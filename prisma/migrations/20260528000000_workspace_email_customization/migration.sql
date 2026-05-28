-- AlterTable: access-email customization fields on Workspace
ALTER TABLE "Workspace" ADD COLUMN "emailLogoUrl" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "emailPrimaryColor" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "emailBgColor" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "emailTitle" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "emailBody" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "emailFooter" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "emailCustomHtml" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "emailUseCustomHtml" BOOLEAN NOT NULL DEFAULT false;
