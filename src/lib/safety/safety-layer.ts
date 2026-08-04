import { prisma } from "@/lib/prisma";
import { decryptNumber } from "@/lib/crypto/field-encryption";
import { getConfig } from "@/lib/config/system-config";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import { sendCoachMessage } from "@/lib/coach/persist";
import { pushSafetyResourceMessage } from "@/lib/notify/push-safety-message";

// 3.8節:メンタルヘルス安全レイヤー。
// 設計原則:AIは摂食障害・メンタルヘルス状態の診断を行わない。機械的な閾値検知のみを行い、
// 該当した場合は定型の相談窓口案内メッセージを配信する、または運営へのエスカレーションを行う。
// この安全レイヤーは3.4節の適応スコアリングとは完全に独立して動作する(1.4節の設計思想)。

export type SafetyFlagType =
  | "rapid_weight_loss"
  | "low_bmi_target_retry"
  | "abnormal_checkin_pattern"
  | "chronic_stagnation"
  | "weight_reporting_silence";

async function hasUnresolvedFlag(userId: string, flagType: SafetyFlagType): Promise<boolean> {
  const existing = await prisma.safetyFlag.findFirst({
    where: { userId, flagType, resolvedAt: null },
    select: { id: true },
  });
  return existing !== null;
}

/**
 * 検知結果を記録し、相談窓口案内メッセージを配信する。
 * escalateWarranted かつ FEATURE_SAFETY_ESCALATION が有効な場合のみ actionTaken を
 * "escalated_to_operator" とする(8章:運営体制が整うまでは検知ログの記録のみに留める)。
 */
async function recordFlag(
  userId: string,
  flagType: SafetyFlagType,
  detectionContext: Record<string, unknown>,
  escalateWarranted: boolean,
): Promise<void> {
  const message = await sendCoachMessage({
    messageType: "safety_resource",
    userId,
    variables: { flagType },
  });
  await pushSafetyResourceMessage(userId, message.filteredOutput);

  const escalationEnabled = escalateWarranted && (await isFeatureEnabled("FEATURE_SAFETY_ESCALATION"));

  await prisma.safetyFlag.create({
    data: {
      userId,
      flagType,
      detectionContext: JSON.parse(JSON.stringify(detectionContext)),
      actionTaken: escalationEnabled ? "escalated_to_operator" : "resource_message_sent",
    },
  });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function detectRapidWeightLoss(userId: string): Promise<boolean> {
  if (await hasUnresolvedFlag(userId, "rapid_weight_loss")) return false;

  const windowDays = await getConfig("safety.rapidWeightLoss.windowDays");
  const kgPerWeekThreshold = await getConfig("safety.rapidWeightLoss.kgPerWeek");

  const since = new Date(Date.now() - windowDays * MS_PER_DAY);
  const checkIns = await prisma.checkIn.findMany({
    where: { userId, type: "weight", createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { weightValueEncrypted: true, createdAt: true },
  });
  if (checkIns.length < 2) return false;

  const first = checkIns[0];
  const last = checkIns[checkIns.length - 1];
  if (!first.weightValueEncrypted || !last.weightValueEncrypted) return false;

  const elapsedDays = (last.createdAt.getTime() - first.createdAt.getTime()) / MS_PER_DAY;
  if (elapsedDays < 1) return false;

  // 単一間隔からの外挿ではなく、windowDays分の実測期間から週次換算ペースを算出する
  // (単発のノイズ(水分変動等)による誤検知を減らすための実装レビュー指摘反映)
  const changeKg = decryptNumber(first.weightValueEncrypted) - decryptNumber(last.weightValueEncrypted);
  const weeklyPaceKg = (changeKg / elapsedDays) * 7;

  if (weeklyPaceKg >= kgPerWeekThreshold) {
    await recordFlag(userId, "rapid_weight_loss", { weeklyPaceKg, elapsedDays, windowDays }, false);
    return true;
  }
  return false;
}

async function detectLowBmiTargetRetry(
  userId: string,
  bmi: number | null,
  targetWeightRevisionCount: number,
): Promise<boolean> {
  if (bmi === null) return false;
  if (await hasUnresolvedFlag(userId, "low_bmi_target_retry")) return false;

  const bmiThreshold = await getConfig("safety.lowBmiTargetRetry.bmiThreshold");
  const maxRetries = await getConfig("safety.lowBmiTargetRetry.maxRetries");

  if (bmi < bmiThreshold && targetWeightRevisionCount >= maxRetries) {
    await recordFlag(userId, "low_bmi_target_retry", { bmi, targetWeightRevisionCount }, true);
    return true;
  }
  return false;
}

async function detectAbnormalCheckinPattern(userId: string, userCreatedAt: Date): Promise<boolean> {
  if (await hasUnresolvedFlag(userId, "abnormal_checkin_pattern")) return false;

  const zeroDays = await getConfig("safety.abnormalCheckin.zeroActivityDays");
  const highFrequencyPerDay = await getConfig("safety.abnormalCheckin.highFrequencyPerDay");

  const tenureDays = (Date.now() - userCreatedAt.getTime()) / MS_PER_DAY;
  if (tenureDays < zeroDays) return false; // 登録間もないユーザーは判定対象外

  const zeroActivitySince = new Date(Date.now() - zeroDays * MS_PER_DAY);
  const mealCountInWindow = await prisma.checkIn.count({
    where: { userId, type: "meal", createdAt: { gte: zeroActivitySince } },
  });
  if (mealCountInWindow === 0) {
    await recordFlag(userId, "abnormal_checkin_pattern", { reason: "zero_activity", zeroDays }, false);
    return true;
  }

  const oneDayAgo = new Date(Date.now() - MS_PER_DAY);
  const recentCount = await prisma.checkIn.count({
    where: { userId, type: "meal", createdAt: { gte: oneDayAgo } },
  });
  if (recentCount >= highFrequencyPerDay) {
    await recordFlag(
      userId,
      "abnormal_checkin_pattern",
      { reason: "high_frequency", recentCount },
      false,
    );
    return true;
  }
  return false;
}

async function detectChronicStagnation(userId: string, stage2FireCount: number): Promise<boolean> {
  if (await hasUnresolvedFlag(userId, "chronic_stagnation")) return false;

  const threshold = await getConfig("safety.chronicStagnation.stage2FireThreshold");
  if (stage2FireCount >= threshold) {
    await recordFlag(userId, "chronic_stagnation", { stage2FireCount }, true);
    return true;
  }
  return false;
}

const FREQUENCY_INTERVAL_DAYS: Record<string, number> = {
  daily: 1,
  every_2_3_days: 2.5,
  weekly: 7,
};

async function detectWeightReportingSilence(userId: string, frequency: string): Promise<boolean> {
  if (await hasUnresolvedFlag(userId, "weight_reporting_silence")) return false;

  const multiplier = await getConfig("safety.weightReportingSilence.missedReportsMultiplier");
  const intervalDays = FREQUENCY_INTERVAL_DAYS[frequency] ?? FREQUENCY_INTERVAL_DAYS.daily;
  const missedThresholdDays = intervalDays * multiplier;

  const lastWeightCheckIn = await prisma.checkIn.findFirst({
    where: { userId, type: "weight" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!lastWeightCheckIn) return false; // 一度も報告がない新規ユーザーは対象外

  const daysSinceLastReport = (Date.now() - lastWeightCheckIn.createdAt.getTime()) / MS_PER_DAY;
  if (daysSinceLastReport >= missedThresholdDays) {
    await recordFlag(
      userId,
      "weight_reporting_silence",
      { daysSinceLastReport, missedThresholdDays, frequency },
      false,
    );
    return true;
  }
  return false;
}

export async function runSafetyLayerBatch(): Promise<{ evaluated: number; flagsRaised: number }> {
  const users = await prisma.user.findMany({
    where: { withdrawnAt: null },
    select: {
      id: true,
      bmi: true,
      targetWeightRevisionCount: true,
      createdAt: true,
      weightReportFrequency: true,
      stagnationState: { select: { stage2FireCount: true } },
    },
  });

  let flagsRaised = 0;

  for (const user of users) {
    const results = await Promise.all([
      detectRapidWeightLoss(user.id),
      detectLowBmiTargetRetry(user.id, user.bmi, user.targetWeightRevisionCount),
      detectAbnormalCheckinPattern(user.id, user.createdAt),
      detectChronicStagnation(user.id, user.stagnationState?.stage2FireCount ?? 0),
      detectWeightReportingSilence(user.id, user.weightReportFrequency),
    ]);
    flagsRaised += results.filter(Boolean).length;
  }

  return { evaluated: users.length, flagsRaised };
}

/** 3.1節/低BMI:目標設定の一時制限。未解決のlow_bmi_target_retryフラグがある間はブロックする。 */
export async function isGoalSettingLockedForSafety(userId: string): Promise<boolean> {
  return hasUnresolvedFlag(userId, "low_bmi_target_retry");
}
