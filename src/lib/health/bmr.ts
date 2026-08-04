// 2.2節・9.1節:基礎代謝計算式は未確定(専門家確認待ち)。
// ここでは仮の計算式(Mifflin-St Jeor式)を実装するが、計算式・料率はこのファイルに
// 閉じ込め、差し替え可能な設計にする(呼び出し側はcalculateBmr()のシグネチャにのみ依存する)。
//
// TODO(9.1節): 専門家確認後、formulaVersionに応じた計算式へ差し替えること。ハードコード禁止の
// 指示に従い、採用式のバージョンは system-config の "bmr.formulaVersion" で管理する。

export interface BmrInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: string; // 未確定。現状は "male" | "female" のみ既知の式を適用し、それ以外は平均値を使う
}

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  low: 1.2,
  medium: 1.55,
  high: 1.725,
};

function mifflinStJeorProvisionalV1(input: BmrInput): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
  if (input.gender === "male") {
    return base + 5;
  }
  if (input.gender === "female") {
    return base - 161;
  }
  // 性別未確定区分の暫定対応(要専門家確認)。男女式の中間値を使う。
  return base - 78;
}

export function calculateBmr(input: BmrInput, formulaVersion = "provisional_v1"): number {
  switch (formulaVersion) {
    case "provisional_v1":
      return mifflinStJeorProvisionalV1(input);
    default:
      return mifflinStJeorProvisionalV1(input);
  }
}

export function calculateDailyCalorieTarget(bmr: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIER[activityLevel] ?? ACTIVITY_MULTIPLIER.low;
  return bmr * multiplier;
}
