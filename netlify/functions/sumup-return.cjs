/**
 * SumUp Return URL Handler
 * 
 * This endpoint serves dual purposes:
 * 1. Webhook: Receives SumUp payment status updates and processes them
 * 2. User Redirect: Redirects users to appropriate success/failure pages after payment
 * 
 * SumUp calls this URL with payment status and then we handle both webhook processing
 * and user redirection from the same endpoint.
 */

// Initialize Supabase client
const createSupabaseClient = () => {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Environment detection (same as webhook)
const getWebhookEnvironment = () => {
  const netlifyContext = process.env.CONTEXT;
  const nodeEnv = process.env.NODE_ENV;
  const netlifyUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const branchName = process.env.HEAD || process.env.BRANCH;
  
  const isUATOrStaging = (
    netlifyContext !== 'production' ||
    (netlifyUrl && (
      netlifyUrl.includes('netlify.app') ||
      netlifyUrl.includes('staging') ||
      netlifyUrl.includes('uat') ||
      netlifyUrl.includes('preview')
    )) ||
    (branchName && branchName !== 'main' && branchName !== 'master')
  );
  
  const isExactProduction = (
    netlifyContext === 'production' && 
    nodeEnv === 'production' &&
    netlifyUrl && 
    netlifyUrl.includes('khtherapy.ie') &&
    !isUATOrStaging
  );
  
  return isExactProduction ? 'production' : 'sandbox';
};

// Map SumUp status to our payment status
const mapSumUpStatusToPaymentStatus = (sumupStatus, eventType) => {
  const statusMap = {
    'COMPLETED': 'paid',
    'PAID': 'paid', 
    'SUCCESSFUL': 'paid',
    'FAILED': 'failed',
    'DECLINED': 'failed',
    'CANCELLED': 'cancelled',
    'PENDING': 'processing',
    'PROCESSING': 'processing'
  };
  
  if (eventType === 'checkout.completed' || eventType === 'transaction.successful') {
    return 'paid';
  } else if (eventType === 'checkout.failed' || eventType === 'transaction.failed') {
    return 'failed';
  } else if (eventType === 'checkout.pending') {
    return 'processing';
  }
  
  return statusMap[sumupStatus?.toUpperCase()] || 'processing';
};

// Process webhook data and update payments table
const processWebhookData = async (supabase, webhookData) => {
  try {
    const { id: eventId, type: eventType, data: paymentData } = webhookData;
    
    console.log('🔄 Processing webhook event:', {
      eventId,
      eventType,
      checkoutId: paymentData.id,
      status: paymentData.status,
      amount: paymentData.amount,
      checkoutReference: paymentData.checkout_reference
    });

    // Find payment record by checkout reference or checkout ID
    let paymentRecord = null;
    
    if (paymentData.checkout_reference) {
      // First try to find by checkout reference
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('sumup_checkout_reference', paymentData.checkout_reference)
        .limit(1);
      
      if (payments && payments.length > 0) {
        paymentRecord = payments[0];
      }
    }
    
    if (!paymentRecord && paymentData.id) {
      // Try to find by SumUp checkout ID
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('sumup_checkout_id', paymentData.id)
        .limit(1);
      
      if (payments && payments.length > 0) {
        paymentRecord = payments[0];
      }
    }

    const newStatus = mapSumUpStatusToPaymentStatus(paymentData.status, eventType);
    const isSuccessful = newStatus === 'paid';
    
    // Prepare update data
    const updateData = {
      status: newStatus,
      sumup_event_type: eventType,
      sumup_event_id: eventId,
      webhook_processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add transaction details if available
    if (paymentData.transaction_id) {
      updateData.sumup_transaction_id = paymentData.transaction_id;
    }
    
    // Set payment date for successful payments
    if (isSuccessful && !paymentRecord?.payment_date) {
      updateData.payment_date = new Date().toISOString();
    }
    
    // Add failure reason for failed payments
    if (newStatus === 'failed' && paymentData.failure_reason) {
      updateData.failure_reason = paymentData.failure_reason;
    }

    if (paymentRecord) {
      // Update existing payment record
      console.log('📝 Updating existing payment record:', paymentRecord.id);
      
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentRecord.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Payment record updated successfully:', updatedPayment.id);
      return updatedPayment;
    } else {
      console.log('⚠️ No existing payment record found for checkout:', {
        checkoutReference: paymentData.checkout_reference,
        checkoutId: paymentData.id
      });
      return null;
    }

  } catch (error) {
    console.error('❌ Error processing webhook data:', error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  const webhookEnvironment = getWebhookEnvironment();
  const environmentLabel = webhookEnvironment === 'production' ? 'LIVE' : 'TEST';
  
  console.log(`🎯 SumUp return URL called [${environmentLabel}]:`, {
    method: event.httpMethod,
    query: event.queryStringParameters,
    headers: Object.keys(event.headers),
    bodyLength: event.body?.length || 0
  });

  try {
    let checkoutId, checkoutReference, paymentRequestId, context;
    let redirectUrl = '/';

    if (event.httpMethod === 'POST') {
      // This is likely a webhook call from SumUp
      console.log('📡 Processing SumUp webhook data');
      
      const webhookData = JSON.parse(event.body);
      console.log('Webhook payload:', webhookData);
      
      // Process the webhook data (update payments table)
      const supabase = createSupabaseClient();
      
      try {
        await processWebhookData(supabase, webhookData);
        console.log('✅ Webhook processing completed');
      } catch (error) {
        console.error('❌ Webhook processing failed:', error);
      }
      
      // Extract data for redirect
      checkoutId = webhookData.data?.id || webhookData.payload?.checkout_id;
      checkoutReference = webhookData.data?.checkout_reference || webhookData.payload?.reference;
      
      // Try to extract payment request info from checkout reference
      if (checkoutReference && checkoutReference.includes('payment-request-')) {
        const parts = checkoutReference.split('-');
        if (parts.length >= 3) {
          paymentRequestId = parts[2];
        }
      }

    } else if (event.httpMethod === 'GET') {
      // This is likely a user redirect from SumUp (less common but possible)
      console.log('👤 Processing user redirect from SumUp');
      
      const params = event.queryStringParameters || {};
      checkoutId = params.checkout_id || params.id;
      checkoutReference = params.checkout_reference || params.reference;
      paymentRequestId = params.payment_request_id;
      context = params.context || 'booking';
    }

    // Determine redirect URL based on the context and payment status
    if (paymentRequestId) {
      // Try to fetch the payment status to determine success/failure
      const supabase = createSupabaseClient();
      
      try {
        const { data: paymentRequest } = await supabase
          .from('payment_requests')
          .select('*')
          .eq('id', paymentRequestId)
          .single();
          
        if (paymentRequest) {
          if (paymentRequest.status === 'paid') {
            redirectUrl = `/payment-success?payment_request_id=${paymentRequestId}&checkout_reference=${checkoutReference}`;
          } else if (paymentRequest.status === 'failed') {
            redirectUrl = `/payment-cancelled?payment_request_id=${paymentRequestId}&checkout_reference=${checkoutReference}&reason=payment_failed`;
          } else {
            // Still processing or pending
            redirectUrl = `/payment-processing?payment_request_id=${paymentRequestId}&checkout_reference=${checkoutReference}`;
          }
        }
      } catch (error) {
        console.error('Error fetching payment status for redirect:', error);
        redirectUrl = `/payment-success?payment_request_id=${paymentRequestId}&checkout_reference=${checkoutReference}`;
      }
    }

    // Add context to redirect URL
    if (context) {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      redirectUrl += `${separator}context=${context}`;
    }

    console.log('🔄 Redirecting user to:', redirectUrl);

    // Return redirect response
    return {
      statusCode: 302,
      headers: {
        'Location': redirectUrl,
        'Cache-Control': 'no-cache'
      },
      body: ''
    };

  } catch (error) {
    console.error('❌ SumUp return handler error:', error);
    
    // Redirect to generic error page on failure
    return {
      statusCode: 302,
      headers: {
        'Location': '/payment-cancelled?reason=processing_error',
        'Cache-Control': 'no-cache'
      },
      body: ''
    };
  }
};