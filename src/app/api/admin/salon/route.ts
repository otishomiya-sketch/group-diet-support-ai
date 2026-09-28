import { NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { logAdminAccess } from "@/lib/access-control/audit-log";
import { createSalon, listSalonsForAdmin } from "@/lib/salon/salon-admin";

// 運営(operator)によるサロン作成・一覧。パイロット導入のため自己登録フローは設けない。
export async function GET() {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const salons = await listSalonsForAdmin();
  return NextResponse.json({ salons });
}

export async function POST(request: Request) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "サロン名を入力してください。" }, { status: 400 });
  }

  const salon = await createSalon(name);
  await logAdminAccess(operator.operatorUserId, "create_salon", undefined, { salonId: salon.id });

  return NextResponse.json(
    {
      salon: {
        id: salon.id,
        name: salon.name,
        customerInviteCode: salon.customerInviteCode,
      },
    },
    { status: 201 },
  );
}
