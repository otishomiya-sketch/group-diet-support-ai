import { NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { logAdminAccess } from "@/lib/access-control/audit-log";
import { addSalonStaffByEmail } from "@/lib/salon/salon-admin";

// 運営(operator)が既存アカウントをサロンのスタッフとして追加する。
export async function POST(request: Request) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const body = await request.json().catch(() => null);
  const salonId = typeof body?.salonId === "string" ? body.salonId : "";
  const email = typeof body?.email === "string" ? body.email : "";
  if (!salonId || !email) {
    return NextResponse.json({ error: "salonIdとemailを指定してください。" }, { status: 400 });
  }

  const result = await addSalonStaffByEmail(salonId, email);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logAdminAccess(operator.operatorUserId, "add_salon_staff", undefined, { salonId, email });
  return NextResponse.json({ ok: true }, { status: 201 });
}
