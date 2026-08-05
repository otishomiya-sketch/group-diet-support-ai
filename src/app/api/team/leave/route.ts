import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentTeamMembership } from "@/lib/group/team-membership";

// 1.3節:チーム脱退。leftAtを記録するのみで、TeamMembership自体は履歴として残す。
export async function POST() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const membership = await getCurrentTeamMembership(session.userId);
  if (!membership) {
    return NextResponse.json({ error: "チームに所属していません。" }, { status: 400 });
  }

  await prisma.teamMembership.update({
    where: { id: membership.id },
    data: { leftAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
