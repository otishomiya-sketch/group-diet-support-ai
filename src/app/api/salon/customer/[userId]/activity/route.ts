import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentSalonStaffMembership, getSalonCustomerUserIds } from "@/lib/salon/salon-membership";
import { getMealHistory, getWeightTrend } from "@/lib/checkin/trends";
import { logAdminAccess } from "@/lib/access-control/audit-log";

const ACTIVITY_WINDOW_DAYS = 30;

// スタッフによる顧客の活動閲覧(体重推移・食事記録)。サロン会員である時点で
// スタッフの閲覧に同意しているものとする(運営判断)。対象が同じサロンの顧客であることのみ検証する。
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const { userId: targetUserId } = await params;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ error: "サロンのスタッフではありません。" }, { status: 403 });
  }

  const customerUserIds = await getSalonCustomerUserIds(staffMembership.salonId);
  if (!customerUserIds.includes(targetUserId)) {
    return NextResponse.json({ error: "対象はこのサロンの顧客ではありません。" }, { status: 403 });
  }

  const [weightTrend, meals] = await Promise.all([
    getWeightTrend(targetUserId, ACTIVITY_WINDOW_DAYS),
    getMealHistory(targetUserId, ACTIVITY_WINDOW_DAYS),
  ]);

  await logAdminAccess(session.userId, "view_salon_customer_activity", targetUserId, {
    salonId: staffMembership.salonId,
  });

  return NextResponse.json({ weightTrend, meals });
}
