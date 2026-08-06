import { prisma } from "@/lib/prisma";
import { decryptNumber } from "@/lib/crypto/field-encryption";

// マイページのダッシュボード(体重・摂取カロリーの推移)向け集計。
// weightValueEncrypted/estimatedCaloriesはCheckIn単位で記録されるため、日付ごとに
// 集約(体重は当日最新値、カロリーは当日合計)してから返す。

export interface WeightTrendPoint {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

export interface CalorieTrendPoint {
  date: string; // YYYY-MM-DD
  calories: number;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getWeightTrend(userId: string, days: number): Promise<WeightTrendPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.checkIn.findMany({
    where: { userId, type: "weight", createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, weightValueEncrypted: true },
  });

  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (!row.weightValueEncrypted) continue;
    // 同日に複数回報告された場合は最新値(降順ではなくasc順走査での上書き)を採用する。
    byDate.set(toDateKey(row.createdAt), decryptNumber(row.weightValueEncrypted));
  }

  return Array.from(byDate.entries())
    .map(([date, weightKg]) => ({ date, weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCalorieTrend(userId: string, days: number): Promise<CalorieTrendPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.checkIn.findMany({
    where: { userId, type: "meal", createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, estimatedCalories: true },
  });

  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (row.estimatedCalories == null) continue;
    const key = toDateKey(row.createdAt);
    byDate.set(key, (byDate.get(key) ?? 0) + row.estimatedCalories);
  }

  return Array.from(byDate.entries())
    .map(([date, calories]) => ({ date, calories }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface MealHistoryItem {
  id: string;
  imageUrl: string | null;
  foodDescription: string | null;
  estimatedCalories: number | null;
  createdAt: string;
}

/** チーム内でのメンバー活動閲覧向け:食事チェックインの一覧(新しい順)。 */
export async function getMealHistory(userId: string, days: number): Promise<MealHistoryItem[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.checkIn.findMany({
    where: { userId, type: "meal", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    select: { id: true, imageUrl: true, foodDescription: true, estimatedCalories: true, createdAt: true },
  });

  return rows.map((row) => ({
    id: row.id,
    imageUrl: row.imageUrl,
    foodDescription: row.foodDescription,
    estimatedCalories: row.estimatedCalories,
    createdAt: row.createdAt.toISOString(),
  }));
}
