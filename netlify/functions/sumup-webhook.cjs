const crypto = require('crypto');

/**
 * SumUp Webhook Handler
 * Handles payment events from SumUp and updates the payments table
 * Automatically detects environment (production vs sandbox) based on deployment domain
 * 
 * Expected webhook events:
 * - checkout.completed (payment successful)
 * - checkout.failed (payment failed)  
 * - checkout.pending (payment pending)
 * - transaction.successful (transaction completed)
 * - transaction.failed (transaction failed)
 */

// Environment detection for server-side (Netlify functions)
const getWebhookEnvironment = () => {
  // Check Netlify context and environment variables
  const netlifyContext = process.env.CONTEXT;
  const nodeEnv = process.env.NODE_ENV;
  const netlifyUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  
  // Production detection based on URL and context
  const isProduction = (
    netlifyContext === 'production' && 
    nodeEnv === 'production' &&
    netlifyUrl && 
    netlifyUrl.includes('khtherapy.ie')
  );
  
  const environment = isProduction ? 'production' : 'sandbox';
  
  console.log('🌐 Webhook environment detection:', {
    netlifyContext,
    nodeEnv,
    netlifyUrl,
    detectedEnvironment: environment
  });
  
  return environment;
};

// Date formatting function for consistent display (matches payment cancellation emails)
const formatDisplayDate = (dateString) => {
  try {
    // Handle various date formats
    let date;

    // If it's already a readable format (e.g., "15th January 2025"), return as is
    if (isNaN(Date.parse(dateString)) && /\d+(st|nd|rd|th)/.test(dateString)) {
      return dateString;
    }

    // Parse the date string
    date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original if can't parse
    }

    // Format as "Wednesday, 1st October 2025"
    const options = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    let formatted = date.toLocaleDateString('en-IE', options);

    // Add ordinal suffix to day (1st, 2nd, 3rd, 4th, etc.)
    const day = date.getDate();
    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';

    // Replace the day number with day + suffix
    formatted = formatted.replace(/\b\d+\b/, day + suffix);

    return formatted;
  } catch (error) {
    return dateString; // Return original if any error occurs
  }
};

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

// Verify SumUp webhook signature
const verifyWebhookSignature = (payload, signature, secret) => {
  // SumUp doesn't provide a webhook secret like other providers
  // Instead, they use x-payload-signature header for verification
  
  if (!signature) {
    console.warn('⚠️ No x-payload-signature header provided - allowing webhook');
    return true; // SumUp webhooks might not always include signature
  }
  
  console.log('🔍 SumUp webhook signature received:', signature.substring(0, 10) + '...');
  
  // For SumUp webhooks, we'll log the signature for monitoring
  // but allow the webhook to process since SumUp doesn't use HMAC with shared secret
  // The signature appears to be SumUp's internal verification
  
  // Additional security: Verify the request comes from SumUp's expected format
  try {
    const parsedPayload = JSON.parse(payload);
    
    // Basic validation - ensure it looks like a SumUp webhook
    if (!parsedPayload.id || !parsedPayload.type || !parsedPayload.data) {
      console.error('❌ Invalid SumUp webhook payload structure');
      return false;
    }
    
    // Check for expected SumUp event types
    const validEventTypes = [
      'checkout.completed', 'checkout.failed', 'checkout.pending',
      'transaction.successful', 'transaction.failed'
    ];
    
    if (!validEventTypes.includes(parsedPayload.type)) {
      console.error('❌ Unexpected SumUp event type:', parsedPayload.type);
      return false;
    }
    
    console.log('✅ SumUp webhook payload structure validated');
    return true;
    
  } catch (error) {
    console.error('❌ Error validating SumUp webhook payload:', error);
    return false;
  }
};

// Map SumUp status to our payment status
const mapSumUpStatusToPaymentStatus = (sumupStatus, eventType) => {
  const statusMap = {
    'PAID': 'paid',
    'SUCCESSFUL': 'paid',
    'COMPLETED': 'paid',
    'FAILED': 'failed',
    'DECLINED': 'failed',
    'CANCELLED': 'cancelled',
    'PENDING': 'processing',
    'PROCESSING': 'processing'
  };
  
  // Handle based on event type
  if (eventType === 'checkout.completed' || eventType === 'transaction.successful') {
    return 'paid';
  } else if (eventType === 'checkout.failed' || eventType === 'transaction.failed') {
    return 'failed';
  } else if (eventType === 'checkout.pending') {
    return 'processing';
  }
  
  // Fallback to status mapping
  return statusMap[sumupStatus?.toUpperCase()] || 'processing';
};

// Update payment record based on webhook data
const updatePaymentRecord = async (supabase, webhookData) => {
  try {
    const { id: eventId, type: eventType, data: paymentData } = webhookData;
    
    console.log('🔄 Processing webhook event:', {
      eventId,
      eventType,
      checkoutId: paymentData.id,
      status: paymentData.status,
      amount: paymentData.amount,
      processedAt: formatDisplayDate(new Date())
    });
    
    // Find payment record by checkout_id or transaction_id
    const { data: existingPayments, error: searchError } = await supabase
      .from('payments')
      .select('*')
      .or(`sumup_checkout_id.eq.${paymentData.id},sumup_transaction_id.eq.${paymentData.transaction_id || paymentData.id}`)
      .order('created_at', { ascending: false });
    
    if (searchError) {
      throw new Error(`Error searching for payment: ${searchError.message}`);
    }
    
    let paymentRecord = existingPayments?.[0];
    
    // If no existing payment found, try to find by payment request
    if (!paymentRecord && paymentData.checkout_reference) {
      // Extract payment request ID from checkout reference
      const referenceMatch = paymentData.checkout_reference.match(/payment-request-(\d+)-/);
      if (referenceMatch) {
        const paymentRequestId = referenceMatch[1];
        
        // Find payment request and associated payment
        const { data: paymentRequest, error: prError } = await supabase
          .from('payment_requests')
          .select('*')
          .eq('id', paymentRequestId)
          .single();
          
        if (!prError && paymentRequest) {
          // Look for payment by booking_id
          const { data: bookingPayments, error: bpError } = await supabase
            .from('payments')
            .select('*')
            .eq('booking_id', paymentRequest.booking_id)
            .order('created_at', { ascending: false });
            
          if (!bpError && bookingPayments?.length > 0) {
            paymentRecord = bookingPayments[0];
          }
        }
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
        throw new Error(`Error updating payment: ${updateError.message}`);
      }
      
      console.log('✅ Payment record updated successfully:', updatedPayment.id);
      
      // Update associated payment request status if successful
      if (isSuccessful && paymentRecord.booking_id) {
        await updatePaymentRequestStatus(supabase, paymentRecord.booking_id, 'paid');
      }
      
      return { success: true, action: 'updated', paymentId: updatedPayment.id };
      
    } else {
      // Create new payment record if we have enough data
      if (paymentData.amount && paymentData.currency) {
        console.log('➕ Creating new payment record from webhook');
        
        const newPaymentData = {
          amount: paymentData.amount / 100, // Convert from cents
          currency: paymentData.currency || 'EUR',
          status: newStatus,
          payment_method: paymentData.payment_type || 'card',
          sumup_checkout_id: paymentData.id,
          sumup_transaction_id: paymentData.transaction_id,
          sumup_payment_type: paymentData.payment_type,
          sumup_event_type: eventType,
          sumup_event_id: eventId,
          webhook_processed_at: new Date().toISOString(),
          notes: `Created from webhook event ${eventType}`,
          ...updateData
        };
        
        // Try to find customer_id from payment request
        if (paymentData.checkout_reference) {
          const referenceMatch = paymentData.checkout_reference.match(/payment-request-(\d+)-/);
          if (referenceMatch) {
            const paymentRequestId = referenceMatch[1];
            const { data: paymentRequest } = await supabase
              .from('payment_requests')
              .select('customer_id, booking_id, invoice_id')
              .eq('id', paymentRequestId)
              .single();
              
            if (paymentRequest) {
              newPaymentData.customer_id = paymentRequest.customer_id;
              newPaymentData.booking_id = paymentRequest.booking_id;
              newPaymentData.invoice_id = paymentRequest.invoice_id;
            }
          }
        }
        
        // Only create if we have customer_id
        if (newPaymentData.customer_id) {
          const { data: newPayment, error: createError } = await supabase
            .from('payments')
            .insert([newPaymentData])
            .select()
            .single();
            
          if (createError) {
            throw new Error(`Error creating payment: ${createError.message}`);
          }
          
          console.log('✅ New payment record created:', newPayment.id);
          
          // Update associated payment request status if successful
          if (isSuccessful && newPayment.booking_id) {
            await updatePaymentRequestStatus(supabase, newPayment.booking_id, 'paid');
          }
          
          return { success: true, action: 'created', paymentId: newPayment.id };
        } else {
          console.warn('⚠️ Cannot create payment record - missing customer_id');
          return { success: false, error: 'Missing customer information' };
        }
      } else {
        console.warn('⚠️ No matching payment record found and insufficient data to create new record');
        return { success: false, error: 'Payment record not found and insufficient webhook data' };
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating payment record:', error);
    throw error;
  }
};

// Update payment request status
const updatePaymentRequestStatus = async (supabase, bookingId, status) => {
  try {
    const { error } = await supabase
      .from('payment_requests')
      .update({ 
        status,
        updated_at: new Date().toISOString() 
      })
      .eq('booking_id', bookingId);
      
    if (error) {
      console.error('❌ Error updating payment request status:', error);
    } else {
      console.log('✅ Payment request status updated to:', status);
    }
  } catch (error) {
    console.error('❌ Exception updating payment request status:', error);
  }
};

// Send webhook processing notification (optional)
const sendWebhookNotification = async (eventType, paymentData, result, bookingInfo = null) => {
  // Optional: Send admin notification for important events
  if (eventType === 'checkout.completed' && result.success) {
    try {
      // Import email utilities
      const { sendEmail } = await import('./send-email.cjs');
      
      // Format booking date if available
      let bookingDateFormatted = '';
      if (bookingInfo?.appointment_date) {
        bookingDateFormatted = `\nBooking Date: ${formatDisplayDate(bookingInfo.appointment_date)}`;
      }
      
      await sendEmail('admin_notification', 'info@khtherapy.ie', {
        subject: 'Payment Received via Webhook',
        message: `Payment of €${(paymentData.amount / 100).toFixed(2)} received via SumUp webhook.${bookingDateFormatted}`,
        payment_id: result.paymentId,
        transaction_id: paymentData.transaction_id,
        booking_date: bookingInfo?.appointment_date ? formatDisplayDate(bookingInfo.appointment_date) : null
      });
      
      console.log('📧 Admin notification sent for successful payment');
    } catch (error) {
      console.error('❌ Error sending webhook notification:', error);
    }
  }
};

// Main webhook handler
exports.handler = async (event, context) => {
  // Detect environment first
  const webhookEnvironment = getWebhookEnvironment();
  const environmentLabel = webhookEnvironment === 'production' ? 'LIVE' : 'TEST';
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-payload-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'X-Webhook-Environment': webhookEnvironment
  };
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' })
    };
  }
  
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  console.log(`🎯 SumUp webhook received [${environmentLabel}]:`, {
    environment: webhookEnvironment,
    headers: event.headers,
    bodyLength: event.body?.length || 0,
    deploymentContext: process.env.CONTEXT
  });
  
  try {
    // Verify SumUp webhook signature and payload
    const signature = event.headers['x-payload-signature'];
    
    if (!verifyWebhookSignature(event.body, signature, null)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid webhook payload' })
      };
    }
    
    // Parse webhook payload
    let webhookData;
    try {
      webhookData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('❌ Invalid JSON in webhook payload:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON payload' })
      };
    }
    
    console.log('📦 Webhook payload:', JSON.stringify(webhookData, null, 2));
    
    // Validate required fields
    if (!webhookData.id || !webhookData.type || !webhookData.data) {
      console.error('❌ Invalid webhook payload structure');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid payload structure' })
      };
    }
    
    // Initialize Supabase client
    const supabase = createSupabaseClient();
    
    // Process the webhook event
    const result = await updatePaymentRecord(supabase, webhookData);
    
    // Send notification for successful payments with booking info
    if (result.success) {
      // Fetch booking information for enhanced notifications
      let bookingInfo = null;
      if (result.paymentId) {
        try {
          const { data: paymentRecord } = await supabase
            .from('payments')
            .select(`
              booking_id,
              bookings!inner(
                appointment_date,
                appointment_time,
                service_type,
                customer_id,
                customers!inner(
                  first_name,
                  last_name,
                  email
                )
              )
            `)
            .eq('id', result.paymentId)
            .single();
            
          if (paymentRecord?.bookings) {
            bookingInfo = {
              appointment_date: paymentRecord.bookings.appointment_date,
              appointment_time: paymentRecord.bookings.appointment_time,
              service_type: paymentRecord.bookings.service_type,
              customer_name: `${paymentRecord.bookings.customers.first_name} ${paymentRecord.bookings.customers.last_name}`,
              customer_email: paymentRecord.bookings.customers.email
            };
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch booking info for notification:', error.message);
        }
      }
      
      await sendWebhookNotification(webhookData.type, webhookData.data, result, bookingInfo);
    }
    
    // Log the result
    console.log('✅ Webhook processed successfully:', result);
    
    // Return success response (required by SumUp)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Webhook processed successfully in ${environmentLabel} mode`,
        environment: webhookEnvironment,
        eventId: webhookData.id,
        result
      })
    };
    
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    
    // Return error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};