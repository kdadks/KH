import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hlmqgghrrmvstbmvwsni.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbXFnZ2hycm12c3RibXZ3c25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzU0MTgsImV4cCI6MjA2ODc1MTQxOH0.3qjmIl_2T9sJR71uuo_QM58t2gyAoF-6HnVCdfBgj6o'
);

async function testDatabase() {
  try {
    console.log('🔍 Testing database structure...');
    
    // Test simple bookings query
    console.log('\n1. Testing bookings table...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(2);
    
    if (bookingsError) {
      console.error('❌ Bookings error:', bookingsError);
    } else {
      console.log('✅ Bookings found:', bookings?.length);
      if (bookings && bookings.length > 0) {
        console.log('📊 Sample booking:', bookings[0]);
        console.log('📋 Columns:', Object.keys(bookings[0]));
      }
    }
    
    // Test customers query
    console.log('\n2. Testing customers table...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(2);
    
    if (customersError) {
      console.error('❌ Customers error:', customersError);
    } else {
      console.log('✅ Customers found:', customers?.length);
      if (customers && customers.length > 0) {
        console.log('📊 Sample customer:', customers[0]);
        console.log('📋 Columns:', Object.keys(customers[0]));
      }
    }
    
    // Test simple join
    console.log('\n3. Testing simple join query...');
    const { data: joined, error: joinError } = await supabase
      .from('bookings')
      .select('id, customer_id, service_id, customers(id, first_name, last_name, email)')
      .limit(2);
    
    if (joinError) {
      console.error('❌ Join query error:', joinError);
    } else {
      console.log('✅ Join query successful:', joined?.length, 'results');
      console.log('📊 Join result:', joined);
    }
    
    // Test the exact query from customerBookingUtils
    console.log('\n4. Testing corrected query from utils...');
    const { data: exactQuery, error: exactError } = await supabase
      .from('bookings')
      .select(`
        *,
        customers!bookings_customer_id_fkey(*)
      `)
      .limit(2);
    
    if (exactError) {
      console.error('❌ Exact query error:', exactError);
    } else {
      console.log('✅ Exact query successful:', exactQuery?.length, 'results');
      console.log('📊 Exact result:', JSON.stringify(exactQuery, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Exception:', error);
  }
}

testDatabase();
