-- CreateEnum
CREATE TYPE "WebhookLogStatus" AS ENUM ('SUCCESS', 'ERROR', 'IGNORED');

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "email" TEXT,
    "productExternalId" TEXT,
    "courseId" TEXT,
    "status" "WebhookLogStatus" NOT NULL,
    "errorMessage" TEXT,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookLog_event_createdAt_idx" ON "WebhookLog"("event", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");
