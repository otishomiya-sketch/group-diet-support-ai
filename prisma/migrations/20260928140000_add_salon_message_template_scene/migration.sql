-- AlterTable
ALTER TABLE "SalonMessageTemplate" ADD COLUMN "scene" TEXT NOT NULL DEFAULT 'general';

-- CreateIndex
CREATE INDEX "SalonMessageTemplate_salonId_scene_idx" ON "SalonMessageTemplate"("salonId", "scene");
