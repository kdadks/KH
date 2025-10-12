import { supabase } from '../supabaseClient';
import { hashPassword } from './passwordUtils';
import { createPaymentRequest } from './paymentRequestUtils';
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
    // First, try to find existing customer by email AND name combination
    // This allows multiple customers with same email but different names
    const { data: existingCustomers, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', customerData.email.toLowerCase().trim())
      .eq('is_active', true);

    if (findError) {
      console.error('Error finding customers:', findError);
      return { customer: null, error: findError.message };
    }

    // Look for exact match by name among customers with the same email
    let existingCustomer = null;
    if (existingCustomers && existingCustomers.length > 0) {
      existingCustomer = existingCustomers.find(customer => {
        const decryptedFirstName = isDataEncrypted(customer.first_name) 
          ? decryptSensitiveData(customer.first_name) 
          : customer.first_name;
        const decryptedLastName = isDataEncrypted(customer.last_name) 
          ? decryptSensitiveData(customer.last_name) 
          : customer.last_name;
        
        return decryptedFirstName.toLowerCase().trim() === customerData.firstName.toLowerCase().trim() &&
               decryptedLastName.toLowerCase().trim() === customerData.lastName.toLowerCase().trim();
      });
    }



    if (existingCustomer) {
      // Found existing customer with exact name match, just update phone if needed
      const decryptedPhone = existingCustomer.phone && isDataEncrypted(existingCustomer.phone) 
        ? decryptSensitiveData(existingCustomer.phone) 
        : existingCustomer.phone;

      // Only update phone if it's different and provided
      if (customerData.phone && decryptedPhone !== customerData.phone.trim()) {
        const { data: updatedCustomer, error: updateError } = await supabase
          .from('customers')
          .update({ phone: encryptSensitiveData(customerData.phone.trim()) })
          .eq('id', existingCustomer.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating customer phone:', updateError);
        } else {
          existingCustomer = updatedCustomer;
        }
      }

      // Return decrypted version of existing customer
      const decryptedExistingCustomer = { ...existingCustomer };
      decryptedExistingCustomer.first_name = isDataEncrypted(existingCustomer.first_name) 
        ? decryptSensitiveData(existingCustomer.first_name) 
        : existingCustomer.first_name;
      decryptedExistingCustomer.last_name = isDataEncrypted(existingCustomer.last_name) 
        ? decryptSensitiveData(existingCustomer.last_name) 
        : existingCustomer.last_name;
      decryptedExistingCustomer.phone = existingCustomer.phone && isDataEncrypted(existingCustomer.phone) 
        ? decryptSensitiveData(existingCustomer.phone) 
        : existingCustomer.phone;
      
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
        // Attempting to resolve constraint violation

        if (constraintName === 'customers_pkey') {
          console.error('❌ Primary key constraint violation detected - this suggests an ID sequence issue');
          // For primary key violations, we need to retry the entire operation
          // This is likely an ID sequence problem that needs database attention
          return { customer: null, error: 'Database ID sequence error. Please try again or contact support.', isNewCustomer: false };
        }

        if (constraintName === 'customers_email_key' || constraintName?.includes('email')) {
          // Email constraint violation - fetching existing customer

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

            // Race condition resolved - existing customer found
            return { customer: decryptedExistingCustomer, error: null, isNewCustomer: false };
          } else {
            console.error('❌ Customer should exist but was not found after email constraint violation');
            return { customer: null, error: 'Customer creation conflict could not be resolved', isNewCustomer: false };
          }
        }

        // Generic constraint violation
        // Constraint violation - fetching existing customer
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

          // Constraint violation resolved
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

    // Step 4: Create payment request with deposit amount as placeholder
    // The actual amount will be updated when user selects payment type (deposit or full)
    // Skip payment request generation for admin bookings
    let paymentRequest = null;
    if (customer.id && !isAdminBooking) {
      try {
        // Create payment request with 'deposit' as default - will be updated by handlePayNow
        paymentRequest = await createPaymentRequest(
          customer.id,
          bookingData.package_name,
          bookingData.booking_date || new Date().toISOString(),
          null, // invoiceId
          booking.id, // bookingId
          false, // isInvoicePaymentRequest
          undefined, // customAmount
          'deposit' // paymentType - default to deposit, will be updated based on user selection
        );

        if (paymentRequest) {
          console.log('✅ Payment request created - amount will be updated based on user selection (deposit or full)');
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
                // Sending welcome email to customer
          try {
            const welcomeResult = await sendWelcomeEmail(`${customerData.firstName} ${customerData.lastName}`, customerData.email);
            if (welcomeResult.success) {
              // Welcome email sent
              
              // Mark welcome email as sent in database
              try {
                await supabase
                  .from('customers')
                  .update({ welcome_email_sent: true })
                  .eq('id', customer.id);
                // Welcome email status updated
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
        // Sending booking captured notification
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
            // Booking captured notification sent
          } else {
            console.error('❌ Failed to send booking captured notification:', capturedResult.error);
          }
        } catch (capturedEmailError) {
          console.error('❌ Booking captured notification failed:', capturedEmailError);
        }

        // Send admin notification for new booking (without sending customer confirmation)
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

          if (!adminResult.adminSuccess) {
            console.error('Failed to send admin booking notification');
          }
        } catch (adminEmailError) {
          console.error('Admin booking notification failed:', adminEmailError);
        }

        // Payment request email will be sent when user selects payment type (deposit or full)
        // This ensures the email contains the correct amount based on user's choice
        if (paymentRequest) {
          console.log('ℹ️ Payment request created - email will be sent after user selects payment type');
        } else {
          // No payment request created (e.g., "Contact for Quote" services)
          // Send booking confirmation without payment
          // Sending booking confirmation email (no payment required)
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
              // Booking confirmation email sent
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
