import { prisma } from "@/lib/prisma";
import type { SalonTicket } from "@/generated/prisma/client";

export interface SalonTicketItem {
  id: string;
  customerUserId: string;
  name: string;
  totalSessions: number | null;
  remainingSessions: number | null;
  totalAmount: number | null;
  remainingAmount: number | null;
  pricePerSession: number | null;
  status: string;
  purchasedAt: string;
  expiresAt: string | null;
  note: string | null;
}

function toItem(t: SalonTicket): SalonTicketItem {
  return {
    id: t.id,
    customerUserId: t.customerUserId,
    name: t.name,
    totalSessions: t.totalSessions,
    remainingSessions: t.remainingSessions,
    totalAmount: t.totalAmount,
    remainingAmount: t.remainingAmount,
    pricePerSession: t.pricePerSession,
    status: t.status,
    purchasedAt: t.purchasedAt.toISOString(),
    expiresAt: t.expiresAt?.toISOString() ?? null,
    note: t.note,
  };
}

export async function getCustomerTickets(
  salonId: string,
  customerUserId: string,
): Promise<SalonTicketItem[]> {
  const tickets = await prisma.salonTicket.findMany({
    where: { salonId, customerUserId },
    orderBy: { purchasedAt: "desc" },
  });
  return tickets.map(toItem);
}

export interface CreateTicketInput {
  name: string;
  totalSessions: number | null;
  totalAmount: number | null;
  pricePerSession: number | null;
  expiresAt: Date | null;
  note: string | null;
}

/** 施術チケット(回数券・前受金)の新規発行。実際の入金はスタッフが店頭で受け取り、ここでは記録するのみ。 */
export async function createSalonTicket(
  salonId: string,
  customerUserId: string,
  input: CreateTicketInput,
): Promise<SalonTicketItem> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("チケット名を入力してください。");
  }
  if (input.totalSessions == null && input.totalAmount == null) {
    throw new Error("回数または金額のいずれかを入力してください。");
  }
  if (input.totalSessions != null && input.totalSessions <= 0) {
    throw new Error("回数は1以上で入力してください。");
  }
  if (input.totalAmount != null && input.totalAmount <= 0) {
    throw new Error("金額は1円以上で入力してください。");
  }

  const ticket = await prisma.salonTicket.create({
    data: {
      salonId,
      customerUserId,
      name,
      totalSessions: input.totalSessions,
      remainingSessions: input.totalSessions,
      totalAmount: input.totalAmount,
      remainingAmount: input.totalAmount,
      pricePerSession: input.pricePerSession,
      expiresAt: input.expiresAt,
      note: input.note?.trim() || null,
    },
  });
  return toItem(ticket);
}

export type SalonTicketActionResult = { ok: true } | { ok: false; error: string };

export async function cancelSalonTicket(salonId: string, ticketId: string): Promise<SalonTicketActionResult> {
  const result = await prisma.salonTicket.updateMany({
    where: { id: ticketId, salonId, status: "active" },
    data: { status: "cancelled" },
  });
  if (result.count === 0) {
    return { ok: false, error: "チケットが見つからないか、すでに利用できない状態です。" };
  }
  return { ok: true };
}

/**
 * 予約完了に伴うチケット消化。回数・金額のどちらか一方または両方を管理しているチケットに対応。
 * どちらか片方でも残数・残高が尽きた時点で"used_up"にする(過剰消化を防ぐ)。
 */
export async function consumeTicketForReservation(
  salonId: string,
  ticketId: string,
  reservationId: string,
  customerUserId: string,
): Promise<SalonTicketActionResult> {
  const ticket = await prisma.salonTicket.findFirst({ where: { id: ticketId, salonId, customerUserId } });
  if (!ticket) {
    return { ok: false, error: "チケットが見つかりません。" };
  }
  if (ticket.status !== "active") {
    return { ok: false, error: "このチケットは利用できません。" };
  }
  if (ticket.remainingSessions != null && ticket.remainingSessions < 1) {
    return { ok: false, error: "このチケットの残り回数がありません。" };
  }
  if (
    ticket.remainingAmount != null &&
    ticket.pricePerSession != null &&
    ticket.remainingAmount < ticket.pricePerSession
  ) {
    return { ok: false, error: "このチケットの残高が不足しています。" };
  }

  const sessionsUsed = ticket.remainingSessions != null ? 1 : 0;
  const amountUsed = ticket.remainingAmount != null ? (ticket.pricePerSession ?? 0) : 0;
  const nextRemainingSessions = ticket.remainingSessions != null ? ticket.remainingSessions - sessionsUsed : null;
  const nextRemainingAmount = ticket.remainingAmount != null ? ticket.remainingAmount - amountUsed : null;
  const eitherExhausted =
    (nextRemainingSessions != null && nextRemainingSessions <= 0) ||
    (nextRemainingAmount != null && nextRemainingAmount <= 0);

  await prisma.$transaction([
    prisma.salonTicket.update({
      where: { id: ticketId },
      data: {
        remainingSessions: nextRemainingSessions,
        remainingAmount: nextRemainingAmount,
        status: eitherExhausted ? "used_up" : ticket.status,
      },
    }),
    prisma.salonTicketConsumption.create({
      data: { ticketId, reservationId, sessionsUsed, amountUsed },
    }),
  ]);

  return { ok: true };
}
