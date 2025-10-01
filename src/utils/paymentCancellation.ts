import { supabase } from '../supabaseClient';
import { sendPaymentRequestCancellationEmail } from './emailUtils';

/**
 * Cancel a payment request and update its status to 'cancelled'
 */
export const cancelPaymentRequest = async (paymentRequestId: number, reason?: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    console.log('🚫 Cancelling payment request:', paymentRequestId, 'Reason:', reason || 'User cancelled');

    // First check current status to avoid duplicate operations
    const { data: currentStatus, error: statusError } = await supabase
      .from('payment_requests')
      .select('id, status, notes')
      .eq('id', paymentRequestId)
      .single();

    if (statusError) {
      console.error('❌ Could not fetch payment request status:', statusError);
      return {
        success: false,
        error: `Could not verify payment request status: ${statusError.message}`
      };
    }

    // If already cancelled, don't send another email
    if (currentStatus.status === 'cancelled') {
      console.log('⚠️ Payment request already cancelled, skipping duplicate cancellation');
      return { success: true };
    }

    // If already paid, don't allow cancellation
    if (currentStatus.status === 'paid') {
      console.log('⚠️ Cannot cancel already paid payment request');
      return {
        success: false,
        error: 'Cannot cancel payment request that has already been paid'
      };
    }

    // Update the payment request status to 'cancelled'
    const { data: updatedRecord, error: updateError } = await supabase
      .from('payment_requests')
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled by user',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequestId)
      .eq('status', currentStatus.status) // Only update if status hasn't changed
      .select();

    if (updateError) {
      console.error('❌ Failed to cancel payment request:', updateError);
      return {
        success: false,
        error: `Failed to cancel payment request: ${updateError.message}`
      };
    }

    console.log('✅ Payment request cancelled successfully');
    console.log('📊 Updated record:', updatedRecord);
    console.log('📊 Records affected:', updatedRecord?.length || 0);

    // Verify the cancellation by checking the record
    if (!updatedRecord || updatedRecord.length === 0) {
      console.warn('⚠️ Warning: No records were updated. This might mean:');
      console.warn('   - Payment request was already paid');
      console.warn('   - Payment request ID not found');
      console.warn('   - RLS policy blocked the update');
      
      // Try to fetch the record to see its current status
      const { data: currentRecord, error: fetchError } = await supabase
        .from('payment_requests')
        .select('id, status, updated_at')
        .eq('id', paymentRequestId)
        .single();
        
      if (fetchError) {
        console.error('❌ Could not fetch payment request for verification:', fetchError);
      } else {
        console.log('🔍 Current payment request status:', currentRecord);
      }
    }

    // Send cancellation email if we successfully updated a record
    if (updatedRecord && updatedRecord.length > 0) {
      try {
        // Get customer details for the email
        const { data: paymentRequestWithCustomer, error: fetchError } = await supabase
          .from('payment_requests')
          .select(`
            *,
            customer:customers!payment_requests_customer_id_fkey(
              first_name,
              last_name,
              email
            ),
            booking:bookings!payment_requests_booking_id_fkey(
              booking_date,
              package_name
            )
          `)
          .eq('id', paymentRequestId)
          .single();

        if (fetchError) {
          console.error('❌ Could not fetch payment request details for email:', fetchError);
        } else if (paymentRequestWithCustomer && paymentRequestWithCustomer.customer) {
          console.log('📧 Sending payment cancellation email...');
          
          const emailResult = await sendPaymentRequestCancellationEmail(
            paymentRequestWithCustomer.customer.email,
            {
              customer_name: `${paymentRequestWithCustomer.customer.first_name} ${paymentRequestWithCustomer.customer.last_name}`,
              amount: paymentRequestWithCustomer.amount,
              service_name: paymentRequestWithCustomer.booking?.package_name || paymentRequestWithCustomer.service_name || 'Therapy Service',
              booking_date: paymentRequestWithCustomer.booking?.booking_date,
              booking_id: paymentRequestWithCustomer.booking_id,
              cancellation_reason: reason
            }
          );

          if (emailResult.success) {
            console.log('✅ Payment cancellation email sent successfully');
          } else {
            console.error('❌ Failed to send payment cancellation email:', emailResult.error);
          }
        }
      } catch (emailError) {
        console.error('❌ Error sending payment cancellation email:', emailError);
        // Don't fail the cancellation if email fails
      }
    }

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('paymentRequestCancelled', {
      detail: {
        paymentRequestId,
        reason: reason || 'User cancelled'
      }
    }));

    return { success: true };

  } catch (error) {
    console.error('❌ Error cancelling payment request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Check if a payment request can be cancelled (not already paid)
 */
export const canCancelPaymentRequest = async (paymentRequestId: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('status')
      .eq('id', paymentRequestId)
      .single();

    if (error) {
      console.error('Error checking payment request status:', error);
      return false;
    }

    // Can cancel if not already paid
    return data?.status !== 'paid';
  } catch (error) {
    console.error('Error checking if payment request can be cancelled:', error);
    return false;
  }
};

/**
 * Handle payment modal cancellation with proper cleanup
 */
/**
 * Silent cancel - just update status without sending email (for internal resets)
 */
export const silentCancelPaymentRequest = async (paymentRequestId: number, reason?: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    console.log('🔇 Silent cancelling payment request:', paymentRequestId);
    
    // Check current status
    const { data: currentStatus, error: statusError } = await supabase
      .from('payment_requests')
      .select('id, status')
      .eq('id', paymentRequestId)
      .single();

    if (statusError) {
      return { success: false, error: statusError.message };
    }

    // If already cancelled or paid, no action needed
    if (currentStatus.status === 'cancelled' || currentStatus.status === 'paid') {
      console.log('⚠️ Payment request already in final state:', currentStatus.status);
      return { success: true };
    }

    // Update status without sending email
    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        status: 'cancelled',
        notes: reason ? `Silent cancel: ${reason}` : 'Silently cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequestId)
      .eq('status', currentStatus.status);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    console.log('✅ Payment request silently cancelled');
    return { success: true };
  } catch (error) {
    console.error('❌ Silent cancellation error:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const handlePaymentModalCancellation = async (
  paymentRequestId: number,
  onClose: () => void,
  showMessage?: (message: string) => void
): Promise<void> => {
  try {
    // Check if we can cancel this request
    const canCancel = await canCancelPaymentRequest(paymentRequestId);
    
    if (!canCancel) {
      console.log('Payment request cannot be cancelled (already paid or processed)');
      onClose();
      return;
    }

    // Cancel the payment request with email notification
    const result = await cancelPaymentRequest(paymentRequestId, 'Modal closed by user');
    
    if (result.success) {
      showMessage?.('Payment cancelled. You can try again or contact us for assistance.');
      console.log('Payment request cancelled due to modal close');
    } else {
      console.error('Failed to cancel payment request:', result.error);
    }

    onClose();
  } catch (error) {
    console.error('Error handling payment modal cancellation:', error);
    onClose();
  }
};