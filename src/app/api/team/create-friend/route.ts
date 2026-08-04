import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentTeamMembership } from "@/lib/group/team-membership";
import { generateInviteCode } from "@/lib/group/invite-code";

// 1.3節:formationType="friend"のチーム作成。友達を招待コードで誘う導線。
export async function POST() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const existing = await getCurrentTeamMembership(session.userId);
  if (existing) {
    return NextResponse.json({ error: "既にチームに所属しています。" }, { status: 409 });
  }

  let inviteCode = generateInviteCode();
  // 衝突は極めて稀だが、一意制約違反時は再試行する
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.team.findUnique({ where: { inviteCode } });
    if (!clash) break;
    inviteCode = generateInviteCode();
  }

  const team = await prisma.team.create({
    data: {
      formationType: "friend",
      status: "matching",
      inviteCode,
      memberships: { create: { userId: session.userId } },
    },
  });

  return NextResponse.json({ team: { id: team.id, inviteCode: team.inviteCode } }, { status: 201 });
}
