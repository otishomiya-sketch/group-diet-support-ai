import { prisma } from "@/lib/prisma";
import { decryptNumber } from "@/lib/crypto/field-encryption";
import { getCurrentTeamMembership, getCurrentTeamMemberUserIds } from "@/lib/group/team-membership";
import { pushTextMessage } from "@/lib/line/client";
import { getLineUserIdForPush } from "@/lib/sensitive/user-profile";

// 運営判断:チーム内1対1対戦機能(「ゲーム性を持たせる」施策)。
// 承諾した時点からdurationDays日間、体重減少率(%)を競う。身長は不変なので減少率はBMI減少率と一致する。
// stakeDescriptionは罰ゲーム等の自由記述のみで、実際の金銭のやり取りは一切発生しない。
const ALLOWED_DURATION_DAYS = [3, 7, 14];
const MAX_STAKE_DESCRIPTION_LENGTH = 200;

export async function createDuelChallenge(
  challengerUserId: string,
  opponentUserId: string,
  durationDays: number,
  stakeDescription: string | null,
) {
  if (challengerUserId === opponentUserId) {
    throw new Error("自分自身には対戦を申し込めません。");
  }
  if (!ALLOWED_DURATION_DAYS.includes(durationDays)) {
    throw new Error("対戦期間は3日・7日・14日のいずれかを選択してください。");
  }
  const trimmedStake = stakeDescription?.trim() || null;
  if (trimmedStake && trimmedStake.length > MAX_STAKE_DESCRIPTION_LENGTH) {
    throw new Error(`賭けの内容は${MAX_STAKE_DESCRIPTION_LENGTH}文字以内で入力してください。`);
  }

  const membership = await getCurrentTeamMembership(challengerUserId);
  if (!membership) {
    throw new Error("チームに所属していません。");
  }

  const memberIds = await getCurrentTeamMemberUserIds(membership.teamId);
  if (!memberIds.includes(opponentUserId)) {
    throw new Error("対象はチームメンバーではありません。");
  }

  const existing = await prisma.duel.findFirst({
    where: {
      status: { in: ["pending", "active"] },
      OR: [
        { challengerUserId, opponentUserId },
        { challengerUserId: opponentUserId, opponentUserId: challengerUserId },
      ],
    },
  });
  if (existing) {
    throw new Error("すでに進行中、または返答待ちの対戦があります。");
  }

  const duel = await prisma.duel.create({
    data: {
      teamId: membership.teamId,
      challengerUserId,
      opponentUserId,
      status: "pending",
      durationDays,
      stakeDescription: trimmedStake,
    },
  });

  const [challenger, opponentLineUserId] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: challengerUserId }, select: { displayName: true } }),
    getLineUserIdForPush(opponentUserId),
  ]);
  if (opponentLineUserId) {
    const stakeText = trimmedStake ? `\n賭けの内容:${trimmedStake}` : "";
    await pushTextMessage(
      opponentLineUserId,
      `${challenger.displayName}さんから「${durationDays}日間、体重減少率で勝負しよう」と対戦を申し込まれました!${stakeText}\nアプリの「チーム」画面から承諾・辞退できます。`,
    ).catch(() => {});
  }

  return duel;
}

export async function respondToDuelChallenge(
  duelId: string,
  userId: string,
  accept: boolean,
): Promise<void> {
  const duel = await prisma.duel.findUniqueOrThrow({ where: { id: duelId } });
  if (duel.opponentUserId !== userId) {
    throw new Error("この対戦に応答する権限がありません。");
  }
  if (duel.status !== "pending") {
    throw new Error("この対戦はすでに応答済みです。");
  }

  if (!accept) {
    await prisma.duel.update({
      where: { id: duelId },
      data: { status: "declined", respondedAt: new Date() },
    });
    return;
  }

  const [challenger, opponent] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: duel.challengerUserId },
      select: { currentWeightEncrypted: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: duel.opponentUserId },
      select: { currentWeightEncrypted: true },
    }),
  ]);

  const now = new Date();
  const durationMs = duel.durationDays * 24 * 60 * 60 * 1000;
  await prisma.duel.update({
    where: { id: duelId },
    data: {
      status: "active",
      startedAt: now,
      endsAt: new Date(now.getTime() + durationMs),
      respondedAt: now,
      challengerStartWeightEncrypted: challenger.currentWeightEncrypted,
      opponentStartWeightEncrypted: opponent.currentWeightEncrypted,
    },
  });

  const challengerLineUserId = await getLineUserIdForPush(duel.challengerUserId);
  if (challengerLineUserId) {
    await pushTextMessage(
      challengerLineUserId,
      `対戦を承諾されました!今日から${duel.durationDays}日間、体重減少率での勝負が始まります。`,
    ).catch(() => {});
  }
}

function changeRatePercent(startEncrypted: string, endEncrypted: string): number {
  const start = decryptNumber(startEncrypted);
  const end = decryptNumber(endEncrypted);
  return Math.round(((start - end) / start) * 1000) / 10;
}

async function resolveDuel(duelId: string): Promise<void> {
  const duel = await prisma.duel.findUniqueOrThrow({ where: { id: duelId } });
  if (!duel.challengerStartWeightEncrypted || !duel.opponentStartWeightEncrypted) {
    throw new Error("開始体重が記録されていない対戦は判定できません。");
  }

  const [challenger, opponent] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: duel.challengerUserId },
      select: { currentWeightEncrypted: true, displayName: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: duel.opponentUserId },
      select: { currentWeightEncrypted: true, displayName: true },
    }),
  ]);

  const challengerRate = changeRatePercent(
    duel.challengerStartWeightEncrypted,
    challenger.currentWeightEncrypted,
  );
  const opponentRate = changeRatePercent(
    duel.opponentStartWeightEncrypted,
    opponent.currentWeightEncrypted,
  );

  const winnerUserId =
    challengerRate === opponentRate
      ? null
      : challengerRate > opponentRate
        ? duel.challengerUserId
        : duel.opponentUserId;

  await prisma.duel.update({
    where: { id: duelId },
    data: {
      status: "completed",
      completedAt: new Date(),
      winnerUserId,
      challengerEndWeightEncrypted: challenger.currentWeightEncrypted,
      opponentEndWeightEncrypted: opponent.currentWeightEncrypted,
    },
  });

  const stakeText = duel.stakeDescription ? `\n賭けの内容:${duel.stakeDescription}` : "";

  function resultMessage(myRate: number, oppRate: number, oppName: string, iWon: boolean | null): string {
    const myPct = myRate.toFixed(1);
    const oppPct = oppRate.toFixed(1);
    if (iWon === null) {
      return `対戦終了!あなた${myPct}% vs ${oppName}さん${oppPct}% で引き分けでした。${stakeText}`;
    }
    return iWon
      ? `対戦終了!あなた${myPct}% vs ${oppName}さん${oppPct}% で勝利しました!🎉${stakeText}`
      : `対戦終了!あなた${myPct}% vs ${oppName}さん${oppPct}% で敗北...次は勝とう!${stakeText}`;
  }

  const [challengerLineUserId, opponentLineUserId] = await Promise.all([
    getLineUserIdForPush(duel.challengerUserId),
    getLineUserIdForPush(duel.opponentUserId),
  ]);

  if (challengerLineUserId) {
    await pushTextMessage(
      challengerLineUserId,
      resultMessage(
        challengerRate,
        opponentRate,
        opponent.displayName,
        winnerUserId === null ? null : winnerUserId === duel.challengerUserId,
      ),
    ).catch(() => {});
  }
  if (opponentLineUserId) {
    await pushTextMessage(
      opponentLineUserId,
      resultMessage(
        opponentRate,
        challengerRate,
        challenger.displayName,
        winnerUserId === null ? null : winnerUserId === duel.opponentUserId,
      ),
    ).catch(() => {});
  }
}

/** 期限(7日)を過ぎたactiveな対戦を判定し、両者にLINEで結果を通知する(日次バッチ)。 */
export async function resolveExpiredDuels(): Promise<{ resolved: number }> {
  const expired = await prisma.duel.findMany({
    where: { status: "active", endsAt: { lte: new Date() } },
    select: { id: true },
  });

  let resolved = 0;
  for (const duel of expired) {
    try {
      await resolveDuel(duel.id);
      resolved += 1;
    } catch (error) {
      console.error(`Failed to resolve duel ${duel.id}`, error);
    }
  }
  return { resolved };
}

export interface DuelListItem {
  id: string;
  status: string;
  role: "challenger" | "opponent";
  opponentUserId: string;
  opponentDisplayName: string;
  durationDays: number;
  stakeDescription: string | null;
  startedAt: string | null;
  endsAt: string | null;
  isWinner: boolean | null;
  myChangeRatePercent: number | null;
  opponentChangeRatePercent: number | null;
  createdAt: string;
}

/** 進行中は現在体重を使ったリアルタイムの途中経過、終了後は確定値を返す。 */
export async function getDuelsForUser(userId: string): Promise<DuelListItem[]> {
  const duels = await prisma.duel.findMany({
    where: { OR: [{ challengerUserId: userId }, { opponentUserId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      challenger: { select: { displayName: true, currentWeightEncrypted: true } },
      opponent: { select: { displayName: true, currentWeightEncrypted: true } },
    },
  });

  return duels.map((d) => {
    const isChallenger = d.challengerUserId === userId;
    const opponentUserId = isChallenger ? d.opponentUserId : d.challengerUserId;
    const opponentDisplayName = isChallenger ? d.opponent.displayName : d.challenger.displayName;

    const myStart = isChallenger ? d.challengerStartWeightEncrypted : d.opponentStartWeightEncrypted;
    const oppStart = isChallenger ? d.opponentStartWeightEncrypted : d.challengerStartWeightEncrypted;
    const myEndFrozen = isChallenger ? d.challengerEndWeightEncrypted : d.opponentEndWeightEncrypted;
    const oppEndFrozen = isChallenger ? d.opponentEndWeightEncrypted : d.challengerEndWeightEncrypted;
    const myCurrent = isChallenger
      ? d.challenger.currentWeightEncrypted
      : d.opponent.currentWeightEncrypted;
    const oppCurrent = isChallenger
      ? d.opponent.currentWeightEncrypted
      : d.challenger.currentWeightEncrypted;

    const myEnd = myEndFrozen ?? (d.status === "active" ? myCurrent : null);
    const oppEnd = oppEndFrozen ?? (d.status === "active" ? oppCurrent : null);

    return {
      id: d.id,
      status: d.status,
      role: isChallenger ? "challenger" : "opponent",
      opponentUserId,
      opponentDisplayName,
      durationDays: d.durationDays,
      stakeDescription: d.stakeDescription,
      startedAt: d.startedAt?.toISOString() ?? null,
      endsAt: d.endsAt?.toISOString() ?? null,
      isWinner: d.winnerUserId ? d.winnerUserId === userId : null,
      myChangeRatePercent: myStart && myEnd ? changeRatePercent(myStart, myEnd) : null,
      opponentChangeRatePercent: oppStart && oppEnd ? changeRatePercent(oppStart, oppEnd) : null,
      createdAt: d.createdAt.toISOString(),
    };
  });
}
