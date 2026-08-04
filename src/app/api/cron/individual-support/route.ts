import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { runIndividualSupportBatch } from "@/lib/group/stagnation";

// 4章バッチ処理一覧:個別支援トリガー判定(日次)
export async function POST(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runIndividualSupportBatch();
  return NextResponse.json({ ok: true, ...result });
}
