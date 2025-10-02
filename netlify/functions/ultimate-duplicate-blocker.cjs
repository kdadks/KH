/**
 * ULTIMATE DUPLICATE BLOCKER - Database-level duplicate prevention with immediate cancellation
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

    console.log('🛡️ ULTIMATE DUPLICATE BLOCKER ACTIVATED');

    // 1. IMMEDIATE: Cancel payment 69 (newest duplicate)
    const { data: payment69, error: fetch69Error } = await supabase
      .from('payments')
      .select('id, status, amount, created_at')
      .eq('id', 69)
      .single();

    let payment69Result = null;
    if (!fetch69Error && payment69 && payment69.status !== 'cancelled') {
      const { error: cancel69Error } = await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          notes: '[ULTIMATE BLOCKER] Duplicate of payment 68 - EUR 12 - ' + new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', 69);

      payment69Result = {
        success: !cancel69Error,
        error: cancel69Error?.message
      };
    }

    // 2. SCAN FOR ALL DUPLICATES in last 48 hours
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: recentPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, customer_id, created_at, status, sumup_checkout_reference, notes, payment_request_id')
      .gte('created_at', twoDaysAgo)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    let duplicatesFound = 0;
    let duplicatesCancelled = 0;
    const duplicateAnalysis = [];

    if (recentPayments) {
      // Group by multiple criteria to catch all duplicate patterns
      const groups = {};
      
      recentPayments.forEach(payment => {
        // Group by customer + amount + same hour
        const hour = new Date(payment.created_at).toISOString().substring(0, 13); // YYYY-MM-DDTHH
        const key1 = `${payment.customer_id}_${payment.amount}_${hour}`;
        
        // Group by payment_request_id if available
        const key2 = payment.payment_request_id ? `pr_${payment.payment_request_id}` : null;
        
        [key1, key2].filter(Boolean).forEach(key => {
          if (!groups[key]) groups[key] = [];
          groups[key].push(payment);
        });
      });

      // Process duplicate groups
      for (const [groupKey, payments] of Object.entries(groups)) {
        if (payments.length > 1) {
          // Remove duplicates from array (same payment in multiple groups)
          const uniquePayments = payments.filter((payment, index, self) =>
            index === self.findIndex(p => p.id === payment.id)
          );
          
          if (uniquePayments.length > 1) {
            duplicatesFound++;
            
            // Sort by created_at to keep the oldest
            const sortedPayments = uniquePayments.sort((a, b) => 
              new Date(a.created_at) - new Date(b.created_at)
            );
            
            // Keep the first one (preferably with checkout reference)
            const toKeep = sortedPayments.find(p => p.sumup_checkout_reference) || sortedPayments[0];
            const toCancel = sortedPayments.filter(p => p.id !== toKeep.id);
            
            for (const duplicate of toCancel) {
              if (duplicate.status !== 'cancelled') {
                const { error: cancelError } = await supabase
                  .from('payments')
                  .update({
                    status: 'cancelled',
                    notes: `[ULTIMATE BLOCKER] Duplicate in group ${groupKey} - keeping payment ${toKeep.id} - ${new Date().toISOString()}`,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', duplicate.id);

                if (!cancelError) {
                  duplicatesCancelled++;
                }
              }
            }
            
            duplicateAnalysis.push({
              groupKey,
              totalPayments: uniquePayments.length,
              keptPayment: toKeep.id,
              cancelledPayments: toCancel.map(p => p.id)
            });
          }
        }
      }
    }

    // 3. ADD DATABASE TRIGGER (PostgreSQL function to prevent future duplicates)
    const triggerSQL = `
      CREATE OR REPLACE FUNCTION prevent_duplicate_payments()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Check for existing payment with same customer + amount in last hour
        IF EXISTS (
          SELECT 1 FROM payments 
          WHERE customer_id = NEW.customer_id 
          AND amount = NEW.amount 
          AND created_at >= NOW() - INTERVAL '1 hour'
          AND status != 'cancelled'
          AND id != COALESCE(NEW.id, 0)
        ) THEN
          RAISE EXCEPTION 'Duplicate payment detected: customer % amount % in last hour', NEW.customer_id, NEW.amount;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      DROP TRIGGER IF EXISTS prevent_duplicates ON payments;
      CREATE TRIGGER prevent_duplicates
        BEFORE INSERT OR UPDATE ON payments
        FOR EACH ROW
        EXECUTE FUNCTION prevent_duplicate_payments();
    `;

    // Try to create the database trigger (may fail due to permissions)
    let triggerResult = null;
    try {
      const { error: triggerError } = await supabase.rpc('exec_sql', { sql: triggerSQL });
      triggerResult = {
        success: !triggerError,
        error: triggerError?.message
      };
    } catch (err) {
      triggerResult = {
        success: false,
        error: 'Database trigger creation not supported or insufficient permissions'
      };
    }

    // 4. LOG THE ACTION
    await supabase.from('debug_logs').insert([{
      function_name: 'ultimate-duplicate-blocker',
      execution_id: 'ultimate-' + Date.now(),
      log_level: 'CRITICAL',
      message: `ULTIMATE DUPLICATE BLOCKER - Found ${duplicatesFound} duplicate groups, cancelled ${duplicatesCancelled} payments`,
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
        payment69Cancelled: payment69Result?.success,
        duplicatesFound,
        duplicatesCancelled,
        duplicateAnalysis,
        triggerCreated: triggerResult?.success,
        scannedPayments: recentPayments?.length || 0
      }),
      created_at: new Date().toISOString()
    }]);

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      ultimateBlock: {
        payment69Cancelled: payment69Result?.success || false,
        duplicatesFound,
        duplicatesCancelled,
        triggerCreated: triggerResult?.success || false,
        scannedPayments: recentPayments?.length || 0
      },
      duplicateAnalysis,
      triggerResult,
      message: `Ultimate blocker completed - ${duplicatesCancelled} duplicates cancelled, database trigger ${triggerResult?.success ? 'created' : 'failed'}`
    };

    // HTML Response
    const userAgent = event.headers['user-agent'] || '';
    const query = event.queryStringParameters || {};
    
    if (userAgent.includes('Mozilla') && !query.json) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>🛡️ ULTIMATE DUPLICATE BLOCKER</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f8f9fa; }
        .ultimate { background: linear-gradient(135deg, #dc3545, #6f42c1); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
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
    <div class="ultimate">
        <h1>🛡️ ULTIMATE DUPLICATE BLOCKER</h1>
        <p><strong>NUCLEAR OPTION:</strong> Maximum duplicate prevention and cleanup</p>
        <p>Executed: ${response.timestamp}</p>
    </div>

    <div class="success">
        <h2>🚨 ULTIMATE RESULTS</h2>
        <p><strong>Payment 69 Cancelled:</strong> ${response.ultimateBlock.payment69Cancelled ? 'YES' : 'NO'}</p>
        <p><strong>Duplicate Groups Found:</strong> ${response.ultimateBlock.duplicatesFound}</p>
        <p><strong>Payments Cancelled:</strong> ${response.ultimateBlock.duplicatesCancelled}</p>
        <p><strong>Database Trigger:</strong> ${response.ultimateBlock.triggerCreated ? 'CREATED' : 'FAILED'}</p>
        <p><strong>Scanned Payments:</strong> ${response.ultimateBlock.scannedPayments} (last 48h)</p>
    </div>

    <div class="card">
        <h2>DUPLICATE ANALYSIS</h2>
        ${response.duplicateAnalysis.length > 0 ? `
        <table>
            <thead><tr><th>Group</th><th>Total</th><th>Kept</th><th>Cancelled</th></tr></thead>
            <tbody>
                ${response.duplicateAnalysis.map(group => `
                <tr>
                    <td>${group.groupKey}</td>
                    <td>${group.totalPayments}</td>
                    <td>${group.keptPayment}</td>
                    <td>${group.cancelledPayments.join(', ')}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>` : '<p>No duplicate groups found</p>'}
    </div>

    <div class="card">
        <h2>🛡️ PROTECTION STATUS</h2>
        <div class="${response.ultimateBlock.triggerCreated ? 'success' : 'warning'}">
            <h3>Database Trigger</h3>
            <p><strong>Status:</strong> ${response.ultimateBlock.triggerCreated ? 'ACTIVE - Future duplicates will be blocked at database level' : 'FAILED - Manual monitoring required'}</p>
            ${response.triggerResult?.error ? `<p><strong>Error:</strong> ${response.triggerResult.error}</p>` : ''}
        </div>
        
        <h3>Multi-Layer Protection Active:</h3>
        <ul>
            <li>✅ Return URL duplicate checking</li>
            <li>✅ Webhook duplicate checking</li>
            <li>✅ Ultimate blocker monitoring</li>
            <li>${response.ultimateBlock.triggerCreated ? '✅' : '❌'} Database trigger prevention</li>
        </ul>
    </div>

    <div class="card">
        <h2>FINAL RECOMMENDATION</h2>
        <p><strong>Test immediately:</strong> Make a new SumUp payment to verify no duplicates are created</p>
        <p><strong>Monitor:</strong> Check payment dashboard after test payment</p>
        <p><strong>Success criteria:</strong> Only ONE payment record with populated webhook columns</p>
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
    console.error('Ultimate blocker error:', error);
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