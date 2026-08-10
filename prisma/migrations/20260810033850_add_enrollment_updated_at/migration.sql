-- Add updatedAt to Enrollment, nullable and without a default: adding it NOT NULL
-- without one is rejected outright on a table with 22,974 rows, and a default
-- would stamp today's date on every existing enrolment — a field that lies is
-- worse than a field that is absent.
-- NULL therefore means: created before this migration and never touched since.
-- A new row never lands NULL, because Prisma fills @updatedAt on create just as
-- it does createdAt — the DMMF's isUpdatedAt flag does not distinguish optional
-- from required. Verified against a throwaway database and against 560
-- ProducerTransaction rows in production.
-- No application code changes: all eleven paths that write Enrollment.status
-- start recording the timestamp on their own, including the updateMany in the
-- revoke path (proven on 350 REFUNDED and 11 CHARGED_BACK rows).
-- Applied via raw SQL with SET LOCAL lock_timeout and recorded with
-- `migrate resolve --applied`.

ALTER TABLE "Enrollment" ADD COLUMN "updatedAt" TIMESTAMP(3);
