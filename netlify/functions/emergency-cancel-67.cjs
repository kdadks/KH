/**
 * EMERGENCY PAYMENT 67 CANCELLER - Cancel the newest duplicate immediately
 */

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  try {
    // Initialize Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🚨 EMERGENCY: Cancelling payment 67 (newest duplicate)');

    // Cancel payment 67 specifically
    const { data: payment67, error: fetchError } = await supabase
      .from('payments')
      .select('id, status, amount, created_at')
      .eq('id', 67)
      .single();

    if (fetchError) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Payment 67 not found',
          details: fetchError.message
        })
      };
    }

    if (payment67.status === 'cancelled') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Payment 67 already cancelled',
          payment: payment67
        })
      };
    }

    // Cancel the payment
    const { data: updatedPayment, error: cancelError } = await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        notes: '[EMERGENCY CANCEL] Duplicate of payment 66 - EUR 16, no checkout ref - ' + new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', 67)
      .select()
      .single();

    if (cancelError) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Failed to cancel payment 67',
          details: cancelError.message
        })
      };
    }

    // Log the action
    await supabase.from('debug_logs').insert([{
      function_name: 'emergency-payment-67-canceller',
      execution_id: 'emergency-67-' + Date.now(),
      log_level: 'CRITICAL',
      message: 'EMERGENCY: Cancelled payment 67 (duplicate)',
      details: JSON.stringify({
        cancelledPayment: updatedPayment,
        reason: 'Duplicate of payment 66',
        timestamp: new Date().toISOString()
      }),
      created_at: new Date().toISOString()
    }]);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Payment 67 cancelled successfully',
        action: 'cancelled',
        payment: updatedPayment,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Emergency canceller error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};