// Common types for Admin Console components

export type Package = {
  id?: number;
  name: string;
  price?: string;
  inHourPrice?: string;
  outOfHourPrice?: string;
  features: string[];
  category?: string;
  description?: string;
  isActive?: boolean;
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
  created_at?: string;
};

export type BookingFormData = {
  id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  package_name: string;
  appointment_date?: string;
  appointment_time?: string;
  booking_date?: string; // New field that stores both date and time
  notes?: string;
  status?: string;
  created_at?: string;
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
  date: string;
  start: string;
  end_time: string;
};

export type AvailabilityToDelete = {
  id: number;
  date: string;
  start: string;
  end_time: string;
  index: number;
};
