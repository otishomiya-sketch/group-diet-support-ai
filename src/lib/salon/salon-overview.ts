import { prisma } from "@/lib/prisma";
import { getSalonCustomerUserIds } from "@/lib/salon/salon-membership";
import { calculateTeamAchievementRates } from "@/lib/group/achievement";

export interface SalonOverviewCustomer {
  userId: string;
  displayName: string;
  achievementRate: number;
}

export interface SalonOverview {
  id: string;
  name: string;
  customerInviteCode: string;
  customers: SalonOverviewCustomer[];
}

/** サロン顧客管理画面(スタッフ用/運営用共通)向けの概要:顧客一覧(達成率つき)。 */
export async function getSalonOverview(salonId: string): Promise<SalonOverview> {
  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: salonId } });
  const customerUserIds = await getSalonCustomerUserIds(salonId);

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

  return {
    id: salon.id,
    name: salon.name,
    customerInviteCode: salon.customerInviteCode,
    customers,
  };
}
