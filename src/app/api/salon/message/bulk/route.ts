import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentSalonStaffMembership, getSalonCustomerUserIds } from "@/lib/salon/salon-membership";
import { sendSalonMessageBulk } from "@/lib/salon/salon-message";
import { logAdminAccess } from "@/lib/access-control/audit-log";

// スタッフが(テンプレートを叩き台に編集した、または自由に書いた)本文を複数顧客へ一斉送信する。
// 送信されるのはあくまでクライアントが最終的に確定した本文であり、templateIdは
// 「どのテンプレートを参考にしたか」を記録する監査ログ用の情報に過ぎない。
export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ error: "サロンのスタッフではありません。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const customerUserIds: unknown = body?.customerUserIds;
  const templateId = typeof body?.templateId === "string" ? body.templateId : null;
  const text = typeof body?.text === "string" ? body.text : "";

  if (!Array.isArray(customerUserIds) || customerUserIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "送信先の顧客を選択してください。" }, { status: 400 });
  }
  if (customerUserIds.length === 0) {
    return NextResponse.json({ error: "送信先の顧客を選択してください。" }, { status: 400 });
  }

  const salonCustomerIds = await getSalonCustomerUserIds(staffMembership.salonId);
  const targetIds = customerUserIds as string[];
  if (targetIds.some((id) => !salonCustomerIds.includes(id))) {
    return NextResponse.json({ error: "対象にこのサロンの顧客でないユーザーが含まれています。" }, { status: 403 });
  }

  if (templateId) {
    const template = await prisma.salonMessageTemplate.findFirst({
      where: { id: templateId, salonId: staffMembership.salonId },
    });
    if (!template) {
      return NextResponse.json({ error: "テンプレートが見つかりません。" }, { status: 404 });
    }
  }

  const results = await sendSalonMessageBulk(targetIds, text);

  await logAdminAccess(session.userId, "send_salon_bulk_message", undefined, {
    salonId: staffMembership.salonId,
    templateId,
    customerCount: targetIds.length,
    successCount: results.filter((r) => r.ok).length,
  });

  return NextResponse.json({ results });
}
