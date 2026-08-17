import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentTeamMembership } from "@/lib/group/team-membership";
import { createTeamDuelChallenge, getTeamDuelsForTeam } from "@/lib/group/team-duel";

// チームvsチーム対戦。GET:自チームに関わる対戦一覧、POST:招待コードで他チームに申し込む。
export async function GET() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const membership = await getCurrentTeamMembership(session.userId);
  if (!membership) {
    return NextResponse.json({ teamDuels: [] });
  }

  const teamDuels = await getTeamDuelsForTeam(membership.teamId);
  return NextResponse.json({ teamDuels });
}

export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const body = await request.json().catch(() => null);
  const opponentInviteCode = typeof body?.opponentInviteCode === "string" ? body.opponentInviteCode : "";
  const durationDays = typeof body?.durationDays === "number" ? body.durationDays : 7;
  const stakeDescription = typeof body?.stakeDescription === "string" ? body.stakeDescription : null;
  if (!opponentInviteCode) {
    return NextResponse.json({ error: "対戦相手チームの招待コードを入力してください。" }, { status: 400 });
  }

  try {
    const teamDuel = await createTeamDuelChallenge(
      session.userId,
      opponentInviteCode,
      durationDays,
      stakeDescription,
    );
    return NextResponse.json({ teamDuel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "対戦の申し込みに失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
