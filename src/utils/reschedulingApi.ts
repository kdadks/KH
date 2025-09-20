/**
 * Rescheduling Request API Functions
 * Handles CRUD operations for booking rescheduling requests
 */

import { supabase } from '../supabaseClient';
import { 
  ReschedulingRequest, 
  ReschedulingRequestWithDetails,
  validateReschedulingRequest,
  canRescheduleBooking,
  isBookingEligibleForRescheduling 
} from '../utils/reschedulingValidation';

/**
 * Submit a new rescheduling request
 * @param requestData - The rescheduling request data
 * @returns {Promise} Result of the operation
 */
export const submitReschedulingRequest = async (requestData: {
  bookingId: string;
  originalDate: string;
  originalTime: string;
  newDate: string;
  newTime: string;
  reason?: string;
  customerNotes?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    // Validate the request data
    const validation = validateReschedulingRequest(requestData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }

    // Get booking details to verify eligibility
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_id, appointment_date, appointment_time, booking_status, booking_reference')
      .eq('id', requestData.bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }

    // Check if booking status allows rescheduling
    if (!isBookingEligibleForRescheduling(booking.booking_status)) {
      return {
        success: false,
        error: `Bookings with status "${booking.booking_status}" cannot be rescheduled`
      };
    }

    // Double-check the 24-hour rule using actual booking data
    if (!canRescheduleBooking(booking.appointment_date, booking.appointment_time)) {
      return {
        success: false,
        error: 'Rescheduling must be requested at least 24 hours before the appointment'
      };
    }

    // Check if there's already a pending request for this booking
    const { data: existingRequest, error: existingError } = await supabase
      .from('rescheduling_requests')
      .select('id, status')
      .eq('booking_id', requestData.bookingId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing requests:', existingError);
      return {
        success: false,
        error: 'Error checking existing rescheduling requests'
      };
    }

    if (existingRequest) {
      return {
        success: false,
        error: 'There is already a pending rescheduling request for this booking'
      };
    }

    // Create the rescheduling request
    const newRequest: Partial<ReschedulingRequest> = {
      bookingId: requestData.bookingId,
      customerId: booking.customer_id,
      originalAppointmentDate: booking.appointment_date,
      originalAppointmentTime: booking.appointment_time,
      requestedAppointmentDate: requestData.newDate,
      requestedAppointmentTime: requestData.newTime,
      rescheduleReason: requestData.reason,
      customerNotes: requestData.customerNotes,
      status: 'pending'
    };

    const { data: createdRequest, error: createError } = await supabase
      .from('rescheduling_requests')
      .insert([{
        booking_id: newRequest.bookingId,
        customer_id: newRequest.customerId,
        original_appointment_date: newRequest.originalAppointmentDate,
        original_appointment_time: newRequest.originalAppointmentTime,
        requested_appointment_date: newRequest.requestedAppointmentDate,
        requested_appointment_time: newRequest.requestedAppointmentTime,
        reschedule_reason: newRequest.rescheduleReason,
        customer_notes: newRequest.customerNotes,
        status: newRequest.status
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating rescheduling request:', createError);
      return {
        success: false,
        error: 'Failed to create rescheduling request'
      };
    }

    // TODO: Send notification email to admin
    // This will be implemented in the next step

    return {
      success: true,
      data: createdRequest
    };

  } catch (error) {
    console.error('Error submitting rescheduling request:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Get rescheduling requests for a customer
 * @param customerId - The customer ID
 * @returns {Promise} List of rescheduling requests
 */
export const getCustomerReschedulingRequests = async (customerId: number): Promise<{ 
  success: boolean; 
  data?: ReschedulingRequestWithDetails[]; 
  error?: string 
}> => {
  try {
    const { data, error } = await supabase
      .from('rescheduling_requests_with_details')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customer rescheduling requests:', error);
      return {
        success: false,
        error: 'Failed to fetch rescheduling requests'
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('Error getting customer rescheduling requests:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Get all pending rescheduling requests for admin review
 * @returns {Promise} List of pending rescheduling requests
 */
export const getPendingReschedulingRequests = async (): Promise<{ 
  success: boolean; 
  data?: ReschedulingRequestWithDetails[]; 
  error?: string 
}> => {
  try {
    const { data, error } = await supabase
      .from('rescheduling_requests_with_details')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending rescheduling requests:', error);
      return {
        success: false,
        error: 'Failed to fetch pending rescheduling requests'
      };
    }

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('Error getting pending rescheduling requests:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Get all rescheduling requests for admin dashboard
 * @param limit - Maximum number of requests to return
 * @param offset - Number of requests to skip
 * @returns {Promise} List of rescheduling requests
 */
export const getAllReschedulingRequests = async (limit = 50, offset = 0): Promise<{ 
  success: boolean; 
  data?: ReschedulingRequestWithDetails[]; 
  error?: string;
  count?: number;
}> => {
  try {
    const { data, error, count } = await supabase
      .from('rescheduling_requests_with_details')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching all rescheduling requests:', error);
      return {
        success: false,
        error: 'Failed to fetch rescheduling requests'
      };
    }

    return {
      success: true,
      data: data || [],
      count: count || 0
    };

  } catch (error) {
    console.error('Error getting all rescheduling requests:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Approve a rescheduling request and update the booking
 * @param requestId - The rescheduling request ID
 * @param adminUserId - The admin user ID processing the request
 * @param adminNotes - Optional admin notes
 * @returns {Promise} Result of the operation
 */
export const approveReschedulingRequest = async (
  requestId: string,
  adminUserId: string,
  adminNotes?: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    // Get the rescheduling request details
    const { data: request, error: requestError } = await supabase
      .from('rescheduling_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return {
        success: false,
        error: 'Rescheduling request not found or already processed'
      };
    }

    // Start a transaction-like operation
    // First, update the booking with new date and time
    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        appointment_date: request.requested_appointment_date,
        appointment_time: request.requested_appointment_time,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.booking_id);

    if (bookingUpdateError) {
      console.error('Error updating booking:', bookingUpdateError);
      return {
        success: false,
        error: 'Failed to update booking'
      };
    }

    // Then, update the rescheduling request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('rescheduling_requests')
      .update({
        status: 'approved',
        admin_user_id: adminUserId,
        admin_notes: adminNotes,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating rescheduling request:', updateError);
      return {
        success: false,
        error: 'Failed to update rescheduling request'
      };
    }

    // TODO: Send approval notification emails with updated ICS
    // This will be implemented in the next step

    return {
      success: true,
      data: updatedRequest
    };

  } catch (error) {
    console.error('Error approving rescheduling request:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Reject a rescheduling request
 * @param requestId - The rescheduling request ID
 * @param adminUserId - The admin user ID processing the request
 * @param adminNotes - Optional admin notes explaining the rejection
 * @returns {Promise} Result of the operation
 */
export const rejectReschedulingRequest = async (
  requestId: string,
  adminUserId: string,
  adminNotes?: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const { data: updatedRequest, error: updateError } = await supabase
      .from('rescheduling_requests')
      .update({
        status: 'rejected',
        admin_user_id: adminUserId,
        admin_notes: adminNotes,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError || !updatedRequest) {
      console.error('Error rejecting rescheduling request:', updateError);
      return {
        success: false,
        error: 'Failed to reject rescheduling request or request not found'
      };
    }

    // TODO: Send rejection notification email
    // This will be implemented in the next step

    return {
      success: true,
      data: updatedRequest
    };

  } catch (error) {
    console.error('Error rejecting rescheduling request:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Cancel a rescheduling request (customer action)
 * @param requestId - The rescheduling request ID
 * @param customerId - The customer ID (for security)
 * @returns {Promise} Result of the operation
 */
export const cancelReschedulingRequest = async (
  requestId: string,
  customerId: number
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const { data: updatedRequest, error: updateError } = await supabase
      .from('rescheduling_requests')
      .update({
        status: 'cancelled',
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('customer_id', customerId)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError || !updatedRequest) {
      console.error('Error cancelling rescheduling request:', updateError);
      return {
        success: false,
        error: 'Failed to cancel rescheduling request or request not found'
      };
    }

    return {
      success: true,
      data: updatedRequest
    };

  } catch (error) {
    console.error('Error cancelling rescheduling request:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Get a specific rescheduling request with details
 * @param requestId - The rescheduling request ID
 * @returns {Promise} Rescheduling request details
 */
export const getReschedulingRequestDetails = async (requestId: string): Promise<{ 
  success: boolean; 
  data?: ReschedulingRequestWithDetails; 
  error?: string 
}> => {
  try {
    const { data, error } = await supabase
      .from('rescheduling_requests_with_details')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: 'Rescheduling request not found'
      };
    }

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('Error getting rescheduling request details:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

export default {
  submitReschedulingRequest,
  getCustomerReschedulingRequests,
  getPendingReschedulingRequests,
  getAllReschedulingRequests,
  approveReschedulingRequest,
  rejectReschedulingRequest,
  cancelReschedulingRequest,
  getReschedulingRequestDetails
};