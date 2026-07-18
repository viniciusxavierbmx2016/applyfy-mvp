-- DropIndex
DROP INDEX "CourseExternalProduct_workspaceId_externalProductId_key";

-- AlterTable: dimensão `gateway`. `ADD COLUMN ... DEFAULT 'applyfy'` já backfilla os rows
-- existentes no Postgres; o UPDATE abaixo é o backfill EXPLÍCITO (defensivo — intenção clara,
-- garante 'applyfy' nos mapeamentos que já vendem, independente do default).
ALTER TABLE "CourseExternalProduct" ADD COLUMN     "gateway" TEXT NOT NULL DEFAULT 'applyfy';
UPDATE "CourseExternalProduct" SET "gateway" = 'applyfy';

-- CreateTable
CREATE TABLE "WorkspaceGatewaySecret" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Principal',
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "WorkspaceGatewaySecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceGatewaySecret_workspaceId_gateway_idx" ON "WorkspaceGatewaySecret"("workspaceId", "gateway");

-- CreateIndex (unique novo — sobre os rows já backfillados p/ 'applyfy')
CREATE UNIQUE INDEX "CourseExternalProduct_workspaceId_gateway_externalProductId_key" ON "CourseExternalProduct"("workspaceId", "gateway", "externalProductId");

-- AddForeignKey
ALTER TABLE "WorkspaceGatewaySecret" ADD CONSTRAINT "WorkspaceGatewaySecret_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
