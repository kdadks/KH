#!/usr/bin/env node
/**
 * Database RLS Status Checker
 * Queries the actual database to determine current RLS configuration
 * Independent of documentation - shows real state
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

/**
 * Execute raw SQL using Supabase's SQL API
 */
async function executeSQL(query) {
  try {
    const { data, error } = await supabase.rpc('exec_sql_safe', { 
      sql_string: query 
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    // Fallback: Try direct query via Postgres REST API
    return { data: null, error: err.message };
  }
}

/**
 * Query to check which tables have RLS enabled
 */
const RLS_STATUS_QUERY = `
  SELECT 
    tablename,
    rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
`;

/**
 * Query to list all RLS policies
 */
const RLS_POLICIES_QUERY = `
  SELECT 
    tablename,
    policyname,
    cmd as policy_type
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
`;

/**
 * Check RLS on specific important tables
 */
async function checkTableRLS() {
  const importantTables = [
    'customers',
    'bookings',
    'invoices',
    'payments',
    'payment_requests',
    'admins',
    'user_sessions',
    'gdpr_audit_log'
  ];

  const results = {};

  for (const table of importantTables) {
    try {
      // Try to query the table - if RLS is enabled with no policies, it will fail
      const { data, error } = await supabase
        .from(table)
        .select('COUNT(*)', { count: 'exact', head: true })
        .limit(0);

      if (error) {
        // RLS is likely enabled
        if (error.message.includes('violates row level security policy')) {
          results[table] = { rls: true, accessible: false };
        } else {
          results[table] = { rls: false, accessible: true, error: error.message };
        }
      } else {
        results[table] = { rls: false, accessible: true };
      }
    } catch (err) {
      results[table] = { rls: false, accessible: true, error: err.message };
    }
  }

  return results;
}

/**
 * Check if RLS helper functions exist
 */
async function checkHelperFunctions() {
  const helpers = {
    is_admin: false,
    current_customer_id: false
  };

  // Try to call each function
  try {
    const { error } = await supabase.rpc('is_admin');
    if (!error || !error.message.includes('does not exist')) {
      helpers.is_admin = true;
    }
  } catch (err) {
    // Function not found or other error
  }

  try {
    const { error } = await supabase.rpc('current_customer_id');
    if (!error || !error.message.includes('does not exist')) {
      helpers.current_customer_id = true;
    }
  } catch (err) {
    // Function not found or other error
  }

  return helpers;
}

async function checkRLSStatus() {
  console.log('🔍 Checking Database RLS Status...\n');
  console.log(`📍 Database: ${supabaseUrl.split('://')[1].split('.')[0]}\n`);

  try {
    // 1. Check RLS status on important tables
    console.log('=' .repeat(70));
    console.log('1️⃣  TABLE RLS STATUS');
    console.log('=' .repeat(70));

    const tableStatus = await checkTableRLS();

    const hasRls = Object.values(tableStatus).some(t => t.rls);
    const rpsEnabledCount = Object.values(tableStatus).filter(t => t.rls).length;
    const rpsDisabledCount = Object.values(tableStatus).length - rpsEnabledCount;

    console.log(`\n📊 Summary: ${rpsEnabledCount} tables with RLS, ${rpsDisabledCount} tables without RLS\n`);

    console.log('🔒 Tables WITH RLS enabled:');
    const enabledTables = Object.entries(tableStatus).filter(([_, t]) => t.rls);
    if (enabledTables.length > 0) {
      enabledTables.forEach(([table, _]) => {
        console.log(`   ✅ ${table}`);
      });
    } else {
      console.log('   (none)');
    }

    console.log('\n🔓 Tables WITHOUT RLS (public access):');
    const disabledTables = Object.entries(tableStatus).filter(([_, t]) => !t.rls);
    if (disabledTables.length > 0) {
      disabledTables.forEach(([table, status]) => {
        console.log(`   ❌ ${table} ${status.error ? `(${status.error})` : ''}`);
      });
    } else {
      console.log('   (none)');
    }

    // 2. Check helper functions
    console.log('\n' + '=' .repeat(70));
    console.log('2️⃣  RLS HELPER FUNCTIONS');
    console.log('=' .repeat(70));

    const helpers = await checkHelperFunctions();

    if (helpers.is_admin || helpers.current_customer_id) {
      console.log('\n✅ Found helper functions:\n');
      if (helpers.is_admin) console.log('   ✅ is_admin()');
      if (helpers.current_customer_id) console.log('   ✅ current_customer_id()');
    } else {
      console.log('\n⚠️  No RLS helper functions found');
    }

    // 3. Final Status Report
    console.log('\n' + '=' .repeat(70));
    console.log('📊 FINAL STATUS REPORT');
    console.log('=' .repeat(70));

    const hasHelpers = helpers.is_admin && helpers.current_customer_id;

    console.log(`\n🔒 RLS Enabled on Tables:        ${hasRls ? '✅ YES' : '❌ NO'}`);
    console.log(`⚙️  Helper Functions Present:     ${hasHelpers ? '✅ YES' : '❌ NO'}`);

    if (hasRls && hasHelpers) {
      console.log(`\n🎯 CONCLUSION: RLS is FULLY IMPLEMENTED in database\n`);
      console.log('✅ Database is secured with Row Level Security');
    } else if (hasRls || hasHelpers) {
      console.log(`\n🚧 CONCLUSION: RLS is PARTIALLY IMPLEMENTED\n`);
      console.log('⚠️  Some RLS components are missing:');
      if (!hasRls) console.log('   - RLS not enabled on sensitive tables');
      if (!hasHelpers) console.log('   - Helper functions not deployed');
    } else {
      console.log(`\n❌ CONCLUSION: RLS is NOT IMPLEMENTED\n`);
      console.log('⚠️  Database has no RLS protection');
      console.log('   All authenticated users can access all data');
      console.log('   Run "npm run implement-rls" to implement RLS');
    }

    console.log('\n' + '=' .repeat(70));
    console.log('\n📋 DETAILED TABLE STATUS:\n');
    Object.entries(tableStatus).forEach(([table, status]) => {
      console.log(`  ${status.rls ? '🔒' : '🔓'} ${table}: ${status.rls ? 'RLS ENABLED' : 'No RLS'}`);
    });
    console.log('\n' + '=' .repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify VITE_SUPABASE_URL is correct');
    console.error('2. Verify SUPABASE_SERVICE_ROLE_KEY is valid (not anon key)');
    console.error('3. Check database connection');
    process.exit(1);
  }
}

// Run the check
checkRLSStatus().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
