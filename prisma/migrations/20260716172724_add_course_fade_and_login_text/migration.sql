-- AlterTable
ALTER TABLE "Course" ADD COLUMN "courseBannerFadeEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Course" ADD COLUMN "courseBannerFadeColor" TEXT;
ALTER TABLE "Course" ADD COLUMN "courseBannerFadeOpacity" DOUBLE PRECISION DEFAULT 1;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "loginTextColor" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "loginSecondaryTextColor" TEXT;
