import { NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { createSalonMessageTemplate, getSalonMessageTemplates } from "@/lib/salon/salon-message";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const { id: salonId } = await params;
  const templates = await getSalonMessageTemplates(salonId);
  return NextResponse.json({ templates });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const { id: salonId } = await params;
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title : "";
  const bodyText = typeof body?.body === "string" ? body.body : "";

  try {
    const template = await createSalonMessageTemplate(salonId, title, bodyText);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "テンプレートの作成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
