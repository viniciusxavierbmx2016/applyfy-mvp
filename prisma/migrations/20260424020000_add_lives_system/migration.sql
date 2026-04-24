-- CreateTable
CREATE TABLE "Live" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "platform" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "embedUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "recordingUrl" TEXT,
    "thumbnailUrl" TEXT,
    "courseId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Live_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "liveId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveNotification" (
    "id" TEXT NOT NULL,
    "liveId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LiveNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Live_workspaceId_idx" ON "Live"("workspaceId");
CREATE INDEX "Live_courseId_idx" ON "Live"("courseId");
CREATE INDEX "Live_status_idx" ON "Live"("status");
CREATE INDEX "Live_scheduledAt_idx" ON "Live"("scheduledAt");

-- CreateIndex
CREATE INDEX "LiveMessage_liveId_createdAt_idx" ON "LiveMessage"("liveId", "createdAt");
CREATE INDEX "LiveMessage_userId_idx" ON "LiveMessage"("userId");

-- CreateIndex
CREATE INDEX "LiveNotification_liveId_idx" ON "LiveNotification"("liveId");
CREATE INDEX "LiveNotification_userId_read_idx" ON "LiveNotification"("userId", "read");

-- AddForeignKey
ALTER TABLE "Live" ADD CONSTRAINT "Live_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Live" ADD CONSTRAINT "Live_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMessage" ADD CONSTRAINT "LiveMessage_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "Live"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveMessage" ADD CONSTRAINT "LiveMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveNotification" ADD CONSTRAINT "LiveNotification_liveId_fkey" FOREIGN KEY ("liveId") REFERENCES "Live"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveNotification" ADD CONSTRAINT "LiveNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
