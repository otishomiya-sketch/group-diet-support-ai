import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";

// 6.2節:退会時刻を記録する。食事画像は退会後90日で自動削除バッチの対象となる。
// その他の機微データの退会後取扱いは未確定(9章参照)だが、削除バッチの対象に含められる設計としている。
export async function POST() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  await prisma.user.update({
    where: { id: session.userId },
    data: { withdrawnAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
