import { NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth-helpers";
import { requireOperator } from "@/lib/access-control/require-operator";
import { logAdminAccess } from "@/lib/access-control/audit-log";
import { getUserProfile } from "@/lib/sensitive/user-profile";

// 5章:運営(管理者)は全データにアクセス可能。ただし監査ログを残すこと。
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const operator = await requireOperator();
  if (isErrorResponse(operator)) return operator;

  const { id } = await context.params;
  const profile = await getUserProfile(id);
  if (!profile) {
    return NextResponse.json({ error: "ユーザーが見つかりません。" }, { status: 404 });
  }

  await logAdminAccess(operator.operatorUserId, "view_user_profile", id);

  return NextResponse.json({ profile });
}
