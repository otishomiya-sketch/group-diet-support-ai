import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { resolveExpiredDuels } from "@/lib/group/duel";

// 期限(7日)を過ぎた対戦を判定し、LINEで結果を通知する(日次)。
async function handler(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await resolveExpiredDuels();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handler;
export const POST = handler;
