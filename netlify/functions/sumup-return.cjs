/**
 * SumUp Return URL Handler with Safe Import Loading
 */

// Safe Supabase client initialization
let supabaseClient = null;

const initializeSupabase = async () => {
  try {
    if (supabaseClient) return supabaseClient;
    
    const { createClient } = require('@supabase/supabase-js');
    
    // Use VITE_SUPABASE_URL as fallback since it's already available
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('🔗 Supabase configuration:', {
      url: supabaseUrl ? 'SET' : 'NOT SET',
      serviceKey: supabaseServiceKey ? 'SET' : 'NOT SET',
      usingViteUrl: !process.env.SUPABASE_URL && !!process.env.VITE_SUPABASE_URL
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required Netlify environment variables:');
      console.error('   - SUPABASE_URL or VITE_SUPABASE_URL:', !!supabaseUrl);
      console.error('   - SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
      throw new Error('Missing Supabase configuration - please check Netlify environment variables');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    throw error;
  }
};

// Environment detection
const getWebhookEnvironment = () => {
  const netlifyContext = process.env.CONTEXT;
  const netlifyUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const branchName = process.env.HEAD || process.env.BRANCH;
  
  const isUATOrStaging = (
    netlifyContext !== 'production' ||
    (netlifyUrl && (
      netlifyUrl.includes('netlify.app') ||
      netlifyUrl.includes('uat') ||
      netlifyUrl.includes('preview')
    )) ||
    (branchName && branchName !== 'main')
  );
  
  return isUATOrStaging ? 'sandbox' : 'production';
};

// Test mode detection
const isTestMode = (event) => {
  const userAgent = event.headers['user-agent'] || '';
  const isTestPayload = event.body && event.body.includes('test_event');
  const hasTestQuery = event.queryStringParameters?.test === 'true';
  
  return userAgent.includes('Mozilla') || isTestPayload || hasTestQuery;
};

// Process webhook data
const processWebhookData = async (supabase, data, isTest = false) => {
  try {
    const checkoutRef = data.checkout_reference;
    const paymentRequestId = data.payment_request_id;
    
    console.log(`🔍 Processing ${isTest ? 'TEST' : 'LIVE'} webhook data:`, { checkoutRef, paymentRequestId });

    let payment = null;
    let paymentRequestData = null;

    // First, get payment request data if available (contains customer_id and booking_id)
    if (paymentRequestId) {
      console.log('🔍 Looking up payment request:', paymentRequestId);
      const { data: paymentRequest, error: prError } = await supabase
        .from('payment_requests')
        .select('id, customer_id, booking_id, amount, currency, status, service_name')
        .eq('id', paymentRequestId)
        .single();

      if (prError) {
        console.error('❌ Payment request lookup error:', prError);
      } else if (paymentRequest) {
        paymentRequestData = paymentRequest;
        console.log('✅ Found payment request data:', { 
          id: paymentRequestData.id,
          customer_id: paymentRequestData.customer_id,
          booking_id: paymentRequestData.booking_id,
          amount: paymentRequestData.amount
        });
      }
    }

    // Find matching payment record - try multiple approaches
    let searchError = null;
    
    // Try 1: Search by checkout reference
    if (checkoutRef) {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('id, booking_id, amount, status, payment_request_id, sumup_checkout_reference, customer_id')
        .eq('sumup_checkout_reference', checkoutRef)
        .limit(1);

      if (!error && payments && payments.length > 0) {
        payment = payments[0];
        console.log('✅ Found payment by checkout_reference:', payment.id);
      } else if (error) {
        searchError = error;
      }
    }

    // Try 2: Search by payment_request_id if no payment found yet
    if (!payment && paymentRequestId) {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('id, booking_id, amount, status, payment_request_id, sumup_checkout_reference, customer_id')
        .eq('payment_request_id', paymentRequestId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && payments && payments.length > 0) {
        payment = payments[0];
        console.log('✅ Found payment by payment_request_id:', payment.id);
      } else if (error) {
        searchError = error;
      }
    }

    if (searchError) {
      console.error('❌ Payment search error:', searchError);
      throw searchError;
    }

    // Handle missing payment record
    if (!payment) {
      if (isTest && paymentRequestData) {
        // For test mode, create payment using payment_request data to avoid FK violations
        console.log('🧪 Creating test payment using payment_request data...');
        
        const { data: newPayment, error: createError } = await supabase
          .from('payments')
          .insert({
            customer_id: paymentRequestData.customer_id,
            booking_id: paymentRequestData.booking_id,
            sumup_checkout_reference: checkoutRef,
            amount: paymentRequestData.amount,
            currency: paymentRequestData.currency || 'EUR',
            status: 'pending',
            payment_method: 'sumup',
            payment_request_id: paymentRequestData.id,
            notes: `Webhook test payment for payment request #${paymentRequestData.id}`
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Test payment creation failed:', createError);
          throw createError;
        }

        payment = newPayment;
        console.log('✅ Test payment created with valid references:', payment.id);
        console.log('📊 Created payment data:', JSON.stringify(payment, null, 2));
      } else if (!isTest) {
        // For real webhooks, payment should already exist
        const errorMsg = `Payment record not found for checkout reference: ${checkoutRef}`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      } else {
        // Test mode fallback - create minimal test payment without payment_request dependency
        console.log('🧪 Creating minimal test payment (no payment_request dependency)...');
        
        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        
        // For test mode, try to find an existing booking or create without booking_id
        let testBookingId = data.booking_id;
        
        if (!testBookingId) {
          // Try to find any existing booking to use as reference
          const { data: existingBookings } = await supabase
            .from('bookings')
            .select('id')
            .limit(1);
            
          if (existingBookings && existingBookings.length > 0) {
            testBookingId = existingBookings[0].id;
            console.log('📎 Using existing booking for test:', testBookingId);
          } else {
            console.log('⚠️ No existing bookings found, creating payment without booking_id');
            testBookingId = null;
          }
        }

        const { data: newPayment, error: createError } = await supabase
          .from('payments')
          .insert({
            customer_id: data.customer_id || 1, // Use provided or default
            booking_id: testBookingId, // Use existing or null
            sumup_checkout_reference: checkoutRef,
            amount: data.amount || 25.00,
            currency: data.currency || 'EUR',
            status: 'pending',
            payment_method: 'sumup',
            payment_request_id: data.payment_request_id, // Can be null
            notes: `Test webhook payment - ${new Date().toISOString()}`
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Minimal test payment creation failed:', createError);
          throw createError;
        }

        payment = newPayment;
        console.log('✅ Minimal test payment created:', payment.id);
        console.log('📊 Created payment data:', JSON.stringify(payment, null, 2));
      }
    }

    if (!payment) {
      // For real payments, the payment record should exist (created in PaymentModal)
      console.log('❌ No payment record found for checkout reference:', checkoutRef);
      console.log('💡 Searching by payment_request_id as backup...');
      
      // Try to find by payment_request_id if checkout reference lookup fails
      if (data.payment_request_id) {
        const { data: backupPayments, error: backupError } = await supabase
          .from('payments')
          .select('id, booking_id, amount, status, payment_request_id, sumup_checkout_reference')
          .eq('payment_request_id', data.payment_request_id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!backupError && backupPayments && backupPayments.length > 0) {
          payment = backupPayments[0];
          console.log('✅ Found payment by payment_request_id:', payment.id);
        }
      }
      
      // If still no payment found, create one for test mode OR fail for real payments
      if (!payment && isTest) {
        console.log('🧪 Creating mock payment for test mode...');
        // Only create mock payment in test mode
        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        
        const mockBookingId = generateUUID();
        
        const { data: newPayment, error: createError } = await supabase
          .from('payments')
          .insert({
            customer_id: data.customer_id || 1, // Use provided customer_id or default
            sumup_checkout_reference: checkoutRef,
            amount: data.amount || 50.00,
            currency: data.currency || 'EUR',
            status: 'pending',
            payment_method: 'sumup',
            payment_request_id: data.payment_request_id,
            booking_id: data.booking_id || mockBookingId, // Use provided booking_id or generate mock
            notes: 'Mock payment for webhook testing'
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Mock payment creation failed:', createError);
          throw createError;
        }

        payment = newPayment;
        console.log('✅ Mock payment created:', payment.id);
      } else if (!payment) {
        throw new Error(`Payment record not found for checkout reference: ${checkoutRef}`);
      }
    }

    console.log('✅ Found payment record:', { 
      id: payment.id, 
      status: payment.status,
      amount: payment.amount,
      sumup_checkout_reference: payment.sumup_checkout_reference 
    });

    // Update payment with webhook data
    const updateData = {
      webhook_processed_at: new Date().toISOString(),
      sumup_event_type: data.type || 'checkout.completed',
      sumup_event_id: data.id,
      sumup_checkout_reference: checkoutRef,
      status: data.status === 'paid' || data.status === 'COMPLETED' ? 'paid' : 'failed'
    };

    const { data: updatedPayments, error: updateError, count } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id)
      .select();

    if (updateError) {
      console.error('❌ Payment update error:', updateError);
      throw updateError;
    }

    if (!updatedPayments || updatedPayments.length === 0) {
      console.error('❌ Payment update failed: No rows affected for payment ID:', payment.id);
      throw new Error(`Payment update failed: Payment ID ${payment.id} not found or not updated`);
    }

    console.log('✅ Payment updated successfully:', payment.id);
    console.log('📊 Updated data:', updateData);
    console.log('🔍 Verification: Updated payment:', updatedPayments[0]);
    
    return { success: true, paymentId: payment.id, updated: updateData };

  } catch (error) {
    console.error('❌ processWebhookData error:', error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  const webhookEnvironment = getWebhookEnvironment();
  const environmentLabel = webhookEnvironment === 'production' ? 'LIVE' : 'TEST';
  
  console.log(`🎯 SumUp return URL called [${environmentLabel}]:`, {
    method: event.httpMethod,
    query: event.queryStringParameters,
    bodyLength: event.body?.length || 0,
    userAgent: event.headers['user-agent']?.substring(0, 50)
  });

  try {
    // Handle GET requests (simple endpoint test)
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'SumUp return endpoint active',
          method: 'GET',
          environment: environmentLabel,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Handle POST requests (webhook processing)
    if (event.httpMethod === 'POST') {
      const testMode = isTestMode(event);
      console.log(`📦 Processing ${testMode ? 'TEST' : 'LIVE'} webhook payload`);

      let webhookData;
      try {
        webhookData = JSON.parse(event.body);
      } catch (parseError) {
        console.error('❌ Invalid JSON payload:', parseError);
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid JSON payload' })
        };
      }

      // Initialize Supabase
      const supabase = await initializeSupabase();
      
      // Process webhook data
      const result = await processWebhookData(supabase, webhookData.data || webhookData, testMode);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Webhook processed successfully',
          environment: environmentLabel,
          testMode: testMode,
          result: result,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Unsupported method
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('❌ Handler error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};