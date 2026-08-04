import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config/system-config";

// 1.3節:BMIマッチングバッチ。
// - ソロ参加者はBMI順にソートし、capacity人数ごとに束ねる動的区分方式(固定BMIレンジテーブルは持たない)
// - 即時マッチング:初期は1名のチームも許容し、後続の登録者が随時合流する
// - v2追加:後続合流者のBMIが既存チームの平均BMIから許容差(既定±3)を超えて離れている場合は
//   新規チームとして切り出す
//
// 表示上の注意:マッチングに使用したBMI値・レンジは、チーム名やUIラベルに一切表示しないこと。

interface OpenTeamState {
  teamId: string;
  capacity: number;
  memberBmis: number[];
}

function averageBmi(bmis: number[]): number {
  return bmis.reduce((sum, v) => sum + v, 0) / bmis.length;
}

export async function runBmiMatchingBatch(): Promise<{ placed: number; newTeams: number }> {
  const toleranceRange = await getConfig("bmiMatching.toleranceRange");

  const unmatchedUsers = await prisma.user.findMany({
    where: {
      teamJoinPreference: "solo",
      withdrawnAt: null,
      bmi: { not: null },
      teamMemberships: { none: { leftAt: null } },
    },
    orderBy: { bmi: "asc" },
    select: { id: true, bmi: true },
  });

  if (unmatchedUsers.length === 0) {
    return { placed: 0, newTeams: 0 };
  }

  const existingOpenTeams = await prisma.team.findMany({
    where: { formationType: "solo", status: "matching" },
    include: {
      memberships: {
        where: { leftAt: null },
        include: { user: { select: { bmi: true } } },
      },
    },
  });

  const openTeams: OpenTeamState[] = existingOpenTeams.map((team) => ({
    teamId: team.id,
    capacity: team.capacity,
    memberBmis: team.memberships
      .map((m) => m.user.bmi)
      .filter((v): v is number => v !== null),
  }));

  let placed = 0;
  let newTeams = 0;

  for (const user of unmatchedUsers) {
    const bmi = user.bmi as number;

    const candidate = openTeams.find(
      (team) =>
        team.memberBmis.length < team.capacity &&
        Math.abs(bmi - averageBmi(team.memberBmis)) <= toleranceRange,
    );

    if (candidate) {
      await prisma.teamMembership.create({ data: { teamId: candidate.teamId, userId: user.id } });
      candidate.memberBmis.push(bmi);
      placed += 1;
      continue;
    }

    const newTeam = await prisma.team.create({
      data: { formationType: "solo", status: "matching" },
    });
    await prisma.teamMembership.create({ data: { teamId: newTeam.id, userId: user.id } });
    openTeams.push({ teamId: newTeam.id, capacity: newTeam.capacity, memberBmis: [bmi] });
    placed += 1;
    newTeams += 1;
  }

  for (const team of openTeams) {
    if (team.memberBmis.length >= team.capacity) {
      await prisma.team.update({ where: { id: team.teamId }, data: { status: "active" } });
    }
  }

  return { placed, newTeams };
}
