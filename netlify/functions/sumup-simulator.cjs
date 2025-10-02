/**
 * SUMUP SIMULATOR - Mock SumUp payment gateway for UAT testing
 * Simulates real SumUp POST callbacks with authentic parameter structure
 * This replaces the frontend simulateWebhookEvent with proper server-side simulation
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const timestamp = new Date().toISOString();
    
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (event.httpMethod === 'GET') {
      // Show simulator interface
      const query = event.queryStringParameters || {};
      const checkoutRef = query.checkout_reference || `payment-request-${Math.floor(Math.random() * 1000)}-${Date.now()}`;
      const amount = query.amount || '16.00';
      const currency = query.currency || 'EUR';
      
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>🎯 SumUp Simulator - UAT Testing</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; line-height: 1.6; }
        .simulator { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
        button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin: 5px; }
        button:hover { background: #0056b3; }
        button.success { background: #28a745; }
        button.failure { background: #dc3545; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 15px; margin: 10px 0; }
        .code-block { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 12px; }
    </style>
</head>
<body>
    <div class="simulator">
        <h1>🎯 SumUp Payment Simulator</h1>
        <p><strong>UAT Testing Environment</strong></p>
        <p>Simulates real SumUp POST callbacks with authentic parameters</p>
    </div>

    <div class="info">
        <h3>📋 Payment Simulation Form</h3>
        <p>This will send the exact same parameters that real SumUp would send via POST callback</p>
    </div>

    <form id="paymentForm">
        <div class="form-group">
            <label for="checkout_reference">Checkout Reference:</label>
            <input type="text" id="checkout_reference" name="checkout_reference" value="${checkoutRef}" required>
        </div>
        
        <div class="form-group">
            <label for="amount">Amount:</label>
            <input type="number" id="amount" name="amount" value="${amount}" step="0.01" required>
        </div>
        
        <div class="form-group">
            <label for="currency">Currency:</label>
            <select id="currency" name="currency" required>
                <option value="EUR" ${currency === 'EUR' ? 'selected' : ''}>EUR</option>
                <option value="USD" ${currency === 'USD' ? 'selected' : ''}>USD</option>
                <option value="GBP" ${currency === 'GBP' ? 'selected' : ''}>GBP</option>
            </select>
        </div>

        <button type="button" class="success" onclick="simulatePayment('PAID')">
            ✅ Simulate Successful Payment
        </button>
        
        <button type="button" class="failure" onclick="simulatePayment('FAILED')">
            ❌ Simulate Failed Payment
        </button>
    </form>

    <div id="result" style="margin-top: 20px;"></div>

    <div class="info">
        <h3>🔧 How This Works:</h3>
        <p><strong>1.</strong> Fill in payment details above</p>
        <p><strong>2.</strong> Click "Simulate Successful Payment"</p>
        <p><strong>3.</strong> This sends authentic SumUp parameters to your sumup-return endpoint</p>
        <p><strong>4.</strong> Check your payments table - should see 1 record with webhook populated</p>
    </div>

    <div class="code-block">
        <strong>Target Endpoint:</strong><br>
        POST https://uat--khtherapy.netlify.app/.netlify/functions/sumup-return
        <br><br>
        <strong>Parameters Sent:</strong><br>
        - checkout_id: Unique checkout ID<br>
        - transaction_id: Unique transaction ID<br>
        - checkout_reference: Your payment request reference<br>
        - amount: Payment amount<br>
        - currency: Payment currency<br>
        - status: PAID or FAILED<br>
        - merchant_code: Test merchant code<br>
        - payment_type: card<br>
        - created_at: Timestamp
    </div>

    <script>
    async function simulatePayment(status) {
        const formData = new FormData(document.getElementById('paymentForm'));
        const checkoutRef = formData.get('checkout_reference');
        const amount = formData.get('amount');
        const currency = formData.get('currency');
        
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = '<p>🚀 Sending simulated SumUp callback...</p>';

        try {
            const response = await fetch(window.location.href, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'simulate_payment',
                    status: status,
                    checkout_reference: checkoutRef,
                    amount: parseFloat(amount),
                    currency: currency
                })
            });

            const result = await response.json();
            
            if (result.success) {
                resultDiv.innerHTML = \`
                    <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px;">
                        <h4>✅ Payment Simulation Successful!</h4>
                        <p><strong>Transaction ID:</strong> \${result.transactionId}</p>
                        <p><strong>Status:</strong> \${status}</p>
                        <p><strong>Response:</strong> \${result.message}</p>
                        <p><strong>Check your payments table for the new record!</strong></p>
                    </div>
                \`;
            } else {
                resultDiv.innerHTML = \`
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px;">
                        <h4>❌ Simulation Failed</h4>
                        <p><strong>Error:</strong> \${result.error}</p>
                    </div>
                \`;
            }
        } catch (error) {
            resultDiv.innerHTML = \`
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px;">
                    <h4>❌ Network Error</h4>
                    <p><strong>Error:</strong> \${error.message}</p>
                </div>
            \`;
        }
    }
    </script>
</body>
</html>`;

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        body: html
      };
    }

    if (event.httpMethod === 'POST') {
      // Process payment simulation
      const body = JSON.parse(event.body || '{}');
      
      if (body.action === 'simulate_payment') {
        const checkoutId = `co_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create authentic SumUp parameters
        const sumupParams = {
          checkout_id: checkoutId,
          transaction_id: transactionId,
          checkout_reference: body.checkout_reference,
          amount: body.amount.toString(),
          currency: body.currency,
          status: body.status,
          merchant_code: 'UAT_TEST_MERCHANT',
          payment_type: 'card',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Log the simulation
        await supabase.from('debug_logs').insert([{
          function_name: 'sumup-simulator',
          log_level: 'INFO',
          message: `Simulating SumUp ${body.status} payment callback`,
          details: sumupParams,
          created_at: timestamp
        }]);

        // Send POST request to sumup-return endpoint with authentic parameters
        const targetUrl = `${event.headers.host.includes('localhost') ? 'http' : 'https'}://${event.headers.host}/.netlify/functions/sumup-return`;
        
        const sumupResponse = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SumUp-Webhook-Simulator/UAT',
            'X-Forwarded-For': '127.0.0.1'
          },
          body: JSON.stringify({
            event_type: body.status === 'PAID' ? 'checkout.completed' : 'checkout.failed',
            checkout_id: checkoutId,
            transaction_id: transactionId,
            checkout_reference: body.checkout_reference,
            amount: body.amount,
            currency: body.currency,
            status: body.status,
            merchant_code: 'UAT_TEST_MERCHANT',
            payment_type: 'card',
            created_at: new Date().toISOString()
          })
        });

        const responseText = await sumupResponse.text();
        
        await supabase.from('debug_logs').insert([{
          function_name: 'sumup-simulator',
          log_level: sumupResponse.ok ? 'SUCCESS' : 'ERROR',
          message: `SumUp simulation callback ${sumupResponse.ok ? 'succeeded' : 'failed'}`,
          details: {
            status: sumupResponse.status,
            response: responseText,
            parameters: sumupParams
          },
          created_at: timestamp
        }]);

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            success: true,
            message: `SumUp ${body.status} payment simulated successfully`,
            transactionId: transactionId,
            checkoutId: checkoutId,
            targetEndpoint: targetUrl,
            responseStatus: sumupResponse.status,
            timestamp: timestamp
          })
        };
      }
    }

    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        success: false,
        error: 'Invalid request method or missing action parameter'
      })
    };

  } catch (error) {
    console.error('SumUp Simulator Error:', error);
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('debug_logs').insert([{
        function_name: 'sumup-simulator',
        log_level: 'ERROR',
        message: 'SumUp Simulator Error',
        details: { error: error.message, stack: error.stack },
        created_at: new Date().toISOString()
      }]);
    }

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