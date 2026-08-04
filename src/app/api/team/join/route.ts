import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentTeamMembership } from "@/lib/group/team-membership";

// 1.3節:招待コードでformationType="friend"のチームに参加する。
export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const existing = await getCurrentTeamMembership(session.userId);
  if (existing) {
    return NextResponse.json({ error: "既にチームに所属しています。" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const inviteCode = typeof body?.inviteCode === "string" ? body.inviteCode.trim().toUpperCase() : "";
  if (!inviteCode) {
    return NextResponse.json({ error: "招待コードを入力してください。" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({
    where: { inviteCode },
    include: { memberships: { where: { leftAt: null } } },
  });

  if (!team || team.formationType !== "friend") {
    return NextResponse.json({ error: "招待コードが見つかりません。" }, { status: 404 });
  }
  if (team.memberships.length >= team.capacity) {
    return NextResponse.json({ error: "このチームは定員に達しています。" }, { status: 409 });
  }

  await prisma.teamMembership.create({ data: { teamId: team.id, userId: session.userId } });

  if (team.memberships.length + 1 >= team.capacity) {
    await prisma.team.update({ where: { id: team.id }, data: { status: "active" } });
  }

  return NextResponse.json({ ok: true, teamId: team.id });
}
