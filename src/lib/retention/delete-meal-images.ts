import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config/system-config";
import { deleteMealImage } from "@/lib/storage/meal-images";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 6.2節/7.2節:食事画像は退会後90日(設定値)で自動削除する。 */
export async function runMealImageDeletionBatch(): Promise<{ deletedCount: number }> {
  const retentionDays = await getConfig("retention.mealImageDeletionDays");
  const cutoff = new Date(Date.now() - retentionDays * MS_PER_DAY);

  const withdrawnUsers = await prisma.user.findMany({
    where: { withdrawnAt: { lte: cutoff } },
    select: { id: true },
  });

  let deletedCount = 0;

  for (const user of withdrawnUsers) {
    const checkIns = await prisma.checkIn.findMany({
      where: { userId: user.id, type: "meal", imageUrl: { not: null } },
      select: { id: true, imageUrl: true },
    });

    for (const checkIn of checkIns) {
      if (!checkIn.imageUrl) continue;

      const deleted = await deleteMealImage(checkIn.imageUrl)
        .then(() => true)
        .catch(() => false); // ストレージ側の削除失敗時は次回バッチで再試行する(imageUrlを残す)

      if (deleted) {
        await prisma.checkIn.update({ where: { id: checkIn.id }, data: { imageUrl: null } });
        deletedCount += 1;
      }
    }
  }

  return { deletedCount };
}

/** LINE Webhookの冪等性チェック用レコードは再送防止のためだけに必要なので、古いものは間引く。 */
export async function pruneProcessedLineEvents(): Promise<{ prunedCount: number }> {
  const cutoff = new Date(Date.now() - 7 * MS_PER_DAY);
  const result = await prisma.processedLineEvent.deleteMany({
    where: { processedAt: { lt: cutoff } },
  });
  return { prunedCount: result.count };
}
