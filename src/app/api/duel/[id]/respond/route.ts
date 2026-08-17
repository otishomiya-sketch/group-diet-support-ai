import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { respondToDuelChallenge } from "@/lib/group/duel";

// 対戦の申し込みへの承諾・辞退。
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const accept = body?.accept === true;

  try {
    await respondToDuelChallenge(id, session.userId, accept);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "処理に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
