import { supabase } from '../supabaseClient';

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

      if (existingCustomer.first_name !== customerData.firstName.trim()) {
        updateData.first_name = customerData.firstName.trim();
        needsUpdate = true;
      }
      if (existingCustomer.last_name !== customerData.lastName.trim()) {
        updateData.last_name = customerData.lastName.trim();
        needsUpdate = true;
      }
      if (customerData.phone && existingCustomer.phone !== customerData.phone.trim()) {
        updateData.phone = customerData.phone.trim();
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
          return { customer: existingCustomer, error: null }; // Return existing customer if update fails
        }

        return { customer: updatedCustomer, error: null };
      }

      return { customer: existingCustomer, error: null };
    }

    // Customer doesn't exist, create a new one
    const newCustomerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'> = {
      first_name: customerData.firstName.trim(),
      last_name: customerData.lastName.trim(),
      email: customerData.email.toLowerCase().trim(),
      phone: customerData.phone?.trim() || undefined,
      country: 'Ireland',
      is_active: true
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

    return { customer: newCustomer, error: null };

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
): Promise<{ booking: any | null; customer: Customer | null; error: string | null }> => {
  try {
    // Step 1: Find or create customer
    const { customer, error: customerError } = await findOrCreateCustomer(customerData);
    
    if (customerError || !customer) {
      return { booking: null, customer: null, error: customerError || 'Failed to create customer' };
    }

    // Step 2: Create booking with customer reference
    const fullBookingData = {
      ...bookingData,
      customer_id: customer.id
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([fullBookingData])
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      return { booking: null, customer, error: bookingError.message };
    }

    return { booking, customer, error: null };

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
    console.log('🔍 About to execute join query...');
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customers!bookings_customer_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    console.log('🔍 Join query completed');
    console.log('📊 Query result data:', data);
    console.log('❌ Query result error:', error);

    if (error) {
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return { bookings: null, error: error.message };
    }

    return { bookings: data || [], error: null };

  } catch (error) {
    console.error('Exception in getBookingsWithCustomers:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return { bookings: null, error: 'Unexpected error occurred' };
  }
};
