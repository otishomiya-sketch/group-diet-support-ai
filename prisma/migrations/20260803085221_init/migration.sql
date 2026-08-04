-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "lineUserIdHash" TEXT,
    "lineUserIdEncrypted" TEXT,
    "heightEncrypted" TEXT NOT NULL,
    "genderEncrypted" TEXT NOT NULL,
    "birthDateEncrypted" TEXT NOT NULL,
    "currentWeightEncrypted" TEXT NOT NULL,
    "targetWeightEncrypted" TEXT NOT NULL,
    "activityLevel" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "bmi" DOUBLE PRECISION,
    "bmrCache" DOUBLE PRECISION,
    "bmiDisplayOptIn" BOOLEAN NOT NULL DEFAULT false,
    "weightShareOptOut" BOOLEAN NOT NULL DEFAULT false,
    "weightReportFrequency" TEXT NOT NULL DEFAULT 'daily',
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
    "agreedToTermsAt" TIMESTAMP(3),
    "agreedToWeightShareDisclosure" BOOLEAN NOT NULL DEFAULT false,
    "agreedToWeightShareDisclosureAt" TIMESTAMP(3),
    "agencyReferralCode" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "imageUrl" TEXT,
    "weightValueEncrypted" TEXT,
    "weightDeltaEncrypted" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "formationType" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 8,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMembership" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flagType" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "actionTaken" TEXT,
    "detectionContext" JSONB,

    CONSTRAINT "SafetyFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StagnationState" (
    "userId" TEXT NOT NULL,
    "consecutiveNonLoss" INTEGER NOT NULL DEFAULT 0,
    "stage1FiredAt" TIMESTAMP(3),
    "stage2FiredAt" TIMESTAMP(3),
    "stage2FireCount" INTEGER NOT NULL DEFAULT 0,
    "lastReportedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StagnationState_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "messageType" TEXT NOT NULL,
    "rawOutput" TEXT NOT NULL,
    "filteredOutput" TEXT NOT NULL,
    "filterFlags" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "StepRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "stepCount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalThresholdSetting" (
    "userId" TEXT NOT NULL,
    "heartRateUpperBound" INTEGER,
    "heartRateLowerBound" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VitalThresholdSetting_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "VitalThresholdEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "boundType" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalThresholdEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_lineUserIdHash_key" ON "User"("lineUserIdHash");

-- CreateIndex
CREATE INDEX "User_bmi_idx" ON "User"("bmi");

-- CreateIndex
CREATE INDEX "User_agencyReferralCode_idx" ON "User"("agencyReferralCode");

-- CreateIndex
CREATE INDEX "CheckIn_userId_type_createdAt_idx" ON "CheckIn"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Team_status_idx" ON "Team"("status");

-- CreateIndex
CREATE INDEX "TeamMembership_userId_leftAt_idx" ON "TeamMembership"("userId", "leftAt");

-- CreateIndex
CREATE INDEX "TeamMembership_teamId_leftAt_idx" ON "TeamMembership"("teamId", "leftAt");

-- CreateIndex
CREATE INDEX "SafetyFlag_userId_flagType_idx" ON "SafetyFlag"("userId", "flagType");

-- CreateIndex
CREATE INDEX "SafetyFlag_actionTaken_idx" ON "SafetyFlag"("actionTaken");

-- CreateIndex
CREATE INDEX "CoachMessage_userId_messageType_idx" ON "CoachMessage"("userId", "messageType");

-- CreateIndex
CREATE INDEX "CoachMessage_teamId_messageType_idx" ON "CoachMessage"("teamId", "messageType");

-- CreateIndex
CREATE UNIQUE INDEX "StepRecord_userId_date_source_key" ON "StepRecord"("userId", "date", "source");

-- CreateIndex
CREATE INDEX "VitalThresholdEvent_userId_metric_idx" ON "VitalThresholdEvent"("userId", "metric");

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyFlag" ADD CONSTRAINT "SafetyFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagnationState" ADD CONSTRAINT "StagnationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepRecord" ADD CONSTRAINT "StepRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalThresholdSetting" ADD CONSTRAINT "VitalThresholdSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalThresholdEvent" ADD CONSTRAINT "VitalThresholdEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
