import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentSalonStaffMembership, getSalonCustomerUserIds } from "@/lib/salon/salon-membership";
import { createSalonReservation, listSalonReservationsForDate } from "@/lib/salon/salon-reservation";

// スタッフによる予約の一覧(指定日)・新規登録(簡易カレンダー、顧客の自己予約は対象外)。
export async function GET(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ error: "サロンのスタッフではありません。" }, { status: 403 });
  }

  const dateParam = new URL(request.url).searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "日付が不正です。" }, { status: 400 });
  }

  const reservations = await listSalonReservationsForDate(staffMembership.salonId, date);
  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ error: "サロンのスタッフではありません。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const customerUserId = typeof body?.customerUserId === "string" ? body.customerUserId : "";
  const menuName = typeof body?.menuName === "string" ? body.menuName : "";
  const scheduledAt = typeof body?.scheduledAt === "string" ? new Date(body.scheduledAt) : new Date(NaN);
  const durationMinutes = typeof body?.durationMinutes === "number" ? body.durationMinutes : 60;
  const note = typeof body?.note === "string" ? body.note : null;

  const customerUserIds = await getSalonCustomerUserIds(staffMembership.salonId);
  if (!customerUserIds.includes(customerUserId)) {
    return NextResponse.json({ error: "対象はこのサロンの顧客ではありません。" }, { status: 403 });
  }

  try {
    const reservation = await createSalonReservation(
      staffMembership.salonId,
      customerUserId,
      menuName,
      scheduledAt,
      durationMinutes,
      note,
    );
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "予約の登録に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
