-- Add optional support contact fields to Workspace. Purely additive: both are
-- nullable, no existing row changes, and no code reads them yet.
-- They fill the gap between Course (already has supportEmail/supportWhatsapp)
-- and the owner's personal User.phone, which is what students currently see
-- when a course has no contact of its own. Precedence becomes:
-- course -> workspace -> owner. Empty workspace fields keep today's behaviour.
-- Applied to production via raw SQL and recorded with `migrate resolve --applied`
-- (migrate deploy is banned while the Fatia A migration is pending/untracked).

ALTER TABLE "Workspace" ADD COLUMN "supportEmail"    TEXT;
ALTER TABLE "Workspace" ADD COLUMN "supportWhatsapp" TEXT;
