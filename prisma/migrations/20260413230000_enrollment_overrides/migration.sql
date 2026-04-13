-- CreateTable
CREATE TABLE "EnrollmentOverride" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "moduleId" TEXT,
    "lessonId" TEXT,
    "released" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentOverride_enrollmentId_moduleId_key" ON "EnrollmentOverride"("enrollmentId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentOverride_enrollmentId_lessonId_key" ON "EnrollmentOverride"("enrollmentId", "lessonId");

-- CreateIndex
CREATE INDEX "EnrollmentOverride_moduleId_idx" ON "EnrollmentOverride"("moduleId");

-- CreateIndex
CREATE INDEX "EnrollmentOverride_lessonId_idx" ON "EnrollmentOverride"("lessonId");

-- AddForeignKey
ALTER TABLE "EnrollmentOverride" ADD CONSTRAINT "EnrollmentOverride_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
