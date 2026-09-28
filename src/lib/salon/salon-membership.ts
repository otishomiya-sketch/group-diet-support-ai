import { prisma } from "@/lib/prisma";

/** サロンスタッフとしての現在の所属(leftAt IS NULL)を取得する。 */
export async function getCurrentSalonStaffMembership(userId: string) {
  return prisma.salonMembership.findFirst({
    where: { userId, role: "staff", leftAt: null },
    orderBy: { joinedAt: "desc" },
  });
}

/** サロン顧客としての現在の所属(leftAt IS NULL)を取得する。 */
export async function getCurrentSalonCustomerMembership(userId: string) {
  return prisma.salonMembership.findFirst({
    where: { userId, role: "customer", leftAt: null },
    orderBy: { joinedAt: "desc" },
  });
}

export async function getSalonCustomerUserIds(salonId: string): Promise<string[]> {
  const memberships = await prisma.salonMembership.findMany({
    where: { salonId, role: "customer", leftAt: null },
    select: { userId: true },
  });
  return memberships.map((m) => m.userId);
}
