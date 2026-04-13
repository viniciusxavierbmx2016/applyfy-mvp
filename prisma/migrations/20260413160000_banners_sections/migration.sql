ALTER TABLE "Course" ADD COLUMN "bannerUrl" TEXT;
ALTER TABLE "Module" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "Module" ADD COLUMN "sectionId" TEXT;

CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Section_courseId_idx" ON "Section"("courseId");
CREATE INDEX "Module_sectionId_idx" ON "Module"("sectionId");

ALTER TABLE "Section" ADD CONSTRAINT "Section_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Module" ADD CONSTRAINT "Module_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
