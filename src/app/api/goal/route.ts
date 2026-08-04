import { NextResponse } from "next/server";

import { getConfig } from "@/lib/config/system-config";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getUserProfile, updateGoal } from "@/lib/sensitive/user-profile";
import { validateGoalSetting } from "@/lib/health/bmi";
import { isGoalSettingLockedForSafety } from "@/lib/safety/safety-layer";

// 目標体重・期限の再設定API。3.8節 low_bmi_target_retry(BMI18.5未満の状態での再設定)を
// 検知バッチが参照できるよう、User.targetWeightRevisionCountを更新する。

function parseNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function PATCH(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const body = await request.json().catch(() => null);
  const targetWeight = parseNumber(body?.targetWeight);
  const targetDateRaw = typeof body?.targetDate === "string" ? new Date(body.targetDate) : null;

  if (!targetWeight || targetWeight <= 0) {
    return NextResponse.json({ error: "目標体重は正の数値で入力してください。" }, { status: 400 });
  }
  if (!targetDateRaw || Number.isNaN(targetDateRaw.getTime()) || targetDateRaw.getTime() <= Date.now()) {
    return NextResponse.json({ error: "目標期限は未来の日付で入力してください。" }, { status: 400 });
  }

  const profile = await getUserProfile(session.userId);
  if (!profile) {
    return NextResponse.json({ error: "ユーザーが見つかりません。" }, { status: 404 });
  }

  // 3.8節 low_bmi_target_retry:未解決の安全フラグがある間は目標設定を一時的に制限する
  if (await isGoalSettingLockedForSafety(session.userId)) {
    return NextResponse.json(
      {
        error:
          "現在、目標体重の再設定を制限しています。専門家への相談窓口をご案内していますので、そちらをご確認ください。",
      },
      { status: 423 },
    );
  }

  const lowBmiThreshold = await getConfig("goalSetting.lowBmiThreshold");
  const isLowBmiAtTimeOfChange = (profile.bmi ?? calculateBmiFallback(profile)) < lowBmiThreshold;

  await updateGoal(
    session.userId,
    { targetWeight, targetDate: targetDateRaw },
    isLowBmiAtTimeOfChange,
  );

  const warnings = await validateGoalSetting({
    heightCm: profile.height,
    currentWeightKg: profile.currentWeight,
    targetWeightKg: targetWeight,
    targetDate: targetDateRaw,
  });

  return NextResponse.json({ ok: true, warnings });
}

function calculateBmiFallback(profile: { height: number; currentWeight: number }): number {
  const heightM = profile.height / 100;
  return profile.currentWeight / (heightM * heightM);
}
