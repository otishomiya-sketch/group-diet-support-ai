import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { createDuelChallenge, getDuelsForUser } from "@/lib/group/duel";

// チーム内1対1対戦(体重減少率で7日間勝負)。GET:自分に関わる対戦一覧、POST:対戦を申し込む。
export async function GET() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const duels = await getDuelsForUser(session.userId);
  return NextResponse.json({ duels });
}

export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const body = await request.json().catch(() => null);
  const opponentUserId = typeof body?.opponentUserId === "string" ? body.opponentUserId : "";
  const durationDays = typeof body?.durationDays === "number" ? body.durationDays : 7;
  const stakeDescription = typeof body?.stakeDescription === "string" ? body.stakeDescription : null;
  if (!opponentUserId) {
    return NextResponse.json({ error: "対戦相手を指定してください。" }, { status: 400 });
  }

  try {
    const duel = await createDuelChallenge(session.userId, opponentUserId, durationDays, stakeDescription);
    return NextResponse.json({ duel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "対戦の申し込みに失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
