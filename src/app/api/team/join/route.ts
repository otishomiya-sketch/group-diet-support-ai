import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { joinTeamByCode } from "@/lib/group/join-team";

// 1.3節:招待コードでformationType="friend"のチームに参加する。
export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const body = await request.json().catch(() => null);
  const inviteCode = typeof body?.inviteCode === "string" ? body.inviteCode : "";

  const result = await joinTeamByCode(session.userId, inviteCode);
  if (!result.ok) {
    const status = result.error.includes("見つかりません") ? 404 : 409;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, teamId: result.teamId });
}
