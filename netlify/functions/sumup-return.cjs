/**
 * SumUp Payment Handler - Processes both webhooks (POST) and return URLs (GET) from SumUp
 */

const crypto = require('crypto');

// Inline Debug Logger to avoid module resolution issues
class DebugLogger {
  constructor(supabase, functionName) {
    this.supabase = supabase;
    this.functionName = functionName;
    this.executionId = this.generateExecutionId();
    this.logs = [];
  }

  generateExecutionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${this.functionName}_${timestamp}_${random}`;
  }

  async log(level, message, details = null) {
    const logEntry = {
      function_name: this.functionName,
      execution_id: this.executionId,
      log_level: level,
      message: message,
      details: details ? JSON.stringify(details) : null,
      created_at: new Date().toISOString()
    };

    this.logs.push(logEntry);
    console.log(`[${level}] ${this.functionName}: ${message}`, details || '');

    // Flush logs immediately to ensure they're captured (for debugging)
    await this.flushToDB();
  }

  async info(message, details = null) { return this.log('INFO', message, details); }
  async warn(message, details = null) { return this.log('WARN', message, details); }
  async error(message, details = null) { return this.log('ERROR', message, details); }
  async critical(message, details = null) { return this.log('CRITICAL', message, details); }
  async debug(message, details = null) { return this.log('DEBUG', message, details); }

  async logRequest(requestData) {
    return this.log('REQUEST', 'Function called', {
      method: requestData.method,
      url: requestData.url,
      headers: requestData.headers,
      query: requestData.query,
      body: requestData.body
    });
  }

  async logResponse(responseData) {
    return this.log('RESPONSE', 'Function response', {
      status: responseData.status,
      data: responseData.data
    });
  }

  async logDatabaseOperation(operation, table, query, result) {
    return this.log('DATABASE', `${operation} on ${table}`, {
      query: query,
      result: result,
      recordCount: result?.data?.length || 0,
      error: result?.error?.message
    });
  }

  async flushToDB() {
    if (this.logs.length === 0) return;

    try {
      const { error } = await this.supabase
        .from('debug_logs')
        .insert(this.logs);

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.warn('⚠️ Debug logs table not created yet - logs will be console only');
        } else {
          console.error('Failed to insert debug logs:', error);
        }
      } else {
        // Debug logs flushed to database
      }

      this.logs = [];
    } catch (err) {
      console.warn('⚠️ Debug logging to database failed - using console only:', err.message);
    }
  }

  async finalize() {
    await this.flushToDB();
    return this.executionId;
  }
}

// Safe Supabase client initialization
let supabaseClient = null;

const initializeSupabase = async () => {
  try {
    if (supabaseClient) return supabaseClient;
    
    const { createClient } = require('@supabase/supabase-js');
    
    // Use VITE_SUPABASE_URL as fallback since it's already available
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    // Supabase configuration validated
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required Netlify environment variables:');
      console.error('   - SUPABASE_URL or VITE_SUPABASE_URL:', !!supabaseUrl);
      console.error('   - SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
      throw new Error('Missing Supabase configuration - please check Netlify environment variables');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    // Supabase client initialized
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

// Comprehensive duplicate prevention checker
const checkForDuplicates = async (supabase, debugLogger, checkoutReference, checkoutId, transactionId) => {
  await debugLogger.info('Starting duplicate check', {
    checkoutReference,
    checkoutId,
    transactionId
  });

  const duplicateChecks = [];

  // Check by checkout_reference
  if (checkoutReference) {
    const { data: refPayments, error } = await supabase
      .from('payments')
      .select('id, created_at, status, sumup_checkout_reference')
      .eq('sumup_checkout_reference', checkoutReference)
      .order('created_at', { ascending: false });

    duplicateChecks.push({
      method: 'checkout_reference',
      query: checkoutReference,
      found: refPayments?.length || 0,
      records: refPayments,
      error: error?.message
    });

    await debugLogger.logDatabaseOperation(
      'SELECT', 
      'payments', 
      `sumup_checkout_reference = ${checkoutReference}`,
      { data: refPayments, error }
    );
  }

  // Check by checkout_id
  if (checkoutId) {
    const { data: idPayments, error } = await supabase
      .from('payments')
      .select('id, created_at, status, sumup_checkout_id')
      .eq('sumup_checkout_id', checkoutId)
      .order('created_at', { ascending: false });

    duplicateChecks.push({
      method: 'checkout_id',
      query: checkoutId,
      found: idPayments?.length || 0,
      records: idPayments,
      error: error?.message
    });

    await debugLogger.logDatabaseOperation(
      'SELECT', 
      'payments', 
      `sumup_checkout_id = ${checkoutId}`,
      { data: idPayments, error }
    );
  }

  // Check by transaction_id if available
  if (transactionId) {
    const { data: txnPayments, error } = await supabase
      .from('payments')
      .select('id, created_at, status, transaction_id')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false });

    duplicateChecks.push({
      method: 'transaction_id',
      query: transactionId,
      found: txnPayments?.length || 0,
      records: txnPayments,
      error: error?.message
    });

    await debugLogger.logDatabaseOperation(
      'SELECT', 
      'payments', 
      `transaction_id = ${transactionId}`,
      { data: txnPayments, error }
    );
  }

  // Analyze results
  const existingPayments = duplicateChecks
    .filter(check => check.found > 0)
    .flatMap(check => check.records)
    .filter((payment, index, self) => 
      index === self.findIndex(p => p.id === payment.id)
    ); // Remove duplicates by ID

  const hasDuplicates = existingPayments.length > 0;

  await debugLogger.info('Duplicate check completed', {
    hasDuplicates,
    existingPaymentCount: existingPayments.length,
    checks: duplicateChecks,
    existingPaymentIds: existingPayments.map(p => p.id)
  });

  return {
    isDuplicate: hasDuplicates,
    hasDuplicates,
    existingPayments,
    duplicateChecks
  };
};

// Log processing details to database for debugging
const logProcessingDetails = async (supabase, type, data, error = null) => {
  try {
    await supabase
      .from('processing_logs')
      .insert({
        log_type: type,
        log_data: data,
        error_message: error?.message || null,
        timestamp: new Date().toISOString(),
        environment: process.env.CONTEXT || 'unknown'
      });
  } catch (logError) {
    console.error('❌ Failed to log to database:', logError);
  }
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
    // Webhook signature verified
    
    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
};

// Map SumUp status to valid database status values (shared function)
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

// Process SumUp return URL data
const processSumUpReturn = async (supabase, data, debugLogger) => {
  try {
    const { checkout_reference, checkout_id, transaction_id, status, amount } = data;
    
    // Processing SumUp return data

    // 🚨 IMMEDIATE DUPLICATE CHECK - Check if we already processed this payment
    await debugLogger.info('Starting duplicate check', { checkout_reference, checkout_id, transaction_id });
    
    const duplicateResult = await checkForDuplicates(
      supabase, 
      debugLogger, 
      checkout_reference, 
      checkout_id, 
      transaction_id
    );

    if (duplicateResult.isDuplicate) {
      await debugLogger.critical('DUPLICATE DETECTED - BLOCKING PROCESSING', duplicateResult);
      // Duplicate payment detected
      
      return {
        success: false,
        error: 'Duplicate payment detected',
        duplicateInfo: duplicateResult,
        preventedDuplicate: true
      };
    }

    await debugLogger.info('No duplicates found, proceeding with processing');

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
        // Payment found by checkout_reference
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
        // Payment found by checkout_id
      }
    }

    if (!payment) {
      // No existing payment found, attempting to create from payment_request
      
      // Try to find payment_request by checkout_reference or sumup_checkout_id and create payment
      if (checkout_reference || checkout_id) {
        const { data: paymentRequests, error: prError } = await supabase
          .from('payment_requests')
          .select('*')
          .or(`checkout_reference.eq.${checkout_reference || 'null'},sumup_checkout_id.eq.${checkout_id || 'null'}`)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!prError && paymentRequests && paymentRequests.length > 0) {
          const paymentRequest = paymentRequests[0];
          console.log('✅ Found payment_request, creating payment record:', paymentRequest.id);
          
          // Create new payment (duplicates already checked at function start)
          console.log('✅ Creating new payment (duplicates checked at start)');
          await debugLogger.info('Creating new payment from payment_request', {
            paymentRequestId: paymentRequest.id,
            checkoutReference: checkout_reference,
            checkoutId: checkout_id
          });
          
          const { data: newPayment, error: createError } = await supabase
          .from('payments')
          .insert({
            customer_id: paymentRequest.customer_id,
            booking_id: paymentRequest.booking_id,
            payment_request_id: paymentRequest.id,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency || 'EUR',
            status: 'pending', // Will be updated below
            payment_method: 'sumup',
            sumup_checkout_id: checkout_id,
            sumup_checkout_reference: checkout_reference,
            sumup_transaction_id: transaction_id,
            notes: `Payment created from return URL for payment_request #${paymentRequest.id}`
          })
          .select()
          .single();
          
        if (!createError && newPayment) {
          payment = newPayment;
          await debugLogger.info('Payment created successfully', { paymentId: payment.id });
        } else {
          console.error('❌ Failed to create payment from return URL:', createError);
          await debugLogger.error('Failed to create payment', { error: createError?.message });
        }
        }
      }
      
      if (!payment) {
        throw new Error(`No payment found and couldn't create from payment_request for checkout_reference: ${checkout_reference} or checkout_id: ${checkout_id}`);
      }
    }

    // Use shared status mapping function

    const mappedStatus = mapSumUpStatus(status);
    
    // Status mapped to database format

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

    // Payment updated successfully

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
    
      // Processing SumUp webhook event

      // Log webhook processing to database
      await logProcessingDetails(supabase, 'webhook_received', {
        event_id: eventId,
        event_type,
        payload,
        timestamp: new Date().toISOString()
      });    // Validate required fields
    if (!payload.checkout_id || !payload.reference || !payload.status) {
      throw new Error('Invalid webhook payload: missing required fields');
    }

    // Map SumUp webhook status to our database values
    const mappedStatus = mapSumUpStatus(payload.status);
    
    // Find payment by checkout reference - try multiple search strategies
    let payment = null;
    let searchAttempts = [];

    // Strategy 1: Search by exact checkout_reference match
    if (payload.reference) {
      const { data: payments1, error: error1 } = await supabase
        .from('payments')
        .select('*')
        .eq('sumup_checkout_reference', payload.reference)
        .order('created_at', { ascending: false })
        .limit(1);

      searchAttempts.push({
        method: 'checkout_reference',
        query: payload.reference,
        found: payments1?.length || 0,
        error: error1?.message
      });

      if (!error1 && payments1 && payments1.length > 0) {
        payment = payments1[0];
        // Payment found by checkout_reference
      }
    }

    // Strategy 2: Search by checkout_id if not found
    if (!payment && payload.checkout_id) {
      const { data: payments2, error: error2 } = await supabase
        .from('payments')
        .select('*')
        .eq('sumup_checkout_id', payload.checkout_id)
        .order('created_at', { ascending: false })
        .limit(1);

      searchAttempts.push({
        method: 'checkout_id', 
        query: payload.checkout_id,
        found: payments2?.length || 0,
        error: error2?.message
      });

      if (!error2 && payments2 && payments2.length > 0) {
        payment = payments2[0];
        // Payment found by checkout_id
      }
    }

    // Strategy 3: For test webhooks, try to find any recent payment
    if (!payment && eventData.test_webhook_payload) {
      console.log('🧪 Test webhook - searching for recent payment to update');
      
      const { data: payments3, error: error3 } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_method', 'sumup')
        .order('created_at', { ascending: false })
        .limit(1);

      searchAttempts.push({
        method: 'recent_sumup_payment',
        query: 'payment_method=sumup',
        found: payments3?.length || 0,
        error: error3?.message
      });

      if (!error3 && payments3 && payments3.length > 0) {
        payment = payments3[0];
        console.log('🧪 Using recent SumUp payment for test:', payment.id);
      }
    }

    console.log('🔍 Payment search summary:', searchAttempts);

    // Strategy 4: If no payment found, search payment_requests table and create payment
    if (!payment) {
      console.log('🔍 No payment found - searching payment_requests table...');
      
      let paymentRequest = null;
      
      // Parse payment_request_id from checkout reference pattern: payment-request-{id}-{timestamp}
      if (payload.reference && payload.reference.startsWith('payment-request-')) {
        const match = payload.reference.match(/^payment-request-(\d+)-/);
        if (match) {
          const paymentRequestId = parseInt(match[1]);
          console.log(`🔍 Parsed payment_request_id from checkout reference: ${paymentRequestId}`);
          
          const { data: paymentRequests, error: prError } = await supabase
            .from('payment_requests')
            .select('*')
            .eq('id', paymentRequestId)
            .limit(1);
          
          searchAttempts.push({
            method: 'payment_request_by_parsed_id',
            query: `${payload.reference} -> id:${paymentRequestId}`,
            found: paymentRequests?.length || 0,
            error: prError?.message
          });

          if (!prError && paymentRequests && paymentRequests.length > 0) {
            paymentRequest = paymentRequests[0];
            console.log('✅ Found payment_request by parsed ID:', paymentRequest.id);
          }
        } else {
          searchAttempts.push({
            method: 'payment_request_by_parsed_id',
            query: payload.reference,
            found: 0,
            error: 'Could not parse payment_request_id from checkout reference'
          });
        }
      }

      // If still not found and this is a test, use most recent payment_request
      if (!paymentRequest && eventData.test_webhook_payload) {
        console.log('🧪 Test mode - using recent payment_request');
        
        const { data: recentPR, error: recentError } = await supabase
          .from('payment_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        searchAttempts.push({
          method: 'recent_payment_request',
          query: 'recent',
          found: recentPR?.length || 0,
          error: recentError?.message
        });

        if (!recentError && recentPR && recentPR.length > 0) {
          paymentRequest = recentPR[0];
          console.log('🧪 Using recent payment_request for test:', paymentRequest.id);
        }
      }

      // Create payment record from payment_request if found
      if (paymentRequest) {
        console.log('� Creating payment record from payment_request:', paymentRequest.id);
        
        const { data: newPayment, error: createError } = await supabase
          .from('payments')
          .insert({
            customer_id: paymentRequest.customer_id,
            booking_id: paymentRequest.booking_id,
            payment_request_id: paymentRequest.id,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency || 'EUR',
            status: mappedStatus,
            payment_method: 'sumup',
            sumup_checkout_id: payload.checkout_id,
            sumup_checkout_reference: payload.reference,
            sumup_transaction_id: payload.transaction_id, // FIX: Include transaction_id from payload
            webhook_processed_at: new Date().toISOString(),
            sumup_event_type: event_type || 'checkout.status.updated',
            sumup_event_id: eventId,
            notes: `Payment created from webhook for payment_request #${paymentRequest.id}`
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Failed to create payment from payment_request:', createError);
          return {
            success: false,
            error: 'Failed to create payment record',
            details: createError.message,
            searchAttempts: searchAttempts
          };
        }

        payment = newPayment;
        console.log('✅ Created payment from payment_request:', {
          paymentId: payment.id,
          paymentRequestId: paymentRequest.id,
          customer_id: payment.customer_id,
          booking_id: payment.booking_id
        });

        // Return early since payment is already created with webhook data
        return {
          success: true,
          action: 'payment_created_from_request',
          paymentId: payment.id,
          paymentRequestId: paymentRequest.id,
          status: mappedStatus,
          webhook_data: {
            webhook_processed_at: payment.webhook_processed_at,
            sumup_event_type: payment.sumup_event_type,
            sumup_event_id: payment.sumup_event_id,
            sumup_checkout_reference: payment.sumup_checkout_reference,
            payment_request_id: payment.payment_request_id
          },
          searchAttempts: searchAttempts
        };
      }

      // Still no payment or payment_request found
      console.log('⚠️ No payment or payment_request found after all strategies');
      console.log('�💡 Webhook data:', { 
        reference: payload.reference, 
        checkout_id: payload.checkout_id,
        test_mode: !!eventData.test_webhook_payload
      });
      
      return {
        success: true,
        action: 'no_records_found',
        checkout_reference: payload.reference,
        status: mappedStatus,
        message: 'No payment or payment_request found to update',
        searchAttempts: searchAttempts
      };
    }

    // Update existing payment with comprehensive webhook data
    const updateData = {
      status: mappedStatus,
      webhook_processed_at: new Date().toISOString(),
      sumup_event_type: event_type || 'checkout.status.updated',
      sumup_event_id: eventId,
      sumup_checkout_id: payload.checkout_id,
      sumup_checkout_reference: payload.reference || payment.sumup_checkout_reference,
      payment_request_id: payment.payment_request_id, // Preserve existing value
      updated_at: new Date().toISOString()
    };

    console.log('📊 Webhook update data:', {
      paymentId: payment.id,
      webhook_columns: {
        webhook_processed_at: updateData.webhook_processed_at,
        sumup_event_type: updateData.sumup_event_type,
        sumup_event_id: updateData.sumup_event_id,
        sumup_checkout_reference: updateData.sumup_checkout_reference,
        payment_request_id: updateData.payment_request_id
      },
      status: updateData.status
    });

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
      webhook_columns_updated: {
        webhook_processed_at: updateData.webhook_processed_at,
        sumup_event_type: updateData.sumup_event_type,
        sumup_event_id: updateData.sumup_event_id,
        sumup_checkout_reference: updateData.sumup_checkout_reference,
        payment_request_id: updateData.payment_request_id
      }
    });

    return {
      success: true,
      action: 'payment_updated',
      paymentId: payment.id,
      status: mappedStatus,
      webhook_data: {
        webhook_processed_at: updateData.webhook_processed_at,
        sumup_event_type: updateData.sumup_event_type,
        sumup_event_id: updateData.sumup_event_id,
        sumup_checkout_reference: updateData.sumup_checkout_reference,
        payment_request_id: updateData.payment_request_id
      },
      updatedPayment: updatedPayments
    };

  } catch (error) {
    console.error('❌ processSumUpWebhook error:', error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  let debugLogger;
  
  try {
    // Initialize debug logger for this execution
    const supabase = await initializeSupabase();
    debugLogger = new DebugLogger(supabase, 'sumup-return');
    
    // 🚨 EMERGENCY DUPLICATE CHECK - Check for recent duplicates FIRST
    if (event.httpMethod === 'GET' && event.queryStringParameters?.checkout_id) {
      const checkoutId = event.queryStringParameters.checkout_id;
      
      // Check if we already processed this checkout_id in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentPayments } = await supabase
        .from('payments')
        .select('id, status, created_at, sumup_checkout_reference')
        .or(`sumup_checkout_reference.eq.${checkoutId},notes.ilike.%${checkoutId}%`)
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false });

      if (recentPayments && recentPayments.length > 0) {
        await debugLogger.critical('EMERGENCY DUPLICATE DETECTED', {
          checkoutId,
          recentPayments: recentPayments.length,
          existingPayments: recentPayments
        });
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          body: `<!DOCTYPE html>
<html><head><title>Payment Already Processed</title></head>
<body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
  <h1 style="color: #28a745;">✅ Payment Already Processed</h1>
  <p>This payment has already been processed successfully.</p>
  <p><strong>Checkout ID:</strong> ${checkoutId}</p>
  <p>You can safely close this window.</p>
  <script>setTimeout(() => window.close(), 3000);</script>
</body></html>`
        };
      }
    }
  } catch (error) {
    console.warn('⚠️ Debug logger initialization failed, using console only:', error.message);
    // Create a fallback debug logger that only uses console
    debugLogger = {
      executionId: `fallback_${Date.now()}`,
      async info(msg, data) { console.log(`[INFO] ${msg}`, data || ''); },
      async warn(msg, data) { console.warn(`[WARN] ${msg}`, data || ''); },
      async error(msg, data) { console.error(`[ERROR] ${msg}`, data || ''); },
      async critical(msg, data) { console.error(`[CRITICAL] ${msg}`, data || ''); },
      async debug(msg, data) { console.log(`[DEBUG] ${msg}`, data || ''); },
      async logRequest(data) { console.log('[REQUEST]', data); },
      async logResponse(data) { console.log('[RESPONSE]', data); },
      async logDatabaseOperation(op, table, query, result) { console.log(`[DB] ${op} on ${table}`, { query, result }); },
      async finalize() { return this.executionId; }
    };
  }
  
  const webhookEnvironment = getWebhookEnvironment();
  const environmentLabel = webhookEnvironment === 'production' ? 'LIVE' : 'TEST';
  
  await debugLogger.logRequest({
    method: event.httpMethod,
    url: event.path || event.rawPath,
    headers: event.headers,
    query: event.queryStringParameters,
    body: event.body
  });
  
  await debugLogger.info(`SumUp ${event.httpMethod} called [${environmentLabel}]`, {
    method: event.httpMethod,
    query: event.queryStringParameters,
    bodyLength: event.body?.length || 0,
    userAgent: event.headers['user-agent']?.substring(0, 50),
    executionId: debugLogger.executionId
  });
  
  console.log(`🎯 SumUp ${event.httpMethod} called [${environmentLabel}]:`, {
    method: event.httpMethod,
    query: event.queryStringParameters,
    bodyLength: event.body?.length || 0,
    userAgent: event.headers['user-agent']?.substring(0, 50),
    executionId: debugLogger.executionId
  });

  // ENHANCED DEBUG: Log all SumUp callback data for troubleshooting
  if (event.httpMethod === 'GET' && event.queryStringParameters) {
    console.log('🔍 RETURN URL DEBUG - All query params:', JSON.stringify(event.queryStringParameters, null, 2));
  }
  
  if (event.httpMethod === 'POST' && event.body) {
    console.log('🔍 WEBHOOK DEBUG - Raw body:', event.body);
    try {
      const webhookData = JSON.parse(event.body);
      console.log('🔍 WEBHOOK DEBUG - Parsed payload:', JSON.stringify(webhookData, null, 2));
    } catch (e) {
      console.log('🔍 WEBHOOK DEBUG - Body parse error:', e.message);
    }
  }

  try {
    // Initialize Supabase
    const supabase = await initializeSupabase();
    
    // Handle GET requests from SumUp redirect
    if (event.httpMethod === 'GET') {
      const queryParams = event.queryStringParameters || {};
      
      console.log('📥 SumUp return URL parameters:', queryParams);
      
      // 🚨 CRITICAL DEBUG: Log ALL parameters we receive from SumUp
      await debugLogger.info('SumUp GET request received', {
        allQueryParams: queryParams,
        paramCount: Object.keys(queryParams).length,
        hasCheckoutId: !!queryParams.checkout_id,
        hasTransactionId: !!queryParams.transaction_id,
        hasCheckoutReference: !!queryParams.checkout_reference,
        hasStatus: !!queryParams.status,
        userAgent: event.headers['user-agent'],
        referer: event.headers.referer
      });
      
      // Log return URL processing to database
      await logProcessingDetails(supabase, 'return_url_received', {
        query_params: queryParams,
        user_agent: event.headers['user-agent']?.substring(0, 100),
        timestamp: new Date().toISOString()
      });
      
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
      
      // If no SumUp parameters, log what we DID receive and return endpoint info
      if (!checkout_id && !transaction_id) {
        console.log('⚠️ NO SUMUP PARAMETERS - Raw query params received:', JSON.stringify(queryParams, null, 2));
        
        // Log this case to debug what SumUp is actually sending
        await debugLogger.critical('NO SUMUP PARAMETERS - SumUp called endpoint without expected parameters', {
          receivedParams: queryParams,
          expectedParams: ['checkout_id', 'transaction_id', 'checkout_reference', 'status'],
          allHeaders: event.headers,
          userAgent: event.headers['user-agent']
        });
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            message: 'SumUp return endpoint active - NO PARAMETERS RECEIVED',
            method: 'GET',
            environment: environmentLabel,
            timestamp: new Date().toISOString(),
            receivedParams: queryParams,
            debugNote: 'This call had no SumUp parameters - check SumUp dashboard configuration'
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

      // Log return URL processing to database
      await logProcessingDetails(supabase, 'return_url_processing', {
        checkout_id,
        transaction_id,
        status,
        checkout_reference,
        amount,
        currency
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
      }, debugLogger);
      
      // Redirect user to success or failure page based on processed status
      // Determine correct base URL based on environment
      const getBaseUrl = () => {
        // Check if this is production environment
        const isProduction = (
          process.env.CONTEXT === 'production' ||
          process.env.URL === 'https://khtherapy.ie' ||
          (event.headers.host && event.headers.host.includes('khtherapy.ie'))
        );
        
        if (isProduction) {
          return 'https://khtherapy.ie';
        }
        
        // Fallback to environment URL or UAT
        return process.env.URL || 'https://uat--khtherapy.netlify.app';
      };
      
      const baseUrl = getBaseUrl();
      const redirectUrl = result.status === 'paid'
        ? `${baseUrl}/payment-success`
        : `${baseUrl}/payment-cancelled`;
      
      console.log(`🔗 Redirecting to: ${redirectUrl} (status: ${result.status})`);
      
      // Use HTML redirect with error handling for better reliability
      const redirectPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment ${result.status === 'paid' ? 'Success' : 'Cancelled'}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0; 
            background: #f5f5f5; 
        }
        .container { 
            text-align: center; 
            background: white; 
            padding: 2rem; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .success { color: #28a745; }
        .cancelled { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="${result.status === 'paid' ? 'success' : 'cancelled'}">
            ${result.status === 'paid' ? '✅ Payment Successful!' : '❌ Payment Cancelled'}
        </h1>
        <p>Redirecting you back to the website...</p>
        <p><small>If you're not redirected automatically, <a href="${redirectUrl}" id="fallback-link">click here</a></small></p>
    </div>
    
    <script>
        // Multiple redirect strategies for better reliability
        let redirected = false;
        
        // Strategy 1: Immediate redirect
        function doRedirect() {
            if (redirected) return;
            redirected = true;
            window.location.href = '${redirectUrl}';
        }
        
        // Strategy 2: Delayed redirect (main)
        setTimeout(doRedirect, 1000);
        
        // Strategy 3: Fallback redirect
        setTimeout(() => {
            if (!redirected) {
                console.warn('Primary redirect failed, trying fallback');
                window.location.replace('${redirectUrl}');
            }
        }, 3000);
        
        // Strategy 4: Manual fallback
        document.getElementById('fallback-link').onclick = function(e) {
            e.preventDefault();
            doRedirect();
        };
        
        // Strategy 5: Handle visibility change (tab focus)
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden && !redirected) {
                setTimeout(doRedirect, 500);
            }
        });
    </script>
</body>
</html>`;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: redirectPage
      };
    }

    // Handle POST requests from SumUp webhooks
    if (event.httpMethod === 'POST') {
      // Use environment-specific webhook secrets
      const isProduction = environmentLabel === 'LIVE';
      const webhookSecret = isProduction 
        ? process.env.SUMUP_WEBHOOK_SECRET_PROD 
        : (process.env.SUMUP_WEBHOOK_SECRET_UAT || process.env.SUMUP_WEBHOOK_SECRET);
      
      console.log('🔐 Webhook environment check:', {
        environment: environmentLabel,
        isProduction,
        hasSecret: !!webhookSecret,
        secretSource: isProduction ? 'PROD' : 'UAT/STAGING'
      });
      
      // Allow test mode for UAT/staging without signature verification
      // Also allow internal calls from PaymentRequestUtils
      const isInternalCall = event.headers['user-agent']?.includes('PaymentRequestUtils') ||
        event.body?.includes('INTERNAL_PROCESSING');
      
      const isTestMode = !isProduction && (!webhookSecret || 
        event.headers['x-test-webhook'] === 'true' ||
        event.body?.includes('test_webhook_payload') ||
        isInternalCall);
      
      if (!webhookSecret && !isTestMode) {
        console.error(`❌ Missing webhook secret for ${environmentLabel} environment`);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Webhook secret not configured',
            message: `${isProduction ? 'SUMUP_WEBHOOK_SECRET_PROD' : 'SUMUP_WEBHOOK_SECRET_UAT'} environment variable is required`,
            environment: environmentLabel
          })
        };
      }

      // Verify webhook signature (skip for test mode)
      const signature = event.headers['x-payload-signature'];
      const rawBody = event.body;
      
      if (isTestMode) {
        console.log('🧪 Test mode enabled - skipping signature verification');
      } else {
        if (!signature) {
          console.error('❌ Missing x-payload-signature header');
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: 'Missing webhook signature',
              environment: environmentLabel,
              testMode: false
            })
          };
        }

        // Verify signature before processing
        if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
          console.error('❌ Invalid webhook signature');
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: 'Invalid webhook signature',
              environment: environmentLabel,
              testMode: false
            })
          };
        }
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

      if (isTestMode) {
        console.log('🧪 Processing webhook in test mode:', webhookData.event_type || 'unknown');
      } else {
        console.log('✅ Webhook signature verified, processing event:', webhookData.event_type);
      }

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
          testMode: isTestMode,
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
    
    // Try to flush any remaining debug logs
    try {
      await debugLogger.finalize();
    } catch (logError) {
      console.warn('Failed to finalize debug logs:', logError.message);
    }
    
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