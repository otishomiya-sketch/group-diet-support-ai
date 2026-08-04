import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentTeamMembership, getCurrentTeamMemberUserIds } from "@/lib/group/team-membership";

// 5章アクセス制御:チームメンバーには「行動達成の有無」「体重減少共有(共有された場合)」のみを返す。
// BMI・個人の食事画像はAPIレスポンスレベルで一切含めない(フロントエンド非表示だけに頼らない)。
export async function GET() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const membership = await getCurrentTeamMembership(session.userId);
  if (!membership) {
    return NextResponse.json({ team: null });
  }

  const memberUserIds = await getCurrentTeamMemberUserIds(membership.teamId);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [members, todayCheckIns, recentMessages] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: memberUserIds } },
      select: { id: true, displayName: true },
    }),
    prisma.checkIn.groupBy({
      by: ["userId"],
      where: { userId: { in: memberUserIds }, createdAt: { gte: startOfToday } },
    }),
    prisma.coachMessage.findMany({
      where: { teamId: membership.teamId },
      orderBy: { sentAt: "desc" },
      take: 20,
      select: { messageType: true, filteredOutput: true, sentAt: true },
    }),
  ]);

  const achievedToday = new Set(todayCheckIns.map((c) => c.userId));

  return NextResponse.json({
    team: {
      id: membership.teamId,
      members: members.map((m) => ({
        userId: m.id,
        displayName: m.displayName,
        achievedToday: achievedToday.has(m.id),
      })),
      messages: recentMessages,
    },
  });
}
