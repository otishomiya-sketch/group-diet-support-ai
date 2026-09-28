import { NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { deleteSalonMessageTemplate } from "@/lib/salon/salon-message";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const { id: salonId, templateId } = await params;
  const deleted = await deleteSalonMessageTemplate(salonId, templateId);
  if (!deleted) {
    return NextResponse.json({ error: "テンプレートが見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
