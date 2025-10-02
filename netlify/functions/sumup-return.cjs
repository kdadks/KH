/**
 * SumUp Payment Handler - Processes both webhooks (POST) and return URLs (GET) from SumUp
 */

const crypto = require('crypto');

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

// SumUp webhook signature verification using HMAC SHA-256
const verifyWebhookSignature = (payload, signature, secret) => {
  try {
    if (!signature || !secret) {
      console.error('❌ Missing signature or webhook secret');
      return false;
    }

    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.replace(/^sha256=/, '');
    
    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // Compare signatures using crypto.timingSafeEqual to prevent timing attacks
    const signatureBuffer = Buffer.from(cleanSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    console.log('🔐 Webhook signature verification:', isValid ? 'VALID' : 'INVALID');
    
    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
};

// Process SumUp return URL data
const processSumUpReturn = async (supabase, data) => {
  try {
    const { checkout_reference, checkout_id, transaction_id, status, amount } = data;
    
    console.log('🔍 Processing SumUp return:', {
      checkout_reference,
      checkout_id,
      transaction_id,
      status,
      amount
    });

    let payment = null;

    // Try to find payment by checkout_reference first
    if (checkout_reference) {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('sumup_checkout_reference', checkout_reference)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && payments && payments.length > 0) {
        payment = payments[0];
        console.log('✅ Found payment by checkout_reference:', payment.id);
      }
    }

    // If not found by checkout_reference, try by checkout_id
    if (!payment && checkout_id) {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('sumup_checkout_id', checkout_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && payments && payments.length > 0) {
        payment = payments[0];
        console.log('✅ Found payment by checkout_id:', payment.id);
      }
    }

    if (!payment) {
      console.log('❌ No payment record found for SumUp return data');
      throw new Error(`No payment found for checkout_reference: ${checkout_reference} or checkout_id: ${checkout_id}`);
    }

    // Map SumUp status to valid database status values
    const mapSumUpStatus = (sumupStatus) => {
      const statusLower = (sumupStatus || '').toLowerCase();
      
      // Success cases
      if (statusLower === 'completed' || statusLower === 'success' || statusLower === 'paid') {
        return 'paid';
      }
      
      // Pending cases  
      if (statusLower === 'pending' || statusLower === 'processing' || statusLower === 'in_progress') {
        return 'pending';
      }
      
      // All other cases (failed, cancelled, error, etc.) map to failed
      return 'failed';
    };

    const mappedStatus = mapSumUpStatus(status);
    
    console.log(`📊 Status mapping: SumUp "${status}" → Database "${mappedStatus}"`);

    // Update payment with SumUp return data
    const updateData = {
      sumup_transaction_id: transaction_id,
      sumup_checkout_id: checkout_id,
      status: mappedStatus,
      payment_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Update webhook columns for consistency
      webhook_processed_at: new Date().toISOString(),
      sumup_event_type: 'return_url_processed',
      sumup_event_id: transaction_id || checkout_id,
      sumup_checkout_reference: checkout_reference || payment.sumup_checkout_reference
    };

    const { data: updatedPayments, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id)
      .select();

    if (updateError) {
      console.error('❌ Payment update error:', updateError);
      throw updateError;
    }

    if (!updatedPayments || updatedPayments.length === 0) {
      throw new Error(`Payment update failed for payment ID: ${payment.id}`);
    }

    console.log('✅ Payment updated successfully:', payment.id);
    console.log('📊 Updated payment data:', updateData);

    return { 
      success: true, 
      paymentId: payment.id, 
      status: updateData.status,
      updated: updateData 
    };

  } catch (error) {
    console.error('❌ processSumUpReturn error:', error);
    throw error;
  }
};

// Process SumUp webhook events (checkout.status.updated)
const processSumUpWebhook = async (supabase, eventData) => {
  try {
    const { id: eventId, event_type, payload, timestamp } = eventData;
    
    console.log('🔔 Processing SumUp webhook:', {
      eventId,
      event_type,
      checkout_id: payload.checkout_id,
      reference: payload.reference,
      status: payload.status
    });

    // Validate required fields
    if (!payload.checkout_id || !payload.reference || !payload.status) {
      throw new Error('Invalid webhook payload: missing required fields');
    }

    // Map SumUp webhook status to our database values
    const mappedStatus = mapSumUpStatus(payload.status);
    
    // Find payment by checkout reference
    const { data: existingPayments, error: searchError } = await supabase
      .from('payments')
      .select('*')
      .eq('sumup_checkout_reference', payload.reference)
      .order('created_at', { ascending: false })
      .limit(1);

    if (searchError) {
      console.error('❌ Payment search error:', searchError);
      throw searchError;
    }

    let payment = existingPayments && existingPayments.length > 0 ? existingPayments[0] : null;

    if (!payment) {
      console.log('⚠️ No existing payment found for checkout reference:', payload.reference);
      console.log('💡 This might be a webhook arriving before return URL processing');
      
      // For webhooks arriving before return URL, we might need to create a minimal record
      // or simply log for later processing when the return URL is called
      return {
        success: true,
        action: 'logged_for_later_processing',
        checkout_reference: payload.reference,
        status: mappedStatus
      };
    }

    // Update existing payment with webhook data
    const updateData = {
      status: mappedStatus,
      webhook_processed_at: new Date().toISOString(),
      sumup_event_type: event_type,
      sumup_event_id: eventId,
      sumup_checkout_id: payload.checkout_id,
      updated_at: new Date().toISOString()
    };

    const { data: updatedPayments, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Payment update error:', updateError);
      throw updateError;
    }

    console.log('✅ Payment updated from webhook:', {
      paymentId: payment.id,
      status: mappedStatus,
      checkout_reference: payload.reference
    });

    return {
      success: true,
      action: 'payment_updated',
      paymentId: payment.id,
      status: mappedStatus,
      checkout_reference: payload.reference
    };

  } catch (error) {
    console.error('❌ processSumUpWebhook error:', error);
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
    // Initialize Supabase
    const supabase = await initializeSupabase();
    
    // Handle GET requests from SumUp redirect
    if (event.httpMethod === 'GET') {
      const queryParams = event.queryStringParameters || {};
      
      console.log('📥 SumUp return URL parameters:', queryParams);
      
      // Extract SumUp parameters
      const {
        checkout_id,
        transaction_id,
        status,
        amount,
        currency,
        merchant_code,
        checkout_reference,
        timestamp
      } = queryParams;
      
      // If no SumUp parameters, just return endpoint info
      if (!checkout_id && !transaction_id) {
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
      
      // Process SumUp return parameters
      console.log('🔍 Processing SumUp return data:', {
        checkout_id,
        transaction_id, 
        status,
        checkout_reference,
        amount
      });
      
      // Find and update payment record
      const result = await processSumUpReturn(supabase, {
        checkout_id,
        transaction_id,
        status,
        amount: amount ? parseFloat(amount) : null,
        currency: currency || 'EUR',
        checkout_reference,
        merchant_code,
        timestamp
      });
      
      // Redirect user to success or failure page based on processed status
      const redirectUrl = result.status === 'paid'
        ? `${process.env.URL || 'https://uat--khtherapy.netlify.app'}/payment-success`
        : `${process.env.URL || 'https://uat--khtherapy.netlify.app'}/payment-cancelled`;
      
      console.log(`🔗 Redirecting to: ${redirectUrl} (status: ${result.status})`);
      
      return {
        statusCode: 302,
        headers: {
          Location: redirectUrl,
          'Cache-Control': 'no-cache'
        }
      };
    }

    // Handle POST requests from SumUp webhooks
    if (event.httpMethod === 'POST') {
      const webhookSecret = process.env.SUMUP_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error('❌ SUMUP_WEBHOOK_SECRET environment variable not set');
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Webhook secret not configured',
            message: 'SUMUP_WEBHOOK_SECRET environment variable is required'
          })
        };
      }

      // Verify webhook signature
      const signature = event.headers['x-payload-signature'];
      const rawBody = event.body;
      
      if (!signature) {
        console.error('❌ Missing x-payload-signature header');
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing webhook signature' })
        };
      }

      // Verify signature before processing
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        console.error('❌ Invalid webhook signature');
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid webhook signature' })
        };
      }

      // Parse webhook payload
      let webhookData;
      try {
        webhookData = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('❌ Invalid JSON payload:', parseError);
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid JSON payload' })
        };
      }

      console.log('✅ Webhook signature verified, processing event:', webhookData.event_type);

      // Process the webhook event
      const result = await processSumUpWebhook(supabase, webhookData);
      
      // Return 200 status as required by SumUp for successful processing
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
          event_type: webhookData.event_type,
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