import { getLineUserIdForPush } from "@/lib/sensitive/user-profile";
import { pushTextMessage } from "@/lib/line/client";

/**
 * 3.8節:メンタルヘルス安全レイヤーからの相談窓口案内は、通知ON/OFF設定に関わらず配信する
 * (安全設計は他のロジックから独立したフェイルセーフであるべきという設計思想。CLAUDE.md参照)。
 */
export async function pushSafetyResourceMessage(userId: string, text: string): Promise<void> {
  const lineUserId = await getLineUserIdForPush(userId);
  if (!lineUserId) return;

  await pushTextMessage(lineUserId, text).catch(() => {
    // LINE配信失敗はログのみ(バッチ処理を止めない)。運営通知は別途SafetyFlagレコードで担保する。
  });
}
