/**
 * Debug script to check payment records and identify duplicate payment issue
 */

const { createClient } = require('@supabase/supabase-js');

const checkPaymentRecords = async () => {
  try {
    // Initialize Supabase (using same logic as the function)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
    
    console.log('🔗 Connecting to Supabase...');
    console.log('URL configured:', !!supabaseUrl);
    console.log('Key configured:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Missing Supabase configuration');
      console.log('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check recent payments
    console.log('\n📊 RECENT PAYMENTS ANALYSIS:');
    
    const { data: recentPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError);
      return;
    }
    
    console.log(`Found ${recentPayments?.length || 0} recent payments:`);
    
    recentPayments?.forEach((payment, index) => {
      console.log(`\n${index + 1}. Payment ID: ${payment.id}`);
      console.log(`   Amount: ${payment.amount} ${payment.currency || 'EUR'}`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Payment Method: ${payment.payment_method}`);
      console.log(`   Payment Request ID: ${payment.payment_request_id}`);
      console.log(`   SumUp Checkout Ref: ${payment.sumup_checkout_reference || 'Not set'}`);
      console.log(`   SumUp Checkout ID: ${payment.sumup_checkout_id || 'Not set'}`);
      console.log(`   SumUp Transaction ID: ${payment.sumup_transaction_id || 'Not set'}`);
      console.log(`   Webhook Processed: ${payment.webhook_processed_at || 'Not processed'}`);
      console.log(`   SumUp Event Type: ${payment.sumup_event_type || 'Not set'}`);
      console.log(`   SumUp Event ID: ${payment.sumup_event_id || 'Not set'}`);
      console.log(`   Created: ${payment.created_at}`);
      console.log(`   Updated: ${payment.updated_at}`);
    });
    
    // Check for duplicates by payment_request_id
    console.log('\n🔍 DUPLICATE ANALYSIS:');
    
    const { data: duplicateCheck, error: dupError } = await supabase
      .from('payments')
      .select('payment_request_id, count(*)')
      .not('payment_request_id', 'is', null)
      .group('payment_request_id')
      .having('count(*)', 'gt', 1);
    
    if (dupError) {
      console.error('❌ Error checking duplicates:', dupError);
    } else if (duplicateCheck && duplicateCheck.length > 0) {
      console.log('⚠️ Found payment_request_ids with multiple payments:');
      duplicateCheck.forEach(dup => {
        console.log(`   Payment Request ${dup.payment_request_id}: ${dup.count} payments`);
      });
      
      // Get detailed info for duplicates
      for (const dup of duplicateCheck) {
        console.log(`\n📋 Details for payment_request_id ${dup.payment_request_id}:`);
        
        const { data: dupPayments } = await supabase
          .from('payments')
          .select('*')
          .eq('payment_request_id', dup.payment_request_id)
          .order('created_at', { ascending: true });
        
        dupPayments?.forEach((payment, index) => {
          console.log(`   ${index + 1}. ID: ${payment.id}, Status: ${payment.status}, Created: ${payment.created_at}`);
          console.log(`      Checkout Ref: ${payment.sumup_checkout_reference || 'None'}`);
          console.log(`      Webhook Processed: ${payment.webhook_processed_at ? 'Yes' : 'No'}`);
        });
      }
    } else {
      console.log('✅ No duplicate payments found');
    }
    
    // Check payment_requests
    console.log('\n💳 RECENT PAYMENT REQUESTS:');
    
    const { data: paymentRequests, error: prError } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (prError) {
      console.error('❌ Error fetching payment requests:', prError);
    } else {
      console.log(`Found ${paymentRequests?.length || 0} recent payment requests:`);
      
      paymentRequests?.forEach((pr, index) => {
        console.log(`\n${index + 1}. Payment Request ID: ${pr.id}`);
        console.log(`   Amount: ${pr.amount} ${pr.currency || 'EUR'}`);
        console.log(`   Customer ID: ${pr.customer_id}`);
        console.log(`   Booking ID: ${pr.booking_id}`);
        console.log(`   SumUp Checkout ID: ${pr.sumup_checkout_id || 'Not set'}`);
        console.log(`   Created: ${pr.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
};

console.log('🔍 Starting payment records analysis...');
checkPaymentRecords();