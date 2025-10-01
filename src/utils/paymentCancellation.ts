import { supabase } from '../supabaseClient';

/**
 * Cancel a payment request and update its status to 'cancelled'
 */
export const cancelPaymentRequest = async (paymentRequestId: number, reason?: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    console.log('🚫 Cancelling payment request:', paymentRequestId, 'Reason:', reason || 'User cancelled');

    // Update the payment request status to 'cancelled'
    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled by user',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequestId)
      .neq('status', 'paid'); // Don't cancel already paid requests

    if (updateError) {
      console.error('❌ Failed to cancel payment request:', updateError);
      return {
        success: false,
        error: `Failed to cancel payment request: ${updateError.message}`
      };
    }

    console.log('✅ Payment request cancelled successfully');

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

    // Cancel the payment request
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