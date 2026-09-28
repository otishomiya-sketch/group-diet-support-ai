import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentSalonStaffMembership } from "@/lib/salon/salon-membership";
import { createSalonMessageTemplate, getSalonMessageTemplates } from "@/lib/salon/salon-message";

export async function GET() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ error: "サロンのスタッフではありません。" }, { status: 403 });
  }

  const templates = await getSalonMessageTemplates(staffMembership.salonId);
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const staffMembership = await getCurrentSalonStaffMembership(session.userId);
  if (!staffMembership) {
    return NextResponse.json({ error: "サロンのスタッフではありません。" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title : "";
  const bodyText = typeof body?.body === "string" ? body.body : "";

  try {
    const template = await createSalonMessageTemplate(staffMembership.salonId, title, bodyText);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "テンプレートの作成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
