import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hlmqgghrrmvstbmvwsni.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbXFnZ2hycm12c3RibXZ3c25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzU0MTgsImV4cCI6MjA2ODc1MTQxOH0.3qjmIl_2T9sJR71uuo_QM58t2gyAoF-6HnVCdfBgj6o'
);

async function addColumns() {
  try {
    console.log('🔄 Adding temp password columns...');

    // Add the columns using individual ALTER statements
    const alterStatements = [
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS password VARCHAR(255) NULL',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN DEFAULT false',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true',
      'ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE NULL'
    ];

    for (const statement of alterStatements) {
      console.log(`Executing: ${statement}`);
      const { error } = await supabase.rpc('exec_raw_sql', { sql: statement });
      if (error) {
        console.error(`❌ Error with statement "${statement}":`, error);
      } else {
        console.log('✅ Statement executed successfully');
      }
    }

    // Check final column structure
    console.log('\n🔍 Checking final column structure...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);

    if (customersError) {
      console.error('❌ Customers check error:', customersError);
    } else {
      console.log('✅ Sample customer record:', customers[0]);
      console.log('📋 Available columns:', Object.keys(customers[0] || {}));
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

addColumns();
