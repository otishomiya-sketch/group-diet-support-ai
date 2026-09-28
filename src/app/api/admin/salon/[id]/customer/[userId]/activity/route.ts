import { NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { getSalonCustomerUserIds } from "@/lib/salon/salon-membership";
import { getMealHistory, getWeightTrend } from "@/lib/checkin/trends";
import { logAdminAccess } from "@/lib/access-control/audit-log";

const ACTIVITY_WINDOW_DAYS = 30;

// 運営(operator)による、任意サロンの顧客の活動閲覧(体重推移・食事記録)。
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const { id: salonId, userId: targetUserId } = await params;

  const customerUserIds = await getSalonCustomerUserIds(salonId);
  if (!customerUserIds.includes(targetUserId)) {
    return NextResponse.json({ error: "対象はこのサロンの顧客ではありません。" }, { status: 403 });
  }

  const [weightTrend, meals] = await Promise.all([
    getWeightTrend(targetUserId, ACTIVITY_WINDOW_DAYS),
    getMealHistory(targetUserId, ACTIVITY_WINDOW_DAYS),
  ]);

  await logAdminAccess(operator.operatorUserId, "view_salon_customer_activity", targetUserId, { salonId });

  return NextResponse.json({ weightTrend, meals });
}
