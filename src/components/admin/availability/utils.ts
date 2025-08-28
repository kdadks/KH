// Enhanced Availability Management Utilities
// Utility functions for the new scheduling features

import { supabase } from '../../../supabaseClient';
import {
  AvailabilityTemplate,
  AvailabilityTemplateSlot,
  EnhancedAvailabilitySlot,
  ScheduleGenerationHistory,
  WeeklyScheduleData,
  SchedulePreview,
  DAYS_OF_WEEK
} from './types';

// Date and time utility functions
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export const formatTime = (time: string): string => {
  if (!time) return '';
  return time.substring(0, 5); // Remove seconds (HH:MM:SS -> HH:MM)
};

export const addMinutes = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};

export const getDayOfWeek = (date: string): number => {
  return new Date(date).getDay();
};

export const getDayName = (dayOfWeek: number): string => {
  return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || '';
};

export const getDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(d));
  }
  
  return dates;
};

// Template management functions
export const fetchAvailabilityTemplates = async (): Promise<AvailabilityTemplate[]> => {
  const { data, error } = await supabase
    .from('availability_templates')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('name');
  
  if (error) throw error;
  return data || [];
};

export const createAvailabilityTemplate = async (template: Partial<AvailabilityTemplate>): Promise<AvailabilityTemplate> => {
  // If this is being set as default, unset other defaults first
  if (template.is_default) {
    await supabase
      .from('availability_templates')
      .update({ is_default: false })
      .eq('is_default', true);
  }
  
  const { data, error } = await supabase
    .from('availability_templates')
    .insert([template])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateAvailabilityTemplate = async (id: number, template: Partial<AvailabilityTemplate>): Promise<AvailabilityTemplate> => {
  // If this is being set as default, unset other defaults first
  if (template.is_default) {
    await supabase
      .from('availability_templates')
      .update({ is_default: false })
      .eq('is_default', true)
      .neq('id', id);
  }
  
  const { data, error } = await supabase
    .from('availability_templates')
    .update({ ...template, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteAvailabilityTemplate = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('availability_templates')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Template slots management
export const fetchTemplateSlots = async (templateId: number): Promise<AvailabilityTemplateSlot[]> => {
  const { data, error } = await supabase
    .from('availability_template_slots')
    .select('*')
    .eq('template_id', templateId)
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time');
  
  if (error) throw error;
  return data || [];
};

export const createTemplateSlot = async (slot: Partial<AvailabilityTemplateSlot>): Promise<AvailabilityTemplateSlot> => {
  const { data, error } = await supabase
    .from('availability_template_slots')
    .insert([slot])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateTemplateSlot = async (id: number, slot: Partial<AvailabilityTemplateSlot>): Promise<AvailabilityTemplateSlot> => {
  const { data, error } = await supabase
    .from('availability_template_slots')
    .update(slot)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteTemplateSlot = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('availability_template_slots')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Default schedule management
export const fetchDefaultSchedule = async (): Promise<WeeklyScheduleData> => {
  const { data, error } = await supabase
    .from('default_availability_schedule')
    .select('*')
    .eq('is_active', true)
    .order('day_of_week');
  
  if (error) throw error;
  
  const scheduleData: WeeklyScheduleData = {};
  
  // Initialize all days
  DAYS_OF_WEEK.forEach(day => {
    scheduleData[day.value] = {
      day: day.label,
      dayOfWeek: day.value,
      isActive: false,
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 60,
      breakDuration: 0
    };
  });
  
  // Update with existing data
  (data || []).forEach(schedule => {
    scheduleData[schedule.day_of_week] = {
      day: getDayName(schedule.day_of_week),
      dayOfWeek: schedule.day_of_week,
      isActive: schedule.is_active,
      startTime: formatTime(schedule.start_time),
      endTime: formatTime(schedule.end_time),
      slotDuration: schedule.slot_duration,
      breakDuration: schedule.break_duration
    };
  });
  
  return scheduleData;
};

export const updateDefaultSchedule = async (scheduleData: WeeklyScheduleData): Promise<void> => {
  // Convert schedule data to array format
  const scheduleArray = Object.values(scheduleData).map(day => ({
    day_of_week: day.dayOfWeek,
    start_time: day.startTime,
    end_time: day.endTime,
    slot_duration: day.slotDuration,
    break_duration: day.breakDuration,
    is_active: day.isActive,
    updated_at: new Date().toISOString()
  }));
  
  // Upsert each day's schedule
  for (const schedule of scheduleArray) {
    const { error } = await supabase
      .from('default_availability_schedule')
      .upsert(schedule, {
        onConflict: 'day_of_week',
        ignoreDuplicates: false
      });
    
    if (error) throw error;
  }
};

// Enhanced availability slots management
export const fetchEnhancedAvailabilitySlots = async (startDate?: string, endDate?: string): Promise<EnhancedAvailabilitySlot[]> => {
  let query = supabase
    .from('availability')
    .select('*')
    .order('date')
    .order('start_time');
  
  if (startDate) {
    query = query.gte('date', startDate);
  }
  
  if (endDate) {
    query = query.lte('date', endDate);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Convert to enhanced format
  return (data || []).map(slot => ({
    id: slot.id,
    date: slot.date,
    start_time: formatTime(slot.start_time || slot.start),
    end_time: formatTime(slot.end_time),
    is_available: slot.is_available,
    created_at: slot.created_at,
    template_id: slot.template_id,
    schedule_type: slot.schedule_type || 'manual',
    slot_duration: slot.slot_duration || 60,
    is_override: slot.is_override || false,
    original_slot_id: slot.original_slot_id
  }));
};

// Schedule generation functions
export const generateScheduleFromTemplate = async (
  templateId: number,
  startDate: string,
  endDate: string
): Promise<number> => {
  const { data, error } = await supabase
    .rpc('generate_availability_from_template', {
      p_template_id: templateId,
      p_start_date: startDate,
      p_end_date: endDate
    });
  
  if (error) throw error;
  return data || 0;
};

export const applyDefaultScheduleToRange = async (
  startDate: string,
  endDate: string
): Promise<number> => {
  const { data, error } = await supabase
    .rpc('apply_default_schedule_to_range', {
      p_start_date: startDate,
      p_end_date: endDate
    });
  
  if (error) throw error;
  return data || 0;
};

// Schedule preview function
export const generateSchedulePreview = async (
  templateId: number | null,
  startDate: string,
  endDate: string,
  useDefaultSchedule: boolean = false
): Promise<SchedulePreview> => {
  const dates = getDateRange(startDate, endDate);
  const preview: SchedulePreview = {
    totalSlots: 0,
    daysAffected: 0,
    dateRange: { start: startDate, end: endDate },
    slotsPerDay: {},
    conflicts: []
  };
  
  // Get existing slots in the date range
  const existingSlots = await fetchEnhancedAvailabilitySlots(startDate, endDate);
  const existingSlotsByDate = existingSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, EnhancedAvailabilitySlot[]>);
  
  // Get template or default schedule data
  let scheduleData: any[] = [];
  
  if (useDefaultSchedule || !templateId) {
    const defaultSchedule = await fetchDefaultSchedule();
    scheduleData = Object.values(defaultSchedule).filter(day => day.isActive);
  } else {
    scheduleData = await fetchTemplateSlots(templateId);
  }
  
  // Calculate slots for each date
  dates.forEach(date => {
    const dayOfWeek = getDayOfWeek(date);
    const daySchedule = scheduleData.filter(s => 
      useDefaultSchedule ? s.dayOfWeek === dayOfWeek : s.day_of_week === dayOfWeek
    );
    
    let slotsForDay = 0;
    
    daySchedule.forEach(schedule => {
      const startTime = useDefaultSchedule ? schedule.startTime : formatTime(schedule.start_time);
      const endTime = useDefaultSchedule ? schedule.endTime : formatTime(schedule.end_time);
      const duration = useDefaultSchedule ? schedule.slotDuration : schedule.slot_duration;
      const breakDuration = useDefaultSchedule ? schedule.breakDuration : (schedule.break_duration || 0);
      
      // Calculate number of slots
      const totalMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
      const slotWithBreak = duration + breakDuration;
      const slotsCount = Math.floor(totalMinutes / slotWithBreak);
      
      slotsForDay += slotsCount;
    });
    
    if (slotsForDay > 0) {
      preview.slotsPerDay[date] = slotsForDay;
      preview.totalSlots += slotsForDay;
      preview.daysAffected++;
      
      // Check for conflicts
      const existing = existingSlotsByDate[date];
      if (existing && existing.length > 0) {
        preview.conflicts?.push({
          date,
          existingSlots: existing.length,
          message: `${existing.length} existing slots will be affected`
        });
      }
    }
  });
  
  return preview;
};

// Bulk operations
export const clearAvailabilityRange = async (startDate: string, endDate: string): Promise<number> => {
  const { count, error } = await supabase
    .from('availability')
    .delete()
    .gte('date', startDate)
    .lte('date', endDate);
  
  if (error) throw error;
  return count || 0;
};

// Time manipulation helpers
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const generateTimeSlots = (
  startTime: string,
  endTime: string,
  slotDuration: number,
  breakDuration: number = 0
): { start_time: string; end_time: string }[] => {
  const slots: { start_time: string; end_time: string }[] = [];
  let currentTime = startTime;
  
  while (timeToMinutes(currentTime) + slotDuration <= timeToMinutes(endTime)) {
    const endSlotTime = addMinutes(currentTime, slotDuration);
    
    slots.push({
      start_time: currentTime,
      end_time: endSlotTime
    });
    
    // Move to next slot with break
    currentTime = addMinutes(endSlotTime, breakDuration);
  }
  
  return slots;
};

// Validation functions
export const validateTimeRange = (startTime: string, endTime: string): boolean => {
  return timeToMinutes(startTime) < timeToMinutes(endTime);
};

export const validateDateRange = (startDate: string, endDate: string): boolean => {
  return new Date(startDate) <= new Date(endDate);
};

export const validateSlotDuration = (duration: number): boolean => {
  return duration > 0 && duration <= 480; // Max 8 hours
};

// Schedule history
export const fetchScheduleHistory = async (limit: number = 10): Promise<ScheduleGenerationHistory[]> => {
  const { data, error } = await supabase
    .from('schedule_generation_history')
    .select(`
      *,
      availability_templates(name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
};
