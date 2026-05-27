-- CreateTable
CREATE TABLE "WorkspaceApplyfyToken" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Token principal',
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "WorkspaceApplyfyToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceApplyfyToken_workspaceId_idx" ON "WorkspaceApplyfyToken"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceApplyfyToken" ADD CONSTRAINT "WorkspaceApplyfyToken_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: copy each existing Settings row whose key matches
-- 'applyfy_token:<workspaceId>' into the new table. SPLIT_PART(key, ':', 2)
-- extracts the workspaceId from the key. Empty/null values skipped.
INSERT INTO "WorkspaceApplyfyToken" ("id", "workspaceId", "label", "value", "createdAt")
SELECT gen_random_uuid(), SPLIT_PART(key, ':', 2), 'Token principal', value, "updatedAt"
FROM "Settings"
WHERE key LIKE 'applyfy_token:%' AND value IS NOT NULL AND value != '';
