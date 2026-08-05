import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { runNightWeightReminderBatch } from "@/lib/checkin/reminder";

// 就寝前のLINEリマインド(日次):「毎日」報告を選んだ人のみ、未報告なら体重報告を促す。
async function handler(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runNightWeightReminderBatch();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handler;
export const POST = handler;
