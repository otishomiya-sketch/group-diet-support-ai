import { prisma } from "@/lib/prisma";

// 3.7節:歩数はHealthKit/Google Fit経由で取得し、記録・グラフ表示のみを行う。
// "manual"はHealthKit等の自動連携(ネイティブアプリが必要)が未整備な間の代替手段。
export type StepSource = "healthkit" | "google_fit" | "manual";

function normalizeToDate(dateIso: string): Date {
  const d = new Date(dateIso);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function recordStepCount(
  userId: string,
  dateIso: string,
  stepCount: number,
  source: StepSource,
) {
  const date = normalizeToDate(dateIso);
  return prisma.stepRecord.upsert({
    where: { userId_date_source: { userId, date, source } },
    create: { userId, date, stepCount, source },
    update: { stepCount },
  });
}

export async function getStepHistory(userId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.stepRecord.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
}
