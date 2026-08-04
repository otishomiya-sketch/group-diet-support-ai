import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";

// 3.7節:バイタルの閾値はユーザー自身が設定する。
export async function GET() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const setting = await prisma.vitalThresholdSetting.findUnique({
    where: { userId: session.userId },
  });
  return NextResponse.json({ setting });
}

export async function PATCH(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const body = await request.json().catch(() => null);
  const heartRateUpperBound =
    body?.heartRateUpperBound === null ? null : Number(body?.heartRateUpperBound);
  const heartRateLowerBound =
    body?.heartRateLowerBound === null ? null : Number(body?.heartRateLowerBound);

  const setting = await prisma.vitalThresholdSetting.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      heartRateUpperBound: Number.isFinite(heartRateUpperBound) ? heartRateUpperBound : null,
      heartRateLowerBound: Number.isFinite(heartRateLowerBound) ? heartRateLowerBound : null,
    },
    update: {
      heartRateUpperBound: Number.isFinite(heartRateUpperBound) ? heartRateUpperBound : null,
      heartRateLowerBound: Number.isFinite(heartRateLowerBound) ? heartRateLowerBound : null,
    },
  });

  return NextResponse.json({ ok: true, setting });
}
