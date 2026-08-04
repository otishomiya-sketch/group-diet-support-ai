import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { runBmiMatchingBatch } from "@/lib/matching/bmi-matching";

// 4章バッチ処理一覧:BMIマッチングバッチ(随時 or 一定間隔)
// Vercel CronはGETで呼び出すため、手動実行(curl等)用のPOSTと両方に対応する。
async function handler(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runBmiMatchingBatch();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handler;
export const POST = handler;
