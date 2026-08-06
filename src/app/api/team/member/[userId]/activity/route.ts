import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentTeamMembership, getCurrentTeamMemberUserIds } from "@/lib/group/team-membership";
import { getMealHistory, getWeightTrend } from "@/lib/checkin/trends";

const ACTIVITY_WINDOW_DAYS = 30;

// チームメンバーの活動閲覧(体重推移・食事記録)。運営判断により、weightShareOptOut設定に
// 関わらずチーム内では全メンバー分を表示する(方針転換)。対象が同じチームのメンバーであることのみ検証する。
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const { userId: targetUserId } = await params;

  const membership = await getCurrentTeamMembership(session.userId);
  if (!membership) {
    return NextResponse.json({ error: "チームに所属していません。" }, { status: 403 });
  }

  const memberUserIds = await getCurrentTeamMemberUserIds(membership.teamId);
  if (!memberUserIds.includes(targetUserId)) {
    return NextResponse.json({ error: "対象はチームメンバーではありません。" }, { status: 403 });
  }

  const [weightTrend, meals] = await Promise.all([
    getWeightTrend(targetUserId, ACTIVITY_WINDOW_DAYS),
    getMealHistory(targetUserId, ACTIVITY_WINDOW_DAYS),
  ]);

  return NextResponse.json({ weightTrend, meals });
}
