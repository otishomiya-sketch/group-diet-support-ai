import { prisma } from "@/lib/prisma";
import { consumeTicketForReservation } from "@/lib/salon/salon-ticket";

export interface SalonReservationItem {
  id: string;
  customerUserId: string;
  customerDisplayName: string;
  menuName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  note: string | null;
}

/** 指定日(ローカル日付の00:00〜24:00)の予約一覧。簡易カレンダーの1日表示用。 */
export async function listSalonReservationsForDate(
  salonId: string,
  date: Date,
): Promise<SalonReservationItem[]> {
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

  const reservations = await prisma.salonReservation.findMany({
    where: { salonId, scheduledAt: { gte: from, lt: to } },
    orderBy: { scheduledAt: "asc" },
  });

  const customerIds = [...new Set(reservations.map((r) => r.customerUserId))];
  const users = await prisma.user.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, displayName: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.displayName]));

  return reservations.map((r) => ({
    id: r.id,
    customerUserId: r.customerUserId,
    customerDisplayName: nameById.get(r.customerUserId) ?? "(不明な顧客)",
    menuName: r.menuName,
    scheduledAt: r.scheduledAt.toISOString(),
    durationMinutes: r.durationMinutes,
    status: r.status,
    note: r.note,
  }));
}

export async function createSalonReservation(
  salonId: string,
  customerUserId: string,
  menuName: string,
  scheduledAt: Date,
  durationMinutes: number,
  note: string | null,
) {
  const trimmedMenu = menuName.trim();
  if (!trimmedMenu) {
    throw new Error("メニュー名を入力してください。");
  }
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("予約日時を正しく入力してください。");
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("所要時間は正の数値で入力してください。");
  }

  return prisma.salonReservation.create({
    data: {
      salonId,
      customerUserId,
      menuName: trimmedMenu,
      scheduledAt,
      durationMinutes,
      note: note?.trim() || null,
    },
  });
}

export type SalonReservationActionResult = { ok: true } | { ok: false; error: string };

/** 予約完了。ticketIdが指定されていれば、そのチケットから1回分を消化する。 */
export async function completeSalonReservation(
  salonId: string,
  reservationId: string,
  ticketId: string | null,
): Promise<SalonReservationActionResult> {
  const reservation = await prisma.salonReservation.findFirst({ where: { id: reservationId, salonId } });
  if (!reservation) {
    return { ok: false, error: "予約が見つかりません。" };
  }
  if (reservation.status !== "scheduled") {
    return { ok: false, error: "この予約はすでに完了またはキャンセル済みです。" };
  }

  if (ticketId) {
    const result = await consumeTicketForReservation(
      salonId,
      ticketId,
      reservationId,
      reservation.customerUserId,
    );
    if (!result.ok) return result;
  }

  await prisma.salonReservation.update({
    where: { id: reservationId },
    data: { status: "completed", completedAt: new Date() },
  });
  return { ok: true };
}

export async function cancelSalonReservation(
  salonId: string,
  reservationId: string,
): Promise<SalonReservationActionResult> {
  const reservation = await prisma.salonReservation.findFirst({ where: { id: reservationId, salonId } });
  if (!reservation) {
    return { ok: false, error: "予約が見つかりません。" };
  }
  if (reservation.status !== "scheduled") {
    return { ok: false, error: "この予約はすでに完了またはキャンセル済みです。" };
  }

  await prisma.salonReservation.update({
    where: { id: reservationId },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
  return { ok: true };
}
