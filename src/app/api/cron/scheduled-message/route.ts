import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { runScheduledMessageBatch } from "@/lib/group/scheduled-message";

// 3.4節:定時配信(本来は6時/11時/17時の1日3回想定)。
// Vercel Hobbyプランはcronが1日1回までのため、当面は1日1回に圧縮している
// (Proプラン移行時にvercel.jsonへ複数エントリを追加すること)。
// Vercel CronはGETで呼び出すため、手動実行(curl等)用のPOSTと両方に対応する。
async function handler(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runScheduledMessageBatch();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handler;
export const POST = handler;
