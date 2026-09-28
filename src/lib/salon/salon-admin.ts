import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/group/invite-code";

// 運営(operator)がパイロット導入するサロンを作成する。自己登録フローは設けない
// (1店舗での試験導入のため)。顧客のみcustomerInviteCode経由で自己登録する。
export async function createSalon(name: string) {
  let customerInviteCode = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.salon.findUnique({ where: { customerInviteCode } });
    if (!clash) break;
    customerInviteCode = generateInviteCode();
  }

  return prisma.salon.create({ data: { name, customerInviteCode } });
}

export type AddSalonStaffResult =
  | { ok: true }
  | { ok: false; error: string };

/** 運営が特定のユーザー(既存アカウント)をサロンのスタッフとして追加する。 */
export async function addSalonStaffByEmail(salonId: string, email: string): Promise<AddSalonStaffResult> {
  const salon = await prisma.salon.findUnique({ where: { id: salonId } });
  if (!salon) {
    return { ok: false, error: "サロンが見つかりません。" };
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    return { ok: false, error: "このメールアドレスのユーザーが見つかりません。" };
  }

  const existing = await prisma.salonMembership.findFirst({
    where: { salonId, userId: user.id, role: "staff", leftAt: null },
  });
  if (existing) {
    return { ok: false, error: "既にこのサロンのスタッフです。" };
  }

  await prisma.salonMembership.create({
    data: { salonId, userId: user.id, role: "staff" },
  });
  return { ok: true };
}

export type RemoveSalonStaffResult =
  | { ok: true }
  | { ok: false; error: string };

export async function removeSalonStaff(salonId: string, userId: string): Promise<RemoveSalonStaffResult> {
  const result = await prisma.salonMembership.updateMany({
    where: { salonId, userId, role: "staff", leftAt: null },
    data: { leftAt: new Date() },
  });
  if (result.count === 0) {
    return { ok: false, error: "このサロンのスタッフではありません。" };
  }
  return { ok: true };
}

export interface SalonAdminListItem {
  id: string;
  name: string;
  customerInviteCode: string;
  createdAt: string;
  staff: { userId: string; displayName: string; email: string }[];
  customerCount: number;
}

export async function listSalonsForAdmin(): Promise<SalonAdminListItem[]> {
  const salons = await prisma.salon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      memberships: {
        where: { leftAt: null },
        include: { user: { select: { id: true, displayName: true, email: true } } },
      },
    },
  });

  return salons.map((s) => ({
    id: s.id,
    name: s.name,
    customerInviteCode: s.customerInviteCode,
    createdAt: s.createdAt.toISOString(),
    staff: s.memberships
      .filter((m) => m.role === "staff")
      .map((m) => ({ userId: m.user.id, displayName: m.user.displayName, email: m.user.email })),
    customerCount: s.memberships.filter((m) => m.role === "customer").length,
  }));
}
