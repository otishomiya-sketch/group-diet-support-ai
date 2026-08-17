import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentTeamMembership, getCurrentTeamMemberUserIds } from "@/lib/group/team-membership";
import { calculateTeamAchievementRates } from "@/lib/group/achievement";

// 運営判断により、チーム内では行動達成の有無に加え、体重・食事の詳細(別エンドポイント)や
// 目標達成率ランキングもメンバー間で共有する(旧方針から転換、weightShareOptOutは適用しない)。
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

  const [team, members, todayCheckIns, achievementRates] = await Promise.all([
    prisma.team.findUniqueOrThrow({
      where: { id: membership.teamId },
      select: { formationType: true, inviteCode: true, capacity: true },
    }),
    prisma.user.findMany({
      where: { id: { in: memberUserIds } },
      select: { id: true, displayName: true },
    }),
    prisma.checkIn.groupBy({
      by: ["userId"],
      where: { userId: { in: memberUserIds }, createdAt: { gte: startOfToday } },
    }),
    calculateTeamAchievementRates(memberUserIds),
  ]);

  const achievedToday = new Set(todayCheckIns.map((c) => c.userId));

  const membersWithRate = members
    .map((m) => ({
      userId: m.id,
      displayName: m.displayName,
      achievedToday: achievedToday.has(m.id),
      achievementRate: achievementRates.get(m.id) ?? 0,
    }))
    .sort((a, b) => b.achievementRate - a.achievementRate);

  return NextResponse.json({
    team: {
      id: membership.teamId,
      formationType: team.formationType,
      inviteCode: team.formationType === "friend" ? team.inviteCode : null,
      capacity: team.capacity,
      members: membersWithRate,
    },
  });
}
