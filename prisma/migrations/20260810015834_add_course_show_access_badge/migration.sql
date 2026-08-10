-- Add showAccessBadge to Course. Purely additive: NOT NULL with a default, which
-- PostgreSQL 11+ records in the catalogue without rewriting the table, so no
-- existing row is touched and every course keeps showing the badge.
-- It gates only the two reassuring branches of the card's badge cascade
-- ("Vitalício" and "Liberado"). Expirado, Bloqueado and the countdown are
-- warnings and are never hidden.
-- Every read must be `!== false`, matching showCourseInfoBox: a field missing
-- from an explicit select then falls through to showing the badge, which is the
-- safe side of the failure.
-- Applied to production via raw SQL and recorded with `migrate resolve --applied`.

ALTER TABLE "Course" ADD COLUMN "showAccessBadge" BOOLEAN NOT NULL DEFAULT true;
