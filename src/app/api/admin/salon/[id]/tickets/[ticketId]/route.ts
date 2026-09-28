import { NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { cancelSalonTicket } from "@/lib/salon/salon-ticket";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; ticketId: string }> },
) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const { id: salonId, ticketId } = await params;
  const result = await cancelSalonTicket(salonId, ticketId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
