import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentTeamMembership } from "@/lib/group/team-membership";

// 6.2節:退会時刻を記録する。食事画像は退会後90日で自動削除バッチの対象となる。
// その他の機微データの退会後取扱いは未確定(9章参照)だが、削除バッチの対象に含められる設計としている。
// 退会後もチームに所属し続けたままだと達成率集計やコーチメッセージの対象に残り続けてしまうため、
// 現在所属しているチームがあれば同時に脱退させる。
export async function POST() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const membership = await getCurrentTeamMembership(session.userId);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: { withdrawnAt: now },
    }),
    ...(membership
      ? [prisma.teamMembership.update({ where: { id: membership.id }, data: { leftAt: now } })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
