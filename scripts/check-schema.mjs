import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('=== CHECKING BOOKINGS TABLE SCHEMA ===\n');

  // Get bookings table columns
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .limit(1);

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
  } else if (bookings && bookings.length > 0) {
    console.log('Bookings table columns:');
    console.log(Object.keys(bookings[0]).sort().join(', '));
    console.log('\nSample booking:');
    console.log(JSON.stringify(bookings[0], null, 2));
  }

  console.log('\n=== CHECKING SERVICES TABLE SCHEMA ===\n');

  // Get services table columns
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .limit(1);

  if (servicesError) {
    console.error('Error fetching services:', servicesError);
  } else if (services && services.length > 0) {
    console.log('Services table columns:');
    console.log(Object.keys(services[0]).sort().join(', '));
    console.log('\nSample service:');
    console.log(JSON.stringify(services[0], null, 2));
  }

  console.log('\n=== CHECKING VISIT_TYPE DISTRIBUTION ===\n');

  // Get all bookings to check visit_type
  const { data: allBookings, error: allError } = await supabase
    .from('bookings')
    .select('visit_type, package_name');

  if (allError) {
    console.error('Error fetching all bookings:', allError);
  } else if (allBookings) {
    const distribution = {};
    allBookings.forEach(b => {
      const vt = b.visit_type || 'NULL';
      distribution[vt] = (distribution[vt] || 0) + 1;
    });
    console.log('Visit type distribution:');
    console.log(distribution);
    
    console.log('\nSample package names:');
    const uniquePackages = [...new Set(allBookings.map(b => b.package_name))].slice(0, 10);
    uniquePackages.forEach(pkg => console.log(`  - ${pkg}`));
  }

  console.log('\n=== CHECKING SERVICES DATA ===\n');

  // Get all services
  const { data: allServices, error: allServicesError } = await supabase
    .from('services')
    .select('id, name, visit_type, is_active')
    .eq('is_active', true);

  if (allServicesError) {
    console.error('Error fetching all services:', allServicesError);
  } else if (allServices) {
    console.log('Active services:');
    allServices.forEach(s => {
      console.log(`  ${s.name} - ${s.visit_type || 'NO VISIT_TYPE'}`);
    });
  }
}

checkSchema().catch(console.error);
