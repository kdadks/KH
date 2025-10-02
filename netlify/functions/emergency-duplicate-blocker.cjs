/**
 * EMERGENCY DUPLICATE PAYMENT BLOCKER
 * This function will immediately check for and prevent duplicate payments
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
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for recent duplicate payments and mark them
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    
    const { data: recentPayments, error } = await supabase
      .from('payments')
      .select('id, amount, customer_id, created_at, status, sumup_checkout_reference, notes')
      .gte('created_at', twentyMinutesAgo)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch recent payments: ' + error.message);
    }

    // Group payments by amount and customer to find duplicates
    const duplicateGroups = {};
    const duplicatesFound = [];
    
    recentPayments.forEach(payment => {
      const key = `${payment.customer_id}_${payment.amount}`;
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push(payment);
    });

    // Process duplicate groups
    for (const [key, payments] of Object.entries(duplicateGroups)) {
      if (payments.length > 1) {
        // Sort by creation time - keep the first one, mark others as duplicates
        const sortedPayments = payments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const originalPayment = sortedPayments[0];
        const duplicatePayments = sortedPayments.slice(1);

        for (const duplicate of duplicatePayments) {
          if (!duplicate.notes?.includes('DUPLICATE')) {
            // Mark as duplicate
            const { error: updateError } = await supabase
              .from('payments')
              .update({
                status: 'cancelled',
                notes: (duplicate.notes || '') + ' [DUPLICATE - AUTO-CANCELLED]',
                updated_at: new Date().toISOString()
              })
              .eq('id', duplicate.id);

            if (!updateError) {
              duplicatesFound.push({
                duplicateId: duplicate.id,
                originalId: originalPayment.id,
                amount: duplicate.amount,
                customerId: duplicate.customer_id
              });
            }
          }
        }
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      duplicatesProcessed: duplicatesFound.length,
      duplicatesFound: duplicatesFound,
      totalRecentPayments: recentPayments.length,
      message: duplicatesFound.length > 0 ? 
        `Found and cancelled ${duplicatesFound.length} duplicate payments` :
        'No duplicates found in recent payments'
    };

    // HTML response for browser
    const userAgent = event.headers['user-agent'] || '';
    const query = event.queryStringParameters || {};
    
    if (userAgent.includes('Mozilla') && !query.json) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Emergency Duplicate Payment Blocker</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; }
        .container { max-width: 800px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; border: 1px solid #c3e6cb; }
        .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 4px; border: 1px solid #ffeaa7; }
        .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 4px; border: 1px solid #f5c6cb; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 10px; border: 1px solid #dee2e6; text-align: left; }
        th { background: #f8f9fa; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        .btn.danger { background: #dc3545; }
        .btn.success { background: #28a745; }
    </style>
    <script>
        function refresh() { window.location.reload(); }
        setInterval(refresh, 10000); // Auto-refresh every 10 seconds
    </script>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>EMERGENCY Duplicate Payment Blocker</h1>
            <p><strong>Status:</strong> Active | <strong>Last Check:</strong> ${response.timestamp}</p>
            <p><em>This page auto-refreshes every 10 seconds to monitor for duplicates</em></p>
            <button class="btn" onclick="refresh()">Manual Refresh</button>
        </div>

        <div class="card">
            ${duplicatesFound.length > 0 ? 
              `<div class="warning">
                <h3>DUPLICATES FOUND AND CANCELLED!</h3>
                <p>Found ${duplicatesFound.length} duplicate payments in the last 20 minutes and marked them as cancelled.</p>
              </div>` :
              `<div class="success">
                <h3>No Duplicates Detected</h3>
                <p>Checked ${recentPayments.length} recent payments - no duplicates found.</p>
              </div>`
            }
        </div>

        ${duplicatesFound.length > 0 ? `
        <div class="card">
            <h3>Cancelled Duplicate Payments</h3>
            <table>
                <thead>
                    <tr>
                        <th>Duplicate Payment ID</th>
                        <th>Original Payment ID</th>
                        <th>Amount (EUR)</th>
                        <th>Customer ID</th>
                    </tr>
                </thead>
                <tbody>
                    ${duplicatesFound.map(dup => `
                    <tr>
                        <td>${dup.duplicateId}</td>
                        <td>${dup.originalId}</td>
                        <td>${dup.amount}</td>
                        <td>${dup.customerId}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>` : ''}

        <div class="card">
            <h3>Instructions</h3>
            <p><strong>What this does:</strong></p>
            <ul>
                <li>Checks for duplicate payments in the last 20 minutes</li>
                <li>Automatically cancels duplicate payments</li>
                <li>Keeps the first payment, cancels subsequent ones</li>
                <li>Monitors continuously with auto-refresh</li>
            </ul>
            <p><strong>Next steps:</strong></p>
            <ol>
                <li>Keep this page open while testing payments</li>
                <li>Check your main debug dashboard for overall status</li>
                <li>Monitor for new duplicates being caught and cancelled</li>
            </ol>
            <p><a href="//.netlify/functions/debug-clean" class="btn success">Go to Main Debug Dashboard</a></p>
        </div>
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
    console.error('Emergency blocker error:', error);
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