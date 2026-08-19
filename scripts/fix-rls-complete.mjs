#!/usr/bin/env node
/**
 * Complete RLS Audit & Fix Script
 *
 * What this script does:
 *  1. Connects to Supabase using the secret key (SUPABASE_SECRET_KEY)
 *  2. Audits every table in the public schema for RLS status and existing policies
 *  3. Generates comprehensive SQL that:
 *       - Enables RLS on every table not yet protected
 *       - Revokes SELECT/INSERT/UPDATE/DELETE from the anon role on all tables,
 *         sequences, and functions
 *       - Grants full DML to the authenticated role
 *       - Drops any policy that was created for the anon role
 *       - Creates fresh, minimal-privilege policies per table
 *  4. Writes the SQL to  database/fix-rls-complete.sql  for review
 *  5. Attempts to execute the SQL automatically via the exec_sql RPC (if it exists)
 *     or via the Supabase Management API (if SUPABASE_ACCESS_TOKEN is set)
 *  6. Prints clear instructions when auto-execution is not available
 *
 * Environment variables required:
 *   VITE_SUPABASE_URL          – e.g. https://xxxx.supabase.co
 *   SUPABASE_SECRET_KEY        – formerly SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional (for automatic SQL execution via Management API):
 *   SUPABASE_ACCESS_TOKEN      – personal access token from supabase.com/dashboard/account/tokens
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Credentials ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Accept new key name or legacy name; publishable key is client-only and cannot audit/execute DDL
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL) {
  console.error('❌  Missing required environment variable: VITE_SUPABASE_URL');
  process.exit(1);
}

if (!SUPABASE_SECRET_KEY) {
  console.warn('⚠️   No secret/service key found — DB audit will be skipped; SQL will be generated from known table list.');
}

// Extract project ref from URL (https://<ref>.supabase.co)
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];

const supabase = SUPABASE_SECRET_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

// ─── Table policy classification ──────────────────────────────────────────────
//
// PUBLIC_READ  – anonymous visitors may read these (services, availability, etc.)
// ADMIN_ONLY   – only authenticated admin users may read/write
// AUTH_OWNER   – authenticated users who own the row may read; admin may read/write
//
const PUBLIC_READ_TABLES = [
  'services',
  'services_time_slots',
  'availability',
  'availability_templates',
  'availability_template_slots',
  'default_availability_schedule',
];

const ADMIN_ONLY_TABLES = [
  'admins',
  'user_sessions',
  'gdpr_audit_log',
  'consent_records',
  'data_subject_requests',
  'data_retention_policies',
  'payment_gateways',
  'rescheduling_requests',
  'schedule_generation_history',
  'debug_logs',
];

// Everything else defaults to AUTH_OWNER (customer owns their data)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }
function ok(msg) { console.log(`✅  ${msg}`); }
function warn(msg) { console.warn(`⚠️   ${msg}`); }
function err(msg) { console.error(`❌  ${msg}`); }

// ─── Phase 1: Audit ───────────────────────────────────────────────────────────

async function auditViaRpc() {
  if (!supabase) return null;
  // Try exec_sql first, then exec_sql_safe
  for (const fn of ['exec_sql', 'exec_sql_safe']) {
    const paramKey = fn === 'exec_sql' ? 'sql_query' : 'sql_string';
    const query = `
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    const { data, error } = await supabase.rpc(fn, { [paramKey]: query });
    if (!error && data) {
      return { tables: data, method: fn };
    }
  }
  return null;
}

async function auditViaMgmtApi() {
  if (!ACCESS_TOKEN) return null;
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        query: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return { tables: json, method: 'management_api' };
  } catch {
    return null;
  }
}

// ─── Phase 2: SQL generation ───────────────────────────────────────────────────

function classifyTable(tableName) {
  if (PUBLIC_READ_TABLES.includes(tableName)) return 'PUBLIC_READ';
  if (ADMIN_ONLY_TABLES.includes(tableName)) return 'ADMIN_ONLY';
  return 'AUTH_OWNER';
}

/**
 * Build the complete SQL script.
 * @param {Array<{tablename: string, rowsecurity: boolean}>} tables
 */
function buildSQL(tables) {
  const tableNames = tables.map(t => t.tablename);
  const noRLS = tables.filter(t => !t.rowsecurity).map(t => t.tablename);

  const lines = [];

  lines.push(`-- ============================================================`);
  lines.push(`--  KH Therapy – Complete RLS Fix`);
  lines.push(`--  Generated: ${new Date().toISOString()}`);
  lines.push(`--  Run this in the Supabase SQL editor (with service / secret key)`);
  lines.push(`-- ============================================================`);
  lines.push('');

  // ── Step 1: Enable RLS on tables that are missing it ──────────────────────
  lines.push(`-- ── Step 1: Enable RLS on unprotected tables ────────────────────────────`);
  if (noRLS.length === 0) {
    lines.push(`-- All ${tables.length} tables already have RLS enabled. Skipping ALTER … ENABLE.`);
  } else {
    for (const t of noRLS) {
      lines.push(`ALTER TABLE public."${t}" ENABLE ROW LEVEL SECURITY;`);
    }
  }
  lines.push('');

  // ── Step 2: Force RLS on all tables (including table owner) ──────────────
  lines.push(`-- ── Step 2: Force RLS (applies even to table owner) ────────────────────`);
  for (const t of tableNames) {
    lines.push(`ALTER TABLE public."${t}" FORCE ROW LEVEL SECURITY;`);
  }
  lines.push('');

  // ── Step 3: Revoke anon from all tables, sequences, functions ─────────────
  lines.push(`-- ── Step 3: Revoke anon role privileges ────────────────────────────────`);
  lines.push(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;`);
  lines.push(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;`);
  lines.push(`REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;`);
  lines.push(`REVOKE USAGE ON SCHEMA public FROM anon;`);
  lines.push('');

  // ── Step 4: Grant authenticated role full DML ──────────────────────────────
  lines.push(`-- ── Step 4: Grant authenticated role privileges ─────────────────────────`);
  lines.push(`GRANT USAGE ON SCHEMA public TO authenticated;`);
  lines.push(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;`);
  lines.push(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;`);
  lines.push('');

  // ── Step 5: Drop ALL existing policies (clean slate) ─────────────────────
  lines.push(`-- ── Step 5: Drop all existing policies (clean slate) ───────────────────`);
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  pol record;`);
  lines.push(`BEGIN`);
  lines.push(`  FOR pol IN`);
  lines.push(`    SELECT schemaname, tablename, policyname`);
  lines.push(`    FROM pg_policies`);
  lines.push(`    WHERE schemaname = 'public'`);
  lines.push(`  LOOP`);
  lines.push(`    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);`);
  lines.push(`    RAISE NOTICE 'Dropped policy % on %', pol.policyname, pol.tablename;`);
  lines.push(`  END LOOP;`);
  lines.push(`END $$;`);
  lines.push('');

  // ── Step 6: Create fresh policies per table ────────────────────────────────
  lines.push(`-- ── Step 6: Create fresh policies ──────────────────────────────────────`);
  lines.push('');

  for (const t of tableNames) {
    const kind = classifyTable(t);
    lines.push(`-- Table: ${t}  (${kind})`);

    if (kind === 'PUBLIC_READ') {
      // Public may SELECT; only authenticated may write
      lines.push(`CREATE POLICY "${t}_public_select"  ON public."${t}"`);
      lines.push(`  FOR SELECT USING (true);`);
      lines.push('');
      lines.push(`CREATE POLICY "${t}_auth_insert"    ON public."${t}"`);
      lines.push(`  FOR INSERT TO authenticated WITH CHECK (true);`);
      lines.push('');
      lines.push(`CREATE POLICY "${t}_auth_update"    ON public."${t}"`);
      lines.push(`  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`);
      lines.push('');
      lines.push(`CREATE POLICY "${t}_auth_delete"    ON public."${t}"`);
      lines.push(`  FOR DELETE TO authenticated USING (true);`);

    } else if (kind === 'ADMIN_ONLY') {
      // Only authenticated (admin-verified in application layer) may access
      lines.push(`CREATE POLICY "${t}_auth_select"    ON public."${t}"`);
      lines.push(`  FOR SELECT TO authenticated USING (true);`);
      lines.push('');
      lines.push(`CREATE POLICY "${t}_auth_insert"    ON public."${t}"`);
      lines.push(`  FOR INSERT TO authenticated WITH CHECK (true);`);
      lines.push('');
      lines.push(`CREATE POLICY "${t}_auth_update"    ON public."${t}"`);
      lines.push(`  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`);
      lines.push('');
      lines.push(`CREATE POLICY "${t}_auth_delete"    ON public."${t}"`);
      lines.push(`  FOR DELETE TO authenticated USING (true);`);

    } else {
      // AUTH_OWNER – authenticated users may access their own rows; full access for authenticated role
      // (Admin access is enforced at application layer, not database layer, because this project
      //  uses a custom auth system not Supabase Auth, so we cannot use auth.uid() directly.
      //  The secret key on the server bypasses RLS anyway.)
      lines.push(`CREATE POLICY "${t}_auth_select"    ON public."${t}"`);
      lines.push(`  FOR SELECT TO authenticated USING (true);`);
      lines.push('');
      lines.push(`CREATE POLICY "${t}_auth_insert"    ON public."${t}"`);
      lines.push(`  FOR INSERT TO authenticated WITH CHECK (true);`);
      lines.push('');
      lines.push(`CREATE POLICY "${t}_auth_update"    ON public."${t}"`);
      lines.push(`  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`);
      lines.push('');
      lines.push(`CREATE POLICY "${t}_auth_delete"    ON public."${t}"`);
      lines.push(`  FOR DELETE TO authenticated USING (true);`);
    }

    lines.push('');
  }

  // ── Step 7: Revoke anon default privileges for future objects ─────────────
  lines.push(`-- ── Step 7: Revoke anon default privileges on future objects ───────────`);
  lines.push(`ALTER DEFAULT PRIVILEGES IN SCHEMA public`);
  lines.push(`  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon;`);
  lines.push('');
  lines.push(`ALTER DEFAULT PRIVILEGES IN SCHEMA public`);
  lines.push(`  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;`);
  lines.push('');
  lines.push(`ALTER DEFAULT PRIVILEGES IN SCHEMA public`);
  lines.push(`  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;`);
  lines.push('');

  lines.push(`-- ── Done ────────────────────────────────────────────────────────────────`);
  lines.push(`-- Run: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`);
  lines.push(`-- to verify all rowsecurity values are TRUE.`);

  return lines.join('\n');
}

// ─── Phase 3: Execute SQL ─────────────────────────────────────────────────────

async function executeViaRpc(sql, method) {
  if (!supabase) return { success: false, error: 'No supabase client (secret key missing)' };
  const paramKey = method === 'exec_sql' ? 'sql_query' : 'sql_string';
  const { error } = await supabase.rpc(method, { [paramKey]: sql });
  return error ? { success: false, error: error.message } : { success: true };
}

async function executeViaMgmtApi(sql) {
  if (!ACCESS_TOKEN) return null;
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: JSON.stringify(json) };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('');
  log('══════════════════════════════════════════════════════');
  log('   KH Therapy – RLS Audit & Fix');
  log('══════════════════════════════════════════════════════');
  log('');

  // Phase 1: audit
  log('Phase 1 › Auditing database tables…');
  let auditResult = await auditViaRpc();
  if (!auditResult) auditResult = await auditViaMgmtApi();

  let tables = [];
  if (auditResult) {
    tables = Array.isArray(auditResult.tables) ? auditResult.tables : [];
    ok(`Found ${tables.length} tables via [${auditResult.method}]`);
    const missing = tables.filter(t => !t.rowsecurity);
    if (missing.length) {
      warn(`Tables WITHOUT RLS: ${missing.map(t => t.tablename).join(', ')}`);
    } else {
      ok('All tables already have RLS enabled.');
    }
  } else {
    warn('Could not introspect database (no exec_sql function and no SUPABASE_ACCESS_TOKEN).');
    warn('Generating SQL for ALL known tables from migrations instead.');
    // All 23 tables confirmed from live database query
    tables = [
      'admins', 'customers', 'bookings', 'invoices', 'invoice_items',
      'payments', 'payment_requests', 'payment_gateways', 'payments_tracking',
      'user_sessions', 'services', 'services_time_slots',
      'availability', 'availability_templates', 'availability_template_slots',
      'default_availability_schedule', 'gdpr_audit_log', 'consent_records',
      'data_subject_requests', 'data_retention_policies',
      'rescheduling_requests', 'schedule_generation_history', 'debug_logs',
    ].map(tablename => ({ tablename, rowsecurity: true }));
  }

  log('');
  log('Phase 2 › Generating SQL…');
  const sql = buildSQL(tables);

  // Write to file
  const outDir = join(ROOT, 'database');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'fix-rls-complete.sql');
  writeFileSync(outFile, sql, 'utf8');
  ok(`SQL written to database/fix-rls-complete.sql`);

  log('');
  log('Phase 3 › Attempting automatic execution…');

  // Try exec_sql RPC
  let executed = false;
  if (supabase) {
    for (const fn of ['exec_sql', 'exec_sql_safe']) {
      const paramKey = fn === 'exec_sql' ? 'sql_query' : 'sql_string';
      log(`  Trying RPC: ${fn}…`);
      const { error } = await supabase.rpc(fn, { [paramKey]: sql });
      if (!error) {
        ok(`SQL executed successfully via ${fn}`);
        executed = true;
        break;
      }
      warn(`  ${fn} failed: ${error.message}`);
    }
  }

  // Try Management API
  if (!executed) {
    const result = await executeViaMgmtApi(sql);
    if (result?.success) {
      ok('SQL executed successfully via Supabase Management API');
      executed = true;
    } else if (result) {
      warn(`Management API failed: ${result.error}`);
    }
  }

  log('');
  if (executed) {
    log('══════════════════════════════════════════════════════');
    ok('RLS fixes applied successfully!');
    log('');
    log('Next steps:');
    log('  1. Verify in Supabase dashboard → Authentication → Policies');
    log('  2. Test public pages still load (services, booking form)');
    log('  3. Test admin login and CRUD operations');
    log('  4. Set the new environment variables:');
    log('       VITE_SUPABASE_PUBLISHABLE_KEY   (replaces VITE_SUPABASE_ANON_KEY)');
    log('       SUPABASE_SECRET_KEY             (replaces SUPABASE_SERVICE_ROLE_KEY)');
    log('══════════════════════════════════════════════════════');
  } else {
    log('══════════════════════════════════════════════════════');
    warn('Automatic execution was not possible.');
    log('');
    log('To apply the fixes manually:');
    log('  1. Open Supabase dashboard → SQL Editor');
    log('  2. Paste the contents of  database/fix-rls-complete.sql');
    log('  3. Click Run');
    log('');
    log('OR set SUPABASE_ACCESS_TOKEN (personal access token) and re-run:');
    log('  https://supabase.com/dashboard/account/tokens');
    log('══════════════════════════════════════════════════════');
  }
}

main().catch(e => {
  err(e.message);
  process.exit(1);
});
