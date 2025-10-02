/**
 * IMMEDIATE DUPLICATE CANCELLER - Cancels specific duplicate payments right now
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

    console.log('🚨 IMMEDIATE DUPLICATE CANCELLER ACTIVATED');

    // IMMEDIATELY CANCEL THESE SPECIFIC DUPLICATES FROM USER DATA
    const confirmedDuplicates = [
      { id: 65, reason: 'Duplicate of payment 64 - EUR 15, no checkout ref, paid status' },
      { id: 63, reason: 'Duplicate of payment 62 - EUR 16, no checkout ref, paid status' },
      { id: 59, reason: 'Duplicate of payment 58 - EUR 16, no checkout ref, paid status' },
      { id: 57, reason: 'Duplicate of payment 56 - EUR 60, no checkout ref, paid status' },
      { id: 55, reason: 'Duplicate of payment 54 - EUR 14, no checkout ref, paid status' }
    ];

    let cancelled = 0;
    const results = [];

    for (const duplicate of confirmedDuplicates) {
      try {
        // Check if payment exists and is not already cancelled
        const { data: payment, error: fetchError } = await supabase
          .from('payments')
          .select('id, status, amount, created_at, sumup_checkout_reference')
          .eq('id', duplicate.id)
          .single();

        if (fetchError) {
          results.push({
            id: duplicate.id,
            status: 'NOT_FOUND',
            error: fetchError.message
          });
          continue;
        }

        if (payment.status === 'cancelled') {
          results.push({
            id: duplicate.id,
            status: 'ALREADY_CANCELLED',
            amount: payment.amount
          });
          continue;
        }

        // Cancel the duplicate
        const { error: cancelError } = await supabase
          .from('payments')
          .update({
            status: 'cancelled',
            notes: `[IMMEDIATE CANCEL] ${duplicate.reason} - Cancelled ${new Date().toISOString()}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', duplicate.id);

        if (cancelError) {
          results.push({
            id: duplicate.id,
            status: 'CANCEL_FAILED',
            error: cancelError.message
          });
        } else {
          cancelled++;
          results.push({
            id: duplicate.id,
            status: 'CANCELLED',
            amount: payment.amount,
            reason: duplicate.reason
          });
          console.log(`✅ CANCELLED Payment ${duplicate.id}: ${payment.amount}`);
        }

      } catch (error) {
        results.push({
          id: duplicate.id,
          status: 'ERROR',
          error: error.message
        });
      }
    }

    // Log the action
    const logEntry = {
      function_name: 'immediate-duplicate-canceller',
      execution_id: 'immediate-' + Date.now(),
      log_level: 'CRITICAL',
      message: `IMMEDIATE CANCEL COMPLETED - Cancelled ${cancelled} duplicate payments`,
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
        cancelledCount: cancelled,
        results: results
      }),
      created_at: new Date().toISOString()
    };

    await supabase.from('debug_logs').insert([logEntry]);

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      cancelled: cancelled,
      results: results,
      message: `Immediate cancellation completed - ${cancelled} duplicates cancelled`
    };

    // HTML Response
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>🚨 IMMEDIATE DUPLICATE CANCELLER</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; }
        .critical { background: #dc3545; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .success { background: #28a745; color: white; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; border: 1px solid #dee2e6; text-align: left; }
        th { background: #f8f9fa; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
    </style>
</head>
<body>
    <div class="critical">
        <h1>🚨 IMMEDIATE DUPLICATE CANCELLER</h1>
        <p><strong>URGENT:</strong> Cancelling confirmed duplicate payments immediately</p>
        <p>Executed: ${response.timestamp}</p>
    </div>

    <div class="success">
        <h2>✅ CANCELLATION RESULTS</h2>
        <p><strong>Duplicates Cancelled:</strong> ${response.cancelled}</p>
        <p><strong>Total Processed:</strong> ${response.results.length}</p>
    </div>

    <div class="card">
        <h2>CANCELLATION DETAILS</h2>
        <table>
            <thead><tr><th>Payment ID</th><th>Status</th><th>Amount</th><th>Reason</th></tr></thead>
            <tbody>
                ${response.results.map(result => `
                <tr>
                    <td>${result.id}</td>
                    <td style="color: ${result.status === 'CANCELLED' ? '#28a745' : result.status.includes('ALREADY') ? '#6c757d' : '#dc3545'}">${result.status}</td>
                    <td>${result.amount || '-'}</td>
                    <td>${result.reason || result.error || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="card">
        <h2>NEXT STEPS</h2>
        <p><strong>1.</strong> Refresh your payment dashboard to verify cancellations</p>
        <p><strong>2.</strong> Investigate why duplicate prevention isn't working</p>
        <p><strong>3.</strong> Fix the root cause in SumUp webhook processing</p>
        <a href="https://uat--khtherapy.netlify.app/.netlify/functions/debug-clean" class="btn" target="_blank">VIEW PAYMENT DASHBOARD</a>
        <button class="btn" onclick="window.location.reload()">REFRESH STATUS</button>
    </div>
</body>
</html>`;

    const userAgent = event.headers['user-agent'] || '';
    const query = event.queryStringParameters || {};
    
    if (userAgent.includes('Mozilla') && !query.json) {
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
    console.error('Immediate canceller error:', error);
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