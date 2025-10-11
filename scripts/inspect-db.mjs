import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.log('Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectPaymentsTable() {
  console.log('🔍 Inspecting payments table structure...\n');

  try {
    // Get sample data to understand actual structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('payments')
      .select('*')
      .limit(2)
      .order('created_at', { ascending: false });

    if (sampleError) {
      console.error('❌ Error fetching sample data:', sampleError);
    } else {
      console.log('📊 Sample payments data:');
      if (sampleData && sampleData.length > 0) {
        console.log('Columns found:', Object.keys(sampleData[0]));
        console.log('\nSample record:');
        console.log(JSON.stringify(sampleData[0], null, 2));
        
        console.log('\n🏗️  Column types analysis:');
        const sample = sampleData[0];
        Object.entries(sample).forEach(([key, value]) => {
          console.log(`${key}: ${typeof value} ${value === null ? '(NULL)' : `(${value})`}`);
        });
      } else {
        console.log('No sample data found');
      }
    }

    // Check what columns are required (NOT NULL)
    console.log('\n🔍 Testing required fields by attempting minimal insert...');
    
    // Try minimal insert to see what fields are required
    const testInsert = {
      amount: 1.00,
      currency: 'EUR',
      status: 'pending',
      payment_method: 'test'
    };

    const { data: testResult, error: testError } = await supabase
      .from('payments')
      .insert(testInsert)
      .select()
      .single();

    if (testError) {
      console.log('❌ Minimal insert failed (shows required fields):');
      console.log('Error:', testError.message);
      
      // Extract required field from error message
      if (testError.message.includes('null value in column')) {
        const match = testError.message.match(/column "([^"]*)".*not-null constraint/);
        if (match) {
          console.log(`🔴 Required field missing: ${match[1]}`);
        }
      }
    } else {
      console.log('✅ Minimal insert successful:');
      console.log(JSON.stringify(testResult, null, 2));
      
      // Clean up test record
      await supabase.from('payments').delete().eq('id', testResult.id);
      console.log('🧹 Test record cleaned up');
    }

  } catch (error) {
    console.error('❌ Inspection failed:', error);
  }
}

// Run the inspection
inspectPaymentsTable();