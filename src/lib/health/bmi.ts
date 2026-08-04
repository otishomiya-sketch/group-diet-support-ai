import { getConfig } from "@/lib/config/system-config";

export function calculateBmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export interface GoalSettingWarning {
  code: "low_bmi" | "aggressive_pace";
  message: string;
}

/**
 * 3.1節:BMIバリデーションロジック。いずれもソフト警告のみで、目標体重の入力自体はブロックしない。
 */
export async function validateGoalSetting(input: {
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  targetDate: Date;
}): Promise<GoalSettingWarning[]> {
  const warnings: GoalSettingWarning[] = [];
  const bmi = calculateBmi(input.heightCm, input.currentWeightKg);

  const lowBmiThreshold = await getConfig("goalSetting.lowBmiThreshold");
  if (bmi < lowBmiThreshold) {
    warnings.push({
      code: "low_bmi",
      message:
        "入力された体重・身長から、健康的な体重の範囲を下回っている可能性があります。" +
        "このアプリでのさらなる減量目標設定はお勧めしません。",
    });
  }

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.max((input.targetDate.getTime() - Date.now()) / msPerWeek, 1 / 7);
  const weeklyLossKg = (input.currentWeightKg - input.targetWeightKg) / weeks;

  const maxWeeklyLossKg = await getConfig("goalSetting.maxWeeklyLossKg");
  if (weeklyLossKg > maxWeeklyLossKg) {
    warnings.push({
      code: "aggressive_pace",
      message: "設定されたペースは急激すぎる可能性があります。",
    });
  }

  return warnings;
}
