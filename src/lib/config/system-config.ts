import { prisma } from "@/lib/prisma";

// 各節の「閾値・計算式をハードコードせず設定値として切り出すこと」という指示への対応。
// SystemConfigテーブルに保存された値を優先し、未設定時はここに定義したデフォルトを使う。
// 運用担当がDBの値を更新すれば、再デプロイなしで閾値を調整できる。

export const DEFAULT_CONFIG = {
  // 1.3節:BMIマッチングの許容差(v2で追加)。後続合流者の平均BMIとの乖離がこれを超えたら新規チームに切り出す
  "bmiMatching.toleranceRange": 3,

  // 3.4節(v3):体重報告「回数」ベースの停滞閾値。頻度ごとに調整可能な設定値として実装
  "stagnation.thresholdsByFrequency": {
    daily: { stage1Count: 3, stage2Count: 5 },
    every_2_3_days: { stage1Count: 3, stage2Count: 5 },
    weekly: { stage1Count: 2, stage2Count: 3 },
  } as Record<string, { stage1Count: number; stage2Count: number }>,

  // 3.8節:rapid_weight_loss。単一間隔の外挿によるノイズを避けるため、
  // windowDays分の実測期間から週次換算ペースを算出する(実装レビュー指摘反映)
  "safety.rapidWeightLoss.kgPerWeek": 3,
  "safety.rapidWeightLoss.windowDays": 14,

  // 3.8節:low_bmi_target_retry。BMI18.5未満での目標体重再設定の許容回数
  "safety.lowBmiTargetRetry.bmiThreshold": 18.5,
  "safety.lowBmiTargetRetry.maxRetries": 3,

  // 3.8節(v3新規):weight_reporting_silence。選択頻度の何回分の欠落で検知するか
  "safety.weightReportingSilence.missedReportsMultiplier": 4,

  // 3.8節:chronic_stagnation。第2段階が同一ユーザーで何回発火したら運営通知するか
  "safety.chronicStagnation.stage2FireThreshold": 2,

  // 3.8節:abnormal_checkin_pattern(仮閾値、要検証)
  "safety.abnormalCheckin.zeroActivityDays": 14,
  "safety.abnormalCheckin.highFrequencyPerDay": 10,

  // 2.2節:BMRの採用計算式バージョン。専門家確認後に差し替える前提(src/lib/health/bmr.ts参照)
  "bmr.formulaVersion": "provisional_v1",

  // 3.1節:目標設定のソフト警告閾値
  "goalSetting.lowBmiThreshold": 18.5,
  "goalSetting.maxWeeklyLossKg": 1,

  // 7.2節:退会後の画像削除までの日数
  "retention.mealImageDeletionDays": 90,

  // 3.8節・CLAUDE.md安全設計:相談窓口の連絡先はハードコードせず設定値として管理する(専門家確認後に確定)
  "safety.consultationResourceText":
    "お困りのことがあれば、お住まいの地域の保健所・精神保健福祉センター等の公的な相談窓口にご相談ください。",
} as const;

export type ConfigKey = keyof typeof DEFAULT_CONFIG;

export async function getConfig<K extends ConfigKey>(
  key: K,
): Promise<(typeof DEFAULT_CONFIG)[K]> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (!row) {
    return DEFAULT_CONFIG[key];
  }
  return row.value as (typeof DEFAULT_CONFIG)[K];
}

export async function setConfig<K extends ConfigKey>(
  key: K,
  value: (typeof DEFAULT_CONFIG)[K],
): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: value as never },
    update: { value: value as never },
  });
}
