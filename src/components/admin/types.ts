// Common types for Admin Console components

export type Package = {
  id?: number;
  name: string;
  price?: string | number;
  inHourPrice?: string | number;
  outOfHourPrice?: string | number;
  features: string[];
  categories?: string[]; // Changed from category?: string to support multiple categories
  category?: string; // Keep for backward compatibility during migration
  description?: string;
  isActive?: boolean;
  bookingType?: 'book_now' | 'contact_me';
  visitType?: 'home' | 'online' | 'clinic'; // Visit type for service-specific rates
  created_at?: string;
  updated_at?: string;
};

// Service type alias for compatibility with invoice management
export type Service = {
  id: number;
  name: string;
  categories?: string[]; // Changed from category?: string to support multiple categories
  category?: string; // Keep for backward compatibility during migration
  price?: string | number;
  in_hour_price?: string | number;
  out_of_hour_price?: string | number;
  features?: string[];
  description?: string;
  is_active?: boolean;
  visit_type?: 'home' | 'online' | 'clinic'; // Visit type for service-specific rates
  created_at?: string;
  updated_at?: string;
};

export type ServiceTimeSlot = {
  id?: number;
  service_id: number;
  slot_type: 'in-hour' | 'out-of-hour';
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;
  end_time: string;
  is_available: boolean;
  slot_duration?: number; // Duration in minutes (30 or 50)
  created_at?: string;
};

export type BookingFormData = {
  id?: string;
  booking_reference?: string; // New field for human-readable booking reference (YYYY-MM-DD-000)
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  package_name: string;
  appointment_date?: string;
  appointment_time?: string;
  booking_date?: string; // New field that stores both date and time
  timeslot_start_time?: string; // New field for timeslot start time
  timeslot_end_time?: string; // New field for timeslot end time
  notes?: string;
  status?: string;
  created_at?: string;
  updated_at?: string; // Timestamp when booking was last updated (e.g., confirmed by admin)
  customer_id?: number; // New field for customer relationship
  visit_type?: 'home' | 'online' | 'clinic'; // Visit type selected by customer
  customer_details?: { // New field for customer relationship data
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    eircode?: string; // Include eircode for home visits
    created_at?: string;
    updated_at?: string;
  };
  // Legacy field mappings for compatibility
  name?: string;
  email?: string;
  phone?: string;
  service?: string;
  date?: string;
  time?: string;
};

export type AvailabilitySlot = {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

// New types for Invoice Management System

export type Customer = {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  eircode?: string; // Zipcode/Eircode for home visits

  county?: string;
  eircode?: string;
  country?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Invoice = {
  id?: number;
  invoice_number: string;
  customer_id: number;
  booking_id?: string; // UUID from bookings table
  invoice_date: string;
  due_date: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_method?: string;
  payment_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Related data for display
  customer?: Customer;
  items?: InvoiceItem[];
};

export type InvoiceItem = {
  id?: number;
  invoice_id?: number;
  service_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
  // Related data for display
  service?: Package;
};

export type InvoiceFormData = {
  customer_id: number;
  booking_id?: string; // UUID from bookings table
  invoice_date: string;
  due_date: string;
  items: InvoiceItem[];
  notes?: string;
};

export type PaymentRecord = {
  invoice_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
};
