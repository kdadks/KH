import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Enhanced SumUp payment integration with webhook support and retry mechanisms
 */

export interface EnhancedPaymentRequest {
  customer_id: number;
  booking_id?: number;
  amount: number;
  currency?: string;
  service_name: string;
  customer_email: string;
  notes?: string;
}

export interface PaymentProcessingResult {
  success: boolean;
  payment_request_id?: number;
  checkout_id?: string;
  checkout_url?: string;
  error?: string;
  polling_enabled?: boolean;
}

/**
 * Create payment request with enhanced tracking
 */
export const createEnhancedPaymentRequest = async (
  paymentData: EnhancedPaymentRequest
): Promise<PaymentProcessingResult> => {
  try {
    console.log('🎯 Creating enhanced payment request:', paymentData);

    // Create payment request record
    const { data: paymentRequest, error: requestError } = await supabase
      .from('payment_requests')
      .insert({
        customer_id: paymentData.customer_id,
        booking_id: paymentData.booking_id,
        amount: paymentData.amount,
        currency: paymentData.currency || 'EUR',
        status: 'pending',
        notes: paymentData.notes || `Payment for ${paymentData.service_name}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (requestError) {
      throw new Error(`Failed to create payment request: ${requestError.message}`);
    }

    console.log('✅ Payment request created:', paymentRequest.id);

    // Create SumUp checkout session
    try {
      const checkoutResponse = await fetch('/api/create-sumup-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentData.amount,
          currency: paymentData.currency || 'EUR',
          description: paymentData.service_name,
          checkout_reference: `payment-request-${paymentRequest.id}-${Date.now()}`,
          customer_email: paymentData.customer_email
        })
      });

      if (!checkoutResponse.ok) {
        throw new Error('Failed to create SumUp checkout');
      }

      const checkout = await checkoutResponse.json();

      // Update payment request with checkout ID
      await supabase
        .from('payment_requests')
        .update({
          sumup_checkout_id: checkout.id,
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRequest.id);

      // Initialize status checking for this payment
      await fetch('/.netlify/functions/payment-status-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          paymentRequestId: paymentRequest.id,
          checkoutId: checkout.id
        })
      });

      console.log('🔄 Payment status checking initialized');

      return {
        success: true,
        payment_request_id: paymentRequest.id,
        checkout_id: checkout.id,
        checkout_url: checkout.checkout_url,
        polling_enabled: true
      };

    } catch (checkoutError) {
      console.error('SumUp checkout creation failed:', checkoutError);
      
      // Update payment request status to indicate checkout failure
      await supabase
        .from('payment_requests')
        .update({
          status: 'pending',
          notes: `${paymentData.notes || ''}\nCheckout creation failed: ${checkoutError}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRequest.id);

      return {
        success: false,
        payment_request_id: paymentRequest.id,
        error: `Failed to create payment checkout: ${checkoutError}`,
        polling_enabled: false
      };
    }

  } catch (error) {
    console.error('❌ Enhanced payment request creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Check payment status manually (for immediate verification)
 */
export const checkPaymentStatus = async (paymentRequestId: number): Promise<{
  success: boolean;
  status?: string;
  payment_found?: boolean;
  sumup_status?: string;
  error?: string;
}> => {
  try {
    console.log(`🔍 Checking payment status for request ${paymentRequestId}`);

    // Get payment request details
    const { data: paymentRequest, error: requestError } = await supabase
      .from('payment_requests')
      .select('id, status, sumup_checkout_id, amount')
      .eq('id', paymentRequestId)
      .single();

    if (requestError || !paymentRequest) {
      return {
        success: false,
        error: 'Payment request not found'
      };
    }

    // Check if payment record exists
    const { data: payment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('payment_request_id', paymentRequestId)
      .single();

    // If we have a checkout ID, check SumUp status
    let sumupStatus = null;
    if (paymentRequest.sumup_checkout_id) {
      try {
        const statusResponse = await fetch('/.netlify/functions/payment-status-checker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check_single',
            paymentRequestId: paymentRequestId,
            checkoutId: paymentRequest.sumup_checkout_id
          })
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          sumupStatus = statusData.sumup_status;
        }
      } catch (statusError) {
        console.warn('Failed to check SumUp status:', statusError);
      }
    }

    return {
      success: true,
      status: paymentRequest.status,
      payment_found: !!payment,
      sumup_status: sumupStatus
    };

  } catch (error) {
    console.error('❌ Payment status check failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Retry failed payment processing
 */
export const retryPaymentProcessing = async (paymentRequestId: number): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> => {
  try {
    console.log(`🔄 Retrying payment processing for request ${paymentRequestId}`);

    // Trigger webhook replay or status sync
    const retryResponse = await fetch('/.netlify/functions/payment-status-checker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'retry',
        paymentRequestId: paymentRequestId
      })
    });

    if (!retryResponse.ok) {
      throw new Error('Failed to trigger payment retry');
    }

    await retryResponse.json();

    return {
      success: true,
      message: 'Payment processing retry initiated'
    };

  } catch (error) {
    console.error('❌ Payment retry failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get payment processing statistics
 */
export const getPaymentStatistics = async (days: number = 7): Promise<{
  success: boolean;
  stats?: {
    total_requests: number;
    successful_payments: number;
    failed_payments: number;
    pending_requests: number;
    webhook_failures: number;
    avg_processing_time: number;
  };
  error?: string;
}> => {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [requestsResult, paymentsResult, failuresResult] = await Promise.all([
      supabase
        .from('payment_requests')
        .select('status, created_at, paid_at')
        .gte('created_at', since),
      supabase
        .from('payments')
        .select('status')
        .gte('created_at', since),
      supabase
        .from('payment_failures')
        .select('id')
        .gte('created_at', since)
        .eq('resolved', false)
    ]);

    const requests = requestsResult.data || [];
    const payments = paymentsResult.data || [];
    const failures = failuresResult.data || [];

    // Calculate average processing time
    const completedRequests = requests.filter(r => r.paid_at && r.created_at);
    const processingTimes = completedRequests.map(r => 
      new Date(r.paid_at!).getTime() - new Date(r.created_at).getTime()
    );
    const avgProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length / 1000 / 60 // minutes
      : 0;

    return {
      success: true,
      stats: {
        total_requests: requests.length,
        successful_payments: payments.filter((p: { status: string }) => p.status === 'paid').length,
        failed_payments: payments.filter((p: { status: string }) => p.status === 'failed').length,
        pending_requests: requests.filter(r => r.status === 'pending' || r.status === 'sent').length,
        webhook_failures: failures.length,
        avg_processing_time: Math.round(avgProcessingTime)
      }
    };

  } catch (error) {
    console.error('❌ Failed to get payment statistics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Update payment request with SumUp checkout information
 */
export const linkPaymentRequestToCheckout = async (
  paymentRequestId: number,
  checkoutId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('payment_requests')
      .update({
        sumup_checkout_id: checkoutId,
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequestId);

    if (error) throw error;

    // Initialize payment status checking
    await fetch('/.netlify/functions/payment-status-checker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'initialize',
        paymentRequestId: paymentRequestId,
        checkoutId: checkoutId
      })
    });

    return { success: true };

  } catch (error) {
    console.error('Failed to link payment request to checkout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};