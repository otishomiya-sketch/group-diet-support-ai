import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { runMealImageDeletionBatch, pruneProcessedLineEvents } from "@/lib/retention/delete-meal-images";

// 4章バッチ処理一覧:画像自動削除バッチ(日次)。LINE Webhook冪等性レコードの間引きも合わせて行う。
// Vercel CronはGETで呼び出すため、手動実行(curl等)用のPOSTと両方に対応する。
async function handler(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const [imageResult, pruneResult] = await Promise.all([
    runMealImageDeletionBatch(),
    pruneProcessedLineEvents(),
  ]);
  return NextResponse.json({ ok: true, ...imageResult, ...pruneResult });
}

export const GET = handler;
export const POST = handler;
