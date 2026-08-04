import { NextResponse } from "next/server";

import { requireCronSecret } from "@/lib/cron-auth";
import { runMealImageDeletionBatch } from "@/lib/retention/delete-meal-images";

// 4章バッチ処理一覧:画像自動削除バッチ(日次)
export async function POST(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runMealImageDeletionBatch();
  return NextResponse.json({ ok: true, ...result });
}
