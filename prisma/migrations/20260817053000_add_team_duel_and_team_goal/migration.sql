CREATE TABLE "TeamDuel" (
    "id" TEXT NOT NULL,
    "challengerTeamId" TEXT NOT NULL,
    "opponentTeamId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "stakeDescription" TEXT,
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "winnerTeamId" TEXT,
    "challengerRatePercent" DOUBLE PRECISION,
    "opponentRatePercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TeamDuel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamDuelParticipant" (
    "id" TEXT NOT NULL,
    "teamDuelId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startWeightEncrypted" TEXT NOT NULL,
    "endWeightEncrypted" TEXT,

    CONSTRAINT "TeamDuelParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamGoal" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "targetAchievementRate" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "stakeDescription" TEXT,
    "status" TEXT NOT NULL,
    "achieved" BOOLEAN,
    "finalAchievementRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TeamGoal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamDuel_challengerTeamId_status_idx" ON "TeamDuel"("challengerTeamId", "status");
CREATE INDEX "TeamDuel_opponentTeamId_status_idx" ON "TeamDuel"("opponentTeamId", "status");
CREATE INDEX "TeamDuelParticipant_teamDuelId_idx" ON "TeamDuelParticipant"("teamDuelId");
CREATE INDEX "TeamGoal_teamId_status_idx" ON "TeamGoal"("teamId", "status");

ALTER TABLE "TeamDuel" ADD CONSTRAINT "TeamDuel_challengerTeamId_fkey" FOREIGN KEY ("challengerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamDuel" ADD CONSTRAINT "TeamDuel_opponentTeamId_fkey" FOREIGN KEY ("opponentTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamDuelParticipant" ADD CONSTRAINT "TeamDuelParticipant_teamDuelId_fkey" FOREIGN KEY ("teamDuelId") REFERENCES "TeamDuel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamGoal" ADD CONSTRAINT "TeamGoal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
