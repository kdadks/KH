/**
 * CRITICAL DEBUG: Direct database logging test
 * This bypasses the complex debug logger to see what's really happening
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
    // Initialize Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // CRITICAL: Direct log entry
    const directLogEntry = {
      function_name: 'critical-debug',
      execution_id: 'critical-' + Date.now(),
      log_level: 'CRITICAL',
      message: 'CRITICAL DEBUG - Testing direct database logging',
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
        issue: 'Debug logs not populating despite fixes',
        duplicateStatus: 'STILL HAPPENING - Payments 63 and 62 are duplicates',
        webhookStatus: 'NO webhook columns populated',
        emergencyBlockerStatus: 'Worked once but duplicates continuing'
      }),
      created_at: new Date().toISOString()
    };

    console.log('🚨 CRITICAL DEBUG: Inserting direct log entry...');
    
    const { data: logResult, error: logError } = await supabase
      .from('debug_logs')
      .insert([directLogEntry])
      .select();

    if (logError) {
      console.error('❌ CRITICAL: Cannot insert debug log:', logError);
    } else {
      console.log('✅ CRITICAL: Successfully inserted debug log ID:', logResult?.[0]?.id);
    }

    // Check recent payments for duplicates
    const { data: recentPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, customer_id, created_at, status, sumup_checkout_reference')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Find and automatically cancel duplicates
    const duplicateGroups = {};
    let duplicatesCancelled = 0;

    if (recentPayments) {
      recentPayments.forEach(payment => {
        const key = `${payment.customer_id}_${payment.amount}`;
        if (!duplicateGroups[key]) {
          duplicateGroups[key] = [];
        }
        duplicateGroups[key].push(payment);
      });

      // Cancel duplicates
      for (const [key, payments] of Object.entries(duplicateGroups)) {
        if (payments.length > 1) {
          const sortedPayments = payments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          const duplicates = sortedPayments.slice(1); // Keep first, cancel rest

          for (const duplicate of duplicates) {
            if (duplicate.status !== 'cancelled') {
              const { error: cancelError } = await supabase
                .from('payments')
                .update({
                  status: 'cancelled',
                  notes: '[AUTO-CANCELLED DUPLICATE] ' + new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', duplicate.id);

              if (!cancelError) {
                duplicatesCancelled++;
                console.log(`✅ CANCELLED DUPLICATE: Payment ${duplicate.id} (EUR ${duplicate.amount})`);
              }
            }
          }
        }
      }
    }

    // Check debug logs count
    const { data: debugLogsCount, error: countError } = await supabase
      .from('debug_logs')
      .select('count')
      .single();

    const { data: debugLogs, error: logsError } = await supabase
      .from('debug_logs')
      .select('id, function_name, log_level, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      criticalStatus: {
        directLogInserted: !logError,
        logInsertId: logResult?.[0]?.id,
        logInsertError: logError?.message,
        debugLogsTotal: debugLogsCount?.count || 0,
        debugLogsFound: debugLogs?.length || 0,
        duplicatesCancelled: duplicatesCancelled,
        recentPaymentsCount: recentPayments?.length || 0
      },
      recentDebugLogs: debugLogs || [],
      duplicateAnalysis: Object.entries(duplicateGroups).map(([key, payments]) => ({
        key,
        count: payments.length,
        isDuplicate: payments.length > 1,
        payments: payments.map(p => ({ id: p.id, status: p.status, created: p.created_at }))
      }))
    };

    // HTML response
    const userAgent = event.headers['user-agent'] || '';
    const query = event.queryStringParameters || {};
    
    if (userAgent.includes('Mozilla') && !query.json) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CRITICAL DEBUG STATUS</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; }
        .critical { background: #dc3545; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .success { background: #28a745; color: white; padding: 15px; border-radius: 4px; }
        .warning { background: #ffc107; color: #212529; padding: 15px; border-radius: 4px; }
        .info { background: #17a2b8; color: white; padding: 15px; border-radius: 4px; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; border: 1px solid #dee2e6; text-align: left; }
        th { background: #f8f9fa; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
    </style>
    <script>
        function refresh() { window.location.reload(); }
        setInterval(refresh, 10000);
    </script>
</head>
<body>
    <div class="critical">
        <h1>🚨 CRITICAL DEBUG STATUS</h1>
        <p><strong>URGENT:</strong> Investigating debug logging and duplicate payment issues</p>
        <p>Auto-refreshes every 10 seconds | ${response.timestamp}</p>
        <button class="btn" onclick="refresh()" style="background: white; color: #dc3545;">REFRESH NOW</button>
    </div>

    <div class="card">
        <h2>DEBUG LOGGING TEST</h2>
        <div class="${response.criticalStatus.directLogInserted ? 'success' : 'warning'}">
            <strong>Direct Log Insert:</strong> ${response.criticalStatus.directLogInserted ? 'SUCCESS' : 'FAILED'}
            ${response.criticalStatus.logInsertId ? ` (ID: ${response.criticalStatus.logInsertId})` : ''}
            ${response.criticalStatus.logInsertError ? ` - Error: ${response.criticalStatus.logInsertError}` : ''}
        </div>
        <p><strong>Total Debug Logs in DB:</strong> ${response.criticalStatus.debugLogsTotal}</p>
        <p><strong>Recent Debug Logs Found:</strong> ${response.criticalStatus.debugLogsFound}</p>
    </div>

    <div class="card">
        <h2>DUPLICATE PAYMENT STATUS</h2>
        <div class="${response.criticalStatus.duplicatesCancelled > 0 ? 'warning' : 'info'}">
            <strong>Duplicates Auto-Cancelled:</strong> ${response.criticalStatus.duplicatesCancelled}
        </div>
        <p><strong>Recent Payments Checked:</strong> ${response.criticalStatus.recentPaymentsCount}</p>
        
        ${response.duplicateAnalysis.filter(d => d.isDuplicate).length > 0 ? `
        <h3>DUPLICATE GROUPS FOUND:</h3>
        <table>
            <thead><tr><th>Group</th><th>Count</th><th>Payment IDs</th></tr></thead>
            <tbody>
                ${response.duplicateAnalysis.filter(d => d.isDuplicate).map(dup => `
                <tr>
                    <td>${dup.key}</td>
                    <td>${dup.count}</td>
                    <td>${dup.payments.map(p => `${p.id}(${p.status})`).join(', ')}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>` : '<p class="success">No duplicate groups found in recent payments</p>'}
    </div>

    <div class="card">
        <h2>RECENT DEBUG LOGS</h2>
        ${response.recentDebugLogs.length > 0 ? `
        <table>
            <thead><tr><th>Time</th><th>Function</th><th>Level</th><th>Message</th></tr></thead>
            <tbody>
                ${response.recentDebugLogs.map(log => `
                <tr>
                    <td>${new Date(log.created_at).toLocaleString()}</td>
                    <td>${log.function_name}</td>
                    <td>${log.log_level}</td>
                    <td>${log.message}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>` : '<p>No debug logs found</p>'}
    </div>

    <div class="card">
        <h2>IMMEDIATE ACTIONS NEEDED</h2>
        <div class="warning">
            <h3>CRITICAL ISSUES IDENTIFIED:</h3>
            <ul>
                <li><strong>Duplicates Still Happening:</strong> Payments 63 & 62 are duplicates (€16 each)</li>
                <li><strong>No Webhook Processing:</strong> All webhook columns still empty</li>
                <li><strong>Debug Logging Issues:</strong> May not be capturing SumUp function execution</li>
            </ul>
        </div>
        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Monitor this page for duplicate auto-cancellation</li>
            <li>Check if debug logs populate with direct insertion</li>
            <li>Investigate why SumUp function logs aren't being captured</li>
        </ol>
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
    console.error('Critical debug error:', error);
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