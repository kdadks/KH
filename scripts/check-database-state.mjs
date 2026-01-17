import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.log('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking Database State...\n');

async function checkTableStructure(tableName) {
  console.log(`\n📋 Checking table: ${tableName}`);
  console.log('='.repeat(60));
  
  try {
    // Get a sample row to understand the structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`❌ Error querying ${tableName}:`, error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log(`✅ Table exists with columns:`);
      Object.keys(data[0]).forEach(column => {
        const value = data[0][column];
        const type = typeof value;
        console.log(`   - ${column}: ${type} ${value === null ? '(null)' : ''}`);
      });
    } else {
      console.log(`⚠️  Table exists but is empty`);
      // Try to get structure anyway
      const { data: emptyData, error: emptyError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      if (!emptyError) {
        console.log(`   Columns: Unable to determine from empty table`);
      }
    }
  } catch (err) {
    console.error(`❌ Unexpected error checking ${tableName}:`, err.message);
  }
}

async function checkTableCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`   Record count: ${count || 0}`);
    }
  } catch (err) {
    // Ignore count errors
  }
}

async function main() {
  console.log('📊 Database State Check\n');
  
  // Check key tables
  const tables = [
    'customers',
    'bookings',
    'services',
    'availability',
    'payments',
    'payment_requests'
  ];
  
  for (const table of tables) {
    await checkTableStructure(table);
    await checkTableCount(table);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Database state check complete!\n');
  
  // Check for specific fields we need
  console.log('\n🔎 Checking for visit-type related fields...\n');
  
  // Check if services table has visit_type field
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .limit(1);
  
  if (services && services.length > 0) {
    const hasVisitType = 'visit_type' in services[0];
    console.log(`   services.visit_type: ${hasVisitType ? '✅ EXISTS' : '❌ MISSING'}`);
  }
  
  // Check if customers table has zipcode/eircode field
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .limit(1);
  
  if (customers && customers.length > 0) {
    const hasEircode = 'eircode' in customers[0];
    const hasZipcode = 'zipcode' in customers[0];
    console.log(`   customers.eircode: ${hasEircode ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   customers.zipcode: ${hasZipcode ? '✅ EXISTS' : '❌ MISSING'}`);
  }
  
  // Check if bookings table has visit_type field
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .limit(1);
  
  if (bookings && bookings.length > 0) {
    const hasVisitType = 'visit_type' in bookings[0];
    console.log(`   bookings.visit_type: ${hasVisitType ? '✅ EXISTS' : '❌ MISSING'}`);
  }
  
  console.log('\n');
}

main().catch(console.error);
