import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentSalonStaffMembership, getSalonCustomerUserIds } from "@/lib/salon/salon-membership";
import { calculateTeamAchievementRates } from "@/lib/group/achievement";

// スタッフ向けサロン概要:サロン名・顧客招待コード・顧客一覧(達成率つき)。
export async function GET() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ salon: null });
  }

  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: staffMembership.salonId } });
  const customerUserIds = await getSalonCustomerUserIds(salon.id);

  const [users, achievementRates] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: customerUserIds } },
      select: { id: true, displayName: true },
    }),
    calculateTeamAchievementRates(customerUserIds),
  ]);

  const customers = users
    .map((u) => ({
      userId: u.id,
      displayName: u.displayName,
      achievementRate: achievementRates.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.achievementRate - a.achievementRate);

  return NextResponse.json({
    salon: {
      id: salon.id,
      name: salon.name,
      customerInviteCode: salon.customerInviteCode,
      customers,
    },
  });
}
