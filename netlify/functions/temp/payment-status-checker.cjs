const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get SumUp API configuration from environment or database
 */
const getSumUpConfig = async () => {
  try {
    // Try to get from database first
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('api_key, merchant_id, environment')
      .eq('provider', 'sumup')
      .eq('is_active', true)
      .single();

    if (!error && data) {
      return {
        apiKey: data.api_key,
        merchantId: data.merchant_id,
        environment: data.environment || 'sandbox'
      };
    }
  } catch (error) {
    console.warn('Failed to get SumUp config from database:', error);
  }

  // Fallback to environment variables
  return {
    apiKey: process.env.SUMUP_API_KEY || process.env.VITE_SUMUP_API_KEY,
    merchantId: process.env.SUMUP_MERCHANT_CODE || process.env.VITE_SUMUP_MERCHANT_CODE,
    environment: process.env.SUMUP_ENVIRONMENT || process.env.VITE_SUMUP_ENVIRONMENT || 'sandbox'
  };
};

/**
 * Get checkout status from SumUp API
 */
const getSumUpCheckoutStatus = async (checkoutId) => {
  const config = await getSumUpConfig();
  
  if (!config.apiKey) {
    throw new Error('SumUp API key not configured');
  }

  const apiBase = config.environment === 'production' 
    ? 'https://api.sumup.com' 
    : 'https://api.sumup.com'; // Same endpoint for both

  const response = await fetch(`${apiBase}/v0.1/checkouts/${checkoutId}`, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`SumUp API error: ${response.status} - ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Process payment status from SumUp response
 */
const processPaymentStatusUpdate = async (checkoutData, paymentRequest) => {
  const {
    id: checkoutId,
    status,
    amount,
    currency = 'EUR',
    transactions = []
  } = checkoutData;

  const transaction = transactions[0]; // Get first transaction
  const transactionId = transaction?.transaction_code || transaction?.id || `sumup_${Date.now()}`;

  let paymentStatus;
  let paymentRequestStatus;
  
  switch (status?.toUpperCase()) {
    case 'PAID':
      paymentStatus = 'paid';
      paymentRequestStatus = 'paid';
      break;
    case 'FAILED':
      paymentStatus = 'failed';
      paymentRequestStatus = 'pending'; // Keep request active for retry
      break;
    case 'CANCELLED':
      paymentStatus = 'cancelled';
      paymentRequestStatus = 'pending'; // Keep request active
      break;
    default:
      paymentStatus = 'processing';
      paymentRequestStatus = 'sent';
  }

  console.log(`Processing status update for checkout ${checkoutId}:`, {
    status,
    paymentStatus,
    paymentRequestStatus,
    transactionId
  });

  // Create or update payment record
  const paymentRecord = {
    customer_id: paymentRequest.customer_id,
    booking_id: paymentRequest.booking_id,
    payment_request_id: paymentRequest.id,
    sumup_transaction_id: transactionId,
    sumup_checkout_id: checkoutId,
    amount: amount || paymentRequest.amount,
    currency: currency,
    status: paymentStatus,
    payment_method: 'sumup',
    sumup_payment_type: 'card',
    payment_date: paymentStatus === 'paid' ? new Date().toISOString() : null,
    notes: `Status polling update: ${status}`,
    last_status_check: new Date().toISOString()
  };

  // Check if payment record exists
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('payment_request_id', paymentRequest.id)
    .single();

  if (existingPayment) {
    // Only update if status changed
    if (existingPayment.status !== paymentStatus) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          ...paymentRecord,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPayment.id);

      if (updateError) throw updateError;
      console.log(`Payment ${existingPayment.id} updated: ${existingPayment.status} → ${paymentStatus}`);
    }
  } else {
    // Create new payment record
    const { error: insertError } = await supabase
      .from('payments')
      .insert(paymentRecord);

    if (insertError) throw insertError;
    console.log('New payment record created from polling');
  }

  // Update payment request
  const { error: requestUpdateError } = await supabase
    .from('payment_requests')
    .update({
      status: paymentRequestStatus,
      paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
      last_webhook_at: new Date().toISOString(), // Use this for polling updates too
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentRequest.id);

  if (requestUpdateError) throw requestUpdateError;

  // Update booking if payment successful
  if (paymentStatus === 'paid' && paymentRequest.booking_id) {
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequest.booking_id);

    if (bookingError) {
      console.error('Failed to update booking payment status:', bookingError);
    }
  }

  return {
    success: true,
    paymentStatus,
    paymentRequestStatus,
    shouldStopPolling: paymentStatus === 'paid' || paymentStatus === 'failed'
  };
};

/**
 * Check payments that need status polling
 */
const checkPendingPayments = async () => {
  console.log('🔍 Checking pending payments for status updates...');

  try {
    // Get payment status checks that are due
    const { data: statusChecks, error: checksError } = await supabase
      .from('payment_status_checks')
      .select(`
        *,
        payment_request:payment_request_id (
          id, customer_id, booking_id, amount, status, sumup_checkout_id
        )
      `)
      .eq('status', 'active')
      .lte('next_check_at', new Date().toISOString())
      .lt('check_count', supabase.raw('max_checks'))
      .order('next_check_at', { ascending: true })
      .limit(10); // Process 10 at a time

    if (checksError) {
      console.error('Failed to fetch pending checks:', checksError);
      return { success: false, error: checksError.message };
    }

    if (!statusChecks || statusChecks.length === 0) {
      console.log('No pending payment checks found');
      return { success: true, processed: 0 };
    }

    console.log(`Found ${statusChecks.length} payments to check`);
    let processed = 0;
    let completed = 0;
    let failed = 0;

    for (const check of statusChecks) {
      try {
        const paymentRequest = check.payment_request;
        
        if (!paymentRequest || !check.checkout_id) {
          console.warn(`Invalid check data for ID ${check.id}`);
          continue;
        }

        console.log(`Checking payment status for checkout: ${check.checkout_id}`);
        
        // Get status from SumUp API
        const checkoutData = await getSumUpCheckoutStatus(check.checkout_id);
        
        // Process the status update
        const result = await processPaymentStatusUpdate(checkoutData, paymentRequest);
        
        // Update the status check record
        const nextCheckDelay = Math.min(6 * Math.pow(1.5, check.check_count), 60); // Exponential backoff, max 60 min
        const nextCheckAt = new Date(Date.now() + nextCheckDelay * 60 * 1000);
        
        const updateData = {
          check_count: check.check_count + 1,
          last_sumup_status: checkoutData.status,
          updated_at: new Date().toISOString()
        };

        if (result.shouldStopPolling) {
          updateData.status = 'completed';
          updateData.next_check_at = null;
          completed++;
        } else {
          updateData.next_check_at = nextCheckAt.toISOString();
        }

        const { error: updateError } = await supabase
          .from('payment_status_checks')
          .update(updateData)
          .eq('id', check.id);

        if (updateError) {
          console.error(`Failed to update status check ${check.id}:`, updateError);
        }

        processed++;
        
        // Add delay between API calls to avoid rate limiting
        if (processed < statusChecks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Failed to check payment ${check.checkout_id}:`, error);
        failed++;
        
        // Mark check as failed if too many failures
        const failureCount = (check.failure_count || 0) + 1;
        
        if (failureCount >= 5) {
          await supabase
            .from('payment_status_checks')
            .update({
              status: 'failed',
              failure_count: failureCount,
              last_error: error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', check.id);
        } else {
          // Retry later with exponential backoff
          const retryDelay = Math.min(30 * Math.pow(2, failureCount), 120); // Max 2 hours
          const retryAt = new Date(Date.now() + retryDelay * 60 * 1000);
          
          await supabase
            .from('payment_status_checks')
            .update({
              check_count: check.check_count + 1,
              failure_count: failureCount,
              next_check_at: retryAt.toISOString(),
              last_error: error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', check.id);
        }
      }
    }

    console.log(`✅ Payment polling completed: ${processed} processed, ${completed} completed, ${failed} failed`);
    return {
      success: true,
      processed,
      completed,
      failed
    };

  } catch (error) {
    console.error('❌ Payment polling failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Initialize payment status checking for a new checkout
 */
const initializePaymentStatusCheck = async (paymentRequestId, checkoutId) => {
  try {
    const { error } = await supabase
      .from('payment_status_checks')
      .insert({
        payment_request_id: paymentRequestId,
        checkout_id: checkoutId,
        next_check_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // First check in 2 minutes
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    
    console.log(`Payment status checking initialized for checkout: ${checkoutId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Failed to initialize payment status check:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Netlify function handler for scheduled payment status checking
 */
exports.handler = async (event, context) => {
  console.log('Payment status checker invoked');

  // Handle different HTTP methods
  if (event.httpMethod === 'POST') {
    // Manual trigger or initialization
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      
      if (body.action === 'initialize' && body.paymentRequestId && body.checkoutId) {
        const result = await initializePaymentStatusCheck(body.paymentRequestId, body.checkoutId);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        };
      }
      
      // Default to checking pending payments
      const result = await checkPendingPayments();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      };
      
    } catch (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: error.message })
      };
    }
  }

  // For scheduled invocation (cron)
  if (event.httpMethod === undefined || event.httpMethod === 'GET') {
    const result = await checkPendingPayments();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};