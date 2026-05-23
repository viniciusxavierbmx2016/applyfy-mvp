-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonProgress_lessonId_completed_idx" ON "LessonProgress"("lessonId", "completed");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonProgress_lessonId_completedAt_idx" ON "LessonProgress"("lessonId", "completedAt");
