import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";

// マイページ用:LINE連携コードを発行する。ユーザーはLINE公式アカウントのトークに
// このコードをそのまま送信することでアカウント連携が完了する(3.6節、友だち追加は任意)。
export async function GET() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  return NextResponse.json({ linkCode: `link:${session.userId}` });
}
