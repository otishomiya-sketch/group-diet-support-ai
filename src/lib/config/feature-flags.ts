import { prisma } from "@/lib/prisma";

// 8章:フィーチャーフラグ管理。法務確認・運営体制の確立が完了するまでOFFにできることが要件のため、
// 再デプロイなしで切り替えられるようDB(SystemConfig)を優先ソースとし、
// 未設定時のみ環境変数フォールバック→最終フォールバックとして安全側(false)を返す。

export type FeatureFlagName =
  | "FEATURE_VITAL_AI_JUDGMENT" // 9.3節:不採用機能。将来再検討用のフラグのみ用意し、判定ロジックは実装しない
  | "FEATURE_SUBSCRIPTION_REFUND_FLOW" // 9.4節:特定継続的役務提供該当性の確認待ち
  | "FEATURE_FORCED_WEIGHT_SHARE" // 9.6節:体重共有のopt-out方式の適法性確認待ち(現状ON)
  | "FEATURE_SAFETY_ESCALATION"; // 9.7節:運営エスカレーション体制が整うまで検知ログ記録のみに留める

const FEATURE_FLAG_KEY_PREFIX = "featureFlag:";

/** 法務・運営体制確認が完了するまでの安全側デフォルト。 */
const SAFE_DEFAULTS: Record<FeatureFlagName, boolean> = {
  FEATURE_VITAL_AI_JUDGMENT: false,
  FEATURE_SUBSCRIPTION_REFUND_FLOW: false,
  FEATURE_FORCED_WEIGHT_SHARE: true,
  FEATURE_SAFETY_ESCALATION: false,
};

function envDefault(name: FeatureFlagName): boolean {
  const raw = process.env[name];
  if (raw === undefined) {
    return SAFE_DEFAULTS[name];
  }
  return raw === "true" || raw === "1";
}

export async function isFeatureEnabled(name: FeatureFlagName): Promise<boolean> {
  const row = await prisma.systemConfig.findUnique({
    where: { key: `${FEATURE_FLAG_KEY_PREFIX}${name}` },
  });
  if (row) {
    return row.value === true;
  }
  return envDefault(name);
}

export async function setFeatureEnabled(name: FeatureFlagName, enabled: boolean): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: `${FEATURE_FLAG_KEY_PREFIX}${name}` },
    create: { key: `${FEATURE_FLAG_KEY_PREFIX}${name}`, value: enabled },
    update: { value: enabled },
  });
}
