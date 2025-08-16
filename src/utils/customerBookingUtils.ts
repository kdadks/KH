import { supabase } from '../supabaseClient';
import { hashPassword } from './passwordUtils';
import { createPaymentRequest, sendPaymentRequestNotification } from './paymentRequestUtils';
import { sendWelcomeEmail } from './emailUtils';
import { encryptSensitiveData, decryptSensitiveData, isDataEncrypted } from './gdprUtils';

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
}

export interface BookingData {
  customer_id: number;
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
}): Promise<{ customer: Customer | null; error: string | null }> => {
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

        return { customer: decryptedUpdatedCustomer, error: null };
      }

      // Return decrypted version of existing customer
      const decryptedExistingCustomer = { ...existingCustomer };
      decryptedExistingCustomer.first_name = decryptedFirstName;
      decryptedExistingCustomer.last_name = decryptedLastName;
      decryptedExistingCustomer.phone = decryptedPhone;
      return { customer: decryptedExistingCustomer, error: null };
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
      first_login: true
    };

    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert([newCustomerData])
      .select()
      .single();

    if (createError) {
      console.error('Error creating customer:', createError);
      return { customer: null, error: createError.message };
    }

    // Return decrypted version of new customer
    const decryptedNewCustomer = { ...newCustomer };
    decryptedNewCustomer.first_name = customerData.firstName.trim();
    decryptedNewCustomer.last_name = customerData.lastName.trim();
    decryptedNewCustomer.phone = customerData.phone?.trim() || undefined;

    return { customer: decryptedNewCustomer, error: null };

  } catch (error) {
    console.error('Exception in findOrCreateCustomer:', error);
    return { customer: null, error: 'Unexpected error occurred' };
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
  bookingData: Omit<BookingData, 'customer_id'>
): Promise<{ booking: any | null; customer: Customer | null; paymentRequest?: any; error: string | null }> => {
  try {
    // Step 1: Find or create customer
    const { customer, error: customerError } = await findOrCreateCustomer(customerData);
    
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

    // Step 4: Create payment request for 20% deposit
    let paymentRequest = null;
    if (customer.id) {
      try {
        paymentRequest = await createPaymentRequest(
          customer.id,
          bookingData.package_name,
          bookingData.booking_date || new Date().toISOString(),
          null, // invoiceId
          booking.id // bookingId
        );

        // Step 5: Send payment request email notification
        if (paymentRequest) {
          const { success: emailSuccess, error: emailError } = await sendPaymentRequestNotification(paymentRequest.id);
          if (!emailSuccess) {
            console.error('Failed to send payment request email:', emailError);
            // Fallback: Send welcome email
            await sendWelcomeEmail(`${customerData.firstName} ${customerData.lastName}`, customerData.email);
          }
        }
      } catch (paymentError) {
        console.error('❌ Error creating payment request:', {
          error: paymentError,
          message: paymentError instanceof Error ? paymentError.message : 'Unknown error',
          stack: paymentError instanceof Error ? paymentError.stack : undefined,
          serviceName: bookingData.package_name,
          customerId: customer.id
        });
        // Fallback: Send welcome email if payment request fails
        await sendWelcomeEmail(`${customerData.firstName} ${customerData.lastName}`, customerData.email);
      }
    }

    return { 
      booking, 
      customer, 
      paymentRequest: paymentRequest,
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
export const getBookingsWithCustomers = async (): Promise<{ bookings: any[] | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customers!bookings_customer_id_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .limit(1000); // Add limit for performance

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
