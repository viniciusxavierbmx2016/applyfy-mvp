-- CreateEnum
CREATE TYPE "ProducerSubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProducerSubscription" (
    "id" TEXT NOT NULL,
    "producerId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "ProducerSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProducerSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProducerSubscription_producerId_createdAt_idx" ON "ProducerSubscription"("producerId", "createdAt");

-- CreateIndex
CREATE INDEX "ProducerSubscription_status_idx" ON "ProducerSubscription"("status");

-- AddForeignKey
ALTER TABLE "ProducerSubscription" ADD CONSTRAINT "ProducerSubscription_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
