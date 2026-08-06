import { prisma } from "@/lib/prisma";
import { decryptNumber } from "@/lib/crypto/field-encryption";

// チーム内の「達成率ランキング」向け集計(運営判断でゲーム性を持たせるため追加)。
// 達成率は「体重目標に対する減少の進捗」として算出する:
//   開始体重 = そのユーザーの最初の体重チェックイン(なければ現在体重をそのまま使い0%扱い)
//   達成率 = (開始体重 - 現在体重) / (開始体重 - 目標体重) を 0〜100% にクランプ

export interface MemberAchievement {
  userId: string;
  achievementRate: number;
}

export async function calculateAchievementRate(userId: string): Promise<MemberAchievement> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { currentWeightEncrypted: true, targetWeightEncrypted: true },
  });

  const currentWeightKg = decryptNumber(user.currentWeightEncrypted);
  const targetWeightKg = decryptNumber(user.targetWeightEncrypted);

  const firstWeightCheckIn = await prisma.checkIn.findFirst({
    where: { userId, type: "weight" },
    orderBy: { createdAt: "asc" },
    select: { weightValueEncrypted: true },
  });
  const startWeightKg = firstWeightCheckIn?.weightValueEncrypted
    ? decryptNumber(firstWeightCheckIn.weightValueEncrypted)
    : currentWeightKg;

  const totalNeeded = startWeightKg - targetWeightKg;
  const achieved = startWeightKg - currentWeightKg;
  const achievementRate =
    totalNeeded > 0 ? Math.max(0, Math.min(100, (achieved / totalNeeded) * 100)) : 0;

  return { userId, achievementRate: Math.round(achievementRate) };
}

export async function calculateTeamAchievementRates(
  userIds: string[],
): Promise<Map<string, number>> {
  const results = await Promise.all(userIds.map((id) => calculateAchievementRate(id)));
  return new Map(results.map((r) => [r.userId, r.achievementRate]));
}
