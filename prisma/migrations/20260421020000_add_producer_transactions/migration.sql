-- CreateTable
CREATE TABLE "ProducerTransaction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "courseId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "externalId" TEXT,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProducerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProducerTransaction_externalId_key" ON "ProducerTransaction"("externalId");

-- CreateIndex
CREATE INDEX "ProducerTransaction_workspaceId_idx" ON "ProducerTransaction"("workspaceId");

-- CreateIndex
CREATE INDEX "ProducerTransaction_status_idx" ON "ProducerTransaction"("status");

-- CreateIndex
CREATE INDEX "ProducerTransaction_createdAt_idx" ON "ProducerTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "ProducerTransaction" ADD CONSTRAINT "ProducerTransaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
