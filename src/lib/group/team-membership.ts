import { prisma } from "@/lib/prisma";

/** 1.3節(v3):現在の所属チームは leftAt IS NULL の TeamMembership として取得する。 */
export async function getCurrentTeamMembership(userId: string) {
  return prisma.teamMembership.findFirst({
    where: { userId, leftAt: null },
    orderBy: { joinedAt: "desc" },
  });
}

export async function getCurrentTeamMemberUserIds(teamId: string): Promise<string[]> {
  const memberships = await prisma.teamMembership.findMany({
    where: { teamId, leftAt: null },
    select: { userId: true },
  });
  return memberships.map((m) => m.userId);
}
