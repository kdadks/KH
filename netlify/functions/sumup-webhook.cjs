const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for server-side operations
);

// SumUp webhook secret for signature verification (set in environment)
const SUMUP_WEBHOOK_SECRET = process.env.SUMUP_WEBHOOK_SECRET;

/**
 * Verify SumUp webhook signature
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  if (!secret || !signature) {
    console.warn('Webhook signature verification skipped (missing secret/signature)');
    return true; // Allow in development
  }
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
};

/**
 * Update payment status with retry mechanism
 */
const updatePaymentStatus = async (paymentData, retryCount = 0) => {
  const maxRetries = 3;
  
  try {
    const {
      checkout_reference,
      transaction_id,
      amount,
      status,
      event_type,
      currency = 'EUR',
      payment_method = 'sumup'
    } = paymentData;

    console.log(`Processing payment update (attempt ${retryCount + 1}):`, {
      checkout_reference,
      transaction_id,
      status,
      event_type
    });

    // Find payment request by checkout reference or transaction ID
    let paymentRequest = null;
    
    if (checkout_reference) {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('id, customer_id, booking_id, amount as requested_amount')
        .or(`sumup_checkout_id.eq.${checkout_reference},notes.ilike.%${checkout_reference}%`)
        .single();
      
      if (!error && data) {
        paymentRequest = data;
      }
    }

    // If not found by checkout reference, try to find by amount and recent timestamp
    if (!paymentRequest && amount) {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('id, customer_id, booking_id, amount as requested_amount')
        .eq('amount', amount)
        .eq('status', 'sent')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        paymentRequest = data;
        console.log('Found payment request by amount matching:', paymentRequest.id);
      }
    }

    if (!paymentRequest) {
      throw new Error(`Payment request not found for checkout_reference: ${checkout_reference}`);
    }

    // Determine payment status based on SumUp event
    let paymentStatus;
    let paymentRequestStatus;
    
    switch (event_type) {
      case 'checkout.paid':
      case 'transaction.successful':
        paymentStatus = 'paid';
        paymentRequestStatus = 'paid';
        break;
      case 'checkout.failed':
      case 'transaction.failed':
        paymentStatus = 'failed';
        paymentRequestStatus = 'pending'; // Keep request active for retry
        break;
      case 'checkout.cancelled':
        paymentStatus = 'cancelled';
        paymentRequestStatus = 'pending'; // Keep request active
        break;
      default:
        paymentStatus = 'processing';
        paymentRequestStatus = 'sent';
    }

    // Create or update payment record
    const paymentRecord = {
      customer_id: paymentRequest.customer_id,
      booking_id: paymentRequest.booking_id,
      payment_request_id: paymentRequest.id,
      sumup_transaction_id: transaction_id,
      sumup_checkout_id: checkout_reference,
      amount: amount || paymentRequest.requested_amount,
      currency: currency,
      status: paymentStatus,
      payment_method: payment_method,
      sumup_payment_type: 'card',
      payment_date: paymentStatus === 'paid' ? new Date().toISOString() : null,
      notes: `Webhook update: ${event_type}`,
      webhook_received_at: new Date().toISOString(),
      retry_count: retryCount
    };

    // Insert or update payment
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('payment_request_id', paymentRequest.id)
      .single();

    if (existingPayment) {
      // Update existing payment
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          ...paymentRecord,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPayment.id);

      if (updateError) throw updateError;
      console.log('Payment record updated:', existingPayment.id);
    } else {
      // Create new payment record
      const { error: insertError } = await supabase
        .from('payments')
        .insert(paymentRecord);

      if (insertError) throw insertError;
      console.log('New payment record created for request:', paymentRequest.id);
    }

    // Update payment request status
    const { error: requestUpdateError } = await supabase
      .from('payment_requests')
      .update({
        status: paymentRequestStatus,
        paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequest.id);

    if (requestUpdateError) throw requestUpdateError;

    // If payment successful, update booking status if needed
    if (paymentStatus === 'paid' && paymentRequest.booking_id) {
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRequest.booking_id);

      if (bookingUpdateError) {
        console.error('Failed to update booking payment status:', bookingUpdateError);
        // Don't throw - payment processing succeeded
      }
    }

    console.log('✅ Payment status update completed successfully');
    return { success: true, paymentRequestId: paymentRequest.id };

  } catch (error) {
    console.error(`❌ Payment update failed (attempt ${retryCount + 1}):`, error);
    
    // Implement exponential backoff retry
    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      console.log(`Retrying payment update in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return updatePaymentStatus(paymentData, retryCount + 1);
    } else {
      // Log failed payment update for manual review
      try {
        await supabase
          .from('payment_failures')
          .insert({
            checkout_reference: paymentData.checkout_reference,
            transaction_id: paymentData.transaction_id,
            event_type: paymentData.event_type,
            error_message: error.message,
            retry_count: retryCount,
            webhook_data: JSON.stringify(paymentData),
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('Failed to log payment failure:', logError);
      }
      
      throw error;
    }
  }
};

/**
 * Main webhook handler
 */
exports.handler = async (event, context) => {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-SumUp-Signature',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const signature = event.headers['x-sumup-signature'] || event.headers['X-SumUp-Signature'];
    const body = event.body;
    
    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature, SUMUP_WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    const payload = JSON.parse(body);
    console.log('Received SumUp webhook:', payload);

    // Extract payment data from webhook payload
    const paymentData = {
      event_type: payload.event_type,
      checkout_reference: payload.checkout_reference || payload.data?.checkout_reference,
      transaction_id: payload.transaction_id || payload.data?.transaction_id || payload.data?.id,
      amount: payload.amount || payload.data?.amount,
      currency: payload.currency || payload.data?.currency || 'EUR',
      status: payload.status || payload.data?.status,
      payment_method: 'sumup'
    };

    // Process payment update
    const result = await updatePaymentStatus(paymentData);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        paymentRequestId: result.paymentRequestId
      })
    };

  } catch (error) {
    console.error('Webhook processing failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Webhook processing failed',
        message: error.message
      })
    };
  }
};