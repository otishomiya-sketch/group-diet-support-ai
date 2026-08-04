import { prisma } from "@/lib/prisma";
import { getLineUserIdForPush } from "@/lib/sensitive/user-profile";
import { pushTextMessage } from "@/lib/line/client";

// 3.7節:バイタル(心拍数等)はユーザーが閾値を設定し、超過時に「設定した数値を超えました」という
// 中立的な事実通知のみを配信する。「危険」等の判定語・AIによる総合判定ロジックは実装しない
// (9.3節:不採用機能。FEATURE_VITAL_AI_JUDGMENTは将来検討用のフラグのみ用意し、判定は行わない)。

export async function evaluateHeartRateReading(
  userId: string,
  heartRateValue: number,
): Promise<void> {
  const setting = await prisma.vitalThresholdSetting.findUnique({ where: { userId } });
  if (!setting) return;

  let boundType: "upper" | "lower" | null = null;
  if (setting.heartRateUpperBound !== null && heartRateValue > setting.heartRateUpperBound) {
    boundType = "upper";
  } else if (setting.heartRateLowerBound !== null && heartRateValue < setting.heartRateLowerBound) {
    boundType = "lower";
  }
  if (!boundType) return;

  await prisma.vitalThresholdEvent.create({
    data: { userId, metric: "heart_rate", value: heartRateValue, boundType },
  });

  const bound = boundType === "upper" ? setting.heartRateUpperBound : setting.heartRateLowerBound;
  const text =
    boundType === "upper"
      ? `心拍数が設定した数値(${bound})を超えました。現在の値:${heartRateValue}`
      : `心拍数が設定した数値(${bound})を下回りました。現在の値:${heartRateValue}`;

  const lineUserId = await getLineUserIdForPush(userId);
  if (lineUserId) {
    await pushTextMessage(lineUserId, text).catch(() => {});
  }
}
