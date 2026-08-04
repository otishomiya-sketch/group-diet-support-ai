import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { logAdminAccess } from "@/lib/access-control/audit-log";

const VALID_ACTIONS = new Set(["resource_message_sent", "escalated_to_operator", "no_action_needed"]);

// 1.4節:actionTakenが"escalated_to_operator"となったSafetyFlagは、
// 運営側の管理画面で確認・対応記録ができるようにすること。
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const actionTaken = typeof body?.actionTaken === "string" ? body.actionTaken : null;

  if (actionTaken && !VALID_ACTIONS.has(actionTaken)) {
    return NextResponse.json({ error: "不正なactionTakenです。" }, { status: 400 });
  }

  const flag = await prisma.safetyFlag.update({
    where: { id },
    data: { resolvedAt: new Date(), ...(actionTaken ? { actionTaken } : {}) },
  });

  await logAdminAccess(operator.operatorUserId, "resolve_safety_flag", flag.userId, { flagId: id });

  return NextResponse.json({ ok: true, flag });
}
