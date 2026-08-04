-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ownAgencyCode" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial';

-- CreateIndex
CREATE UNIQUE INDEX "User_ownAgencyCode_key" ON "User"("ownAgencyCode");
