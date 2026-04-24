-- AlterTable
ALTER TABLE "Live" ADD COLUMN "roomOpen" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Live" ADD COLUMN "chatEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "LiveModerator" (
    "id" TEXT NOT NULL,
    "liveId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveModerator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveModerator_liveId_idx" ON "LiveModerator"("liveId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveModerator_liveId_userId_key" ON "LiveModerator"("liveId", "userId");

-- AddForeignKey
ALTER TABLE "LiveModerator" ADD CONSTRAINT "LiveModerator_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "Live"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveModerator" ADD CONSTRAINT "LiveModerator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
