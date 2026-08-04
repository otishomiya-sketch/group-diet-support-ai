-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyIndividualSupport" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyScheduled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyTeamShare" BOOLEAN NOT NULL DEFAULT true;
