import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isErrorResponse } from "@/lib/auth-helpers";
import { requireAgency } from "@/lib/access-control/require-agency";

// 3.5節:代理店ダッシュボード。
// 表示項目:紹介経由登録者数、課金移行率、継続率(すべて集計値)。
// 個別ユーザーの体重・BMI・食事画像等は、代理店アカウントのアクセス権限から明示的に除外する
// (フロントエンド非表示だけに頼らず、ここで集計値以外のフィールドを一切selectしない)。
export async function GET() {
  const agency = await requireAgency();
  if (isErrorResponse(agency)) return agency;

  const referredUsers = await prisma.user.findMany({
    where: { agencyReferralCode: agency.ownAgencyCode },
    select: { subscriptionStatus: true, withdrawnAt: true },
  });

  const totalReferred = referredUsers.length;
  const convertedCount = referredUsers.filter((u) => u.subscriptionStatus !== "trial").length;
  const activeCount = referredUsers.filter(
    (u) => u.subscriptionStatus === "active" && !u.withdrawnAt,
  ).length;

  const conversionRate = totalReferred > 0 ? convertedCount / totalReferred : 0;
  // 継続率:課金移行したユーザーのうち、現在も継続中(active・未退会)の割合
  const retentionRate = convertedCount > 0 ? activeCount / convertedCount : 0;

  return NextResponse.json({
    totalReferred,
    conversionRate,
    retentionRate,
  });
}
