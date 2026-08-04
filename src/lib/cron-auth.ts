import { NextResponse } from "next/server";

/** Vercel cron / 外部スケジューラからの呼び出しを CRON_SECRET で認証する。 */
export function requireCronSecret(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
