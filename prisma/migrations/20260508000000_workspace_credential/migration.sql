-- CreateTable
CREATE TABLE "WorkspaceCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "resetToken" TEXT,
    "resetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceCredential_workspaceId_idx" ON "WorkspaceCredential"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceCredential_resetToken_idx" ON "WorkspaceCredential"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceCredential_userId_workspaceId_key" ON "WorkspaceCredential"("userId", "workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceCredential" ADD CONSTRAINT "WorkspaceCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceCredential" ADD CONSTRAINT "WorkspaceCredential_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
