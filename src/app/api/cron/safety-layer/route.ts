import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { runSafetyLayerBatch } from "@/lib/safety/safety-layer";

// 4章/5章バッチ処理一覧:安全レイヤー検知バッチ(日次)。
// 個別支援トリガー判定バッチ(/api/cron/individual-support)の後に実行すること
// (chronic_stagnation判定がStagnationState.stage2FireCountの最新値を参照するため)。
export async function POST(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runSafetyLayerBatch();
  return NextResponse.json({ ok: true, ...result });
}
