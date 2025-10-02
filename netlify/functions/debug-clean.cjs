/**
 * Clean Debug Dashboard - No special characters to avoid encoding issues
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
    let supabase = null;
    let connectionStatus = 'Not Connected';
    
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
        connectionStatus = 'Connected';
      } else {
        connectionStatus = 'Missing Credentials';
      }
    } catch (initError) {
      connectionStatus = 'Init Failed: ' + initError.message;
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      connection: connectionStatus,
      environment: process.env.CONTEXT || 'unknown',
      payments: [],
      paymentCount: 0,
      debugLogs: [],
      debugLogCount: 0,
      errors: []
    };

    // Try to get payment data
    if (supabase) {
      try {
        const { data: payments, error } = await supabase
          .from('payments')
          .select('id, amount, currency, status, sumup_checkout_reference, webhook_processed_at, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          response.errors.push('Payments: ' + error.message);
        } else {
          response.payments = payments || [];
          response.paymentCount = payments?.length || 0;
        }
      } catch (paymentError) {
        response.errors.push('Payment Query Failed: ' + paymentError.message);
      }

      try {
        const { data: debugLogs, error } = await supabase
          .from('debug_logs')
          .select('id, function_name, log_level, message, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            response.debugLogNote = 'Debug logs table not created yet';
          } else {
            response.errors.push('Debug Logs: ' + error.message);
          }
        } else {
          response.debugLogs = debugLogs || [];
          response.debugLogCount = debugLogs?.length || 0;
        }
      } catch (debugError) {
        response.errors.push('Debug Log Query Failed: ' + debugError.message);
      }
    }

    // Check for JSON request
    const query = event.queryStringParameters || {};
    const userAgent = event.headers['user-agent'] || '';
    const wantsJson = query.json || query.format === 'json';

    if (wantsJson || !userAgent.includes('Mozilla')) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(response, null, 2)
      };
    }

    // Generate clean HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SumUp Debug Dashboard</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0; padding: 20px; background: #f8f9fa; line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .card { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .status { padding: 12px; border-radius: 6px; margin: 10px 0; font-weight: 500; }
        .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .status.warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .status.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric { text-align: center; padding: 15px; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .metric-label { color: #6c757d; text-transform: uppercase; font-size: 0.85em; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: 600; }
        .code { background: #f8f9fa; padding: 15px; border-radius: 4px; font-family: 'Monaco', monospace; font-size: 0.9em; overflow-x: auto; white-space: pre; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
        .btn:hover { background: #0056b3; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
        .error-list { background: #f8d7da; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .error-item { margin: 5px 0; color: #721c24; }
    </style>
    <script>
        function refresh() { window.location.reload(); }
        function toggleAutoRefresh() {
            const btn = document.getElementById('autoBtn');
            if (window.autoRefreshInterval) {
                clearInterval(window.autoRefreshInterval);
                window.autoRefreshInterval = null;
                btn.textContent = 'Start Auto-Refresh';
                btn.style.background = '#28a745';
            } else {
                window.autoRefreshInterval = setInterval(refresh, 30000);
                btn.textContent = 'Stop Auto-Refresh';
                btn.style.background = '#dc3545';
            }
        }
        window.onload = function() {
            // Start auto-refresh by default
            window.autoRefreshInterval = setInterval(refresh, 30000);
        }
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SumUp Payment Debug Dashboard</h1>
            <div class="timestamp">Last updated: ${response.timestamp}</div>
            <div style="margin-top: 15px;">
                <button class="btn" onclick="refresh()">Refresh Now</button>
                <button class="btn" id="autoBtn" onclick="toggleAutoRefresh()" style="background: #dc3545;">Stop Auto-Refresh</button>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <div class="metric">
                    <div class="metric-value">${response.paymentCount}</div>
                    <div class="metric-label">Recent Payments</div>
                </div>
            </div>
            <div class="card">
                <div class="metric">
                    <div class="metric-value">${response.debugLogCount}</div>
                    <div class="metric-label">Debug Log Entries</div>
                </div>
            </div>
            <div class="card">
                <div class="metric">
                    <div class="metric-value">${response.errors.length}</div>
                    <div class="metric-label">Current Errors</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>System Status</h2>
            <div class="status ${response.connection === 'Connected' ? 'success' : 'error'}">
                Database: ${response.connection}
            </div>
            <div class="status info">
                Environment: ${response.environment}
            </div>
            ${response.debugLogNote ? `<div class="status warning">Note: ${response.debugLogNote}</div>` : ''}
        </div>

        ${response.errors.length > 0 ? `
        <div class="card">
            <h2>Current Issues</h2>
            <div class="error-list">
                ${response.errors.map(error => `<div class="error-item">• ${error}</div>`).join('')}
            </div>
        </div>` : ''}

        <div class="card">
            <h2>Recent Payments (Last 10)</h2>
            ${response.payments.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Checkout Ref</th>
                        <th>Webhook</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${response.payments.map(payment => `
                    <tr>
                        <td>${payment.id}</td>
                        <td>${payment.currency || 'EUR'} ${payment.amount}</td>
                        <td><span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8em; background: ${payment.status === 'paid' ? '#d4edda' : '#fff3cd'};">${payment.status || 'unknown'}</span></td>
                        <td>${payment.sumup_checkout_reference || '-'}</td>
                        <td>${payment.webhook_processed_at ? 'YES' : 'NO'}</td>
                        <td>${new Date(payment.created_at).toLocaleString()}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : '<p>No recent payments found.</p>'}
        </div>

        <div class="card">
            <h2>Debug Logs (Last 10)</h2>
            ${response.debugLogs.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Function</th>
                        <th>Level</th>
                        <th>Message</th>
                    </tr>
                </thead>
                <tbody>
                    ${response.debugLogs.map(log => `
                    <tr>
                        <td>${new Date(log.created_at).toLocaleString()}</td>
                        <td>${log.function_name}</td>
                        <td><span style="padding: 2px 6px; border-radius: 3px; font-size: 0.8em; background: ${log.log_level === 'ERROR' ? '#f8d7da' : log.log_level === 'WARN' ? '#fff3cd' : '#d1ecf1'};">${log.log_level}</span></td>
                        <td>${log.message}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : '<p>No debug logs found. ' + (response.debugLogNote || 'Table may not exist yet.') + '</p>'}
        </div>

        <div class="card">
            <h2>Setup Instructions</h2>
            <p><strong>If debug logs table doesn't exist</strong>, run this SQL in your Supabase SQL Editor:</p>
            <div class="code">CREATE TABLE IF NOT EXISTS public.debug_logs (
    id SERIAL PRIMARY KEY,
    function_name VARCHAR(100) NOT NULL,
    execution_id VARCHAR(255) NOT NULL,
    log_level VARCHAR(20) DEFAULT 'INFO',
    message TEXT NOT NULL,
    details JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow debug logs access" ON public.debug_logs FOR ALL USING (true);</div>
            <p><strong>To test duplicate prevention:</strong> Make a real SumUp payment and check that only ONE payment record is created with populated webhook columns.</p>
            <p><strong>API Access:</strong> Add <code>?json=1</code> to the URL for JSON format.</p>
        </div>
    </div>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      body: html
    };

  } catch (error) {
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};