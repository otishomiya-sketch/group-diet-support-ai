import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import { getUserProfile, getLineUserIdForPush } from "@/lib/sensitive/user-profile";
import { sendCoachMessage } from "@/lib/coach/persist";
import { pushTextMessage } from "@/lib/line/client";
import { getCurrentTeamMembership, getCurrentTeamMemberUserIds } from "@/lib/group/team-membership";

/**
 * 3.4節/4.1節:体重報告のweightDeltaが負値(減少)かつ本人がweightShareOptOutしていない場合、
 * チーム全員宛にコーチメッセージをリアルタイムで生成・配信する。
 * FEATURE_FORCED_WEIGHT_SHARE がOFFの場合(opt-in方式へ切替後)は本ロジック自体を停止する(8章)。
 */
export async function triggerWeightShareIfApplicable(
  userId: string,
  weightDeltaKg: number,
): Promise<void> {
  if (weightDeltaKg >= 0) return;

  const forcedShareEnabled = await isFeatureEnabled("FEATURE_FORCED_WEIGHT_SHARE");
  if (!forcedShareEnabled) return;

  const profile = await getUserProfile(userId);
  if (!profile || profile.weightShareOptOut) return;

  const membership = await getCurrentTeamMembership(userId);
  if (!membership) return;

  const remainingKg = Math.max(profile.currentWeight - profile.targetWeight, 0);

  const message = await sendCoachMessage({
    messageType: "team_share",
    teamId: membership.teamId,
    variables: {
      displayName: profile.displayName,
      weightLossKg: Math.abs(weightDeltaKg),
      remainingKg,
    },
  });

  const memberUserIds = await getCurrentTeamMemberUserIds(membership.teamId);
  await Promise.all(
    memberUserIds.map(async (memberId) => {
      const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: { notifyTeamShare: true },
      });
      if (!member?.notifyTeamShare) return;

      const lineUserId = await getLineUserIdForPush(memberId);
      if (!lineUserId) return;

      await pushTextMessage(lineUserId, message.filteredOutput).catch(() => {
        // LINE配信の一時的な失敗はログのみとし、他メンバーへの配信は継続する
      });
    }),
  );
}
