-- New tables from feature/support-system Stage B1 — keep RLS posture consistent.
ALTER TABLE public."SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TicketMessage" ENABLE ROW LEVEL SECURITY;
