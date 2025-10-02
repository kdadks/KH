/**
 * SUMUP DEBUG LOGGER - Capture 500 errors in production
 * This will show us exactly what's causing the internal calls to fail
 */

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
    
    // Capture the exact same payload that's failing
    const realPayload = event.body ? JSON.parse(event.body) : {};
    
    console.log('🚨 DEBUGGING 500 ERROR - Real payload received:');
    console.log(JSON.stringify(realPayload, null, 2));
    
    // Now call sumup-return with this payload and catch the exact error
    const sumupUrl = `${event.headers.host.includes('localhost') ? 'http' : 'https'}://${event.headers.host}/.netlify/functions/sumup-return`;
    
    console.log('🔗 Calling sumup-return endpoint:', sumupUrl);
    
    const response = await fetch(sumupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': event.headers['user-agent'] || 'SumUp-Debug-Logger'
      },
      body: event.body
    });
    
    const responseText = await response.text();
    
    console.log('📤 Response status:', response.status);
    console.log('📤 Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('📤 Response body:', responseText);
    
    let errorDetails = {};
    try {
      errorDetails = JSON.parse(responseText);
    } catch (e) {
      errorDetails = { raw: responseText };
    }
    
    const debugReport = {
      timestamp,
      originalPayload: realPayload,
      sumupEndpoint: sumupUrl,
      responseStatus: response.status,
      responseOk: response.ok,
      errorDetails,
      userAgent: event.headers['user-agent'],
      analysis: {
        hasId: !!realPayload.id,
        hasEventType: !!realPayload.event_type,
        hasPayload: !!realPayload.payload,
        hasPayloadCheckoutId: !!realPayload.payload?.checkout_id,
        payloadStructure: realPayload.payload ? Object.keys(realPayload.payload) : 'NO PAYLOAD'
      }
    };
    
    // HTML response for easy viewing
    const userAgent = event.headers['user-agent'] || '';
    if (userAgent.includes('Mozilla')) {
      const html = `<!DOCTYPE html>
<html>
<head>
    <title>🚨 SumUp 500 Error Debug Report</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; }
        .error { background: #dc3545; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .success { background: #28a745; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .warning { background: #ffc107; color: black; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .code-block { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 12px; }
        pre { white-space: pre-wrap; margin: 0; }
    </style>
</head>
<body>
    <div class="${response.ok ? 'success' : 'error'}">
        <h1>🚨 SumUp Handler Debug Report</h1>
        <p><strong>Status:</strong> ${response.status} ${response.ok ? 'SUCCESS' : 'FAILED'}</p>
        <p><strong>Time:</strong> ${timestamp}</p>
    </div>

    <h2>📥 Original Payload Received:</h2>
    <div class="code-block">
        <pre>${JSON.stringify(realPayload, null, 2)}</pre>
    </div>

    <h2>📤 SumUp Handler Response:</h2>
    <div class="code-block">
        <pre>${JSON.stringify(errorDetails, null, 2)}</pre>
    </div>

    <h2>🔍 Payload Analysis:</h2>
    <div class="code-block">
        <pre>${JSON.stringify(debugReport.analysis, null, 2)}</pre>
    </div>

    ${!response.ok ? `
    <div class="error">
        <h3>❌ ERROR IDENTIFIED</h3>
        <p><strong>The sumup-return handler is failing with:</strong></p>
        <p>${errorDetails.error || errorDetails.message || 'Unknown error'}</p>
    </div>
    ` : `
    <div class="success">
        <h3>✅ SUCCESS</h3>
        <p>The sumup-return handler processed the request successfully!</p>
    </div>
    `}

    <h2>🔧 Next Steps:</h2>
    <ul>
        <li>Compare the payload structure above with expected format</li>
        <li>Check if all required fields are present</li>
        <li>Verify the payload matches the webhook handler expectations</li>
        <li>Fix any missing or incorrectly formatted fields</li>
    </ul>
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
      body: JSON.stringify(debugReport, null, 2)
    };

  } catch (error) {
    console.error('Debug logger error:', error);
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