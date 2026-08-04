import { prisma } from "@/lib/prisma";
import { getCurrentTeamMembership } from "@/lib/group/team-membership";

export type JoinTeamResult =
  | { ok: true; teamId: string }
  | { ok: false; error: string };

/** 1.3節:招待コードでformationType="friend"のチームに参加する共通ロジック。 */
export async function joinTeamByCode(userId: string, rawInviteCode: string): Promise<JoinTeamResult> {
  const inviteCode = rawInviteCode.trim().toUpperCase();
  if (!inviteCode) {
    return { ok: false, error: "招待コードを入力してください。" };
  }

  const existing = await getCurrentTeamMembership(userId);
  if (existing) {
    return { ok: false, error: "既にチームに所属しています。" };
  }

  const team = await prisma.team.findUnique({
    where: { inviteCode },
    include: { memberships: { where: { leftAt: null } } },
  });

  if (!team || team.formationType !== "friend") {
    return { ok: false, error: "招待コードが見つかりません。" };
  }
  if (team.memberships.length >= team.capacity) {
    return { ok: false, error: "このチームは定員に達しています。" };
  }

  await prisma.teamMembership.create({ data: { teamId: team.id, userId } });

  if (team.memberships.length + 1 >= team.capacity) {
    await prisma.team.update({ where: { id: team.id }, data: { status: "active" } });
  }

  return { ok: true, teamId: team.id };
}
