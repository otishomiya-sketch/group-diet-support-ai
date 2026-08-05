import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { runEveningMealReminderBatch } from "@/lib/checkin/reminder";

// 夕方のLINEリマインド(日次):今日の食事報告(写真)を促す。
async function handler(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runEveningMealReminderBatch();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handler;
export const POST = handler;
