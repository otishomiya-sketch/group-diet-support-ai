import { NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { getSalonOverview } from "@/lib/salon/salon-overview";

// 運営(operator)による、任意サロンの顧客管理画面向け概要取得。
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const { id: salonId } = await params;

  try {
    const salon = await getSalonOverview(salonId);
    return NextResponse.json({ salon });
  } catch {
    return NextResponse.json({ error: "サロンが見つかりません。" }, { status: 404 });
  }
}
