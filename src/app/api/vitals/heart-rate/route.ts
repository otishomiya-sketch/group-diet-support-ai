import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { evaluateHeartRateReading } from "@/lib/vitals/heart-rate";

// 3.7節:HealthKit/Google Fit連携時にリアルタイムで閾値判定を行う(4章バッチ処理一覧参照)。
export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const body = await request.json().catch(() => null);
  const heartRateValue = Number(body?.heartRateValue);
  if (!Number.isFinite(heartRateValue) || heartRateValue <= 0) {
    return NextResponse.json({ error: "heartRateValueを正しく指定してください。" }, { status: 400 });
  }

  await evaluateHeartRateReading(session.userId, heartRateValue);
  return NextResponse.json({ ok: true });
}
