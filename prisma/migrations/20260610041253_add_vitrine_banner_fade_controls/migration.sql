-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "vitrineBannerFadeEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Workspace" ADD COLUMN "vitrineBannerFadeColor" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "vitrineBannerFadeOpacity" DOUBLE PRECISION DEFAULT 1;
