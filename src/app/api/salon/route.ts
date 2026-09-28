import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentSalonStaffMembership } from "@/lib/salon/salon-membership";
import { getSalonOverview } from "@/lib/salon/salon-overview";

// スタッフ向けサロン概要:サロン名・顧客招待コード・顧客一覧(達成率つき)。
export async function GET() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ salon: null });
  }

  const salon = await getSalonOverview(staffMembership.salonId);
  return NextResponse.json({ salon });
}
