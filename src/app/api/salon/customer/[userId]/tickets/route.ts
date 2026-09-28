import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentSalonStaffMembership, getSalonCustomerUserIds } from "@/lib/salon/salon-membership";
import { createSalonTicket, getCustomerTickets } from "@/lib/salon/salon-ticket";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ error: "サロンのスタッフではありません。" }, { status: 403 });
  }

  const { userId: customerUserId } = await params;
  const customerUserIds = await getSalonCustomerUserIds(staffMembership.salonId);
  if (!customerUserIds.includes(customerUserId)) {
    return NextResponse.json({ error: "対象はこのサロンの顧客ではありません。" }, { status: 403 });
  }

  const tickets = await getCustomerTickets(staffMembership.salonId, customerUserId);
  return NextResponse.json({ tickets });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ error: "サロンのスタッフではありません。" }, { status: 403 });
  }

  const { userId: customerUserId } = await params;
  const customerUserIds = await getSalonCustomerUserIds(staffMembership.salonId);
  if (!customerUserIds.includes(customerUserId)) {
    return NextResponse.json({ error: "対象はこのサロンの顧客ではありません。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : "";
  const totalSessions = typeof body?.totalSessions === "number" ? body.totalSessions : null;
  const totalAmount = typeof body?.totalAmount === "number" ? body.totalAmount : null;
  const pricePerSession = typeof body?.pricePerSession === "number" ? body.pricePerSession : null;
  const expiresAt = typeof body?.expiresAt === "string" && body.expiresAt ? new Date(body.expiresAt) : null;
  const note = typeof body?.note === "string" ? body.note : null;

  try {
    const ticket = await createSalonTicket(staffMembership.salonId, customerUserId, {
      name,
      totalSessions,
      totalAmount,
      pricePerSession,
      expiresAt,
      note,
    });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "チケットの発行に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
