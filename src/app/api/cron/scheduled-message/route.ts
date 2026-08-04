import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { runScheduledMessageBatch } from "@/lib/group/scheduled-message";

// 3.4節:定時配信(6時/11時/17時に外部スケジューラから呼び出す想定)
export async function POST(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runScheduledMessageBatch();
  return NextResponse.json({ ok: true, ...result });
}
