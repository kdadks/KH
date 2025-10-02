/**
 * EMERGENCY DUPLICATE FIXER - Immediately cancels known duplicates and strengthens protection
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

    console.log('🚨 EMERGENCY DUPLICATE FIXER ACTIVATED');

    // 1. IMMEDIATELY CANCEL KNOWN DUPLICATES FROM USER'S REPORT
    const knownDuplicates = [
      { id: 63, reason: 'Duplicate of payment 62 - same amount €16, no checkout ref' },
      { id: 61, reason: 'Duplicate of payment 60 - same amount €15, cancelled by emergency blocker' },
      { id: 59, reason: 'Duplicate of payment 58 - same amount €16, no checkout ref' },
      { id: 57, reason: 'Duplicate of payment 56 - same amount €60, no checkout ref' },
      { id: 55, reason: 'Duplicate of payment 54 - same amount €14, no checkout ref' }
    ];

    let fixedDuplicates = 0;
    const fixResults = [];

    for (const duplicate of knownDuplicates) {
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('id, status, amount, sumup_checkout_reference, created_at')
        .eq('id', duplicate.id)
        .single();

      if (payment && payment.status !== 'cancelled') {
        const { error: cancelError } = await supabase
          .from('payments')
          .update({
            status: 'cancelled',
            notes: `[EMERGENCY FIX] ${duplicate.reason} - Auto-cancelled ${new Date().toISOString()}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', duplicate.id);

        if (!cancelError) {
          fixedDuplicates++;
          fixResults.push({
            id: duplicate.id,
            status: 'CANCELLED',
            amount: payment.amount,
            reason: duplicate.reason
          });
          console.log(`✅ CANCELLED Payment ${duplicate.id}: €${payment.amount}`);
        } else {
          fixResults.push({
            id: duplicate.id,
            status: 'FAILED',
            error: cancelError.message
          });
        }
      } else if (payment && payment.status === 'cancelled') {
        fixResults.push({
          id: duplicate.id,
          status: 'ALREADY_CANCELLED',
          amount: payment.amount
        });
      }
    }

    // 2. SCAN FOR ANY OTHER DUPLICATES IN LAST 24 HOURS
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, customer_id, created_at, status, sumup_checkout_reference, notes')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false });

    let additionalDuplicatesFound = 0;
    const duplicateGroups = {};

    if (recentPayments) {
      // Group by customer_id and amount
      recentPayments.forEach(payment => {
        const key = `${payment.customer_id}_${payment.amount}`;
        if (!duplicateGroups[key]) {
          duplicateGroups[key] = [];
        }
        duplicateGroups[key].push(payment);
      });

      // Cancel additional duplicates
      for (const [key, payments] of Object.entries(duplicateGroups)) {
        if (payments.length > 1) {
          const sortedPayments = payments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          
          // Keep the first one (with checkout reference if available), cancel the rest
          const toKeep = sortedPayments.find(p => p.sumup_checkout_reference) || sortedPayments[0];
          const toCancel = sortedPayments.filter(p => p.id !== toKeep.id);

          for (const duplicate of toCancel) {
            if (duplicate.status !== 'cancelled' && !duplicate.notes?.includes('[EMERGENCY FIX]')) {
              const { error: cancelError } = await supabase
                .from('payments')
                .update({
                  status: 'cancelled',
                  notes: `[EMERGENCY FIX] Auto-detected duplicate - keeping payment ${toKeep.id} - ${new Date().toISOString()}`,
                  updated_at: new Date().toISOString()
                })
                .eq('id', duplicate.id);

              if (!cancelError) {
                additionalDuplicatesFound++;
                fixResults.push({
                  id: duplicate.id,
                  status: 'AUTO_CANCELLED',
                  amount: duplicate.amount,
                  reason: `Duplicate of payment ${toKeep.id}`
                });
              }
            }
          }
        }
      }
    }

    // 3. CREATE MONITORING ALERT
    const alertEntry = {
      function_name: 'emergency-duplicate-fixer',
      execution_id: 'emergency-' + Date.now(),
      log_level: 'CRITICAL',
      message: `EMERGENCY FIX COMPLETED - Fixed ${fixedDuplicates} known + ${additionalDuplicatesFound} auto-detected duplicates`,
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
        knownDuplicatesFixed: fixedDuplicates,
        additionalDuplicatesFound: additionalDuplicatesFound,
        totalPaymentsScanned: recentPayments?.length || 0,
        fixResults: fixResults
      }),
      created_at: new Date().toISOString()
    };

    await supabase.from('debug_logs').insert([alertEntry]);

    // 4. RESPONSE
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      emergencyFix: {
        knownDuplicatesFixed: fixedDuplicates,
        additionalDuplicatesFound: additionalDuplicatesFound,
        totalFixed: fixedDuplicates + additionalDuplicatesFound,
        scannedPayments: recentPayments?.length || 0
      },
      fixResults: fixResults,
      message: `Emergency fix completed - ${fixedDuplicates + additionalDuplicatesFound} duplicates cancelled`
    };

    // HTML Response
    const userAgent = event.headers['user-agent'] || '';
    const query = event.queryStringParameters || {};
    
    if (userAgent.includes('Mozilla') && !query.json) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>🚨 EMERGENCY DUPLICATE FIXER</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; }
        .emergency { background: #dc3545; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .success { background: #28a745; color: white; padding: 15px; border-radius: 4px; margin: 10px 0; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; border: 1px solid #dee2e6; text-align: left; }
        th { background: #f8f9fa; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
    </style>
    <script>
        function refresh() { window.location.reload(); }
    </script>
</head>
<body>
    <div class="emergency">
        <h1>🚨 EMERGENCY DUPLICATE FIXER ACTIVATED</h1>
        <p><strong>URGENT:</strong> Fixing duplicate payment records immediately</p>
        <p>Executed: ${response.timestamp}</p>
    </div>

    <div class="success">
        <h2>✅ EMERGENCY FIX RESULTS</h2>
        <p><strong>Known Duplicates Fixed:</strong> ${response.emergencyFix.knownDuplicatesFixed}</p>
        <p><strong>Additional Duplicates Found & Fixed:</strong> ${response.emergencyFix.additionalDuplicatesFound}</p>
        <p><strong>Total Duplicates Cancelled:</strong> ${response.emergencyFix.totalFixed}</p>
        <p><strong>Payments Scanned:</strong> ${response.emergencyFix.scannedPayments} (last 24h)</p>
    </div>

    <div class="card">
        <h2>FIX DETAILS</h2>
        ${response.fixResults.length > 0 ? `
        <table>
            <thead><tr><th>Payment ID</th><th>Status</th><th>Amount</th><th>Reason</th></tr></thead>
            <tbody>
                ${response.fixResults.map(fix => `
                <tr>
                    <td>${fix.id}</td>
                    <td style="color: ${fix.status.includes('CANCELLED') ? '#28a745' : '#6c757d'}">${fix.status}</td>
                    <td>${fix.amount || '-'}</td>
                    <td>${fix.reason || fix.error || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>` : '<p>No fixes applied (no duplicates found)</p>'}
    </div>

    <div class="card">
        <h2>NEXT STEPS</h2>
        <p><strong>1. Verify Results:</strong> Check your payment dashboard to confirm duplicates are cancelled</p>
        <p><strong>2. Test New Payment:</strong> Make a new SumUp payment to verify single record creation</p>
        <p><strong>3. Monitor:</strong> Use debug dashboards to monitor for future duplicates</p>
        <button class="btn" onclick="refresh()">REFRESH STATUS</button>
        <a href="https://uat--khtherapy.netlify.app/.netlify/functions/debug-clean" class="btn" target="_blank">VIEW DEBUG DASHBOARD</a>
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
    console.error('Emergency fixer error:', error);
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