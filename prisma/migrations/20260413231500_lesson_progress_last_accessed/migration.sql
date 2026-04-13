-- AlterTable
ALTER TABLE "LessonProgress" ADD COLUMN "lastAccessedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "LessonProgress_userId_lastAccessedAt_idx" ON "LessonProgress"("userId", "lastAccessedAt");
