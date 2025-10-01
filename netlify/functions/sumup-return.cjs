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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
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
    if (!checkoutRef) {
      throw new Error('No checkout_reference provided');
    }

    console.log(`🔍 Processing ${isTest ? 'TEST' : 'LIVE'} checkout reference:`, checkoutRef);

    // Find matching payment record using correct column name
    const { data: payments, error: searchError } = await supabase
      .from('payments')
      .select('id, booking_id, amount, status, payment_request_id, sumup_checkout_reference')
      .eq('sumup_checkout_reference', checkoutRef)
      .limit(1);

    if (searchError) {
      console.error('❌ Payment search error:', searchError);
      throw searchError;
    }

    let payment = payments?.[0];

    // Auto-create mock payment for test mode if not found
    if (!payment && isTest) {
      console.log('🧪 Creating mock payment for test mode...');
      
      // Generate a proper UUID v4 format for booking_id
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
          sumup_checkout_reference: checkoutRef,
          amount: data.amount || 50.00,
          currency: data.currency || 'EUR',
          status: 'pending',
          payment_method: 'sumup',
          payment_request_id: data.payment_request_id,
          booking_id: mockBookingId, // Use proper UUID format
          created_at: new Date().toISOString(),
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
    }

    if (!payment) {
      // For real payments, the payment record should exist (created in PaymentModal)
      console.error('❌ No payment record found for checkout reference:', checkoutRef);
      console.log('💡 Searching all recent payments to debug...');
      
      try {
        const { data: recentPayments, error: debugError } = await supabase
          .from('payments')
          .select('id, sumup_checkout_reference, payment_request_id, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (!debugError && recentPayments) {
          console.log('📊 Recent payments found:', recentPayments);
          const matching = recentPayments.filter(p => p.sumup_checkout_reference && p.sumup_checkout_reference.includes(checkoutRef.split('-')[2]));
          console.log('🔍 Potential matches:', matching);
        }
      } catch (debugError) {
        console.error('Debug query failed:', debugError);
      }
      
      throw new Error(`Payment record not found for checkout reference: ${checkoutRef}`);
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
      status: data.status === 'COMPLETED' ? 'completed' : 'failed'
    };

    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id);

    if (updateError) {
      console.error('❌ Payment update error:', updateError);
      throw updateError;
    }

    console.log('✅ Payment updated successfully:', payment.id);
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