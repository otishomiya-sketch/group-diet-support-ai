import { prisma } from "@/lib/prisma";
import { sendCoachMessage } from "@/lib/coach/persist";
import { pushCoachMessageToUser } from "@/lib/notify/push-coach-message";

// 3.4節:定時配信(6時/11時/17時)。チーム達成率(集計値)を算出してコーチメッセージを生成・配信する。
// 達成率は「本日いずれかのチェックイン(食事 or 体重)を行ったメンバーの割合」とする
// (選択理論に基づき、評価対象は常に「行動」であり結果ではないため)。

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function calculateTeamAchievementRate(memberUserIds: string[]): Promise<number> {
  if (memberUserIds.length === 0) return 0;

  const checkedInCount = await prisma.checkIn.groupBy({
    by: ["userId"],
    where: { userId: { in: memberUserIds }, createdAt: { gte: startOfToday() } },
  });

  return Math.round((checkedInCount.length / memberUserIds.length) * 100);
}

export async function runScheduledMessageBatch(): Promise<{ teamsSent: number }> {
  const teams = await prisma.team.findMany({
    where: { status: "active" },
    include: { memberships: { where: { leftAt: null }, select: { userId: true } } },
  });

  let teamsSent = 0;

  for (const team of teams) {
    const memberUserIds = team.memberships.map((m) => m.userId);
    if (memberUserIds.length === 0) continue;

    const achievementRate = await calculateTeamAchievementRate(memberUserIds);
    const message = await sendCoachMessage({
      messageType: "scheduled",
      teamId: team.id,
      variables: { teamAchievementRate: achievementRate },
    });

    await Promise.all(
      memberUserIds.map((userId) =>
        pushCoachMessageToUser(userId, message.filteredOutput, "notifyScheduled"),
      ),
    );
    teamsSent += 1;
  }

  return { teamsSent };
}
