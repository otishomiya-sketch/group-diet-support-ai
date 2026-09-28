import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentSalonStaffMembership } from "@/lib/salon/salon-membership";
import { cancelSalonReservation, completeSalonReservation } from "@/lib/salon/salon-reservation";

// 予約のステータス更新:action="complete"(任意でticketIdを消化)またはaction="cancel"。
export async function PATCH(
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
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";
  const ticketId = typeof body?.ticketId === "string" ? body.ticketId : null;

  const result =
    action === "complete"
      ? await completeSalonReservation(staffMembership.salonId, id, ticketId)
      : action === "cancel"
        ? await cancelSalonReservation(staffMembership.salonId, id)
        : ({ ok: false, error: "actionはcompleteまたはcancelを指定してください。" } as const);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
