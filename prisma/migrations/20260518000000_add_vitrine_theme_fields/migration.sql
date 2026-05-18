-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "vitrineBgColor" TEXT,
ADD COLUMN     "vitrineCardColor" TEXT,
ADD COLUMN     "vitrineHeaderColor" TEXT,
ADD COLUMN     "vitrineLayoutStyle" TEXT DEFAULT 'netflix',
ADD COLUMN     "vitrineSidebarColor" TEXT,
ADD COLUMN     "vitrineTextColor" TEXT,
ADD COLUMN     "vitrineWelcomeText" TEXT;
