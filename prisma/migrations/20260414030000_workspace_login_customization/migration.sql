ALTER TABLE "Workspace"
  ADD COLUMN "loginLayout" TEXT NOT NULL DEFAULT 'central',
  ADD COLUMN "loginBgImageUrl" TEXT,
  ADD COLUMN "loginPrimaryColor" TEXT DEFAULT '#3b82f6',
  ADD COLUMN "loginLogoUrl" TEXT,
  ADD COLUMN "loginTitle" TEXT,
  ADD COLUMN "loginSubtitle" TEXT;

ALTER TABLE "Workspace" ALTER COLUMN "loginBgColor" SET DEFAULT '#0f172a';
