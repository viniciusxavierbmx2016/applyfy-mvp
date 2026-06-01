-- Explicit onDelete sweep: align FK constraints with schema.prisma.
-- Live module FKs gain ON DELETE CASCADE (consistent with Post.user/Comment.user).
-- No data is deleted — DROP CONSTRAINT only removes the FK to recreate it with CASCADE.
-- Cascades are inert today (no user-delete route; workspace delete is soft).

-- DropForeignKey
ALTER TABLE "Live" DROP CONSTRAINT "Live_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "LiveMessage" DROP CONSTRAINT "LiveMessage_userId_fkey";

-- DropForeignKey
ALTER TABLE "LiveModerator" DROP CONSTRAINT "LiveModerator_userId_fkey";

-- DropForeignKey
ALTER TABLE "LiveNotification" DROP CONSTRAINT "LiveNotification_userId_fkey";

-- AddForeignKey
ALTER TABLE "Live" ADD CONSTRAINT "Live_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMessage" ADD CONSTRAINT "LiveMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveNotification" ADD CONSTRAINT "LiveNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveModerator" ADD CONSTRAINT "LiveModerator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
