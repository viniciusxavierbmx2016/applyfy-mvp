-- CreateEnum
CREATE TYPE "IntegrationRequestStatus" AS ENUM ('PENDING', 'REVIEWING', 'COMPLETED');

-- AlterTable
ALTER TABLE "IntegrationRequest"
  ADD COLUMN "status" "IntegrationRequestStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "IntegrationRequest_status_idx" ON "IntegrationRequest"("status");
