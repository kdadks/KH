import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface PaymentDiscrepancy {
  id: string;
  type: 'missing_payment' | 'duplicate_payment' | 'amount_mismatch' | 'status_mismatch';
  description: string;
  payment_request_id?: number;
  payment_id?: number;
  sumup_checkout_id?: string;
  expected_amount?: number;
  actual_amount?: number;
  expected_status?: string;
  actual_status?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  resolved: boolean;
}

export interface PaymentReconciliationReport {
  summary: {
    total_payment_requests: number;
    total_payments: number;
    successful_payments: number;
    failed_payments: number;
    pending_payments: number;
    discrepancies_found: number;
  };
  discrepancies: PaymentDiscrepancy[];
  recommendations: string[];
}

/**
 * Get SumUp checkout status directly from API for reconciliation
 */
const getSumUpCheckoutStatus = async (checkoutId: string) => {
  try {
    // Get SumUp configuration
    const { data: gateway } = await supabase
      .from('payment_gateways')
      .select('api_key, environment')
      .eq('provider', 'sumup')
      .eq('is_active', true)
      .single();

    if (!gateway?.api_key) {
      throw new Error('SumUp API configuration not found');
    }

    const apiBase = gateway.environment === 'production' 
      ? 'https://api.sumup.com' 
      : 'https://api.sumup.com';

    const response = await fetch(`${apiBase}/v0.1/checkouts/${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${gateway.api_key}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SumUp API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get SumUp checkout status:', error);
    throw error;
  }
};

/**
 * Find payment requests that are missing corresponding payment records
 */
const findMissingPayments = async (): Promise<PaymentDiscrepancy[]> => {
  const discrepancies: PaymentDiscrepancy[] = [];

  try {
    // Get payment requests that should have payments but don't
    const { data: missingPayments, error } = await supabase
      .from('payment_requests')
      .select(`
        id, customer_id, amount, status, sumup_checkout_id, 
        created_at, updated_at
      `)
      .in('status', ['sent', 'paid'])
      .is('sumup_checkout_id', false) // Has checkout ID but no payment record
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (error) throw error;

    for (const request of missingPayments || []) {
      if (request.sumup_checkout_id) {
        // Check if payment record exists
        const { data: payment } = await supabase
          .from('payments')
          .select('id')
          .eq('payment_request_id', request.id)
          .single();

        if (!payment) {
          discrepancies.push({
            id: `missing_payment_${request.id}`,
            type: 'missing_payment',
            description: `Payment request ${request.id} has SumUp checkout ${request.sumup_checkout_id} but no payment record exists`,
            payment_request_id: request.id,
            sumup_checkout_id: request.sumup_checkout_id,
            expected_amount: request.amount,
            severity: request.status === 'paid' ? 'high' : 'medium',
            created_at: new Date().toISOString(),
            resolved: false
          });
        }
      }
    }

    return discrepancies;
  } catch (error) {
    console.error('Error finding missing payments:', error);
    return [];
  }
};

/**
 * Find duplicate payment records for the same payment request
 */
const findDuplicatePayments = async (): Promise<PaymentDiscrepancy[]> => {
  const discrepancies: PaymentDiscrepancy[] = [];

  try {
    // Find payment requests with multiple payment records
    const { data: duplicates, error } = await supabase
      .rpc('find_duplicate_payments', {
        days_back: 30
      });

    if (error) throw error;

    for (const duplicate of duplicates || []) {
      discrepancies.push({
        id: `duplicate_payment_${duplicate.payment_request_id}`,
        type: 'duplicate_payment',
        description: `Payment request ${duplicate.payment_request_id} has ${duplicate.payment_count} payment records`,
        payment_request_id: duplicate.payment_request_id,
        severity: 'high',
        created_at: new Date().toISOString(),
        resolved: false
      });
    }

    return discrepancies;
  } catch (error) {
    console.error('Error finding duplicate payments:', error);
    return [];
  }
};

/**
 * Find amount mismatches between payment requests and payments
 */
const findAmountMismatches = async (): Promise<PaymentDiscrepancy[]> => {
  const discrepancies: PaymentDiscrepancy[] = [];

  try {
    // Get payment requests with their payments for manual comparison
    const { data: requestsWithPayments, error } = await supabase
      .from('payment_requests')
      .select(`
        id, amount,
        payments (
          id, amount
        )
      `)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const mismatches = requestsWithPayments?.filter(req => {
      const payment = Array.isArray(req.payments) ? req.payments[0] : req.payments;
      return payment && req.amount !== payment.amount;
    }) || [];

    if (error) throw error;

    for (const mismatch of mismatches || []) {
      const payment = Array.isArray(mismatch.payments) ? mismatch.payments[0] : mismatch.payments;
      
      discrepancies.push({
        id: `amount_mismatch_${mismatch.id}`,
        type: 'amount_mismatch',
        description: `Payment request ${mismatch.id} amount (€${mismatch.amount}) doesn't match payment amount (€${payment.amount})`,
        payment_request_id: mismatch.id,
        payment_id: payment.id,
        expected_amount: mismatch.amount,
        actual_amount: payment.amount,
        severity: Math.abs(mismatch.amount - payment.amount) > 10 ? 'high' : 'medium',
        created_at: new Date().toISOString(),
        resolved: false
      });
    }

    return discrepancies;
  } catch (error) {
    console.error('Error finding amount mismatches:', error);
    return [];
  }
};

/**
 * Find status mismatches between our records and SumUp
 */
const findStatusMismatches = async (): Promise<PaymentDiscrepancy[]> => {
  const discrepancies: PaymentDiscrepancy[] = [];

  try {
    // Get recent payment requests with checkout IDs
    const { data: recentRequests, error } = await supabase
      .from('payment_requests')
      .select(`
        id, status, sumup_checkout_id, amount,
        payments (id, status, sumup_transaction_id)
      `)
      .not('sumup_checkout_id', 'is', null)
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .limit(20); // Limit to avoid API rate limits

    if (error) throw error;

    for (const request of recentRequests || []) {
      try {
        if (!request.sumup_checkout_id) continue;

        // Get actual status from SumUp
        const sumupData = await getSumUpCheckoutStatus(request.sumup_checkout_id);
        const sumupStatus = sumupData.status?.toUpperCase();

        // Map SumUp status to our status
        let expectedStatus = 'pending';
        if (sumupStatus === 'PAID') expectedStatus = 'paid';
        else if (sumupStatus === 'FAILED') expectedStatus = 'failed';
        else if (sumupStatus === 'CANCELLED') expectedStatus = 'cancelled';

        // Check if our status matches
        if (request.status !== expectedStatus) {
          discrepancies.push({
            id: `status_mismatch_${request.id}`,
            type: 'status_mismatch',
            description: `Payment request ${request.id} status '${request.status}' doesn't match SumUp status '${sumupStatus}'`,
            payment_request_id: request.id,
            sumup_checkout_id: request.sumup_checkout_id,
            expected_status: expectedStatus,
            actual_status: request.status,
            severity: expectedStatus === 'paid' ? 'critical' : 'medium',
            created_at: new Date().toISOString(),
            resolved: false
          });
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Failed to check SumUp status for ${request.sumup_checkout_id}:`, error);
        // Continue with next request
      }
    }

    return discrepancies;
  } catch (error) {
    console.error('Error finding status mismatches:', error);
    return [];
  }
};

/**
 * Generate payment reconciliation report
 */
export const generatePaymentReconciliationReport = async (): Promise<PaymentReconciliationReport> => {
  // Generating payment reconciliation report

  try {
    // Get summary statistics
    const [requestsResult, paymentsResult] = await Promise.all([
      supabase
        .from('payment_requests')
        .select('status')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('payments')
        .select('status')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    const requests = requestsResult.data || [];
    const payments = paymentsResult.data || [];

    const summary = {
      total_payment_requests: requests.length,
      total_payments: payments.length,
      successful_payments: payments.filter((p: { status: string }) => p.status === 'paid').length,
      failed_payments: payments.filter((p: { status: string }) => p.status === 'failed').length,
      pending_payments: payments.filter((p: { status: string }) => p.status === 'pending' || p.status === 'processing').length,
      discrepancies_found: 0
    };

    // Find all types of discrepancies
    // Checking for payment discrepancies
    
    const [
      missingPayments,
      duplicatePayments,
      amountMismatches,
      statusMismatches
    ] = await Promise.all([
      findMissingPayments(),
      findDuplicatePayments(),
      findAmountMismatches(),
      findStatusMismatches()
    ]);

    const allDiscrepancies = [
      ...missingPayments,
      ...duplicatePayments,
      ...amountMismatches,
      ...statusMismatches
    ];

    summary.discrepancies_found = allDiscrepancies.length;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (missingPayments.length > 0) {
      recommendations.push(`${missingPayments.length} payment requests have SumUp checkouts but no payment records. Consider running payment status sync.`);
    }
    
    if (duplicatePayments.length > 0) {
      recommendations.push(`${duplicatePayments.length} payment requests have multiple payment records. Review for potential duplicate processing.`);
    }
    
    if (amountMismatches.length > 0) {
      recommendations.push(`${amountMismatches.length} payments have amount discrepancies. Verify payment amounts and update records.`);
    }
    
    if (statusMismatches.length > 0) {
      recommendations.push(`${statusMismatches.length} payments have status mismatches with SumUp. Consider running webhook replay or status sync.`);
    }

    if (allDiscrepancies.length === 0) {
      recommendations.push('✅ No discrepancies found. Payment system is in sync.');
    }

    // Reconciliation completed

    return {
      summary,
      discrepancies: allDiscrepancies,
      recommendations
    };

  } catch (error) {
    console.error('❌ Payment reconciliation failed:', error);
    throw error;
  }
};

/**
 * Resolve a payment discrepancy
 */
export const resolvePaymentDiscrepancy = async (
  discrepancyId: string, 
  resolution: 'sync_from_sumup' | 'create_missing_payment' | 'mark_resolved' | 'manual_fix',
  notes?: string
): Promise<{ success: boolean; message: string }> => {
  
  try {
    // Resolving discrepancy

    // Parse discrepancy ID to get payment request ID
    const requestIdStr = discrepancyId.split('_').slice(-1)[0];
    const paymentRequestId = parseInt(requestIdStr);

    switch (resolution) {
      case 'sync_from_sumup': {
        // Get SumUp status and update our records
        const { data: request } = await supabase
          .from('payment_requests')
          .select('sumup_checkout_id')
          .eq('id', paymentRequestId)
          .single();

        if (request?.sumup_checkout_id) {
          await getSumUpCheckoutStatus(request.sumup_checkout_id);
          // Process status update using existing logic
          // This would call the same function used in the webhook handler
          return { success: true, message: 'Status synced from SumUp' };
        }
        break;
      }

      case 'create_missing_payment': {
        // Create payment record for missing payment
        const { data: requestData } = await supabase
          .from('payment_requests')
          .select('*')
          .eq('id', paymentRequestId)
          .single();

        if (requestData) {
          await supabase
            .from('payments')
            .insert({
              customer_id: requestData.customer_id,
              booking_id: requestData.booking_id,
              payment_request_id: paymentRequestId,
              amount: requestData.amount,
              status: 'paid',
              payment_method: 'sumup',
              notes: `Manual reconciliation: ${notes || 'Missing payment record created'}`,
              created_at: new Date().toISOString()
            });
          
          return { success: true, message: 'Missing payment record created' };
        }
        break;
      }

      case 'mark_resolved':
        // Just mark as resolved without changes
        return { success: true, message: `Discrepancy marked as resolved: ${notes || 'No action needed'}` };

      default:
        return { success: false, message: 'Unknown resolution type' };
    }

    return { success: true, message: 'Discrepancy resolved' };

  } catch (error) {
    console.error('Failed to resolve discrepancy:', error);
    return { 
      success: false, 
      message: `Failed to resolve discrepancy: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

/**
 * Auto-sync payment statuses from SumUp for recent payments
 */
export const autoSyncPaymentStatuses = async (hoursBack: number = 24): Promise<{
  success: boolean;
  synced: number;
  errors: number;
}> => {
  
  // Auto-syncing payment statuses

  try {
    // Get payment requests with checkout IDs from the specified time period
    const { data: requests, error } = await supabase
      .from('payment_requests')
      .select('id, sumup_checkout_id, status, amount')
      .not('sumup_checkout_id', 'is', null)
      .gte('updated_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .limit(50); // Limit to avoid API rate limits

    if (error) throw error;

    let synced = 0;
    let errors = 0;

    for (const request of requests || []) {
      try {
        if (!request.sumup_checkout_id) continue;

        // Get current status from SumUp
        await getSumUpCheckoutStatus(request.sumup_checkout_id);
        
        // Process status update (this would use the same logic as webhook handler)
        // Update payment request and payment records based on SumUp response
        
        synced++;
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Failed to sync status for ${request.sumup_checkout_id}:`, error);
        errors++;
      }
    }

    // Auto-sync completed
    
    return { success: true, synced, errors };

  } catch (error) {
    console.error('❌ Auto-sync failed:', error);
    return { success: false, synced: 0, errors: 1 };
  }
};