/**
 * Simple Debug Status - Basic payment monitoring without complex dependencies
 */

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    // Initialize Supabase only when needed
    let supabase = null;
    
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
      }
    } catch (initError) {
      console.error('Supabase init failed:', initError.message);
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      status: supabase ? 'Supabase Connected' : 'Supabase Not Available',
      environment: process.env.CONTEXT || 'unknown',
      message: 'Simple debug status endpoint working'
    };

    // Try to get basic payment data if Supabase is available
    if (supabase) {
      try {
        const { data: payments, error } = await supabase
          .from('payments')
          .select('id, amount, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        response.recentPayments = payments || [];
        response.paymentCount = payments?.length || 0;
        response.paymentError = error?.message || null;
      } catch (paymentError) {
        response.paymentError = paymentError.message;
      }

      try {
        const { data: debugLogs, error } = await supabase
          .from('debug_logs')
          .select('id, function_name, log_level, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        response.debugLogs = debugLogs || [];
        response.debugLogCount = debugLogs?.length || 0;
        response.debugLogError = error?.message || null;
      } catch (debugError) {
        response.debugLogError = debugError.message;
        response.debugLogNote = 'Debug logs table not created yet (normal if first run)';
      }
    }

    // Generate simple HTML if browser request
    const userAgent = event.headers['user-agent'] || '';
    const isBrowser = userAgent.includes('Mozilla') && !event.queryStringParameters?.json;

    if (isBrowser) {
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>SumUp Debug Status</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
        .success { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .error { background: #ffebee; border-left: 4px solid #f44336; }
        .warning { background: #fff3e0; border-left: 4px solid #ff9800; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; }
        .refresh { background: #2196f3; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    </style>
    <script>
        function refresh() { window.location.reload(); }
        setInterval(refresh, 30000);
    </script>
</head>
<body>
    <h1>🔍 SumUp Debug Status</h1>
    <button class="refresh" onclick="refresh()">🔄 Refresh</button>
    <p><small>Auto-refreshes every 30 seconds | ${response.timestamp}</small></p>
    
    <div class="card">
        <h2>System Status</h2>
        <div class="status ${response.status.includes('Connected') ? 'success' : 'warning'}">
            ${response.status}
        </div>
        <p>Environment: ${response.environment}</p>
    </div>

    <div class="card">
        <h2>Recent Payments</h2>
        ${response.paymentError ? 
          `<div class="status error">Error: ${response.paymentError}</div>` :
          `<p>Found: ${response.paymentCount || 0} recent payments</p>`
        }
        ${response.recentPayments?.length > 0 ? 
          `<pre>${JSON.stringify(response.recentPayments, null, 2)}</pre>` : 
          '<p>No recent payments found</p>'
        }
    </div>

    <div class="card">
        <h2>Debug Logs</h2>
        ${response.debugLogError ? 
          `<div class="status warning">Note: ${response.debugLogNote || response.debugLogError}</div>` :
          `<p>Found: ${response.debugLogCount || 0} debug logs</p>`
        }
        ${response.debugLogs?.length > 0 ? 
          `<pre>${JSON.stringify(response.debugLogs, null, 2)}</pre>` : 
          '<p>No debug logs (table may not exist yet)</p>'
        }
    </div>

    <div class="card">
        <h2>Instructions</h2>
        <p>If debug logs table doesn't exist, run this in Supabase SQL Editor:</p>
        <pre>CREATE TABLE IF NOT EXISTS public.debug_logs (
    id SERIAL PRIMARY KEY,
    function_name VARCHAR(100) NOT NULL,
    execution_id VARCHAR(255) NOT NULL,
    log_level VARCHAR(20) DEFAULT 'INFO',
    message TEXT NOT NULL,
    details JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);</pre>
        <p>Then test a real SumUp payment to see debug information!</p>
    </div>
</body>
</html>`;
      
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        body: html
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    console.error('Debug status error:', error);

    return {
      statusCode: 200, // Return 200 even for errors to show debug info
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        message: 'Debug status encountered an error'
      })
    };
  }
};