-- Update workspace login theme defaults to a more modern/elegant palette.
ALTER TABLE "Workspace" ALTER COLUMN "loginBgColor" SET DEFAULT '#0a0a1a';
ALTER TABLE "Workspace" ALTER COLUMN "loginPrimaryColor" SET DEFAULT '#6366f1';
ALTER TABLE "Workspace" ALTER COLUMN "loginBoxColor" SET DEFAULT '#1a1a2e';
ALTER TABLE "Workspace" ALTER COLUMN "loginBoxOpacity" SET DEFAULT 0.85;
ALTER TABLE "Workspace" ALTER COLUMN "loginSideColor" SET DEFAULT '#0a0a1a';
ALTER TABLE "Workspace" ALTER COLUMN "loginLinkColor" SET DEFAULT '#818cf8';
