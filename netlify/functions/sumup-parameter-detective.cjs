/**
 * SUMUP PARAMETER DETECTIVE - Capture everything SumUp sends
 * This will log EVERY parameter, header, and data SumUp sends to help debug the issue
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sumup-Webhook-Signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const timestamp = new Date().toISOString();
    const method = event.httpMethod;
    
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Capture EVERYTHING SumUp sends
    const fullCapture = {
      timestamp,
      method,
      
      // Query parameters
      queryParams: event.queryStringParameters || {},
      
      // All headers
      headers: event.headers || {},
      
      // Body data (for POST requests)
      body: event.body || null,
      bodyIsBase64: event.isBase64Encoded || false,
      
      // Path and context
      path: event.path || '',
      rawUrl: event.rawUrl || '',
      
      // Netlify context
      netlifyContext: {
        requestId: context.awsRequestId,
        functionName: context.functionName,
        deployId: process.env.DEPLOY_ID,
        context: process.env.CONTEXT
      }
    };

    // Log to database
    await supabase.from('debug_logs').insert([{
      function_name: 'sumup-parameter-detective',
      log_level: 'CAPTURE',
      message: `FULL SUMUP CAPTURE - Method: ${method}`,
      details: fullCapture,
      created_at: timestamp
    }]);

    // Also log specific SumUp parameters we're looking for
    const expectedParams = [
      'checkout_id', 'transaction_id', 'amount', 'currency', 'status',
      'checkout_reference', 'merchant_code', 'payment_type', 'success'
    ];

    const foundParams = {};
    const missingParams = [];

    expectedParams.forEach(param => {
      const value = event.queryStringParameters?.[param];
      if (value) {
        foundParams[param] = value;
      } else {
        missingParams.push(param);
      }
    });

    await supabase.from('debug_logs').insert([{
      function_name: 'sumup-parameter-detective',
      log_level: 'ANALYSIS',
      message: `PARAMETER ANALYSIS - Found: ${Object.keys(foundParams).length}, Missing: ${missingParams.length}`,
      details: {
        foundParams,
        missingParams,
        totalQueryParams: Object.keys(event.queryStringParameters || {}).length
      },
      created_at: timestamp
    }]);

    // Check if this looks like a real SumUp payment callback
    const hasPaymentData = foundParams.checkout_id || foundParams.transaction_id || foundParams.checkout_reference;
    
    if (hasPaymentData) {
      await supabase.from('debug_logs').insert([{
        function_name: 'sumup-parameter-detective',
        log_level: 'SUCCESS',
        message: '🎯 REAL SUMUP PAYMENT DETECTED - This is what we need to process!',
        details: { paymentParams: foundParams },
        created_at: timestamp
      }]);
    } else {
      await supabase.from('debug_logs').insert([{
        function_name: 'sumup-parameter-detective',
        log_level: 'WARNING',
        message: '❌ NO PAYMENT DATA - This appears to be a test/health check call',
        details: { 
          reason: 'No checkout_id, transaction_id, or checkout_reference found',
          allParams: event.queryStringParameters
        },
        created_at: timestamp
      }]);
    }

    // Return response based on what we detected
    const responseData = {
      success: true,
      timestamp,
      method,
      detectedType: hasPaymentData ? 'PAYMENT_CALLBACK' : 'TEST_CALL',
      parametersFound: Object.keys(foundParams).length,
      parametersMissing: missingParams.length,
      summary: hasPaymentData 
        ? '🎯 Real SumUp payment callback detected and logged'
        : '❌ No payment data - appears to be test/health check'
    };

    // HTML response for browser viewing
    const userAgent = event.headers['user-agent'] || '';
    if (userAgent.includes('Mozilla') && !event.queryStringParameters?.json) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>🕵️ SumUp Parameter Detective</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; line-height: 1.6; }
        .detective { background: linear-gradient(135deg, #6f42c1, #e83e8c); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .found { background: #28a745; color: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .missing { background: #dc3545; color: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .code-block { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 12px; }
        pre { white-space: pre-wrap; margin: 0; }
        .param-list { columns: 2; column-gap: 20px; }
    </style>
</head>
<body>
    <div class="detective">
        <h1>🕵️ SumUp Parameter Detective Report</h1>
        <p><strong>Captured:</strong> ${timestamp}</p>
        <p><strong>Method:</strong> ${method}</p>
        <p><strong>Detection:</strong> ${responseData.detectedType}</p>
    </div>

    <div class="${hasPaymentData ? 'found' : 'missing'}">
        <h2>${hasPaymentData ? '🎯 PAYMENT DATA DETECTED' : '❌ NO PAYMENT DATA'}</h2>
        <p><strong>Parameters Found:</strong> ${Object.keys(foundParams).length}</p>
        <p><strong>Parameters Missing:</strong> ${missingParams.length}</p>
    </div>

    ${Object.keys(foundParams).length > 0 ? `
    <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 10px 0;">
        <h3>✅ Found Parameters:</h3>
        <div class="param-list">
          ${Object.entries(foundParams).map(([key, value]) => `<strong>${key}:</strong> ${value}<br>`).join('')}
        </div>
    </div>
    ` : ''}

    ${missingParams.length > 0 ? `
    <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin: 10px 0;">
        <h3>❌ Missing Parameters:</h3>
        <div class="param-list">
          ${missingParams.map(param => `<strong>${param}</strong><br>`).join('')}
        </div>
    </div>
    ` : ''}

    <div style="background: #e9ecef; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3>📋 Raw Capture Data:</h3>
        <div class="code-block">
            <pre>${JSON.stringify(fullCapture, null, 2)}</pre>
        </div>
    </div>

    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
        <h3>🔧 Next Steps:</h3>
        <p><strong>If PAYMENT DATA detected:</strong> This is what our sumup-return.cjs should process</p>
        <p><strong>If NO PAYMENT DATA:</strong> Check SumUp dashboard return URL configuration</p>
        <p><strong>Check debug logs:</strong> All data logged to debug_logs table for analysis</p>
    </div>
</body>
</html>`;
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        body: html
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(responseData, null, 2)
    };

  } catch (error) {
    console.error('Detective error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};