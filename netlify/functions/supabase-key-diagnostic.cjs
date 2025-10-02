/**
 * SUPABASE KEY DIAGNOSTIC - Check which keys are being used and if they work
 */

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    console.log('🔍 SUPABASE KEY DIAGNOSTIC STARTING...');

    // Check what environment variables are available
    const envCheck = {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET', 
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
    };

    // Determine which keys would be used (same logic as our functions)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    const usingKeys = {
      url: supabaseUrl ? (process.env.SUPABASE_URL ? 'SUPABASE_URL' : 'VITE_SUPABASE_URL') : 'NONE',
      key: supabaseKey ? (process.env.SUPABASE_ANON_KEY ? 'SUPABASE_ANON_KEY' : 'VITE_SUPABASE_ANON_KEY') : 'NONE',
      urlValue: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING',
      keyValue: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'MISSING'
    };

    let connectionTest = null;
    let testResults = {};

    if (supabaseUrl && supabaseKey) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Test 1: Simple connection
      console.log('🧪 Testing Supabase connection...');
      try {
        const { data, error } = await supabase.from('payments').select('id').limit(1);
        testResults.connectionTest = {
          success: !error,
          error: error?.message,
          recordsFound: data?.length || 0
        };
      } catch (err) {
        testResults.connectionTest = {
          success: false,
          error: err.message,
          recordsFound: 0
        };
      }

      // Test 2: Debug logs table access
      console.log('🧪 Testing debug_logs table access...');
      try {
        const { data, error } = await supabase.from('debug_logs').select('id').limit(1);
        testResults.debugLogsTest = {
          success: !error,
          error: error?.message,
          recordsFound: data?.length || 0
        };
      } catch (err) {
        testResults.debugLogsTest = {
          success: false,
          error: err.message,
          recordsFound: 0
        };
      }

      // Test 3: Insert permission test
      console.log('🧪 Testing insert permissions...');
      try {
        const testEntry = {
          function_name: 'supabase-key-diagnostic',
          execution_id: 'diag-' + Date.now(),
          log_level: 'INFO',
          message: 'Testing Supabase key permissions',
          details: JSON.stringify(envCheck),
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('debug_logs').insert([testEntry]).select();
        testResults.insertTest = {
          success: !error,
          error: error?.message,
          insertedId: data?.[0]?.id
        };
      } catch (err) {
        testResults.insertTest = {
          success: false,
          error: err.message,
          insertedId: null
        };
      }

      // Test 4: Update permission test (try to update payments)
      console.log('🧪 Testing update permissions on payments...');
      try {
        // Get a recent payment to test update
        const { data: recentPayment } = await supabase
          .from('payments')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1);

        if (recentPayment && recentPayment.length > 0) {
          const { error: updateError } = await supabase
            .from('payments')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', recentPayment[0].id);

          testResults.updateTest = {
            success: !updateError,
            error: updateError?.message,
            testedPaymentId: recentPayment[0].id
          };
        } else {
          testResults.updateTest = {
            success: false,
            error: 'No payments found to test update',
            testedPaymentId: null
          };
        }
      } catch (err) {
        testResults.updateTest = {
          success: false,
          error: err.message,
          testedPaymentId: null
        };
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.CONTEXT || process.env.NODE_ENV || 'unknown',
      envCheck,
      usingKeys,
      testResults,
      diagnosis: {
        hasCorrectKeys: supabaseUrl && supabaseKey,
        usingFallbackKeys: !process.env.SUPABASE_URL && !!process.env.VITE_SUPABASE_URL,
        canConnect: testResults.connectionTest?.success,
        canInsert: testResults.insertTest?.success,
        canUpdate: testResults.updateTest?.success,
        recommendation: ''
      }
    };

    // Add recommendation
    if (!response.diagnosis.hasCorrectKeys) {
      response.diagnosis.recommendation = 'CRITICAL: Missing Supabase keys in Netlify environment';
    } else if (response.diagnosis.usingFallbackKeys) {
      response.diagnosis.recommendation = 'WARNING: Using VITE_ fallback keys - may have wrong permissions';
    } else if (!response.diagnosis.canConnect) {
      response.diagnosis.recommendation = 'ERROR: Cannot connect to Supabase - check keys and URL';
    } else if (!response.diagnosis.canInsert || !response.diagnosis.canUpdate) {
      response.diagnosis.recommendation = 'ERROR: Insufficient permissions - need service role key for updates';
    } else {
      response.diagnosis.recommendation = 'SUCCESS: All tests passed - keys are working correctly';
    }

    // HTML Response
    const userAgent = event.headers['user-agent'] || '';
    const query = event.queryStringParameters || {};
    
    if (userAgent.includes('Mozilla') && !query.json) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>🔍 SUPABASE KEY DIAGNOSTIC</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; }
        .critical { background: #dc3545; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .success { background: #28a745; color: white; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .warning { background: #ffc107; color: #212529; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; border: 1px solid #dee2e6; text-align: left; }
        th { background: #f8f9fa; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
    </style>
</head>
<body>
    <div class="critical">
        <h1>🔍 SUPABASE KEY DIAGNOSTIC</h1>
        <p><strong>DIAGNOSIS:</strong> ${response.diagnosis.recommendation}</p>
        <p>Environment: ${response.environment} | ${response.timestamp}</p>
    </div>

    <div class="card">
        <h2>ENVIRONMENT VARIABLES</h2>
        <table>
            <thead><tr><th>Variable</th><th>Status</th></tr></thead>
            <tbody>
                ${Object.entries(response.envCheck).map(([key, value]) => `
                <tr>
                    <td>${key}</td>
                    <td style="color: ${value === 'SET' ? '#28a745' : '#dc3545'}">${value}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="card">
        <h2>ACTIVE CONFIGURATION</h2>
        <p><strong>Using URL:</strong> ${response.usingKeys.url} (${response.usingKeys.urlValue})</p>
        <p><strong>Using Key:</strong> ${response.usingKeys.key} (${response.usingKeys.keyValue})</p>
        <div class="${response.diagnosis.usingFallbackKeys ? 'warning' : 'success'}">
            <strong>Key Source:</strong> ${response.diagnosis.usingFallbackKeys ? 'FALLBACK (VITE_*)' : 'PRIMARY (SUPABASE_*)'}
        </div>
    </div>

    <div class="card">
        <h2>CONNECTION TESTS</h2>
        ${Object.entries(response.testResults).map(([testName, result]) => `
        <div class="${result.success ? 'success' : 'warning'}">
            <h3>${testName.toUpperCase()}</h3>
            <p><strong>Success:</strong> ${result.success ? 'YES' : 'NO'}</p>
            ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
            ${result.recordsFound !== undefined ? `<p><strong>Records:</strong> ${result.recordsFound}</p>` : ''}
            ${result.insertedId ? `<p><strong>Inserted ID:</strong> ${result.insertedId}</p>` : ''}
        </div>
        `).join('')}
    </div>

    <div class="card">
        <h2>RECOMMENDED ACTIONS</h2>
        ${response.diagnosis.recommendation.includes('CRITICAL') ? `
        <div class="critical">
            <h3>🚨 CRITICAL ISSUE</h3>
            <p>Supabase keys are missing from Netlify environment variables!</p>
            <ol>
                <li>Go to Netlify Dashboard → Site Settings → Environment Variables</li>
                <li>Add SUPABASE_URL and SUPABASE_ANON_KEY</li>
                <li>Redeploy the site</li>
            </ol>
        </div>` : ''}
        
        ${response.diagnosis.recommendation.includes('WARNING') ? `
        <div class="warning">
            <h3>⚠️ USING FALLBACK KEYS</h3>
            <p>Functions are using VITE_* keys which may have wrong permissions.</p>
            <p>Consider setting proper SUPABASE_* environment variables in Netlify.</p>
        </div>` : ''}
        
        ${response.diagnosis.recommendation.includes('permissions') ? `
        <div class="warning">
            <h3>🔒 PERMISSION ISSUES</h3>
            <p>Database operations are failing - may need service role key for updates.</p>
            <p>Check if SUPABASE_SERVICE_ROLE_KEY is set for write operations.</p>
        </div>` : ''}
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
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    console.error('Supabase diagnostic error:', error);
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