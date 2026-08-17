import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { resolveExpiredTeamDuels } from "@/lib/group/team-duel";

// 期限を過ぎたチーム対戦を判定し、LINEで結果を通知する(日次)。
async function handler(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await resolveExpiredTeamDuels();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handler;
export const POST = handler;
