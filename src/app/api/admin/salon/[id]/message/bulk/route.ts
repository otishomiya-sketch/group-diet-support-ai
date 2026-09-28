import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { getSalonCustomerUserIds } from "@/lib/salon/salon-membership";
import { sendSalonMessageBulk } from "@/lib/salon/salon-message";
import { logAdminAccess } from "@/lib/access-control/audit-log";

// 運営(operator)による、任意サロンでのテンプレート(または自由入力文)一斉送信。
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const { id: salonId } = await params;

  const body = await request.json().catch(() => null);
  const customerUserIds: unknown = body?.customerUserIds;
  const templateId = typeof body?.templateId === "string" ? body.templateId : null;
  const freeText = typeof body?.text === "string" ? body.text : "";

  if (!Array.isArray(customerUserIds) || customerUserIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "送信先の顧客を選択してください。" }, { status: 400 });
  }
  if (customerUserIds.length === 0) {
    return NextResponse.json({ error: "送信先の顧客を選択してください。" }, { status: 400 });
  }

  const salonCustomerIds = await getSalonCustomerUserIds(salonId);
  const targetIds = customerUserIds as string[];
  if (targetIds.some((id) => !salonCustomerIds.includes(id))) {
    return NextResponse.json({ error: "対象にこのサロンの顧客でないユーザーが含まれています。" }, { status: 403 });
  }

  let text = freeText;
  if (templateId) {
    const template = await prisma.salonMessageTemplate.findFirst({
      where: { id: templateId, salonId },
    });
    if (!template) {
      return NextResponse.json({ error: "テンプレートが見つかりません。" }, { status: 404 });
    }
    text = template.body;
  }

  const results = await sendSalonMessageBulk(targetIds, text);

  await logAdminAccess(operator.operatorUserId, "send_salon_bulk_message", undefined, {
    salonId,
    templateId,
    customerCount: targetIds.length,
    successCount: results.filter((r) => r.ok).length,
  });

  return NextResponse.json({ results });
}
