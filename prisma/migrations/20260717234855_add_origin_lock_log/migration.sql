-- CreateTable
CREATE TABLE "OriginLockLog" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OriginLockLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OriginLockLog_createdAt_idx" ON "OriginLockLog"("createdAt");

-- CreateIndex
CREATE INDEX "OriginLockLog_path_idx" ON "OriginLockLog"("path");
