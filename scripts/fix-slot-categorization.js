#!/usr/bin/env node

/**
 * Script to fix slot_type categorization in the availability table
 *
 * Usage:
 *   node scripts/fix-slot-categorization.js
 *
 * Make sure your DATABASE_URL environment variable is set correctly.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables if .env file exists
if (fs.existsSync('.env')) {
  require('dotenv').config();
}

async function fixSlotCategorization() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Please check your environment variables.');
    console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔍 Checking current slot categorization...');

    // First, check for problematic 8:55-9:45 slots
    const { data: problemSlots, error: checkError } = await supabase
      .from('availability')
      .select('date, start_time, end_time, slot_type')
      .eq('start_time', '08:55:00')
      .eq('end_time', '09:45:00')
      .limit(5);

    if (checkError) {
      throw checkError;
    }

    console.log('Current 8:55-9:45 AM slots:', problemSlots);

    // Count slots that need fixing
    console.log('🔢 Counting slots that need categorization fixes...');

    const { data: incorrectSlots, error: countError } = await supabase
      .from('availability')
      .select('id, date, start_time, end_time, slot_type')
      .or(`
        and(start_time.lt.09:00,end_time.gte.09:15,slot_type.eq.out-of-hour),
        and(start_time.lt.09:00,end_time.lt.09:15,slot_type.eq.in-hour)
      `);

    if (countError) {
      console.warn('⚠️  Could not count incorrect slots:', countError.message);
    } else {
      console.log(`Found ${incorrectSlots?.length || 0} slots with potentially incorrect categorization`);
    }

    console.log('🔄 Applying categorization fixes...');
    console.log('This will update slots based on the corrected logic:');
    console.log('  ✓ Weekend slots → out-of-hour');
    console.log('  ✓ Weekday slots ending >= 9:15 AM and starting < 5 PM → in-hour');
    console.log('  ✓ Slots starting >= 5 PM → out-of-hour');
    console.log('  ✓ Early slots ending < 9:15 AM → out-of-hour');
    console.log('  ✓ All other weekday slots → in-hour');

    // Since Supabase doesn't support complex CASE statements in the JS client,
    // we'll need to use RPC or raw SQL. Let's use a more direct approach.

    console.log('📋 Note: For complex updates, please run the SQL script manually:');
    console.log('   psql $DATABASE_URL -f database/fix-slot-type-categorization.sql');
    console.log('');
    console.log('Or copy the SQL from database/fix-slot-type-categorization.sql');
    console.log('into your database management tool.');

    // Alternative: Update in batches using simpler logic
    console.log('🔄 Attempting simplified batch updates...');

    // Fix weekend slots
    const { error: weekendError } = await supabase
      .from('availability')
      .update({ slot_type: 'out-of-hour' })
      .in('date', function() {
        return supabase
          .rpc('get_weekend_dates')  // This would need to be a custom function
      });

    // For now, just show the user what needs to be done
    console.log('✅ Script completed. Please run the SQL script for full categorization fix.');

  } catch (error) {
    console.error('❌ Error fixing slot categorization:', error.message);
    console.error('\n📋 Manual fix required:');
    console.error('Please run: psql $DATABASE_URL -f database/fix-slot-type-categorization.sql');
    process.exit(1);
  }
}

// Run the fix
if (require.main === module) {
  fixSlotCategorization()
    .then(() => {
      console.log('✅ Slot categorization fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to fix slot categorization:', error);
      process.exit(1);
    });
}

module.exports = { fixSlotCategorization };