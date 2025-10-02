import { supabase } from '../supabaseClient';
import { hashPassword } from './passwordUtils';
import { createPaymentRequest, sendPaymentRequestNotification } from './paymentRequestUtils';
import { sendWelcomeEmail } from './emailUtils';
import { encryptSensitiveData, decryptSensitiveData, isDataEncrypted } from './gdprUtils';
import { PaymentRequest } from '../types/paymentTypes';

export interface Customer {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  county?: string;
  eircode?: string;
  country?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  password?: string;
  must_change_password?: boolean;
  first_login?: boolean;
  welcome_email_sent?: boolean;
}

export interface BookingData {
  customer_id: number;
  booking_reference?: string; // New field for human-readable booking reference (YYYY-MM-DD-000)
  package_name: string;
  booking_date?: string;
  timeslot_start_time?: string;
  timeslot_end_time?: string;
  appointment_date?: string;
  appointment_time?: string;
  notes?: string;
  status?: string;
  service_cost?: number;
}

export interface BookingRecord extends BookingData {
  id: string; // UUID from database
  created_at: string;
  updated_at?: string;
}

export interface BookingWithCustomer extends BookingRecord {
  customers?: Customer;
}

/**
 * Find or create a customer based on email
 * If customer exists, update their information
 * If customer doesn't exist, create a new one
 */
export const findOrCreateCustomer = async (customerData: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}): Promise<{ customer: Customer | null; error: string | null; isNewCustomer?: boolean }> => {
  try {
    // First, try to find existing customer by email
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', customerData.email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('Error finding customer:', findError);
      return { customer: null, error: findError.message };
    }

    if (existingCustomer) {
      // Customer exists, update their information if needed
      const updateData: Partial<Customer> = {};
      let needsUpdate = false;

      // Decrypt existing data for comparison
      const decryptedFirstName = isDataEncrypted(existingCustomer.first_name) 
        ? decryptSensitiveData(existingCustomer.first_name) 
        : existingCustomer.first_name;
      const decryptedLastName = isDataEncrypted(existingCustomer.last_name) 
        ? decryptSensitiveData(existingCustomer.last_name) 
        : existingCustomer.last_name;
      const decryptedPhone = existingCustomer.phone && isDataEncrypted(existingCustomer.phone) 
        ? decryptSensitiveData(existingCustomer.phone) 
        : existingCustomer.phone;

      if (decryptedFirstName !== customerData.firstName.trim()) {
        updateData.first_name = encryptSensitiveData(customerData.firstName.trim());
        needsUpdate = true;
      }
      if (decryptedLastName !== customerData.lastName.trim()) {
        updateData.last_name = encryptSensitiveData(customerData.lastName.trim());
        needsUpdate = true;
      }
      if (customerData.phone && decryptedPhone !== customerData.phone.trim()) {
        updateData.phone = encryptSensitiveData(customerData.phone.trim());
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { data: updatedCustomer, error: updateError } = await supabase
          .from('customers')
          .update(updateData)
          .eq('id', existingCustomer.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating customer:', updateError);
          // Return decrypted version of existing customer
          const decryptedExistingCustomer = { ...existingCustomer };
          decryptedExistingCustomer.first_name = decryptedFirstName;
          decryptedExistingCustomer.last_name = decryptedLastName;
          decryptedExistingCustomer.phone = decryptedPhone;
          return { customer: decryptedExistingCustomer, error: null };
        }

        // Return decrypted version of updated customer
        const decryptedUpdatedCustomer = { ...updatedCustomer };
        decryptedUpdatedCustomer.first_name = isDataEncrypted(updatedCustomer.first_name) 
          ? decryptSensitiveData(updatedCustomer.first_name) 
          : updatedCustomer.first_name;
        decryptedUpdatedCustomer.last_name = isDataEncrypted(updatedCustomer.last_name) 
          ? decryptSensitiveData(updatedCustomer.last_name) 
          : updatedCustomer.last_name;
        decryptedUpdatedCustomer.phone = updatedCustomer.phone && isDataEncrypted(updatedCustomer.phone) 
          ? decryptSensitiveData(updatedCustomer.phone) 
          : updatedCustomer.phone;

        return { customer: decryptedUpdatedCustomer, error: null, isNewCustomer: false };
      }

      // Return decrypted version of existing customer
      const decryptedExistingCustomer = { ...existingCustomer };
      decryptedExistingCustomer.first_name = decryptedFirstName;
      decryptedExistingCustomer.last_name = decryptedLastName;
      decryptedExistingCustomer.phone = decryptedPhone;
      return { customer: decryptedExistingCustomer, error: null, isNewCustomer: false };
    }

    // Customer doesn't exist, create a new one with default password same as email (hashed)
    const defaultPassword = customerData.email.toLowerCase().trim();
    const hashedDefaultPassword = await hashPassword(defaultPassword);
    
    const newCustomerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'> = {
      first_name: encryptSensitiveData(customerData.firstName.trim()),
      last_name: encryptSensitiveData(customerData.lastName.trim()),
      email: customerData.email.toLowerCase().trim(),
      phone: customerData.phone?.trim() ? encryptSensitiveData(customerData.phone.trim()) : undefined,
      country: 'Ireland',
      is_active: true,
      password: hashedDefaultPassword, // Store hashed password
      must_change_password: true, // Force password change on first login
      first_login: true,
      welcome_email_sent: false // Will be set to true after welcome email is sent
    };

    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert([newCustomerData])
      .select()
      .single();

    if (createError) {
      console.error('Error creating customer:', {
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        customerEmail: customerData.email
      });

      // Handle duplicate key constraint violation
      if (createError.code === '23505' || createError.message.includes('duplicate key value violates unique constraint')) {
        const constraintName = createError.message.match(/unique constraint "([^"]+)"/)?.[1];
        console.log(`🔄 Constraint violation detected: ${constraintName}. Attempting to resolve...`);

        if (constraintName === 'customers_pkey') {
          console.error('❌ Primary key constraint violation detected - this suggests an ID sequence issue');
          // For primary key violations, we need to retry the entire operation
          // This is likely an ID sequence problem that needs database attention
          return { customer: null, error: 'Database ID sequence error. Please try again or contact support.', isNewCustomer: false };
        }

        if (constraintName === 'customers_email_key' || constraintName?.includes('email')) {
          console.log('🔄 Email constraint violation - customer with this email already exists, fetching...');

          // Try to fetch the existing customer again with a small delay to ensure the other transaction has completed
          await new Promise(resolve => setTimeout(resolve, 200));

          const { data: existingAfterConflict, error: refetchError } = await supabase
            .from('customers')
            .select('*')
            .eq('email', customerData.email.toLowerCase().trim())
            .eq('is_active', true)
            .maybeSingle();

          if (refetchError) {
            console.error('Error refetching customer after conflict:', refetchError);
            return { customer: null, error: 'Failed to resolve customer creation conflict', isNewCustomer: false };
          }

          if (existingAfterConflict) {
            // Return decrypted version of the existing customer found after conflict
            const decryptedExistingCustomer = { ...existingAfterConflict };
            decryptedExistingCustomer.first_name = isDataEncrypted(existingAfterConflict.first_name)
              ? decryptSensitiveData(existingAfterConflict.first_name)
              : existingAfterConflict.first_name;
            decryptedExistingCustomer.last_name = isDataEncrypted(existingAfterConflict.last_name)
              ? decryptSensitiveData(existingAfterConflict.last_name)
              : existingAfterConflict.last_name;
            decryptedExistingCustomer.phone = existingAfterConflict.phone && isDataEncrypted(existingAfterConflict.phone)
              ? decryptSensitiveData(existingAfterConflict.phone)
              : existingAfterConflict.phone;

            console.log('✅ Successfully resolved race condition - found existing customer');
            return { customer: decryptedExistingCustomer, error: null, isNewCustomer: false };
          } else {
            console.error('❌ Customer should exist but was not found after email constraint violation');
            return { customer: null, error: 'Customer creation conflict could not be resolved', isNewCustomer: false };
          }
        }

        // Generic constraint violation
        console.log('🔄 Generic constraint violation, attempting to fetch existing customer...');
        await new Promise(resolve => setTimeout(resolve, 200));

        const { data: existingAfterConflict, error: refetchError } = await supabase
          .from('customers')
          .select('*')
          .eq('email', customerData.email.toLowerCase().trim())
          .eq('is_active', true)
          .maybeSingle();

        if (!refetchError && existingAfterConflict) {
          const decryptedExistingCustomer = { ...existingAfterConflict };
          decryptedExistingCustomer.first_name = isDataEncrypted(existingAfterConflict.first_name)
            ? decryptSensitiveData(existingAfterConflict.first_name)
            : existingAfterConflict.first_name;
          decryptedExistingCustomer.last_name = isDataEncrypted(existingAfterConflict.last_name)
            ? decryptSensitiveData(existingAfterConflict.last_name)
            : existingAfterConflict.last_name;
          decryptedExistingCustomer.phone = existingAfterConflict.phone && isDataEncrypted(existingAfterConflict.phone)
            ? decryptSensitiveData(existingAfterConflict.phone)
            : existingAfterConflict.phone;

          console.log('✅ Successfully resolved constraint violation - found existing customer');
          return { customer: decryptedExistingCustomer, error: null, isNewCustomer: false };
        }
      }

      return { customer: null, error: createError.message, isNewCustomer: false };
    }

    // Return decrypted version of new customer
    const decryptedNewCustomer = { ...newCustomer };
    decryptedNewCustomer.first_name = customerData.firstName.trim();
    decryptedNewCustomer.last_name = customerData.lastName.trim();
    decryptedNewCustomer.phone = customerData.phone?.trim() || undefined;

    return { customer: decryptedNewCustomer, error: null, isNewCustomer: true };

  } catch (error) {
    console.error('Exception in findOrCreateCustomer:', error);
    return { customer: null, error: 'Unexpected error occurred', isNewCustomer: false };
  }
};

/**
 * Create a booking with customer relationship
 */
export const createBookingWithCustomer = async (
  customerData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  },
  bookingData: Omit<BookingData, 'customer_id'>,
  isAdminBooking: boolean = false
): Promise<{ booking: BookingRecord | null; customer: Customer | null; paymentRequest?: PaymentRequest; error: string | null }> => {
  try {
    // Step 1: Find or create customer
    const { customer, error: customerError, isNewCustomer } = await findOrCreateCustomer(customerData);
    
    if (customerError || !customer) {
      return { booking: null, customer: null, error: customerError || 'Failed to create customer' };
    }

    // Step 2: Create booking with only fields that exist in the table
    const bookingDataForInsert = {
      customer_id: customer.id,
      package_name: bookingData.package_name,
      booking_date: bookingData.booking_date,
      timeslot_start_time: bookingData.timeslot_start_time,
      timeslot_end_time: bookingData.timeslot_end_time,
      notes: bookingData.notes,
      status: bookingData.status || 'confirmed'
    };

    // Step 3: Create booking with customer reference
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([bookingDataForInsert])
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return { booking: null, customer, error: bookingError.message };
    }

    // Step 4: Try to create payment request for 20% deposit (don't let this block email sending)
    // Skip payment request generation for admin bookings
    let paymentRequest = null;
    if (customer.id && !isAdminBooking) {
      try {
        console.log('💳 Attempting to create payment request...');
        paymentRequest = await createPaymentRequest(
          customer.id,
          bookingData.package_name,
          bookingData.booking_date || new Date().toISOString(),
          null, // invoiceId
          booking.id // bookingId
        );

        if (paymentRequest) {
          console.log('✅ Payment request created successfully');
        } else {
          console.log('⚠️ No payment request created (service may require quote or be per-session)');
        }
      } catch (paymentRequestError) {
        console.error('❌ Payment request creation failed, but continuing with email sending:', paymentRequestError);
        // Don't return here - continue with email sending even if payment request fails
        paymentRequest = null;
      }
    } else if (isAdminBooking) {
      console.log('ℹ️ Skipping payment request generation for admin booking');
    }

    // Step 5: Send emails regardless of payment request success/failure
    if (customer.id) {
      try {
        // Only send welcome email for new customers who haven't received it yet
        if (isNewCustomer && !customer.welcome_email_sent) {
          console.log('📧 Sending welcome email to new customer...');
          try {
            const welcomeResult = await sendWelcomeEmail(`${customerData.firstName} ${customerData.lastName}`, customerData.email);
            if (welcomeResult.success) {
              console.log('✅ Welcome email sent successfully');
              
              // Mark welcome email as sent in database
              try {
                await supabase
                  .from('customers')
                  .update({ welcome_email_sent: true })
                  .eq('id', customer.id);
                console.log('✅ Welcome email status updated in database');
              } catch (updateError) {
                console.error('❌ Failed to update welcome email status:', updateError);
                // Don't fail the process, just log the error
              }
            } else {
              console.error('❌ Failed to send welcome email:', welcomeResult.error);
            }
          } catch (welcomeEmailError) {
            console.error('❌ Welcome email failed:', welcomeEmailError);
          }
        } else if (isNewCustomer && customer.welcome_email_sent) {
          console.log('ℹ️ Skipping welcome email - already sent to this new customer');
        } else {
          console.log('ℹ️ Skipping welcome email - existing customer');
        }

        // Then send booking captured notification
        console.log('📧 Sending booking captured notification...');
        try {
          const { sendBookingCapturedNotification } = await import('./emailUtils');
          const capturedResult = await sendBookingCapturedNotification(customerData.email, {
            customer_name: `${customerData.firstName} ${customerData.lastName}`,
            customer_email: customerData.email,
            service_name: bookingData.package_name,
            appointment_date: new Date(bookingData.booking_date || new Date()).toLocaleDateString('en-IE'),
            appointment_time: `${(bookingData.timeslot_start_time || '').substring(0, 5)}-${(bookingData.timeslot_end_time || '').substring(0, 5)}`,
            total_amount: 0, // This is just a notification, amount is handled in payment request
            booking_reference: booking.booking_reference || booking.id.toString(),
            therapist_name: 'KH Therapy Team',
            clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
            special_instructions: bookingData.notes || undefined
          });

          if (capturedResult.success) {
            console.log('✅ Booking captured notification sent successfully');
          } else {
            console.error('❌ Failed to send booking captured notification:', capturedResult.error);
          }
        } catch (capturedEmailError) {
          console.error('❌ Booking captured notification failed:', capturedEmailError);
        }

        // Send admin notification for new booking (without sending customer confirmation)
        console.log('📧 Sending admin notification for new booking...');
        try {
          const { sendAdminBookingNotificationOnly } = await import('./emailUtils');
          const adminResult = await sendAdminBookingNotificationOnly(
            {
              customer_name: `${customerData.firstName} ${customerData.lastName}`,
              customer_email: customerData.email,
              service_name: bookingData.package_name,
              appointment_date: new Date(bookingData.booking_date || new Date()).toLocaleDateString('en-IE'),
              appointment_time: `${(bookingData.timeslot_start_time || '').substring(0, 5)}-${(bookingData.timeslot_end_time || '').substring(0, 5)}`,
              total_amount: paymentRequest?.amount || 0,
              booking_reference: booking.booking_reference || booking.id.toString(),
              therapist_name: 'KH Therapy Team',
              clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
              special_instructions: bookingData.notes || undefined
            }
          );

          if (adminResult.adminSuccess) {
            console.log('✅ Admin booking notification sent successfully');
          } else {
            console.error('❌ Failed to send admin booking notification');
          }
        } catch (adminEmailError) {
          console.error('❌ Admin booking notification failed:', adminEmailError);
        }

        // Then send payment request email if payment is required
        if (paymentRequest) {
          console.log('📧 Sending payment request email...');
          try {
            const { success: emailSuccess, error: emailError } = await sendPaymentRequestNotification(paymentRequest.id);
            if (emailSuccess) {
              console.log('✅ Payment request email sent successfully');
            } else {
              console.error('❌ Failed to send payment request email:', emailError);
            }
          } catch (emailError) {
            console.error('❌ Payment request email failed:', emailError);
          }
        } else {
          // No payment request created (e.g., "Contact for Quote" services)
          // Send booking confirmation without payment
          console.log('📧 Sending booking confirmation email (no payment required)...');
          try {
            const { sendSimpleBookingConfirmation } = await import('./emailUtils');
            const emailResult = await sendSimpleBookingConfirmation(
              customerData.email,
              {
                customer_name: `${customerData.firstName} ${customerData.lastName}`,
                customer_email: customerData.email,
                service_name: bookingData.package_name,
                appointment_date: new Date(bookingData.booking_date || new Date()).toLocaleDateString('en-IE'),
                appointment_time: `${(bookingData.timeslot_start_time || '').substring(0, 5)}-${(bookingData.timeslot_end_time || '').substring(0, 5)}`,
                total_amount: 0, // No amount for contact for quote
                booking_reference: booking.booking_reference || booking.id.toString(),
                therapist_name: 'KH Therapy Team',
                clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
                special_instructions: bookingData.notes || undefined
              }
            );
            
            if (emailResult) {
              console.log('✅ Booking confirmation email sent successfully');
            } else {
              console.error('❌ Failed to send booking confirmation email');
            }
          } catch (emailError) {
            console.error('❌ Booking confirmation email failed:', emailError);
          }
        }
      } catch (emailError) {
        console.error('❌ Error in email sending process:', emailError);
        // Don't throw - just log the error and continue
      }
    }

    return { 
      booking, 
      customer, 
      paymentRequest: paymentRequest || undefined,
      error: null 
    };

  } catch (error) {
    console.error('Exception in createBookingWithCustomer:', error);
    return { booking: null, customer: null, error: 'Unexpected error occurred' };
  }
};

/**
 * Get bookings with customer details joined
 */
export const getBookingsWithCustomers = async (): Promise<{ bookings: BookingWithCustomer[] | null; error: string | null }> => {
  try {
    const query = supabase
      .from('bookings')
      .select(`
        *,
        customers!bookings_customer_id_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .limit(1000); // Add limit for performance

    const { data, error } = await query;

    if (error) {
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return { bookings: null, error: error.message };
    }

    // Decrypt customer data for admin viewing
    const decryptedBookings = data?.map(booking => {
      if (booking.customers) {
        // Decrypt customer PII fields
        const customer = booking.customers;
        if (customer.first_name && isDataEncrypted(customer.first_name)) {
          customer.first_name = decryptSensitiveData(customer.first_name);
        }
        if (customer.last_name && isDataEncrypted(customer.last_name)) {
          customer.last_name = decryptSensitiveData(customer.last_name);
        }
        if (customer.phone && isDataEncrypted(customer.phone)) {
          customer.phone = decryptSensitiveData(customer.phone);
        }
      }
      return booking;
    });

    return { bookings: decryptedBookings || [], error: null };

  } catch (error) {
    console.error('Exception in getBookingsWithCustomers:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return { bookings: null, error: 'Unexpected error occurred' };
  }
};
