-- Add favicon, forceTheme and customDomain fields to Workspace.
ALTER TABLE "Workspace" ADD COLUMN "faviconUrl" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "forceTheme" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "customDomain" TEXT;
CREATE UNIQUE INDEX "Workspace_customDomain_key" ON "Workspace"("customDomain");
