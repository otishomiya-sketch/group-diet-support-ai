import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";

const WEIGHT_REPORT_FREQUENCIES = new Set(["daily", "every_2_3_days", "weekly"]);

// 3.1節/3.6節/4.1節:マイページ設定。
// - bmiDisplayOptIn:デフォルトOFF(BMI非表示)
// - weightShareOptOut:「自分の体重減少をチームに共有しない」トグル
// - weightReportFrequency:v3で選択制に変更(9.10節、日次を強く誘導しない)
// - notifyIndividualSupport:個別行動支援通知のON/OFF(定時配信・チーム共有機能は廃止済み)
export async function GET() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: {
      bmiDisplayOptIn: true,
      weightShareOptOut: true,
      weightReportFrequency: true,
      notifyIndividualSupport: true,
      lineUserIdHash: true,
    },
  });

  const { lineUserIdHash, ...settings } = user;

  return NextResponse.json({ settings, lineLinked: lineUserIdHash !== null });
}

export async function PATCH(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const body = await request.json().catch(() => null);
  const data: Record<string, boolean | string> = {};

  if (typeof body?.bmiDisplayOptIn === "boolean") data.bmiDisplayOptIn = body.bmiDisplayOptIn;
  if (typeof body?.weightShareOptOut === "boolean") data.weightShareOptOut = body.weightShareOptOut;
  if (typeof body?.notifyIndividualSupport === "boolean") {
    data.notifyIndividualSupport = body.notifyIndividualSupport;
  }
  if (
    typeof body?.weightReportFrequency === "string" &&
    WEIGHT_REPORT_FREQUENCIES.has(body.weightReportFrequency)
  ) {
    data.weightReportFrequency = body.weightReportFrequency;
  }

  await prisma.user.update({ where: { id: session.userId }, data });

  return NextResponse.json({ ok: true });
}
