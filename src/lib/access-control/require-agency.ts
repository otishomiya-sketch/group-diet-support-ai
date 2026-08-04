import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * 5章アクセス制御:代理店ロールのみアクセス可能なAPI用のガード。
 * 自分が紹介したユーザーの集計値のみを返せるよう、ownAgencyCodeを併せて返す。
 */
export async function requireAgency(): Promise<
  { agencyUserId: string; ownAgencyCode: string } | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  if (session.user.role !== "agency") {
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ownAgencyCode: true },
  });
  if (!user?.ownAgencyCode) {
    return NextResponse.json({ error: "代理店コードが設定されていません。" }, { status: 400 });
  }

  return { agencyUserId: session.user.id, ownAgencyCode: user.ownAgencyCode };
}
