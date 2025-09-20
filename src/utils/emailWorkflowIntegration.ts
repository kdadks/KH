/**
 * Email Workflow Integration for Payment Processing
 * 
 * This file integrates the email workflow with the existing payment processing system
 * to ensure emails are sent at the correct triggers according to the requirements.
 */

import { 
  processBookingEmailWorkflow,
  determinePaymentType,
  validateEmailWorkflowData,
  type BookingEmailData,
  type PaymentEmailData
} from './bookingEmailWorkflow';

/**
 * Integration function for payment reque    // Prepare cancellation data
    const cancellationData = {
      cancellation_reason: cancellationReason,
      has_payment_request: hasPaymentRequests || false,
      refund_info: refundInfo
    };cessing
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
): Promise<{ success: boolean; results: any; errors: string[] }> => {
  
  try {
    console.log('🔄 Integrating payment email workflow for payment request:', paymentRequestId);

    // Import supabase to get booking and customer details
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    );

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
  customerId: number,
  paymentRequestId?: number
): Promise<{ success: boolean; results: any; errors: string[] }> => {
  
  try {
    console.log('🔄 Integrating booking creation email workflow for booking:', bookingId);

    // Import supabase to get booking details
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    );

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
): Promise<{ success: boolean; results: any; errors: string[] }> => {
  
  try {
    console.log('🔄 Integrating admin confirmation email workflow for booking:', bookingId);

    // Import supabase to get booking details
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    );

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

    console.log('✅ Admin confirmation email workflow completed. Success:', result.success);
    return result;

  } catch (error) {
    console.error('❌ Admin confirmation email workflow integration failed:', error);
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
  results: { [key: string]: any }; 
  errors: string[] 
}> => {
  console.log('🧪 Testing email workflow integration...');
  
  const results: { [key: string]: any } = {};
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
): Promise<{ success: boolean; results: any; errors: string[] }> => {
  
  try {
    console.log('🔄 Integrating booking cancellation workflow for booking:', bookingId);

    // Import supabase to get booking details
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    );

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
    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
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
): Promise<{ success: boolean; results: any; errors: string[] }> => {
  
  try {
    console.log('🔄 Integrating booking rescheduling workflow for booking:', bookingId);

    // Import supabase to update booking and get details
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    );

    // First, get the current booking details before updating
    const { data: currentBooking, error: currentBookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        service:services(*)
      `)
      .eq('id', bookingId)
      .single();

    if (currentBookingError || !currentBooking) {
      throw new Error('Failed to get booking details for rescheduling');
    }

    // Store old appointment details if not provided
    const oldAppointmentDate = reschedulingOptions.old_appointment_date || currentBooking.appointment_date;
    const oldAppointmentTime = reschedulingOptions.old_appointment_time || currentBooking.appointment_time;

    // Update the booking with new appointment details
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        appointment_date: newAppointmentDate,
        appointment_time: newAppointmentTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      throw new Error('Failed to update booking with new appointment details');
    }

    // Get customer name (encrypted/decrypted handling)
    const customerName = currentBooking.customer?.name || currentBooking.customer_name || 'Customer';
    const customerEmail = currentBooking.customer?.email || currentBooking.customer_email;

    if (!customerEmail) {
      throw new Error('Customer email not found for rescheduling notification');
    }

    // Prepare booking email data
    const bookingEmailData: BookingEmailData = {
      customer_name: customerName,
      customer_email: customerEmail,
      service_name: currentBooking.service?.name || currentBooking.service_name || 'Physiotherapy Session',
      appointment_date: newAppointmentDate,
      appointment_time: newAppointmentTime,
      booking_reference: currentBooking.booking_reference || `KH-${bookingId}`,
      booking_id: bookingId,
      customer_id: currentBooking.customer_id,
      therapist_name: currentBooking.therapist_name || 'KH Therapy Team',
      clinic_address: currentBooking.clinic_address || 'KH Therapy Clinic, Dublin, Ireland',
      special_instructions: currentBooking.special_instructions,
      // Include old appointment details
      old_appointment_date: oldAppointmentDate,
      old_appointment_time: oldAppointmentTime
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
    const result = await processBookingEmailWorkflow(
      'booking_rescheduled',
      bookingEmailData,
      undefined,
      undefined,
      undefined,
      reschedulingData
    );

    console.log('✅ Booking rescheduling workflow completed. Success:', result.success);
    
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
    return {
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown integration error']
    };
  }
};