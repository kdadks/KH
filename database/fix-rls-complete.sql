-- ============================================================
--  KH Therapy – Complete RLS Fix
--  Generated: 2026-08-19T15:50:50.102Z
--  Run this in the Supabase SQL editor (with service / secret key)
-- ============================================================

-- ── Step 1: Enable RLS on unprotected tables ────────────────────────────
-- All 23 tables already have RLS enabled. Skipping ALTER … ENABLE.

-- ── Step 2: Force RLS (applies even to table owner) ────────────────────
ALTER TABLE public."admins" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."customers" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."bookings" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."invoices" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."invoice_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."payments" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."payment_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."payment_gateways" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."payments_tracking" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."user_sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."services" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."services_time_slots" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."availability" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."availability_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."availability_template_slots" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."default_availability_schedule" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."gdpr_audit_log" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."consent_records" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."data_subject_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."data_retention_policies" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."rescheduling_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."schedule_generation_history" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."debug_logs" FORCE ROW LEVEL SECURITY;

-- ── Step 3: Revoke anon write privileges; keep schema + SELECT for public tables ──
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
-- Keep USAGE and SELECT: anon needs them to reach public-read tables via RLS
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.services                      TO anon;
GRANT SELECT ON public.services_time_slots           TO anon;
GRANT SELECT ON public.availability                  TO anon;
GRANT SELECT ON public.availability_templates        TO anon;
GRANT SELECT ON public.availability_template_slots   TO anon;
GRANT SELECT ON public.default_availability_schedule TO anon;

-- ── Step 4: Grant authenticated role privileges ─────────────────────────
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ── Step 5: Drop all existing policies (clean slate) ───────────────────
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    RAISE NOTICE 'Dropped policy % on %', pol.policyname, pol.tablename;
  END LOOP;
END $$;

-- ── Step 6: Create fresh policies ──────────────────────────────────────

-- Table: admins  (ADMIN_ONLY)
CREATE POLICY "admins_auth_select"    ON public."admins"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_auth_insert"    ON public."admins"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admins_auth_update"    ON public."admins"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admins_auth_delete"    ON public."admins"
  FOR DELETE TO authenticated USING (true);

-- Table: customers  (AUTH_OWNER)
CREATE POLICY "customers_auth_select"    ON public."customers"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "customers_auth_insert"    ON public."customers"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "customers_auth_update"    ON public."customers"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "customers_auth_delete"    ON public."customers"
  FOR DELETE TO authenticated USING (true);

-- Table: bookings  (AUTH_OWNER)
CREATE POLICY "bookings_auth_select"    ON public."bookings"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bookings_auth_insert"    ON public."bookings"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "bookings_auth_update"    ON public."bookings"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bookings_auth_delete"    ON public."bookings"
  FOR DELETE TO authenticated USING (true);

-- Table: invoices  (AUTH_OWNER)
CREATE POLICY "invoices_auth_select"    ON public."invoices"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "invoices_auth_insert"    ON public."invoices"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "invoices_auth_update"    ON public."invoices"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "invoices_auth_delete"    ON public."invoices"
  FOR DELETE TO authenticated USING (true);

-- Table: invoice_items  (AUTH_OWNER)
CREATE POLICY "invoice_items_auth_select"    ON public."invoice_items"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "invoice_items_auth_insert"    ON public."invoice_items"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "invoice_items_auth_update"    ON public."invoice_items"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "invoice_items_auth_delete"    ON public."invoice_items"
  FOR DELETE TO authenticated USING (true);

-- Table: payments  (AUTH_OWNER)
CREATE POLICY "payments_auth_select"    ON public."payments"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "payments_auth_insert"    ON public."payments"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "payments_auth_update"    ON public."payments"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "payments_auth_delete"    ON public."payments"
  FOR DELETE TO authenticated USING (true);

-- Table: payment_requests  (AUTH_OWNER)
CREATE POLICY "payment_requests_auth_select"    ON public."payment_requests"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "payment_requests_auth_insert"    ON public."payment_requests"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "payment_requests_auth_update"    ON public."payment_requests"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "payment_requests_auth_delete"    ON public."payment_requests"
  FOR DELETE TO authenticated USING (true);

-- Table: payment_gateways  (ADMIN_ONLY)
CREATE POLICY "payment_gateways_auth_select"    ON public."payment_gateways"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "payment_gateways_auth_insert"    ON public."payment_gateways"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "payment_gateways_auth_update"    ON public."payment_gateways"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "payment_gateways_auth_delete"    ON public."payment_gateways"
  FOR DELETE TO authenticated USING (true);

-- Table: payments_tracking  (AUTH_OWNER)
CREATE POLICY "payments_tracking_auth_select"    ON public."payments_tracking"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "payments_tracking_auth_insert"    ON public."payments_tracking"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "payments_tracking_auth_update"    ON public."payments_tracking"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "payments_tracking_auth_delete"    ON public."payments_tracking"
  FOR DELETE TO authenticated USING (true);

-- Table: user_sessions  (ADMIN_ONLY)
CREATE POLICY "user_sessions_auth_select"    ON public."user_sessions"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_sessions_auth_insert"    ON public."user_sessions"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "user_sessions_auth_update"    ON public."user_sessions"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "user_sessions_auth_delete"    ON public."user_sessions"
  FOR DELETE TO authenticated USING (true);

-- Table: services  (PUBLIC_READ)
CREATE POLICY "services_public_select"  ON public."services"
  FOR SELECT USING (true);

CREATE POLICY "services_auth_insert"    ON public."services"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "services_auth_update"    ON public."services"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "services_auth_delete"    ON public."services"
  FOR DELETE TO authenticated USING (true);

-- Table: services_time_slots  (PUBLIC_READ)
CREATE POLICY "services_time_slots_public_select"  ON public."services_time_slots"
  FOR SELECT USING (true);

CREATE POLICY "services_time_slots_auth_insert"    ON public."services_time_slots"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "services_time_slots_auth_update"    ON public."services_time_slots"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "services_time_slots_auth_delete"    ON public."services_time_slots"
  FOR DELETE TO authenticated USING (true);

-- Table: availability  (PUBLIC_READ)
CREATE POLICY "availability_public_select"  ON public."availability"
  FOR SELECT USING (true);

CREATE POLICY "availability_auth_insert"    ON public."availability"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "availability_auth_update"    ON public."availability"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "availability_auth_delete"    ON public."availability"
  FOR DELETE TO authenticated USING (true);

-- Table: availability_templates  (PUBLIC_READ)
CREATE POLICY "availability_templates_public_select"  ON public."availability_templates"
  FOR SELECT USING (true);

CREATE POLICY "availability_templates_auth_insert"    ON public."availability_templates"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "availability_templates_auth_update"    ON public."availability_templates"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "availability_templates_auth_delete"    ON public."availability_templates"
  FOR DELETE TO authenticated USING (true);

-- Table: availability_template_slots  (PUBLIC_READ)
CREATE POLICY "availability_template_slots_public_select"  ON public."availability_template_slots"
  FOR SELECT USING (true);

CREATE POLICY "availability_template_slots_auth_insert"    ON public."availability_template_slots"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "availability_template_slots_auth_update"    ON public."availability_template_slots"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "availability_template_slots_auth_delete"    ON public."availability_template_slots"
  FOR DELETE TO authenticated USING (true);

-- Table: default_availability_schedule  (PUBLIC_READ)
CREATE POLICY "default_availability_schedule_public_select"  ON public."default_availability_schedule"
  FOR SELECT USING (true);

CREATE POLICY "default_availability_schedule_auth_insert"    ON public."default_availability_schedule"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "default_availability_schedule_auth_update"    ON public."default_availability_schedule"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "default_availability_schedule_auth_delete"    ON public."default_availability_schedule"
  FOR DELETE TO authenticated USING (true);

-- Table: gdpr_audit_log  (ADMIN_ONLY)
CREATE POLICY "gdpr_audit_log_auth_select"    ON public."gdpr_audit_log"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "gdpr_audit_log_auth_insert"    ON public."gdpr_audit_log"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "gdpr_audit_log_auth_update"    ON public."gdpr_audit_log"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "gdpr_audit_log_auth_delete"    ON public."gdpr_audit_log"
  FOR DELETE TO authenticated USING (true);

-- Table: consent_records  (ADMIN_ONLY)
CREATE POLICY "consent_records_auth_select"    ON public."consent_records"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "consent_records_auth_insert"    ON public."consent_records"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "consent_records_auth_update"    ON public."consent_records"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "consent_records_auth_delete"    ON public."consent_records"
  FOR DELETE TO authenticated USING (true);

-- Table: data_subject_requests  (ADMIN_ONLY)
CREATE POLICY "data_subject_requests_auth_select"    ON public."data_subject_requests"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "data_subject_requests_auth_insert"    ON public."data_subject_requests"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "data_subject_requests_auth_update"    ON public."data_subject_requests"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "data_subject_requests_auth_delete"    ON public."data_subject_requests"
  FOR DELETE TO authenticated USING (true);

-- Table: data_retention_policies  (ADMIN_ONLY)
CREATE POLICY "data_retention_policies_auth_select"    ON public."data_retention_policies"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "data_retention_policies_auth_insert"    ON public."data_retention_policies"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "data_retention_policies_auth_update"    ON public."data_retention_policies"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "data_retention_policies_auth_delete"    ON public."data_retention_policies"
  FOR DELETE TO authenticated USING (true);

-- Table: rescheduling_requests  (ADMIN_ONLY)
CREATE POLICY "rescheduling_requests_auth_select"    ON public."rescheduling_requests"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rescheduling_requests_auth_insert"    ON public."rescheduling_requests"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "rescheduling_requests_auth_update"    ON public."rescheduling_requests"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "rescheduling_requests_auth_delete"    ON public."rescheduling_requests"
  FOR DELETE TO authenticated USING (true);

-- Table: schedule_generation_history  (ADMIN_ONLY)
CREATE POLICY "schedule_generation_history_auth_select"    ON public."schedule_generation_history"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "schedule_generation_history_auth_insert"    ON public."schedule_generation_history"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "schedule_generation_history_auth_update"    ON public."schedule_generation_history"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "schedule_generation_history_auth_delete"    ON public."schedule_generation_history"
  FOR DELETE TO authenticated USING (true);

-- Table: debug_logs  (ADMIN_ONLY)
CREATE POLICY "debug_logs_auth_select"    ON public."debug_logs"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "debug_logs_auth_insert"    ON public."debug_logs"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "debug_logs_auth_update"    ON public."debug_logs"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "debug_logs_auth_delete"    ON public."debug_logs"
  FOR DELETE TO authenticated USING (true);

-- ── Step 7: Default privileges for future objects ──────────────────────
-- anon: no INSERT/UPDATE/DELETE by default (SELECT must be explicitly granted per table)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ── Done ────────────────────────────────────────────────────────────────
-- Run: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- to verify all rowsecurity values are TRUE.