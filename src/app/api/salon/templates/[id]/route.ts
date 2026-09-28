import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentSalonStaffMembership } from "@/lib/salon/salon-membership";
import { deleteSalonMessageTemplate } from "@/lib/salon/salon-message";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ error: "サロンのスタッフではありません。" }, { status: 403 });
  }

  const { id } = await params;
  const deleted = await deleteSalonMessageTemplate(staffMembership.salonId, id);
  if (!deleted) {
    return NextResponse.json({ error: "テンプレートが見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
