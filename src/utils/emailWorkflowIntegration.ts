/**
 * Email Workflow Integration for Payment Processing
 * 
 * This file integrates the email workflow with the existing payment processing system
 * to ensure emails are sent at the correct triggers according to the requirements.
 */

import { supabase } from '../supabaseClient';
import { 
  processBookingEmailWorkflow,
  determinePaymentType,
  validateEmailWorkflowData,
  type BookingEmailData,
  type PaymentEmailData
} from './bookingEmailWorkflow';

/**
 * Generic workflow result interface
 */
interface WorkflowResult {
  success: boolean;
  results: Record<string, unknown>;
  errors: string[];
}

/**
 * Integration function for payment processing
 * Called when a payment is successfully processed
 */
export const integratePaymentEmailWorkflow = async (
  paymentRequestId: number,
  paymentData: {
    amount: number;
    transactionId?: string;
    customerId: number;
    bookingId?: string;
  },
  totalServiceCost: number = 150 // Default service cost for calculation
): Promise<WorkflowResult> => {
  
  try {
    console.log('🔄 Integrating payment email workflow for payment request:', paymentRequestId);

    // Get payment request details with customer and booking info
    const { data: paymentRequest, error: prError } = await supabase
      .from('payment_requests')
      .select(`
        *,
        customer:customers!payment_requests_customer_id_fkey(
          first_name,
          last_name,
          email
        ),
        booking:bookings!inner(
          *
        )
      `)
      .eq('id', paymentRequestId)
      .single();

    if (prError || !paymentRequest) {
      throw new Error(`Failed to get payment request details: ${prError?.message}`);
    }

    // Determine payment type (deposit vs full)
    const paymentType = determinePaymentType(paymentData.amount, totalServiceCost);
    
    // Prepare booking data for email
    const bookingEmailData: BookingEmailData = {
      customer_name: `${paymentRequest.customer.first_name} ${paymentRequest.customer.last_name}`,
      customer_email: paymentRequest.customer.email,
      service_name: paymentRequest.service_name,
      appointment_date: paymentRequest.booking_date || new Date().toLocaleDateString('en-IE'),
      appointment_time: paymentRequest.booking?.timeslot_start_time || 'To be scheduled',
      booking_reference: paymentRequest.booking_reference || paymentRequest.id.toString(),
      booking_id: paymentRequest.booking?.id,
      customer_id: paymentRequest.customer_id,
      therapist_name: 'KH Therapy Team',
      clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
      special_instructions: paymentRequest.booking?.notes
    };

    // Prepare payment data for email
    const paymentEmailData: PaymentEmailData = {
      payment_amount: paymentData.amount,
      payment_type: paymentType,
      transaction_id: paymentData.transactionId,
      remaining_balance: paymentType === 'deposit' ? (totalServiceCost - paymentData.amount) : undefined
    };

    // Validate data before processing
    const validation = validateEmailWorkflowData(bookingEmailData, paymentEmailData);
    if (!validation.isValid) {
      throw new Error(`Email workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Process the appropriate email workflow
    const trigger = paymentType === 'deposit' ? 'deposit_paid' : 'full_paid';
    
    const result = await processBookingEmailWorkflow(
      trigger,
      bookingEmailData,
      paymentEmailData
    );

    console.log('✅ Payment email workflow completed:', trigger, 'Success:', result.success);
    return result;

  } catch (error) {
    console.error('❌ Payment email workflow integration failed:', error);
    return {
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown integration error']
    };
  }
};

/**
 * Integration function for booking creation
 * Called when a new booking is created
 */
export const integrateBookingCreationEmailWorkflow = async (
  bookingId: string,
  _customerId: number,
  paymentRequestId?: number
): Promise<WorkflowResult> => {
  
  try {
    console.log('🔄 Integrating booking creation email workflow for booking:', bookingId);

    // Get booking details with customer info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers!bookings_customer_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Failed to get booking details: ${bookingError?.message}`);
    }

    // Prepare booking data for email
    const bookingEmailData: BookingEmailData = {
      customer_name: `${booking.customer.first_name} ${booking.customer.last_name}`,
      customer_email: booking.customer.email,
      service_name: booking.package_name,
      appointment_date: booking.booking_date || new Date().toLocaleDateString('en-IE'),
      appointment_time: booking.timeslot_start_time || 'To be scheduled',
      booking_reference: booking.booking_reference || `KH-${booking.id}`,
      booking_id: booking.id,
      customer_id: booking.customer_id,
      therapist_name: 'KH Therapy Team',
      clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
      special_instructions: booking.notes
    };

    // Get payment request details if provided
    let paymentEmailData: PaymentEmailData | undefined;
    
    if (paymentRequestId) {
      const { data: paymentRequest, error: prError } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', paymentRequestId)
        .single();

      if (!prError && paymentRequest) {
        paymentEmailData = {
          payment_amount: paymentRequest.amount,
          payment_type: 'deposit', // Assume deposit for new bookings
          payment_url: paymentRequest.payment_url,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IE')
        };
      }
    }

    // Validate data before processing
    const validation = validateEmailWorkflowData(bookingEmailData, paymentEmailData);
    if (!validation.isValid) {
      throw new Error(`Email workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Process booking creation email workflow
    const result = await processBookingEmailWorkflow(
      'booking_created',
      bookingEmailData,
      paymentEmailData
    );

    console.log('✅ Booking creation email workflow completed. Success:', result.success);
    return result;

  } catch (error) {
    console.error('❌ Booking creation email workflow integration failed:', error);
    return {
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown integration error']
    };
  }
};

/**
 * Integration function for admin booking confirmation
 * Called when admin confirms a booking
 */
export const integrateAdminConfirmationEmailWorkflow = async (
  bookingId: string,
  adminEmail?: string
): Promise<WorkflowResult> => {
  
  try {
    // Get booking details with customer info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        package_name,
        booking_date,
        booking_reference,
        customer_id,
        timeslot_start_time,
        notes,
        visit_type,
        customer:customers!bookings_customer_id_fkey(
          first_name,
          last_name,
          email,
          address_line_1,
          address_line_2,
          city,
          county,
          eircode
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Failed to get booking details: ${bookingError?.message}`);
    }

    // Prepare booking data for email with proper date/time formatting
    const formatDateForICS = (dateStr: string | null): string => {
      if (!dateStr) {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return new Date().toISOString().split('T')[0];
        }
        return date.toISOString().split('T')[0];
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    };
    
    const formatTimeForICS = (timeStr: string | null): string => {
      if (!timeStr || timeStr === 'To be scheduled') {
        return '10:00:00'; // Default to 10 AM
      }
      
      // If it's already in HH:MM:SS format, keep it
      if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) {
        return timeStr;
      }
      // If it's in HH:MM format, add seconds
      else if (timeStr.match(/^\d{2}:\d{2}$/)) {
        return timeStr + ':00';
      }
      // If it contains extra text, try to extract time
      else {
        const timeMatch = timeStr.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
          return timeMatch[1].padStart(5, '0') + ':00';
        } else {
          return '10:00:00'; // Fallback
        }
      }
    };

    // Build location/address based on visit type
    let locationDisplay = undefined;
    const visitType = booking.visit_type || 'clinic';
    
    if (visitType === 'clinic') {
      locationDisplay = 'KH Therapy Clinic, Dublin, Ireland';
    } else if (visitType === 'home' && booking.customer) {
      // Build full address for home visits
      const addressParts = [];
      if (booking.customer.address_line_1) addressParts.push(booking.customer.address_line_1);
      if (booking.customer.address_line_2) addressParts.push(booking.customer.address_line_2);
      if (booking.customer.city) addressParts.push(booking.customer.city);
      if (booking.customer.county) addressParts.push(booking.customer.county);
      if (booking.customer.eircode) addressParts.push(booking.customer.eircode);
      locationDisplay = addressParts.length > 0 ? addressParts.join(', ') : undefined;
    }

    const bookingEmailData: BookingEmailData = {
      customer_name: `${booking.customer.first_name} ${booking.customer.last_name}`,
      customer_email: booking.customer.email,
      service_name: booking.package_name,
      appointment_date: formatDateForICS(booking.booking_date),
      appointment_time: formatTimeForICS(booking.timeslot_start_time),
      booking_reference: booking.booking_reference || `KH-${booking.id}`,
      booking_id: booking.id,
      customer_id: booking.customer_id,
      therapist_name: 'KH Therapy Team',
      clinic_address: locationDisplay,
      visit_type: visitType as 'clinic' | 'home' | 'online',
      special_instructions: booking.notes
    };
    
    // Validate data before processing
    const validation = validateEmailWorkflowData(bookingEmailData);
    if (!validation.isValid) {
      throw new Error(`Email workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Process admin confirmation email workflow
    const result = await processBookingEmailWorkflow(
      'admin_confirmed',
      bookingEmailData,
      undefined,
      adminEmail
    );

    return result;

  } catch (error) {
    return {
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown integration error']
    };
  }
};

/**
 * Test function to validate email workflow integration
 */
export const testEmailWorkflowIntegration = async (): Promise<{ 
  success: boolean; 
  results: Record<string, unknown>; 
  errors: string[] 
}> => {
  console.log('🧪 Testing email workflow integration...');
  
  const results: Record<string, unknown> = {};
  const errors: string[] = [];
  let overallSuccess = true;

  try {
    // Test data validation
    const validBookingData: BookingEmailData = {
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      service_name: 'Physiotherapy Session',
      appointment_date: '2024-01-15',
      appointment_time: '10:00',
      booking_reference: 'KH-TEST-123',
      booking_id: 'test-uuid-123',
      customer_id: 456
    };

    const validPaymentData: PaymentEmailData = {
      payment_amount: 30,
      payment_type: 'deposit',
      transaction_id: 'TEST-TXN-123'
    };

    // Test validation function
    const validation = validateEmailWorkflowData(validBookingData, validPaymentData);
    results.validation = validation;
    
    if (!validation.isValid) {
      errors.push(`Validation test failed: ${validation.errors.join(', ')}`);
      overallSuccess = false;
    }

    // Test payment type determination
    const depositType = determinePaymentType(30, 150);
    const fullType = determinePaymentType(150, 150);
    
    results.paymentTypeDetermination = {
      deposit: depositType === 'deposit',
      full: fullType === 'full'
    };

    if (depositType !== 'deposit' || fullType !== 'full') {
      errors.push('Payment type determination test failed');
      overallSuccess = false;
    }

    console.log('✅ Email workflow integration tests completed');
    return { success: overallSuccess, results, errors };

  } catch (error) {
    console.error('❌ Email workflow integration test failed:', error);
    errors.push(error instanceof Error ? error.message : 'Unknown test error');
    return { success: false, results, errors };
  }
};

/**
 * Integration function for booking cancellation
 * Called when admin cancels a booking - handles email notification and payment request cancellation
 */
export const integrateBookingCancellationWorkflow = async (
  bookingId: string,
  cancellationReason?: string,
  refundInfo?: string
): Promise<WorkflowResult> => {
  
  try {
    console.log('🔄 Integrating booking cancellation workflow for booking:', bookingId);

    // Get booking details with customer info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers!bookings_customer_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Failed to get booking details: ${bookingError?.message}`);
    }

    // Check for existing payment requests for this booking
    const { data: paymentRequests, error: prError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('booking_id', bookingId)
      .neq('status', 'cancelled');

    if (prError) {
      console.warn('Failed to get payment requests:', prError.message);
    }

    const hasPaymentRequests = paymentRequests && paymentRequests.length > 0;

    // Update booking status to cancelled
    // Note: updated_at will be automatically set by database trigger if column exists
    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        notes: booking.notes ? `${booking.notes}\n\nCancellation Reason: ${cancellationReason || 'Admin cancellation'}` : `Cancellation Reason: ${cancellationReason || 'Admin cancellation'}`
      })
      .eq('id', bookingId);

    if (updateBookingError) {
      throw new Error(`Failed to update booking status: ${updateBookingError.message}`);
    }

    // Restore availability slot if booking was confirmed and has timeslot information
    let availabilitySlotRestored = false;
    if (booking.status === 'confirmed' && booking.timeslot_start_time && booking.timeslot_end_time && booking.booking_date) {
      console.log('🔍 Finding availability slot to restore for cancelled booking:', bookingId);
      
      // Extract booking date and time from booking_date
      const bookingDate = booking.booking_date.split('T')[0]; // Get YYYY-MM-DD format
      const bookingTime = booking.timeslot_start_time;
      
      // Find matching availability slot
      const { data: availabilitySlots, error: availabilityQueryError } = await supabase
        .from('availability')
        .select('id, date, start_time, end_time, start, is_available')
        .eq('date', bookingDate);

      if (!availabilityQueryError && availabilitySlots && availabilitySlots.length > 0) {
        // Convert booking time to minutes for comparison
        const bookingMinutes = parseInt(bookingTime.substring(0, 2)) * 60 + parseInt(bookingTime.substring(3, 5));

        // Find slot that contains this booking time
        const matchingSlot = availabilitySlots.find(slot => {
          const slotStartTime = slot.start_time || slot.start || '';
          const slotEndTime = slot.end_time || '';

          if (!slotStartTime || !slotEndTime) return false;

          const slotStartMinutes = parseInt(slotStartTime.substring(0, 2)) * 60 + parseInt(slotStartTime.substring(3, 5));
          const slotEndMinutes = parseInt(slotEndTime.substring(0, 2)) * 60 + parseInt(slotEndTime.substring(3, 5));

          return bookingMinutes >= slotStartMinutes && bookingMinutes < slotEndMinutes;
        });

        if (matchingSlot) {
          console.log('🔄 Restoring availability slot after booking cancellation:', matchingSlot.id);

          const { error: availabilityRestoreError } = await supabase
            .from('availability')
            .update({ is_available: true })
            .eq('id', matchingSlot.id);

          if (availabilityRestoreError) {
            console.error('❌ Failed to restore availability slot:', availabilityRestoreError);
            // Don't throw error - booking is already cancelled, just log the issue
          } else {
            console.log('✅ Availability slot restored to available');
            availabilitySlotRestored = true;
          }
        } else {
          console.log('❌ No matching availability slot found to restore - this may be expected if slot was manually created');
        }
      } else {
        console.log('❌ Failed to query availability slots or no slots found for date:', bookingDate);
      }
    } else {
      console.log('ℹ️ Skipping availability slot restoration - booking was not confirmed or missing timeslot info');
    }

    // Cancel all pending payment requests for this booking
    if (hasPaymentRequests) {
      const { error: updatePaymentError } = await supabase
        .from('payment_requests')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          notes: 'Automatically cancelled due to booking cancellation'
        })
        .eq('booking_id', bookingId)
        .neq('status', 'cancelled');

      if (updatePaymentError) {
        console.error('Failed to cancel payment requests:', updatePaymentError.message);
        // Don't throw error here - continue with email sending
      } else {
        console.log('✅ Successfully cancelled pending payment requests for booking:', bookingId);
      }
    }

    // Prepare booking data for email
    const bookingEmailData: BookingEmailData = {
      customer_name: `${booking.customer.first_name} ${booking.customer.last_name}`,
      customer_email: booking.customer.email,
      service_name: booking.package_name,
      appointment_date: booking.booking_date || new Date().toLocaleDateString('en-IE'),
      appointment_time: booking.timeslot_start_time || 'To be scheduled',
      booking_reference: booking.booking_reference || `KH-${booking.id}`,
      booking_id: booking.id,
      customer_id: booking.customer_id,
      therapist_name: 'KH Therapy Team',
      clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
      special_instructions: booking.notes
    };

    // Prepare cancellation data
    const cancellationData = {
      cancellation_reason: cancellationReason,
      has_payment_request: Boolean(hasPaymentRequests),
      refund_info: refundInfo
    };

    // Validate data before processing
    const validation = validateEmailWorkflowData(bookingEmailData);
    if (!validation.isValid) {
      throw new Error(`Email workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Process booking cancellation email workflow
    const result = await processBookingEmailWorkflow(
      'booking_cancelled',
      bookingEmailData,
      undefined,
      undefined,
      cancellationData
    );

    console.log('✅ Booking cancellation workflow completed. Success:', result.success);
    
    // Add information about payment request cancellation and availability slot restoration to results
    result.results.paymentRequestsCancelled = hasPaymentRequests;
    result.results.bookingStatusUpdated = true;
    result.results.availabilitySlotRestored = availabilitySlotRestored;
    
    return result;

  } catch (error) {
    console.error('❌ Booking cancellation workflow integration failed:', error);
    return {
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown integration error']
    };
  }
};

/**
 * Integration function for booking rescheduling workflow
 * Called when a booking is rescheduled by admin or customer
 */
export const integrateBookingReschedulingWorkflow = async (
  bookingId: string,
  newAppointmentDate: string,
  newAppointmentTime: string,
  reschedulingOptions: {
    reschedule_reason?: string;
    reschedule_note?: string;
    rescheduled_by?: 'admin' | 'customer';
    old_appointment_date?: string;
    old_appointment_time?: string;
  } = {}
): Promise<WorkflowResult> => {
  
  try {
    console.log('🔄 Integrating booking rescheduling workflow for booking:', bookingId);

    // First, get the current booking details before updating
    const { data: currentBooking, error: currentBookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (currentBookingError || !currentBooking) {
      throw new Error('Failed to get booking details for rescheduling');
    }

    // Get customer details separately for more reliable query
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', currentBooking.customer_id)
      .single();

    if (customerError || !customer) {
      console.warn('Could not fetch customer details separately, falling back to booking fields');
    }

    // Store old appointment details if not provided - handle both field patterns
    const oldAppointmentDate = reschedulingOptions.old_appointment_date || 
                              currentBooking.appointment_date || 
                              currentBooking.booking_date?.split('T')[0] ||
                              currentBooking.date;
    const oldAppointmentTime = reschedulingOptions.old_appointment_time || 
                              currentBooking.appointment_time || 
                              currentBooking.timeslot_start_time ||
                              currentBooking.time;

    // Update the booking with new appointment details - use only confirmed fields
    // Handle time format - newAppointmentTime might already include seconds
    const timeForTimestamp = newAppointmentTime.includes(':') && newAppointmentTime.split(':').length === 3 
      ? newAppointmentTime  // Already has seconds (HH:MM:SS)
      : `${newAppointmentTime}:00`; // Add seconds (HH:MM -> HH:MM:SS)
    
    const updateData = {
      booking_date: `${newAppointmentDate}T${timeForTimestamp}`,
      timeslot_start_time: timeForTimestamp,
      timeslot_end_time: `${newAppointmentTime.split(':')[0]}:${(parseInt(newAppointmentTime.split(':')[1]) + 50).toString().padStart(2, '0')}:00`,
      status: 'confirmed'  // Confirm booking when rescheduling is completed
    };
    
    console.log('🔄 Updating booking with data:', { bookingId, updateData, originalTime: newAppointmentTime });
    
    const { error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (updateError) {
      console.error('❌ Booking update failed:', {
        error: updateError,
        bookingId,
        updateData,
        errorCode: updateError.code,
        errorMessage: updateError.message,
        errorDetails: updateError.details
      });
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    // Get customer name and email (handle encrypted/decrypted and different field patterns)
    const customerName = customer?.first_name && customer?.last_name 
                        ? `${customer.first_name} ${customer.last_name}`
                        : customer?.name || currentBooking.customer_name || 'Customer';
    const customerEmail = customer?.email || currentBooking.customer_email;

    if (!customerEmail) {
      throw new Error('Customer email not found for rescheduling notification');
    }

    // Use the same date/time formatting functions we implemented for booking confirmations
    const formatDateForICS = (dateStr: string | null): string => {
      if (!dateStr) {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return new Date().toISOString().split('T')[0];
        }
        return date.toISOString().split('T')[0];
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    };
    
    const formatTimeForICS = (timeStr: string | null): string => {
      if (!timeStr || timeStr === 'To be scheduled') {
        return '10:00:00'; // Default to 10 AM
      }
      
      // If it's already in HH:MM:SS format, keep it
      if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) {
        return timeStr;
      }
      // If it's in HH:MM format, add seconds
      else if (timeStr.match(/^\d{2}:\d{2}$/)) {
        return timeStr + ':00';
      }
      // If it contains extra text, try to extract time
      else {
        const timeMatch = timeStr.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
          return timeMatch[1].padStart(5, '0') + ':00';
        } else {
          return '10:00:00'; // Fallback
        }
      }
    };

    // Prepare booking email data with proper date/time formatting
    const bookingEmailData: BookingEmailData = {
      customer_name: customerName,
      customer_email: customerEmail,
      service_name: currentBooking.service?.name || currentBooking.service_name || 'Physiotherapy Session',
      appointment_date: formatDateForICS(newAppointmentDate),
      appointment_time: formatTimeForICS(newAppointmentTime),
      booking_reference: currentBooking.booking_reference || `KH-${bookingId}`,
      booking_id: bookingId,
      customer_id: currentBooking.customer_id,
      therapist_name: currentBooking.therapist_name || 'KH Therapy Team',
      clinic_address: currentBooking.clinic_address || 'KH Therapy Clinic, Dublin, Ireland',
      special_instructions: currentBooking.special_instructions,
      // Include old appointment details with proper formatting
      old_appointment_date: formatDateForICS(oldAppointmentDate),
      old_appointment_time: formatTimeForICS(oldAppointmentTime)
    };

    // Prepare rescheduling data
    const reschedulingData = {
      reschedule_reason: reschedulingOptions.reschedule_reason,
      reschedule_note: reschedulingOptions.reschedule_note,
      rescheduled_by: reschedulingOptions.rescheduled_by || 'admin',
      is_admin_initiated: reschedulingOptions.rescheduled_by === 'admin'
    };

    // Validate booking data
    const validation = validateEmailWorkflowData(bookingEmailData);
    if (!validation.isValid) {
      throw new Error(`Invalid booking data: ${validation.errors.join(', ')}`);
    }

    // Process the rescheduling email workflow
    console.log('📧 Processing rescheduling email workflow with data:', {
      trigger: 'booking_rescheduled',
      customerEmail: bookingEmailData.customer_email,
      bookingReference: bookingEmailData.booking_reference
    });
    
    const result = await processBookingEmailWorkflow(
      'booking_rescheduled',
      bookingEmailData,
      undefined,
      undefined,
      undefined,
      reschedulingData
    );

    console.log('✅ Booking rescheduling workflow completed. Success:', result.success);
    
    if (!result.success) {
      console.error('❌ Rescheduling email workflow failed:', result.errors);
    }
    
    // Add information about the rescheduling to results
    result.results.oldAppointmentDate = oldAppointmentDate;
    result.results.oldAppointmentTime = oldAppointmentTime;
    result.results.newAppointmentDate = newAppointmentDate;
    result.results.newAppointmentTime = newAppointmentTime;
    result.results.bookingUpdated = true;
    result.results.rescheduledBy = reschedulingOptions.rescheduled_by || 'admin';
    
    return result;

  } catch (error) {
    console.error('❌ Booking rescheduling workflow integration failed:', error);
    console.error('❌ Error details:', {
      bookingId,
      newAppointmentDate,
      newAppointmentTime,
      reschedulingOptions,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown integration error']
    };
  }
};

/**
 * Integration function for customer-initiated rescheduling requests (with approval workflow)
 * Called when a customer requests to reschedule a booking that requires admin approval
 */
export const submitCustomerReschedulingRequest = async (
  bookingId: string,
  requestData: {
    newAppointmentDate: string;
    newAppointmentTime: string;
    reschedule_reason?: string;
    customer_notes?: string;
  }
): Promise<WorkflowResult> => {
  
  try {
    console.log('🔄 Processing customer rescheduling request for booking:', bookingId);

    // Import validation and API functions
    const { 
      validateReschedulingRequest, 
      canRescheduleBooking, 
      isBookingEligibleForRescheduling 
    } = await import('./reschedulingValidation');
    
    const { submitReschedulingRequest } = await import('./reschedulingApi');

    // Get current booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        service:services(*)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        results: {},
        errors: ['Booking not found']
      };
    }

    // Check if booking status allows rescheduling
    if (!isBookingEligibleForRescheduling(booking.booking_status)) {
      return {
        success: false,
        results: {},
        errors: [`Bookings with status "${booking.booking_status}" cannot be rescheduled`]
      };
    }

    // Check 24-hour rule
    if (!canRescheduleBooking(booking.appointment_date, booking.appointment_time)) {
      return {
        success: false,
        results: {},
        errors: ['Rescheduling requests must be submitted at least 24 hours before the appointment']
      };
    }

    // Validate request data
    const validation = validateReschedulingRequest({
      bookingId,
      originalDate: booking.appointment_date,
      originalTime: booking.appointment_time,
      newDate: requestData.newAppointmentDate,
      newTime: requestData.newAppointmentTime,
      reason: requestData.reschedule_reason
    });

    if (!validation.isValid) {
      return {
        success: false,
        results: {},
        errors: validation.errors
      };
    }

    // Submit the rescheduling request to the database
    const submitResult = await submitReschedulingRequest({
      bookingId,
      originalDate: booking.appointment_date,
      originalTime: booking.appointment_time,
      newDate: requestData.newAppointmentDate,
      newTime: requestData.newAppointmentTime,
      reason: requestData.reschedule_reason,
      customerNotes: requestData.customer_notes
    });

    if (!submitResult.success) {
      return {
        success: false,
        results: {},
        errors: submitResult.error ? [submitResult.error] : ['Failed to submit rescheduling request']
      };
    }

    // Send email notifications using the existing workflow
    const { sendReschedulingRequestNotification } = await import('./bookingEmailWorkflow');

    // Prepare booking data for email notifications
    const bookingEmailData = {
      customer_name: booking.customer?.name || booking.customer_name || 'Customer',
      customer_email: booking.customer?.email || booking.customer_email,
      service_name: booking.service?.name || booking.service_name || 'Physiotherapy Session',
      appointment_date: booking.appointment_date,
      appointment_time: booking.appointment_time,
      booking_reference: booking.booking_reference || `KH-${bookingId}`,
      booking_id: bookingId,
      customer_id: booking.customer_id,
      therapist_name: booking.therapist_name || 'KH Therapy Team',
      clinic_address: booking.clinic_address || 'KH Therapy Clinic, Dublin, Ireland',
      special_instructions: booking.special_instructions || '',
      old_appointment_date: booking.appointment_date,
      old_appointment_time: booking.appointment_time
    };

    // Send notification emails
    const emailResult = await sendReschedulingRequestNotification(
      bookingEmailData,
      {
        requestId: submitResult.data.id,
        newAppointmentDate: requestData.newAppointmentDate,
        newAppointmentTime: requestData.newAppointmentTime,
        reschedule_reason: requestData.reschedule_reason,
        customer_notes: requestData.customer_notes
      }
    );

    return {
      success: true,
      results: {
        ...submitResult.data,
        emailNotificationSent: emailResult.success,
        emailError: emailResult.error
      },
      errors: []
    };

  } catch (error) {
    console.error('❌ Customer rescheduling request failed:', error);
    return {
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    };
  }
};

/**
 * Integration function for admin approval of rescheduling requests
 * Called when admin approves a customer's rescheduling request
 */
export const approveCustomerReschedulingRequest = async (
  requestId: string,
  adminUserId: string,
  adminNotes?: string
): Promise<WorkflowResult> => {
  
  try {
    console.log('🔄 Processing rescheduling request approval:', requestId);

    // Import the API functions
    const { 
      approveReschedulingRequest,
      getReschedulingRequestDetails 
    } = await import('./reschedulingApi');

    // Get request details before approval
    const detailsResult = await getReschedulingRequestDetails(requestId);
    if (!detailsResult.success || !detailsResult.data) {
      return {
        success: false,
        results: {},
        errors: ['Rescheduling request not found']
      };
    }

    // Approve the request
    const approvalResult = await approveReschedulingRequest(requestId, adminUserId, adminNotes);
    if (!approvalResult.success) {
      return {
        success: false,
        results: {},
        errors: approvalResult.error ? [approvalResult.error] : ['Failed to approve rescheduling request']
      };
    }

    // Send approval notification using existing workflow
    const { sendReschedulingApprovalNotification } = await import('./bookingEmailWorkflow');

    // Prepare booking data for email notification
    const bookingEmailData = {
      customer_name: detailsResult.data.customerName,
      customer_email: detailsResult.data.customerEmail,
      service_name: detailsResult.data.serviceName,
      appointment_date: detailsResult.data.requestedAppointmentDate,
      appointment_time: detailsResult.data.requestedAppointmentTime,
      booking_reference: detailsResult.data.bookingReference,
      booking_id: detailsResult.data.bookingId,
      customer_id: detailsResult.data.customerId,
      therapist_name: 'KH Therapy Team',
      clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
      special_instructions: '',
      old_appointment_date: detailsResult.data.originalAppointmentDate,
      old_appointment_time: detailsResult.data.originalAppointmentTime
    };

    // Send approval notification
    const emailResult = await sendReschedulingApprovalNotification(
      bookingEmailData,
      {
        requestId,
        adminNotes,
        adminUserId
      }
    );

    return {
      success: true,
      results: {
        ...approvalResult.data,
        emailNotificationSent: emailResult.success,
        emailError: emailResult.error
      },
      errors: []
    };

  } catch (error) {
    console.error('❌ Rescheduling request approval failed:', error);
    return {
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    };
  }
};

/**
 * Integration function for admin rejection of rescheduling requests
 * Called when admin rejects a customer's rescheduling request  
 */
export const rejectCustomerReschedulingRequest = async (
  requestId: string,
  adminUserId: string,
  adminNotes?: string
): Promise<WorkflowResult> => {
  
  try {
    console.log('🔄 Processing rescheduling request rejection:', requestId);

    // Import the API functions
    const { 
      rejectReschedulingRequest,
      getReschedulingRequestDetails 
    } = await import('./reschedulingApi');

    // Get request details before rejection
    const detailsResult = await getReschedulingRequestDetails(requestId);
    if (!detailsResult.success || !detailsResult.data) {
      return {
        success: false,
        results: {},
        errors: ['Rescheduling request not found']
      };
    }

    // Reject the request
    const rejectionResult = await rejectReschedulingRequest(requestId, adminUserId, adminNotes);
    if (!rejectionResult.success) {
      return {
        success: false,
        results: {},
        errors: rejectionResult.error ? [rejectionResult.error] : ['Failed to reject rescheduling request']
      };
    }

    // Send rejection notification using existing workflow
    const { sendReschedulingRejectionNotification } = await import('./bookingEmailWorkflow');

    // Prepare booking data for email notification
    const bookingEmailData = {
      customer_name: detailsResult.data.customerName,
      customer_email: detailsResult.data.customerEmail,
      service_name: detailsResult.data.serviceName,
      appointment_date: detailsResult.data.originalAppointmentDate,
      appointment_time: detailsResult.data.originalAppointmentTime,
      booking_reference: detailsResult.data.bookingReference,
      booking_id: detailsResult.data.bookingId,
      customer_id: detailsResult.data.customerId,
      therapist_name: 'KH Therapy Team',
      clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
      special_instructions: ''
    };

    // Send rejection notification
    const emailResult = await sendReschedulingRejectionNotification(
      bookingEmailData,
      {
        requestId,
        adminNotes,
        adminUserId
      }
    );

    return {
      success: true,
      results: {
        ...rejectionResult.data,
        emailNotificationSent: emailResult.success,
        emailError: emailResult.error
      },
      errors: []
    };

  } catch (error) {
    console.error('❌ Rescheduling request rejection failed:', error);
    return {
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    };
  }
};