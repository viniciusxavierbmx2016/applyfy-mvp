-- Add member customization fields to Course
ALTER TABLE "Course" ADD COLUMN "memberBgColor" TEXT;
ALTER TABLE "Course" ADD COLUMN "memberSidebarColor" TEXT;
ALTER TABLE "Course" ADD COLUMN "memberHeaderColor" TEXT;
ALTER TABLE "Course" ADD COLUMN "memberCardColor" TEXT;
ALTER TABLE "Course" ADD COLUMN "memberPrimaryColor" TEXT;
ALTER TABLE "Course" ADD COLUMN "memberTextColor" TEXT;
ALTER TABLE "Course" ADD COLUMN "memberAccentColor" TEXT;
ALTER TABLE "Course" ADD COLUMN "memberWelcomeText" TEXT;
ALTER TABLE "Course" ADD COLUMN "memberLayoutStyle" TEXT DEFAULT 'netflix';

-- Remove member customization fields from Workspace
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "memberBgColor";
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "memberSidebarColor";
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "memberHeaderColor";
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "memberCardColor";
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "memberPrimaryColor";
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "memberTextColor";
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "memberAccentColor";
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "memberBannerUrl";
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "memberWelcomeText";
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "memberLayoutStyle";
