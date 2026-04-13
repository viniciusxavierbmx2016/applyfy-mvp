-- CreateTable: Workspace
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "loginBgColor" TEXT,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add workspaceId to User (nullable, STUDENT-only)
ALTER TABLE "User" ADD COLUMN "workspaceId" TEXT;
CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add workspaceId to Course (add nullable, backfill, then enforce NOT NULL)
ALTER TABLE "Course" ADD COLUMN "workspaceId" TEXT;

-- Backfill: create a legacy workspace per ADMIN/PRODUCER so existing courses can be assigned.
-- We pick the first ADMIN as owner of the legacy workspace and attach all orphan courses to it.
DO $$
DECLARE
    legacy_owner_id TEXT;
    legacy_ws_id TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM "Course") THEN
        SELECT "id" INTO legacy_owner_id FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1;
        IF legacy_owner_id IS NULL THEN
            SELECT "id" INTO legacy_owner_id FROM "User" WHERE "role" = 'PRODUCER' ORDER BY "createdAt" ASC LIMIT 1;
        END IF;
        IF legacy_owner_id IS NULL THEN
            RAISE EXCEPTION 'Cannot backfill Course.workspaceId: no ADMIN or PRODUCER user exists';
        END IF;

        legacy_ws_id := gen_random_uuid()::text;
        INSERT INTO "Workspace" ("id", "slug", "name", "ownerId", "isActive", "createdAt", "updatedAt")
            VALUES (legacy_ws_id, 'legacy', 'Legacy Workspace', legacy_owner_id, true, NOW(), NOW());

        UPDATE "Course" SET "workspaceId" = legacy_ws_id WHERE "workspaceId" IS NULL;
    END IF;
END $$;

ALTER TABLE "Course" ALTER COLUMN "workspaceId" SET NOT NULL;
CREATE INDEX "Course_workspaceId_idx" ON "Course"("workspaceId");
ALTER TABLE "Course" ADD CONSTRAINT "Course_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add workspaceId to WebhookLog (nullable; historical logs may have no workspace)
ALTER TABLE "WebhookLog" ADD COLUMN "workspaceId" TEXT;
CREATE INDEX "WebhookLog_workspaceId_idx" ON "WebhookLog"("workspaceId");
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
