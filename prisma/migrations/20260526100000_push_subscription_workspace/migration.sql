-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN "workspaceId" TEXT;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "PushSubscription_userId_workspaceId_idx" ON "PushSubscription"("userId", "workspaceId");
