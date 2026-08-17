import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { getCurrentTeamMembership } from "@/lib/group/team-membership";
import { createTeamGoal, getTeamGoals } from "@/lib/group/team-goal";

// チーム共有目標・賭け。GET:自チームの現在の目標・履歴、POST:新しい目標を設定する。
export async function GET() {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const membership = await getCurrentTeamMembership(session.userId);
  if (!membership) {
    return NextResponse.json({ active: null, history: [] });
  }

  const goals = await getTeamGoals(membership.teamId);
  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const membership = await getCurrentTeamMembership(session.userId);
  if (!membership) {
    return NextResponse.json({ error: "チームに所属していません。" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const targetAchievementRate = typeof body?.targetAchievementRate === "number" ? body.targetAchievementRate : 0;
  const durationDays = typeof body?.durationDays === "number" ? body.durationDays : 7;
  const stakeDescription = typeof body?.stakeDescription === "string" ? body.stakeDescription : null;

  try {
    const goal = await createTeamGoal(membership.teamId, targetAchievementRate, durationDays, stakeDescription);
    return NextResponse.json({ goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "目標の設定に失敗しました。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
