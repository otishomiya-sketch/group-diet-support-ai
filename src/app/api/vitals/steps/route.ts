import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { recordStepCount, getStepHistory, type StepSource } from "@/lib/vitals/steps";

const VALID_SOURCES = new Set<StepSource>(["healthkit", "google_fit"]);

export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : null;
  const stepCount = Number(body?.stepCount);
  const source = body?.source;

  if (!date || !Number.isFinite(stepCount) || stepCount < 0 || !VALID_SOURCES.has(source)) {
    return NextResponse.json({ error: "date, stepCount, sourceを正しく指定してください。" }, { status: 400 });
  }

  const record = await recordStepCount(session.userId, date, stepCount, source);
  return NextResponse.json({ ok: true, record });
}

export async function GET() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const records = await getStepHistory(session.userId, 30);
  return NextResponse.json({ records });
}
