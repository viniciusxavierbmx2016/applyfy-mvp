-- CreateTable
CREATE TABLE "CourseExternalProduct" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseExternalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseExternalProduct_externalProductId_workspaceId_idx" ON "CourseExternalProduct"("externalProductId", "workspaceId");

-- CreateIndex
CREATE INDEX "CourseExternalProduct_courseId_idx" ON "CourseExternalProduct"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseExternalProduct_workspaceId_externalProductId_key" ON "CourseExternalProduct"("workspaceId", "externalProductId");

-- AddForeignKey
ALTER TABLE "CourseExternalProduct" ADD CONSTRAINT "CourseExternalProduct_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseExternalProduct" ADD CONSTRAINT "CourseExternalProduct_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: copy each course's existing single externalProductId into the
-- new table. The old Course.externalProductId is globally @unique, so there are
-- no per-workspace duplicates to violate the new unique constraint.
INSERT INTO "CourseExternalProduct" ("id", "courseId", "externalProductId", "workspaceId", "createdAt")
SELECT gen_random_uuid(), "id", "externalProductId", "workspaceId", now()
FROM "Course"
WHERE "externalProductId" IS NOT NULL;
