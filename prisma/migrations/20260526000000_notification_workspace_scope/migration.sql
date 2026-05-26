-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "workspaceId" TEXT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Notification_userId_workspaceId_idx" ON "Notification"("userId", "workspaceId");
