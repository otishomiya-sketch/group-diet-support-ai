import { prisma } from "@/lib/prisma";
import { pushTextMessage } from "@/lib/line/client";
import { getLineUserIdForPush } from "@/lib/sensitive/user-profile";

// LINE連携済みユーザーに対して、体重報告の頻度設定(weightReportFrequency)に応じて
// 「そろそろ報告してください」と能動的に促すバッチ。LINE Bot側は受信メッセージへの
// 応答のみで、こちらから話しかけることがなかったため追加(ユーザーからのフィードバック対応)。

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function isDueForReminder(frequency: string, lastWeightCheckInAt: Date | null): boolean {
  if (!lastWeightCheckInAt) return true;
  const days = daysSince(lastWeightCheckInAt);
  if (frequency === "weekly") return days >= 7;
  if (frequency === "every_2_3_days") return days >= 2;
  return days >= 1;
}

const REMINDER_MESSAGE =
  "おはようございます😊\n今日の体重を教えてください(例:70.5)。\n食事の写真もそのまま送ってくださいね。";

export async function runCheckinReminderBatch(): Promise<{ sent: number }> {
  const users = await prisma.user.findMany({
    where: { lineUserIdHash: { not: null }, withdrawnAt: null },
    select: { id: true, weightReportFrequency: true },
  });

  let sent = 0;

  for (const user of users) {
    const lastWeightCheckIn = await prisma.checkIn.findFirst({
      where: { userId: user.id, type: "weight" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (!isDueForReminder(user.weightReportFrequency, lastWeightCheckIn?.createdAt ?? null)) {
      continue;
    }

    const lineUserId = await getLineUserIdForPush(user.id);
    if (!lineUserId) continue;

    await pushTextMessage(lineUserId, REMINDER_MESSAGE).catch(() => {});
    sent += 1;
  }

  return { sent };
}
