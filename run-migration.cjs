const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = 'https://bxzayfmzhuhxhjbtxwhu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4emF5Zm16aHVoeGhqYnR4d2h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzQ4NjgwNCwiZXhwIjoyMDM5MDYyODA0fQ.dYShfn5qpQ7A1Pu_M0cFU9LwFu1gEvdN9TvOCE6hHFE';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'add-temp-password-support.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔄 Running temp password migration...\n');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Migration error:', error);
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('📋 Result:', data);
    }
    
    // Test by checking the updated columns
    console.log('\n🔍 Verifying columns were added...');
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'customers')
      .eq('table_schema', 'public')
      .in('column_name', ['temp_password', 'password_change_required', 'must_change_password', 'first_login', 'last_login']);
    
    if (columnError) {
      console.error('❌ Column check error:', columnError);
    } else {
      console.log('✅ New columns found:', columns.map(c => c.column_name));
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

runMigration();
