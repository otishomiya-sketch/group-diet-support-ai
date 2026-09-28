import { prisma } from "@/lib/prisma";
import { getCurrentSalonCustomerMembership } from "@/lib/salon/salon-membership";

export type JoinSalonResult =
  | { ok: true; salonId: string }
  | { ok: false; error: string };

/** 招待コードでサロンに顧客として参加する共通ロジック(Teamの招待参加と同じ形)。 */
export async function joinSalonByCode(userId: string, rawInviteCode: string): Promise<JoinSalonResult> {
  const inviteCode = rawInviteCode.trim().toUpperCase();
  if (!inviteCode) {
    return { ok: false, error: "招待コードを入力してください。" };
  }

  const existing = await getCurrentSalonCustomerMembership(userId);
  if (existing) {
    return { ok: false, error: "既にサロンの顧客として登録されています。" };
  }

  const salon = await prisma.salon.findUnique({ where: { customerInviteCode: inviteCode } });
  if (!salon) {
    return { ok: false, error: "招待コードが見つかりません。" };
  }

  await prisma.salonMembership.create({
    data: { salonId: salon.id, userId, role: "customer" },
  });

  return { ok: true, salonId: salon.id };
}
