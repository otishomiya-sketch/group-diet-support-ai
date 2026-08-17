import { prisma } from "@/lib/prisma";
import { getCurrentTeamMemberUserIds } from "@/lib/group/team-membership";
import { calculateTeamAchievementRates } from "@/lib/group/achievement";
import { pushTextMessage } from "@/lib/line/client";
import { getLineUserIdForPush } from "@/lib/sensitive/user-profile";
import type { TeamGoal } from "@/generated/prisma/client";

// 運営判断:チーム内の共有目標・賭け。メンバーの誰かが「期限までにチーム平均達成率を
// ◯%にする」目標を設定し、期限到達時にcalculateTeamAchievementRatesの平均で成否を判定する。
const ALLOWED_DURATION_DAYS = [7, 14, 30];
const ALLOWED_TARGET_RATES = [30, 50, 70, 90];
const MAX_STAKE_DESCRIPTION_LENGTH = 200;

async function averageAchievementRate(teamId: string): Promise<number> {
  const memberIds = await getCurrentTeamMemberUserIds(teamId);
  if (memberIds.length === 0) return 0;
  const rates = await calculateTeamAchievementRates(memberIds);
  const values = Array.from(rates.values());
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export async function createTeamGoal(
  teamId: string,
  targetAchievementRate: number,
  durationDays: number,
  stakeDescription: string | null,
) {
  if (!ALLOWED_TARGET_RATES.includes(targetAchievementRate)) {
    throw new Error("目標達成率は30/50/70/90%のいずれかを選択してください。");
  }
  if (!ALLOWED_DURATION_DAYS.includes(durationDays)) {
    throw new Error("期間は7日・14日・30日のいずれかを選択してください。");
  }
  const trimmedStake = stakeDescription?.trim() || null;
  if (trimmedStake && trimmedStake.length > MAX_STAKE_DESCRIPTION_LENGTH) {
    throw new Error(`賭けの内容は${MAX_STAKE_DESCRIPTION_LENGTH}文字以内で入力してください。`);
  }

  const existing = await prisma.teamGoal.findFirst({ where: { teamId, status: "active" } });
  if (existing) {
    throw new Error("すでに進行中のチーム目標があります。");
  }

  const endsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  const goal = await prisma.teamGoal.create({
    data: { teamId, targetAchievementRate, durationDays, stakeDescription: trimmedStake, status: "active", endsAt },
  });

  const memberIds = await getCurrentTeamMemberUserIds(teamId);
  const stakeText = trimmedStake ? `\n賭けの内容:${trimmedStake}` : "";
  const text = `チーム目標が設定されました!${durationDays}日後までに、チーム平均達成率を${targetAchievementRate}%にすることが目標です。${stakeText}`;
  await Promise.all(
    memberIds.map(async (uid) => {
      const lineUserId = await getLineUserIdForPush(uid);
      if (lineUserId) await pushTextMessage(lineUserId, text).catch(() => {});
    }),
  );

  return goal;
}

async function resolveTeamGoal(goalId: string): Promise<void> {
  const goal = await prisma.teamGoal.findUniqueOrThrow({ where: { id: goalId } });
  const average = await averageAchievementRate(goal.teamId);
  const finalRate = Math.round(average * 10) / 10;
  const achieved = average >= goal.targetAchievementRate;

  await prisma.teamGoal.update({
    where: { id: goalId },
    data: { status: "completed", achieved, finalAchievementRate: finalRate, completedAt: new Date() },
  });

  const stakeText = goal.stakeDescription ? `\n賭けの内容:${goal.stakeDescription}` : "";
  const text = achieved
    ? `チーム目標達成!平均達成率${finalRate}%で目標の${goal.targetAchievementRate}%を上回りました🎉${stakeText}`
    : `チーム目標は未達成でした。平均達成率${finalRate}%(目標${goal.targetAchievementRate}%)。${stakeText}`;

  const memberIds = await getCurrentTeamMemberUserIds(goal.teamId);
  await Promise.all(
    memberIds.map(async (uid) => {
      const lineUserId = await getLineUserIdForPush(uid);
      if (lineUserId) await pushTextMessage(lineUserId, text).catch(() => {});
    }),
  );
}

/** 期限を過ぎたactiveなチーム目標を判定し、メンバー全員にLINEで結果を通知する(日次バッチ)。 */
export async function resolveExpiredTeamGoals(): Promise<{ resolved: number }> {
  const expired = await prisma.teamGoal.findMany({
    where: { status: "active", endsAt: { lte: new Date() } },
    select: { id: true },
  });

  let resolved = 0;
  for (const goal of expired) {
    try {
      await resolveTeamGoal(goal.id);
      resolved += 1;
    } catch (error) {
      console.error(`Failed to resolve team goal ${goal.id}`, error);
    }
  }
  return { resolved };
}

export interface TeamGoalItem {
  id: string;
  targetAchievementRate: number;
  durationDays: number;
  stakeDescription: string | null;
  status: string;
  achieved: boolean | null;
  finalAchievementRate: number | null;
  currentAchievementRate: number | null;
  endsAt: string;
  createdAt: string;
}

function mapGoal(g: TeamGoal): Omit<TeamGoalItem, "currentAchievementRate"> {
  return {
    id: g.id,
    targetAchievementRate: g.targetAchievementRate,
    durationDays: g.durationDays,
    stakeDescription: g.stakeDescription,
    status: g.status,
    achieved: g.achieved,
    finalAchievementRate: g.finalAchievementRate,
    endsAt: g.endsAt.toISOString(),
    createdAt: g.createdAt.toISOString(),
  };
}

export async function getTeamGoals(
  teamId: string,
): Promise<{ active: TeamGoalItem | null; history: TeamGoalItem[] }> {
  const goals = await prisma.teamGoal.findMany({ where: { teamId }, orderBy: { createdAt: "desc" } });
  const active = goals.find((g) => g.status === "active");

  let activeItem: TeamGoalItem | null = null;
  if (active) {
    const currentAverage = await averageAchievementRate(teamId);
    activeItem = { ...mapGoal(active), currentAchievementRate: Math.round(currentAverage * 10) / 10 };
  }

  const history = goals
    .filter((g) => g.status === "completed")
    .map((g) => ({ ...mapGoal(g), currentAchievementRate: null }));

  return { active: activeItem, history };
}
