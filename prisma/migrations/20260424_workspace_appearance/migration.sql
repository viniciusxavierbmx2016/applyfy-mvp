-- Add workspace appearance fields
ALTER TABLE "Workspace" ADD COLUMN "accentColor" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "bannerUrl" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "bannerPosition" TEXT DEFAULT '{"x":50,"y":50}';

-- Remove dead memberAccentColor from Course
ALTER TABLE "Course" DROP COLUMN IF EXISTS "memberAccentColor";
