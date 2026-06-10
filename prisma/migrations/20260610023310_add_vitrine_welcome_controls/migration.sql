-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "vitrineWelcomeTitle" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "vitrineWelcomeEnabled" BOOLEAN NOT NULL DEFAULT true;
