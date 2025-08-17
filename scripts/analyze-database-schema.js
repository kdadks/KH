// Script to analyze current database schema and RLS policies
// This will help us understand what tables exist and their current RLS status

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeSchema() {
  console.log('🔍 Analyzing current database schema and RLS policies...\n');

  try {
    // 1. Get all tables in public schema
    console.log('📋 TABLES IN PUBLIC SCHEMA:');
    console.log('=' .repeat(50));
    
    // Try a simpler approach - query known tables directly
    const knownTables = [
      'bookings', 'availability', 'customers', 'invoices', 'invoice_items',
      'payments', 'payment_requests', 'admins', 'user_sessions', 'services',
      'payment_gateways', 'payments_tracking', 'gdpr_audit_log', 'consent_records',
      'services_time_slots'
    ];
    
    console.log('Checking which tables exist in the database...');
    const existingTables = [];
    
    for (const tableName of knownTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          existingTables.push(tableName);
        }
      } catch (err) {
        // Table doesn't exist or no access
      }
    }
    
    const tableNames = existingTables;
    console.log(`Found ${tableNames.length} existing tables:`);
    tableNames.forEach(name => console.log(`  • ${name}`));
    console.log('');

    // 2. Check RLS status by testing access patterns
    console.log('🔒 ROW LEVEL SECURITY STATUS:');
    console.log('=' .repeat(50));
    
    const rlsStatus = [];
    
    for (const tableName of tableNames) {
      try {
        // Try to query the table - if RLS is enabled and no policies allow access,
        // we'll get a permission denied error
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.message.includes('RLS') || error.message.includes('policy') || error.code === '42501') {
            rlsStatus.push({ table: tableName, rls_enabled: true, accessible: false, error: error.message });
          } else {
            rlsStatus.push({ table: tableName, rls_enabled: 'unknown', accessible: false, error: error.message });
          }
        } else {
          // If we can query successfully, either RLS is disabled or there are permissive policies
          rlsStatus.push({ table: tableName, rls_enabled: 'unknown', accessible: true, error: null });
        }
      } catch (err) {
        rlsStatus.push({ table: tableName, rls_enabled: 'unknown', accessible: false, error: err.message });
      }
    }
    
    const accessibleTables = rlsStatus.filter(r => r.accessible);
    const restrictedTables = rlsStatus.filter(r => !r.accessible && r.rls_enabled === true);
    const errorTables = rlsStatus.filter(r => !r.accessible && r.rls_enabled === 'unknown');

    console.log(`✅ ACCESSIBLE TABLES (${accessibleTables.length}):`);
    accessibleTables.forEach(result => {
      console.log(`  • ${result.table} - RLS: ${result.rls_enabled === true ? 'Enabled (with permissive policies)' : 'Likely disabled or permissive'}`);
    });
    console.log('');

    console.log(`🔒 RLS PROTECTED TABLES (${restrictedTables.length}):`);
    restrictedTables.forEach(result => {
      console.log(`  • ${result.table} - Access denied (RLS enabled with restrictive policies)`);
    });
    console.log('');

    if (errorTables.length > 0) {
      console.log(`⚠️  TABLES WITH ERRORS (${errorTables.length}):`);
      errorTables.forEach(result => {
        console.log(`  • ${result.table} - ${result.error}`);
      });
      console.log('');
    }

    // 3. Sample data from accessible tables to understand structure
    console.log('� TABLE STRUCTURE ANALYSIS:');
    console.log('=' .repeat(50));

    for (const result of accessibleTables) {
      const tableName = result.table;
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`  ${tableName}: ${columns.length} columns`);
          console.log(`    Columns: ${columns.join(', ')}`);
          
          // Check for common auth-related columns
          const authColumns = columns.filter(col => 
            col.includes('auth') || col.includes('user_id') || col === 'email'
          );
          if (authColumns.length > 0) {
            console.log(`    Auth-related: ${authColumns.join(', ')}`);
          }
        } else {
          console.log(`  ${tableName}: Empty table or access denied`);
        }
      } catch (err) {
        console.log(`  ${tableName}: Error - ${err.message}`);
      }
      console.log('');
    }

    // 4. Test authentication patterns
    console.log('🔍 AUTHENTICATION SETUP ANALYSIS:');
    console.log('=' .repeat(50));

    // Check if admins table exists and is accessible
    if (tableNames.includes('admins')) {
      try {
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('id, email')
          .limit(5);
        
        if (!adminError && adminData) {
          console.log(`✅ Admins table accessible with ${adminData.length} visible record(s)`);
          if (adminData.length > 0) {
            console.log(`    Sample admin emails: ${adminData.map(a => a.email).join(', ')}`);
          }
        } else {
          console.log(`❌ Admins table exists but access denied: ${adminError?.message}`);
        }
      } catch (err) {
        console.log(`❌ Admins table error: ${err.message}`);
      }
    } else {
      console.log('❌ No admins table found');
    }

    // Check customers table auth integration
    if (tableNames.includes('customers')) {
      try {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id, email, auth_user_id')
          .limit(3);
        
        if (!customerError && customerData) {
          console.log(`✅ Customers table accessible with ${customerData.length} visible record(s)`);
          const hasAuthUserId = customerData.some(c => c.auth_user_id);
          console.log(`    Auth integration: ${hasAuthUserId ? 'Present' : 'Not found'}`);
        } else {
          console.log(`❌ Customers table access denied: ${customerError?.message}`);
        }
      } catch (err) {
        console.log(`❌ Customers table error: ${err.message}`);
      }
    }

    // 5. Summary and recommendations
    console.log('\n� RLS RECOMMENDATIONS:');
    console.log('=' .repeat(50));

    const needsRLS = accessibleTables.filter(t => 
      ['customers', 'payments', 'payment_requests', 'invoices', 'bookings', 'user_sessions'].includes(t.table)
    );

    if (needsRLS.length > 0) {
      console.log('🔧 Sensitive tables that should have RLS enabled:');
      needsRLS.forEach(result => {
        const table = result.table;
        console.log(`  • ${table} - Currently accessible to anon users`);
        
        // Suggest appropriate policies based on table type
        if (table === 'customers') {
          console.log(`    Suggested policies: Users can view/update own data, Admins can view all`);
        } else if (table === 'payments' || table === 'payment_requests') {
          console.log(`    Suggested policies: Users can view own payments, Admins can manage all`);
        } else if (table === 'bookings') {
          console.log(`    Suggested policies: Users can view own bookings, Admins can manage all`);
        } else if (table === 'invoices') {
          console.log(`    Suggested policies: Users can view own invoices, Admins can manage all`);
        } else if (table === 'user_sessions') {
          console.log(`    Suggested policies: Users can manage own sessions, Admins can view all`);
        }
      });
    }

    const publicTables = accessibleTables.filter(t => 
      ['services', 'availability', 'services_time_slots'].includes(t.table)
    );

    if (publicTables.length > 0) {
      console.log('\n✅ Tables that can remain publicly accessible:');
      publicTables.forEach(result => {
        console.log(`  • ${result.table} - Public read access appropriate`);
      });
    }

    const adminTables = accessibleTables.filter(t => 
      ['admins', 'gdpr_audit_log', 'payment_gateways'].includes(t.table)
    );

    if (adminTables.length > 0) {
      console.log('\n🔒 Admin-only tables:');
      adminTables.forEach(result => {
        console.log(`  • ${result.table} - Should be admin-only access`);
      });
    }

  } catch (error) {
    console.error('❌ Error analyzing schema:', error);
  }
}

// Run the analysis
analyzeSchema().then(() => {
  console.log('\n✅ Schema analysis complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
