import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { runCheckinReminderBatch } from "@/lib/checkin/reminder";

// LINE連携済みユーザーへの体重・食事報告リマインド(日次)。
async function handler(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runCheckinReminderBatch();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handler;
export const POST = handler;
