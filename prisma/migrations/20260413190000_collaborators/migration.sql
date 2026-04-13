-- Add COLLABORATOR value to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COLLABORATOR';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CollaboratorStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "permissions" TEXT[],
    "courseIds" TEXT[],
    "status" "CollaboratorStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Collaborator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Collaborator_workspaceId_email_key" ON "Collaborator"("workspaceId", "email");
CREATE INDEX "Collaborator_userId_idx" ON "Collaborator"("userId");
CREATE INDEX "Collaborator_status_idx" ON "Collaborator"("status");

ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
