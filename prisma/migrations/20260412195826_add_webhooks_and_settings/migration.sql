-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "externalProductId" TEXT;

-- CreateTable
CREATE TABLE "Settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_externalProductId_key" ON "Course"("externalProductId");
