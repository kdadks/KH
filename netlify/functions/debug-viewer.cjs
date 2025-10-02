/**
 * Debug Viewer - Shows debug logs and payment status
 * Access this to see what's happening with payments without console access
 * 
 * URL: https://your-site/.netlify/functions/debug-viewer
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const query = event.queryStringParameters || {};
    const limit = parseInt(query.limit) || 50;
    const functionName = query.function || 'sumup-return';
    const executionId = query.execution_id;
    const level = query.level;

    console.log('🔍 Debug viewer request:', { limit, functionName, executionId, level });

    // Build query for debug logs
    let logsQuery = supabase
      .from('debug_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (functionName) {
      logsQuery = logsQuery.eq('function_name', functionName);
    }

    if (executionId) {
      logsQuery = logsQuery.eq('execution_id', executionId);
    }

    if (level) {
      logsQuery = logsQuery.eq('log_level', level);
    }

    const { data: debugLogs, error: logsError } = await logsQuery;

    if (logsError) {
      throw new Error(`Failed to fetch logs: ${logsError.message}`);
    }

    // Get recent payments for context
    const { data: recentPayments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        customer_id,
        amount,
        currency,
        status,
        payment_method,
        sumup_checkout_id,
        sumup_checkout_reference,
        webhook_processed_at,
        sumup_event_type,
        sumup_event_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (paymentsError) {
      console.warn('Warning: Could not fetch payments:', paymentsError.message);
    }

    // Get recent payment requests for context
    const { data: paymentRequests, error: prError } = await supabase
      .from('payment_requests')
      .select(`
        id,
        customer_id,
        amount,
        currency,
        status,
        checkout_reference,
        sumup_checkout_id,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (prError) {
      console.warn('Warning: Could not fetch payment requests:', prError.message);
    }

    // Count duplicates
    const { data: duplicates, error: dupError } = await supabase
      .rpc('count_duplicate_payments')
      .single();

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalLogs: debugLogs?.length || 0,
        recentPayments: recentPayments?.length || 0,
        recentPaymentRequests: paymentRequests?.length || 0,
        duplicateInfo: dupError ? 'Could not check duplicates' : duplicates
      },
      debugLogs: debugLogs || [],
      recentPayments: recentPayments || [],
      recentPaymentRequests: paymentRequests || [],
      queryParams: query,
      instructions: {
        usage: 'Add query parameters to filter logs',
        parameters: {
          limit: 'Number of logs to return (default: 50)',
          function: 'Filter by function name (default: sumup-return)',
          execution_id: 'Show logs for specific execution',
          level: 'Filter by log level (INFO, WARN, ERROR, etc.)'
        },
        examples: [
          '?limit=100 - Show last 100 logs',
          '?level=ERROR - Show only errors',
          '?execution_id=sumup-return_123456 - Show specific execution'
        ]
      }
    };

    // Generate HTML if browser request
    const userAgent = event.headers['user-agent'] || '';
    const isBrowser = userAgent.includes('Mozilla') && !userAgent.includes('curl');

    if (isBrowser && !query.json) {
      const html = generateDebugHTML(response);
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html'
        },
        body: html
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    console.error('❌ Debug viewer error:', error);

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

function generateDebugHTML(data) {
  const logs = data.debugLogs.map(log => `
    <tr class="${getLogRowClass(log.log_level)}">
      <td>${new Date(log.created_at).toLocaleString()}</td>
      <td><span class="badge ${log.log_level.toLowerCase()}">${log.log_level}</span></td>
      <td>${log.message}</td>
      <td><pre>${log.details ? JSON.stringify(JSON.parse(log.details), null, 2) : ''}</pre></td>
      <td><code>${log.execution_id}</code></td>
    </tr>
  `).join('');

  const payments = data.recentPayments.map(payment => `
    <tr>
      <td>${payment.id}</td>
      <td>€${payment.amount}</td>
      <td><span class="badge ${payment.status}">${payment.status}</span></td>
      <td>${payment.sumup_checkout_reference || '-'}</td>
      <td>${payment.webhook_processed_at ? '✅' : '❌'}</td>
      <td>${new Date(payment.created_at).toLocaleString()}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
    <title>SumUp Payment Debug Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric { padding: 15px; border-radius: 6px; text-align: center; }
        .metric.info { background: #e3f2fd; }
        .metric.success { background: #e8f5e8; }
        .metric.warning { background: #fff3e0; }
        .metric.error { background: #ffebee; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .badge.info { background: #2196f3; color: white; }
        .badge.warn { background: #ff9800; color: white; }
        .badge.error { background: #f44336; color: white; }
        .badge.debug { background: #9c27b0; color: white; }
        .badge.paid { background: #4caf50; color: white; }
        .badge.pending { background: #ff9800; color: white; }
        .badge.failed { background: #f44336; color: white; }
        .log-error { background: #ffebee; }
        .log-warn { background: #fff3e0; }
        pre { font-size: 12px; max-width: 300px; overflow: auto; white-space: pre-wrap; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-size: 12px; }
        .refresh-btn { background: #2196f3; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .refresh-btn:hover { background: #1976d2; }
        h1, h2 { color: #333; }
        .timestamp { color: #666; font-size: 14px; }
    </style>
    <script>
        function refresh() { window.location.reload(); }
        setInterval(refresh, 30000); // Auto-refresh every 30 seconds
    </script>
</head>
<body>
    <div class="container">
        <h1>🔍 SumUp Payment Debug Dashboard</h1>
        <div class="timestamp">Last updated: ${data.timestamp} | Auto-refreshes every 30 seconds</div>
        <button class="refresh-btn" onclick="refresh()">🔄 Refresh Now</button>

        <div class="card">
            <h2>📊 Summary</h2>
            <div class="summary">
                <div class="metric info">
                    <h3>${data.summary.totalLogs}</h3>
                    <p>Debug Logs</p>
                </div>
                <div class="metric success">
                    <h3>${data.summary.recentPayments}</h3>
                    <p>Recent Payments</p>
                </div>
                <div class="metric warning">
                    <h3>${data.summary.recentPaymentRequests}</h3>
                    <p>Payment Requests</p>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>💳 Recent Payments</h2>
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
                    ${payments || '<tr><td colspan="6">No payments found</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="card">
            <h2>📝 Debug Logs</h2>
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Level</th>
                        <th>Message</th>
                        <th>Details</th>
                        <th>Execution ID</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs || '<tr><td colspan="5">No logs found</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="card">
            <h2>ℹ️ Usage Instructions</h2>
            <p>Add query parameters to filter the data:</p>
            <ul>
                <li><code>?limit=100</code> - Show last 100 logs</li>
                <li><code>?level=ERROR</code> - Show only error logs</li>
                <li><code>?execution_id=xyz</code> - Show logs for specific execution</li>
                <li><code>?json=1</code> - Return JSON instead of HTML</li>
            </ul>
        </div>
    </div>
</body>
</html>
  `;
}

function getLogRowClass(level) {
  switch(level) {
    case 'ERROR':
    case 'CRITICAL':
      return 'log-error';
    case 'WARN':
      return 'log-warn';
    default:
      return '';
  }
}