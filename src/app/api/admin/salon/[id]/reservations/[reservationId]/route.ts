import { NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { cancelSalonReservation, completeSalonReservation } from "@/lib/salon/salon-reservation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; reservationId: string }> },
) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const { id: salonId, reservationId } = await params;
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";
  const ticketId = typeof body?.ticketId === "string" ? body.ticketId : null;

  const result =
    action === "complete"
      ? await completeSalonReservation(salonId, reservationId, ticketId)
      : action === "cancel"
        ? await cancelSalonReservation(salonId, reservationId)
        : ({ ok: false, error: "actionはcompleteまたはcancelを指定してください。" } as const);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
