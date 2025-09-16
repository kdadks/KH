// Enhanced Availability Management Types
// Types for the new scheduling features

export interface AvailabilityTemplate {
  id?: number;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AvailabilityTemplateSlot {
  id?: number;
  template_id: number;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;
  end_time: string;
  slot_duration: number; // in minutes
  break_duration: number; // in minutes
  is_active: boolean;
  created_at?: string;
}

export interface DefaultAvailabilitySchedule {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  break_duration: number;
  is_active: boolean;
  template_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EnhancedAvailabilitySlot {
  id?: number;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at?: string;
  template_id?: number;
  schedule_type: 'manual' | 'template' | 'override';
  slot_duration: number;
  is_override: boolean;
  original_slot_id?: number;
}

export interface ScheduleGenerationHistory {
  id?: number;
  template_id?: number;
  generation_date: string;
  start_date: string;
  end_date: string;
  slots_created: number;
  admin_user_id?: number;
  notes?: string;
  created_at?: string;
}

export interface WeeklyScheduleData {
  [key: number]: {
    day: string;
    dayOfWeek: number;
    isActive: boolean;
    startTime: string;
    endTime: string;
    slotDuration: number;
    breakDuration: number;
  };
}

export interface BulkScheduleOperation {
  operation: 'generate' | 'clear' | 'override';
  startDate: string;
  endDate: string;
  templateId?: number;
  useDefaultSchedule: boolean;
  selectedDays?: number[];
  confirmOverwrite: boolean;
}

export interface CalendarEditOperation {
  type: 'create' | 'edit' | 'delete' | 'bulk_delete';
  date: string;
  slotId?: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  selectedSlots?: number[];
}

export interface SchedulePreview {
  totalSlots: number;
  daysAffected: number;
  dateRange: {
    start: string;
    end: string;
  };
  slotsPerDay: {
    [date: string]: number;
  };
  conflicts?: {
    date: string;
    existingSlots: number;
    message: string;
  }[];
}

// Day of week constants
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

// Schedule type options
export const SCHEDULE_TYPES = [
  { value: 'manual', label: 'Manual', description: 'Manually created slot' },
  { value: 'template', label: 'Template', description: 'Generated from template' },
  { value: 'override', label: 'Override', description: 'Override of template slot' }
];

// Common slot durations
export const SLOT_DURATIONS = [
  { value: 30, label: '30 minutes' },
  { value: 50, label: '50 minutes' },
  { value: 60, label: '1 hour' }
];

// Break durations
export const BREAK_DURATIONS = [
  { value: 0, label: 'No break' },
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' }
];
