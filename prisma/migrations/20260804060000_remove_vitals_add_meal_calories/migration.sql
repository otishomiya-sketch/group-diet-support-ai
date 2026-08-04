-- DropForeignKey
ALTER TABLE "StepRecord" DROP CONSTRAINT IF EXISTS "StepRecord_userId_fkey";
ALTER TABLE "VitalThresholdSetting" DROP CONSTRAINT IF EXISTS "VitalThresholdSetting_userId_fkey";
ALTER TABLE "VitalThresholdEvent" DROP CONSTRAINT IF EXISTS "VitalThresholdEvent_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "StepRecord";
DROP TABLE IF EXISTS "VitalThresholdSetting";
DROP TABLE IF EXISTS "VitalThresholdEvent";

-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN "estimatedCalories" INTEGER,
ADD COLUMN "foodDescription" TEXT;
