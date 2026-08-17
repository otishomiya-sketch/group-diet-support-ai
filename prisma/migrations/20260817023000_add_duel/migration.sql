CREATE TABLE "Duel" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "challengerUserId" TEXT NOT NULL,
    "opponentUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "challengerStartWeightEncrypted" TEXT,
    "opponentStartWeightEncrypted" TEXT,
    "winnerUserId" TEXT,
    "challengerEndWeightEncrypted" TEXT,
    "opponentEndWeightEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Duel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Duel_teamId_status_idx" ON "Duel"("teamId", "status");
CREATE INDEX "Duel_challengerUserId_status_idx" ON "Duel"("challengerUserId", "status");
CREATE INDEX "Duel_opponentUserId_status_idx" ON "Duel"("opponentUserId", "status");

ALTER TABLE "Duel" ADD CONSTRAINT "Duel_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_challengerUserId_fkey" FOREIGN KEY ("challengerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_opponentUserId_fkey" FOREIGN KEY ("opponentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
