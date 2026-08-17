import { prisma } from "@/lib/prisma";
import { decryptNumber } from "@/lib/crypto/field-encryption";
import { getCurrentTeamMembership, getCurrentTeamMemberUserIds } from "@/lib/group/team-membership";
import { pushTextMessage } from "@/lib/line/client";
import { getLineUserIdForPush } from "@/lib/sensitive/user-profile";

// 運営判断:チームvsチームの対戦(個人戦Duelのチーム版)。
// 承諾時点の両チームメンバー全員の体重を記録し、durationDays日後に平均体重減少率(%)で
// 勝敗を決める。stakeDescriptionは個人戦と同様、実際の金銭のやり取りは一切発生しない。
const ALLOWED_DURATION_DAYS = [3, 7, 14];
const MAX_STAKE_DESCRIPTION_LENGTH = 200;
const MAX_LABEL_MEMBERS = 3;

async function teamLabel(teamId: string): Promise<string> {
  const memberIds = await getCurrentTeamMemberUserIds(teamId);
  const members = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { displayName: true },
    take: MAX_LABEL_MEMBERS,
  });
  const names = members.map((m) => m.displayName).join("・");
  const suffix = memberIds.length > MAX_LABEL_MEMBERS ? "他" : "";
  return `${names}${suffix}のチーム`;
}

export async function createTeamDuelChallenge(
  challengerUserId: string,
  opponentInviteCode: string,
  durationDays: number,
  stakeDescription: string | null,
) {
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

  const inviteCode = opponentInviteCode.trim().toUpperCase();
  const opponentTeam = await prisma.team.findUnique({ where: { inviteCode } });
  if (!opponentTeam || opponentTeam.formationType !== "friend") {
    throw new Error("招待コードが見つかりません。");
  }
  if (opponentTeam.id === membership.teamId) {
    throw new Error("自分のチームには対戦を申し込めません。");
  }

  const existing = await prisma.teamDuel.findFirst({
    where: {
      status: { in: ["pending", "active"] },
      OR: [
        { challengerTeamId: membership.teamId, opponentTeamId: opponentTeam.id },
        { challengerTeamId: opponentTeam.id, opponentTeamId: membership.teamId },
      ],
    },
  });
  if (existing) {
    throw new Error("すでに進行中、または返答待ちの対戦がこのチームとの間にあります。");
  }

  const teamDuel = await prisma.teamDuel.create({
    data: {
      challengerTeamId: membership.teamId,
      opponentTeamId: opponentTeam.id,
      status: "pending",
      durationDays,
      stakeDescription: trimmedStake,
    },
  });

  const challengerLabel = await teamLabel(membership.teamId);
  const opponentMemberIds = await getCurrentTeamMemberUserIds(opponentTeam.id);
  const stakeText = trimmedStake ? `\n賭けの内容:${trimmedStake}` : "";
  const text = `${challengerLabel}から「${durationDays}日間、チーム対抗の体重減少率で勝負しよう」と対戦を申し込まれました!${stakeText}\nアプリの「チーム」画面から承諾・辞退できます。`;

  await Promise.all(
    opponentMemberIds.map(async (userId) => {
      const lineUserId = await getLineUserIdForPush(userId);
      if (lineUserId) await pushTextMessage(lineUserId, text).catch(() => {});
    }),
  );

  return teamDuel;
}

export async function respondToTeamDuelChallenge(
  teamDuelId: string,
  userId: string,
  accept: boolean,
): Promise<void> {
  const teamDuel = await prisma.teamDuel.findUniqueOrThrow({ where: { id: teamDuelId } });
  if (teamDuel.status !== "pending") {
    throw new Error("この対戦はすでに応答済みです。");
  }

  const opponentMemberIds = await getCurrentTeamMemberUserIds(teamDuel.opponentTeamId);
  if (!opponentMemberIds.includes(userId)) {
    throw new Error("この対戦に応答する権限がありません。");
  }

  if (!accept) {
    await prisma.teamDuel.update({
      where: { id: teamDuelId },
      data: { status: "declined", respondedAt: new Date() },
    });
    return;
  }

  const challengerMemberIds = await getCurrentTeamMemberUserIds(teamDuel.challengerTeamId);
  const [challengerUsers, opponentUsers] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: challengerMemberIds } },
      select: { id: true, currentWeightEncrypted: true },
    }),
    prisma.user.findMany({
      where: { id: { in: opponentMemberIds } },
      select: { id: true, currentWeightEncrypted: true },
    }),
  ]);

  const now = new Date();
  const endsAt = new Date(now.getTime() + teamDuel.durationDays * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.teamDuel.update({
      where: { id: teamDuelId },
      data: { status: "active", startedAt: now, endsAt, respondedAt: now },
    }),
    prisma.teamDuelParticipant.createMany({
      data: [
        ...challengerUsers.map((u) => ({
          teamDuelId,
          side: "challenger",
          userId: u.id,
          startWeightEncrypted: u.currentWeightEncrypted,
        })),
        ...opponentUsers.map((u) => ({
          teamDuelId,
          side: "opponent",
          userId: u.id,
          startWeightEncrypted: u.currentWeightEncrypted,
        })),
      ],
    }),
  ]);

  const text = `対戦を承諾されました!今日から${teamDuel.durationDays}日間、チーム対抗の体重減少率での勝負が始まります。`;
  await Promise.all(
    [...challengerMemberIds, ...opponentMemberIds].map(async (uid) => {
      const lineUserId = await getLineUserIdForPush(uid);
      if (lineUserId) await pushTextMessage(lineUserId, text).catch(() => {});
    }),
  );
}

function changeRatePercent(startEncrypted: string, endEncrypted: string): number {
  const start = decryptNumber(startEncrypted);
  const end = decryptNumber(endEncrypted);
  return ((start - end) / start) * 100;
}

async function resolveTeamDuel(teamDuelId: string): Promise<void> {
  const teamDuel = await prisma.teamDuel.findUniqueOrThrow({
    where: { id: teamDuelId },
    include: { participants: true },
  });

  const rates: Record<"challenger" | "opponent", number[]> = { challenger: [], opponent: [] };
  const endWeightUpdates: { id: string; endWeightEncrypted: string }[] = [];

  for (const participant of teamDuel.participants) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: participant.userId },
      select: { currentWeightEncrypted: true },
    });
    const rate = changeRatePercent(participant.startWeightEncrypted, user.currentWeightEncrypted);
    rates[participant.side as "challenger" | "opponent"].push(rate);
    endWeightUpdates.push({ id: participant.id, endWeightEncrypted: user.currentWeightEncrypted });
  }

  const average = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

  const challengerRate = Math.round(average(rates.challenger) * 10) / 10;
  const opponentRate = Math.round(average(rates.opponent) * 10) / 10;
  const winnerTeamId =
    challengerRate === opponentRate
      ? null
      : challengerRate > opponentRate
        ? teamDuel.challengerTeamId
        : teamDuel.opponentTeamId;

  await prisma.$transaction([
    prisma.teamDuel.update({
      where: { id: teamDuelId },
      data: {
        status: "completed",
        completedAt: new Date(),
        winnerTeamId,
        challengerRatePercent: challengerRate,
        opponentRatePercent: opponentRate,
      },
    }),
    ...endWeightUpdates.map((u) =>
      prisma.teamDuelParticipant.update({
        where: { id: u.id },
        data: { endWeightEncrypted: u.endWeightEncrypted },
      }),
    ),
  ]);

  const stakeText = teamDuel.stakeDescription ? `\n賭けの内容:${teamDuel.stakeDescription}` : "";
  const [challengerLabel, opponentLabel] = await Promise.all([
    teamLabel(teamDuel.challengerTeamId),
    teamLabel(teamDuel.opponentTeamId),
  ]);

  function resultText(myLabel: string, oppLabel: string, myRate: number, oppRate: number, won: boolean | null) {
    const myPct = myRate.toFixed(1);
    const oppPct = oppRate.toFixed(1);
    if (won === null) {
      return `チーム対戦終了!${myLabel}${myPct}% vs ${oppLabel}${oppPct}% で引き分けでした。${stakeText}`;
    }
    return won
      ? `チーム対戦終了!${myLabel}${myPct}% vs ${oppLabel}${oppPct}% で勝利しました!🎉${stakeText}`
      : `チーム対戦終了!${myLabel}${myPct}% vs ${oppLabel}${oppPct}% で敗北...次は勝とう!${stakeText}`;
  }

  await Promise.all(
    teamDuel.participants.map(async (p) => {
      const isChallenger = p.side === "challenger";
      const won =
        winnerTeamId === null
          ? null
          : winnerTeamId === (isChallenger ? teamDuel.challengerTeamId : teamDuel.opponentTeamId);
      const text = resultText(
        isChallenger ? "自チーム" : "自チーム",
        isChallenger ? opponentLabel : challengerLabel,
        isChallenger ? challengerRate : opponentRate,
        isChallenger ? opponentRate : challengerRate,
        won,
      );
      const lineUserId = await getLineUserIdForPush(p.userId);
      if (lineUserId) await pushTextMessage(lineUserId, text).catch(() => {});
    }),
  );
}

/** 期限を過ぎたactiveなチーム対戦を判定し、参加者全員にLINEで結果を通知する(日次バッチ)。 */
export async function resolveExpiredTeamDuels(): Promise<{ resolved: number }> {
  const expired = await prisma.teamDuel.findMany({
    where: { status: "active", endsAt: { lte: new Date() } },
    select: { id: true },
  });

  let resolved = 0;
  for (const teamDuel of expired) {
    try {
      await resolveTeamDuel(teamDuel.id);
      resolved += 1;
    } catch (error) {
      console.error(`Failed to resolve team duel ${teamDuel.id}`, error);
    }
  }
  return { resolved };
}

export interface TeamDuelListItem {
  id: string;
  status: string;
  role: "challenger" | "opponent";
  opponentLabel: string;
  durationDays: number;
  stakeDescription: string | null;
  startedAt: string | null;
  endsAt: string | null;
  isWinner: boolean | null;
  myRatePercent: number | null;
  opponentRatePercent: number | null;
  createdAt: string;
}

export async function getTeamDuelsForTeam(teamId: string): Promise<TeamDuelListItem[]> {
  const teamDuels = await prisma.teamDuel.findMany({
    where: { OR: [{ challengerTeamId: teamId }, { opponentTeamId: teamId }] },
    orderBy: { createdAt: "desc" },
    include: { participants: true },
  });

  const results: TeamDuelListItem[] = [];
  for (const d of teamDuels) {
    const isChallenger = d.challengerTeamId === teamId;
    const opponentTeamId = isChallenger ? d.opponentTeamId : d.challengerTeamId;
    const opponentLabel = await teamLabel(opponentTeamId);

    let myRatePercent: number | null = isChallenger ? d.challengerRatePercent : d.opponentRatePercent;
    let opponentRatePercent: number | null = isChallenger ? d.opponentRatePercent : d.challengerRatePercent;

    if (d.status === "active" && myRatePercent === null) {
      const mySide = isChallenger ? "challenger" : "opponent";
      const oppSide = isChallenger ? "opponent" : "challenger";
      const myParticipants = d.participants.filter((p) => p.side === mySide);
      const oppParticipants = d.participants.filter((p) => p.side === oppSide);

      const liveAverage = async (participants: typeof d.participants) => {
        if (participants.length === 0) return 0;
        const rates = await Promise.all(
          participants.map(async (p) => {
            const user = await prisma.user.findUniqueOrThrow({
              where: { id: p.userId },
              select: { currentWeightEncrypted: true },
            });
            return changeRatePercent(p.startWeightEncrypted, user.currentWeightEncrypted);
          }),
        );
        return rates.reduce((sum, v) => sum + v, 0) / rates.length;
      };

      myRatePercent = Math.round((await liveAverage(myParticipants)) * 10) / 10;
      opponentRatePercent = Math.round((await liveAverage(oppParticipants)) * 10) / 10;
    }

    results.push({
      id: d.id,
      status: d.status,
      role: isChallenger ? "challenger" : "opponent",
      opponentLabel,
      durationDays: d.durationDays,
      stakeDescription: d.stakeDescription,
      startedAt: d.startedAt?.toISOString() ?? null,
      endsAt: d.endsAt?.toISOString() ?? null,
      isWinner: d.winnerTeamId ? d.winnerTeamId === teamId : null,
      myRatePercent,
      opponentRatePercent,
      createdAt: d.createdAt.toISOString(),
    });
  }

  return results;
}
