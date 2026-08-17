import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { resolveExpiredTeamGoals } from "@/lib/group/team-goal";

// 期限を過ぎたチーム目標を判定し、LINEで結果を通知する(日次)。
async function handler(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await resolveExpiredTeamGoals();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handler;
export const POST = handler;
