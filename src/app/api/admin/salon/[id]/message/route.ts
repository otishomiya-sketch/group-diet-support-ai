import { NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { getSalonCustomerUserIds } from "@/lib/salon/salon-membership";
import { sendSalonMessageToCustomer } from "@/lib/salon/salon-message";
import { logAdminAccess } from "@/lib/access-control/audit-log";

// 運営(operator)による、任意サロンの顧客1名へのLINEメッセージ送信。
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const { id: salonId } = await params;

  const body = await request.json().catch(() => null);
  const customerUserId = typeof body?.customerUserId === "string" ? body.customerUserId : "";
  const text = typeof body?.text === "string" ? body.text : "";

  const customerUserIds = await getSalonCustomerUserIds(salonId);
  if (!customerUserIds.includes(customerUserId)) {
    return NextResponse.json({ error: "対象はこのサロンの顧客ではありません。" }, { status: 403 });
  }

  const result = await sendSalonMessageToCustomer(customerUserId, text);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAccess(operator.operatorUserId, "send_salon_message", customerUserId, { salonId });

  return NextResponse.json({ ok: true });
}
