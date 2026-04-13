-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PRODUCER';

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "Course_ownerId_idx" ON "Course"("ownerId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
