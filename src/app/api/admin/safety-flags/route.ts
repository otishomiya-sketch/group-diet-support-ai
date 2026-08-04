import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { logAdminAccess } from "@/lib/access-control/audit-log";

// 6章:SafetyFlagテーブルは運営(管理者)のみアクセス可能とし、チームメンバー・代理店には一切見せない。
export async function GET() {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const flags = await prisma.safetyFlag.findMany({
    where: { resolvedAt: null },
    orderBy: { detectedAt: "desc" },
    include: { user: { select: { id: true, displayName: true, email: true } } },
  });

  await logAdminAccess(operator.operatorUserId, "list_safety_flags");

  return NextResponse.json({ flags });
}
