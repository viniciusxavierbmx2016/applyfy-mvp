-- Add optional expiration date to enrollments
ALTER TABLE "Enrollment" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "Enrollment_expiresAt_idx" ON "Enrollment"("expiresAt");
