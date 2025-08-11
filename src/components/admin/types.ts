// Common types for Admin Console components

export type Package = {
  name: string;
  price?: string;
  inHourPrice?: string;
  outOfHourPrice?: string;
  features: string[];
  category?: string;
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
