-- Rename hasCertificate -> certificateEnabled
ALTER TABLE "Course" RENAME COLUMN "hasCertificate" TO "certificateEnabled";

-- Add new feature flag columns
ALTER TABLE "Course" ADD COLUMN "communityEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Course" ADD COLUMN "lessonCommentsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Course" ADD COLUMN "reviewsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Course" ADD COLUMN "gamificationEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Course" ADD COLUMN "showStudentCount" BOOLEAN NOT NULL DEFAULT false;
