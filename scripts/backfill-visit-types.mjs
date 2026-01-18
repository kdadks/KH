import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillVisitTypes() {
  console.log('=== STARTING VISIT TYPE BACKFILL ===\n');

  // Get all active services
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, visit_type')
    .eq('is_active', true);

  if (servicesError) {
    console.error('Error fetching services:', servicesError);
    return;
  }

  console.log(`Found ${services.length} active services\n`);

  // Get all bookings with 'clinic' visit_type (the default)
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, package_name, visit_type');

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    return;
  }

  console.log(`Found ${bookings.length} total bookings\n`);

  // Track updates
  let updatedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;
  const updates = [];

  // Process each booking
  for (const booking of bookings) {
    // Skip if already has a non-clinic visit_type
    if (booking.visit_type && booking.visit_type !== 'clinic') {
      skippedCount++;
      continue;
    }

    // Extract base service name from package_name
    // Example: "Sports / Deep Tissue Massage - In Hour (€60)" -> "Sports / Deep Tissue Massage"
    let baseName = booking.package_name;
    
    // Remove pricing suffixes
    baseName = baseName.replace(/\s*-\s*(In Hour|Out of Hour)\s*\([^)]+\)\s*$/i, '');
    baseName = baseName.trim();

    // Find matching service
    const matchedService = services.find(s => {
      // Exact match
      if (s.name === baseName) return true;
      
      // Case-insensitive match
      if (s.name.toLowerCase() === baseName.toLowerCase()) return true;
      
      // Check if booking package starts with service name
      if (booking.package_name.toLowerCase().startsWith(s.name.toLowerCase())) return true;
      
      return false;
    });

    if (matchedService && matchedService.visit_type) {
      updates.push({
        bookingId: booking.id,
        packageName: booking.package_name,
        newVisitType: matchedService.visit_type,
        matchedService: matchedService.name
      });
    } else {
      notFoundCount++;
      console.log(`⚠️  No match found for: "${booking.package_name}"`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total bookings: ${bookings.length}`);
  console.log(`To be updated: ${updates.length}`);
  console.log(`Already correct: ${skippedCount}`);
  console.log(`No match found: ${notFoundCount}`);

  if (updates.length > 0) {
    console.log(`\n=== PERFORMING UPDATES ===\n`);

    // Group updates by visit_type for easier monitoring
    const byVisitType = updates.reduce((acc, u) => {
      acc[u.newVisitType] = (acc[u.newVisitType] || 0) + 1;
      return acc;
    }, {});

    console.log('Updates by visit type:');
    console.log(byVisitType);
    console.log('');

    // Perform updates
    for (const update of updates) {
      const { error } = await supabase
        .from('bookings')
        .update({ visit_type: update.newVisitType })
        .eq('id', update.bookingId);

      if (error) {
        console.error(`❌ Error updating booking ${update.bookingId}:`, error);
      } else {
        updatedCount++;
        console.log(`✅ Updated: "${update.packageName}" -> ${update.newVisitType} (matched: ${update.matchedService})`);
      }
    }

    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Successfully updated: ${updatedCount} bookings`);
    console.log(`Failed: ${updates.length - updatedCount}`);
  } else {
    console.log('\n✅ No updates needed - all bookings already have correct visit types');
  }
}

backfillVisitTypes().catch(console.error);
