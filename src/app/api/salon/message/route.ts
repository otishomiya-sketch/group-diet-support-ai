import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentSalonStaffMembership, getSalonCustomerUserIds } from "@/lib/salon/salon-membership";
import { sendSalonMessageToCustomer } from "@/lib/salon/salon-message";
import { logAdminAccess } from "@/lib/access-control/audit-log";

// スタッフから顧客1名へのLINEメッセージ送信。
export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ error: "サロンのスタッフではありません。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const customerUserId = typeof body?.customerUserId === "string" ? body.customerUserId : "";
  const text = typeof body?.text === "string" ? body.text : "";

  const customerUserIds = await getSalonCustomerUserIds(staffMembership.salonId);
  if (!customerUserIds.includes(customerUserId)) {
    return NextResponse.json({ error: "対象はこのサロンの顧客ではありません。" }, { status: 403 });
  }

  const result = await sendSalonMessageToCustomer(customerUserId, text);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAccess(session.userId, "send_salon_message", customerUserId, {
    salonId: staffMembership.salonId,
  });

  return NextResponse.json({ ok: true });
}
