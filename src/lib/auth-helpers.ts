import { NextResponse } from "next/server";

import { auth } from "@/auth";

export async function requireSessionUserId(): Promise<
  { userId: string; role: string } | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  return { userId: session.user.id, role: session.user.role ?? "member" };
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
