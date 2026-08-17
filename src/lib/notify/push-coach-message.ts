import { prisma } from "@/lib/prisma";
import { getLineUserIdForPush } from "@/lib/sensitive/user-profile";
import { pushTextMessage } from "@/lib/line/client";

/** 個別行動支援通知(notifyIndividualSupport)を尊重してLINE Pushする。 */
export async function pushCoachMessageToUser(userId: string, text: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifyIndividualSupport: true },
  });
  if (!user || !user.notifyIndividualSupport) return;

  const lineUserId = await getLineUserIdForPush(userId);
  if (!lineUserId) return;

  await pushTextMessage(lineUserId, text).catch(() => {
    // LINE配信失敗はログのみ(呼び出し元のバッチ処理を止めない)
  });
}
