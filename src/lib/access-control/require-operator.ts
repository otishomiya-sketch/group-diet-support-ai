import { NextResponse } from "next/server";

import { auth } from "@/auth";

/**
 * 5章アクセス制御:運営(管理者)ロールのみアクセス可能なAPI用のガード。
 * フロントエンドの非表示だけに頼らず、APIレスポンスレベルで制御すること。
 */
export async function requireOperator(): Promise<{ operatorUserId: string } | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  if (session.user.role !== "operator") {
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }
  return { operatorUserId: session.user.id };
}
