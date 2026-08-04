import { prisma } from "@/lib/prisma";
import { getLineUserIdForPush } from "@/lib/sensitive/user-profile";
import { pushTextMessage } from "@/lib/line/client";

type NotificationField = "notifyScheduled" | "notifyTeamShare" | "notifyIndividualSupport";

/** 3.6節:通知設定(定時配信・チーム共有・個別支援を別々にON/OFF)を尊重してLINE Pushする。 */
export async function pushCoachMessageToUser(
  userId: string,
  text: string,
  notificationField: NotificationField,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifyScheduled: true, notifyTeamShare: true, notifyIndividualSupport: true },
  });
  if (!user || !user[notificationField]) return;

  const lineUserId = await getLineUserIdForPush(userId);
  if (!lineUserId) return;

  await pushTextMessage(lineUserId, text).catch(() => {
    // LINE配信失敗はログのみ(呼び出し元のバッチ処理を止めない)
  });
}
