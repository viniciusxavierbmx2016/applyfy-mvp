-- CreateTable
CREATE TABLE "IntegrationRequest" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationRequest_createdAt_idx" ON "IntegrationRequest"("createdAt");
