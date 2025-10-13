import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Zap,
  Play,
  Info
} from 'lucide-react';
import { useToast } from '../../shared/toastContext';
import { SLOT_DURATIONS, BREAK_DURATIONS } from './types';
import { supabase } from '../../../supabaseClient';

interface QuickScheduleGeneratorProps {
  onScheduleGenerated?: (slotsCreated: number) => void;
}

export const QuickScheduleGenerator: React.FC<QuickScheduleGeneratorProps> = ({
  onScheduleGenerated
}) => {
  const { showSuccess, showError } = useToast();

  // State for quick generation options
  const [quickPeriod, setQuickPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [slotDuration, setSlotDuration] = useState(50); // Default 50 minutes
  const [breakDuration, setBreakDuration] = useState(10); // Default 10 minutes break
  const [workingHours, setWorkingHours] = useState({
    start: '09:00',
    end: '17:00'
  });
  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    // For day mode, default to only today's day of the week
    const today = new Date();
    return [today.getDay()];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<{
    totalSlots: number;
    dates: string[];
    dailySlots: number;
    outOfHoursSlots?: number;
    weekendDays?: number;
    isOutOfHoursTime?: boolean;
  } | null>(null);

  // Update selected days when period changes
  useEffect(() => {
    const selectedDate = new Date(startDate);
    const selectedDayOfWeek = selectedDate.getDay();
    
    switch (quickPeriod) {
      case 'day':
        // For day mode, select only the day of the selected date
        setSelectedDays([selectedDayOfWeek]);
        break;
      case 'week':
        // For week mode, select Monday-Friday
        setSelectedDays([1, 2, 3, 4, 5]);
        break;
      case 'month':
        // For month mode, select Monday-Friday  
        setSelectedDays([1, 2, 3, 4, 5]);
        break;
    }
  }, [quickPeriod, startDate]);

  // Auto-calculate preview when any input changes
  useEffect(() => {
    const calculateAndSetPreview = () => {
      // Calculate end date based on quick period
      const start_date = new Date(startDate);
      let end_date = new Date(start_date);

      switch (quickPeriod) {
        case 'day':
          end_date = new Date(start_date);
          break;
        case 'week':
          end_date.setDate(start_date.getDate() + 6);
          break;
        case 'month':
          end_date = new Date(start_date.getFullYear(), start_date.getMonth() + 1, 0);
          break;
      }

      const end = end_date;
      const dates: string[] = [];
      const current = new Date(start_date);

      // Collect all dates in range that match selected days
      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (selectedDays.includes(dayOfWeek)) {
          dates.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }

      // Calculate slots per day
      const startTime = workingHours.start;
      const endTime = workingHours.end;
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const totalMinutes = endMinutes - startMinutes;

      const slotWithBreak = slotDuration + breakDuration;
      const dailySlots = Math.max(0, Math.floor(totalMinutes / slotWithBreak));

      // Calculate weekend days count
      const weekendDays = dates.filter(date => {
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
      });

      setPreviewData({
        totalSlots: dailySlots * dates.length,
        dates,
        dailySlots,
        weekendDays: weekendDays.length,
        isOutOfHoursTime: false
      });
    };

    calculateAndSetPreview();
  }, [startDate, workingHours.start, workingHours.end, slotDuration, breakDuration, selectedDays, quickPeriod]);

  const dayLabels = [
    { value: 0, label: 'Sunday', short: 'Sun' },
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' }
  ];

  // Calculate end date based on quick period
  const calculateEndDate = () => {
    const start = new Date(startDate);
    let end = new Date(start);

    switch (quickPeriod) {
      case 'day':
        // Same day
        end = new Date(start);
        break;
      case 'week':
        // 7 days from start
        end.setDate(start.getDate() + 6);
        break;
      case 'month':
        // End of the month
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        break;
    }

    return end.toISOString().split('T')[0];
  };

  // Calculate preview
  const calculatePreview = () => {
    // Calculate end date based on quick period
    const start_date = new Date(startDate);
    let end_date = new Date(start_date);

    switch (quickPeriod) {
      case 'day':
        end_date = new Date(start_date);
        break;
      case 'week':
        end_date.setDate(start_date.getDate() + 6);
        break;
      case 'month':
        end_date = new Date(start_date.getFullYear(), start_date.getMonth() + 1, 0);
        break;
    }

    const end = end_date;
    const dates: string[] = [];
    const current = new Date(start_date);

    // Collect all dates in range that match selected days
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (selectedDays.includes(dayOfWeek)) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }

    // Calculate slots per day
    const startTime = workingHours.start;
    const endTime = workingHours.end;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;

    const slotWithBreak = slotDuration + breakDuration;
    const dailySlots = Math.max(0, Math.floor(totalMinutes / slotWithBreak));

    // Calculate weekend days count
    const weekendDays = dates.filter(date => {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    });

    setPreviewData({
      totalSlots: dailySlots * dates.length,
      dates,
      dailySlots,
      weekendDays: weekendDays.length,
      isOutOfHoursTime: false
    });
  };

  // Handle day selection toggle
  const toggleDay = (dayValue: number) => {
    setSelectedDays(prev => {
      if (prev.includes(dayValue)) {
        return prev.filter(d => d !== dayValue);
      } else {
        return [...prev, dayValue].sort();
      }
    });
  };

  // Generate time slots for a day
  const generateTimeSlotsForDay = (startTime: string, endTime: string, slotDuration: number, breakDuration: number) => {
    const slots = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let currentMinutes = startMinutes;

    while (currentMinutes + slotDuration <= endMinutes) {
      const slotStartHour = Math.floor(currentMinutes / 60);
      const slotStartMin = currentMinutes % 60;
      const slotEndMinutes = currentMinutes + slotDuration;
      const slotEndHour = Math.floor(slotEndMinutes / 60);
      const slotEndMin = slotEndMinutes % 60;

      const startTimeStr = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMin.toString().padStart(2, '0')}`;
      const endTimeStr = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`;

      slots.push({
        start_time: startTimeStr,
        end_time: endTimeStr
      });

      // Move to next slot (add slot duration + break duration)
      currentMinutes += slotDuration + breakDuration;
    }

    return slots;
  };

  // Generate slots based on parameters
  const generateSlots = async () => {
    if (selectedDays.length === 0) {
      showError('No Days Selected', 'Please select at least one day of the week');
      return;
    }

    setIsGenerating(true);
    try {
      const endDate = calculateEndDate();

      // Generate all dates in the range that match selected days
      const dates = [];
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (selectedDays.includes(dayOfWeek)) {
          dates.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }

      console.log('Generating slots for dates:', dates);

      // Generate time slots for each day
      const timeSlots = generateTimeSlotsForDay(
        workingHours.start,
        workingHours.end,
        slotDuration,
        breakDuration
      );

      console.log('Time slots per day:', timeSlots);

      // Helper function to determine slot type based on time and day
      const getSlotType = (date: string, startTime: string, endTime: string): 'in-hour' | 'out-of-hour' => {
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

        // Weekend slots are always out-of-hour
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          return 'out-of-hour';
        }

        // Parse start and end times
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);

        const startTimeInMinutes = startHours * 60 + startMinutes;
        const endTimeInMinutes = endHours * 60 + endMinutes;

        const nineAM = 9 * 60; // 540 minutes (9:00 AM)
        const nineQuarterAM = 9 * 60 + 15; // 555 minutes (9:15 AM)
        const fivePM = 17 * 60; // 1020 minutes (5:00 PM)

        // Special rule: If slot starts before 9 AM but ends after 9:15 AM, consider it in-hour
        if (startTimeInMinutes < nineAM && endTimeInMinutes >= nineQuarterAM) {
          console.log(`✅ Early slot ${startTime}-${endTime} classified as IN-HOUR (overlaps business hours)`);
          return 'in-hour';
        }

        // Regular rules: slot must start at or after 9 AM and start before 5 PM
        if (startTimeInMinutes >= nineAM && startTimeInMinutes < fivePM) {
          return 'in-hour';
        }

        console.log(`❌ Slot ${startTime}-${endTime} classified as OUT-OF-HOUR`);
        return 'out-of-hour';
      };

      // Create slots to insert
      const slotsToInsert = [];
      for (const date of dates) {
        for (const timeSlot of timeSlots) {
          const slotType = getSlotType(date, timeSlot.start_time, timeSlot.end_time);

          slotsToInsert.push({
            date,
            start_time: timeSlot.start_time,
            end_time: timeSlot.end_time,
            start: timeSlot.start_time, // For backward compatibility
            is_available: true,
            schedule_type: 'template',
            slot_duration: slotDuration,
            slot_type: slotType
          });
        }
      }

      console.log('Total slots to insert:', slotsToInsert.length);

      // Insert slots in batches to avoid timeout
      const batchSize = 50;
      let totalInserted = 0;

      for (let i = 0; i < slotsToInsert.length; i += batchSize) {
        const batch = slotsToInsert.slice(i, i + batchSize);

        const { error } = await supabase
          .from('availability')
          .insert(batch)
          .select();

        if (error) {
          console.error('Error inserting batch:', error);
          throw error;
        }

        totalInserted += batch.length;
        console.log(`Inserted batch ${Math.ceil((i + 1) / batchSize)}: ${batch.length} slots`);
      }

      showSuccess(
        'Schedule Generated',
        `${totalInserted} slots created across ${dates.length} ${dates.length === 1 ? 'day' : 'days'}`
      );

      onScheduleGenerated?.(totalInserted);

    } catch (error) {
      console.error('Error generating schedule:', error);
      showError('Generation Failed', 'Unable to create schedule. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Quick preset buttons
  const quickPresets = [
    {
      name: 'Standard Week',
      period: 'week' as const,
      duration: 50,
      break: 10,
      hours: { start: '09:00', end: '17:00' },
      days: [1, 2, 3, 4, 5]
    },
    {
      name: 'Extended Hours',
      period: 'week' as const,
      duration: 60,
      break: 15,
      hours: { start: '08:00', end: '18:00' },
      days: [1, 2, 3, 4, 5]
    },
    {
      name: 'Weekend Only',
      period: 'week' as const,
      duration: 50,
      break: 10,
      hours: { start: '10:00', end: '16:00' },
      days: [0, 6]
    }
  ];

  const applyPreset = (preset: typeof quickPresets[0]) => {
    setQuickPeriod(preset.period);
    setSlotDuration(preset.duration);
    setBreakDuration(preset.break);
    setWorkingHours(preset.hours);
    setSelectedDays(preset.days);
  };

  // Auto-calculate preview when parameters change
  React.useEffect(() => {
    calculatePreview();
  }, [startDate, quickPeriod, slotDuration, breakDuration, workingHours, selectedDays]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <Zap className="w-5 h-5 text-primary-600 mr-2" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Schedule Generator</h3>
            <p className="text-sm text-gray-600">
              Rapidly create availability slots for day, week, or month periods
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Quick Presets */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Presets</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {quickPresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => applyPreset(preset)}
                className="p-3 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <div className="font-medium text-gray-900 text-sm">{preset.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {preset.duration}min slots, {preset.break}min breaks
                </div>
                <div className="text-xs text-gray-500">
                  {preset.hours.start} - {preset.hours.end}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Period Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Settings */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Generation Period</label>
              <div className="grid grid-cols-3 gap-2">
                {(['day', 'week', 'month'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setQuickPeriod(period)}
                    className={`p-3 text-center border rounded-lg transition-colors ${
                      quickPeriod === period
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Calendar className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-sm font-medium capitalize">{period}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <div className="text-xs text-gray-500 mt-1">
                End date: {calculateEndDate()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={workingHours.start}
                  onChange={(e) => setWorkingHours(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={workingHours.end}
                  onChange={(e) => setWorkingHours(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Advanced Settings */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slot Duration</label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {SLOT_DURATIONS.map(duration => (
                    <option key={duration.value} value={duration.value}>
                      {duration.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Break Time</label>
                <select
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {BREAK_DURATIONS.map(duration => (
                    <option key={duration.value} value={duration.value}>
                      {duration.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Days of Week</label>
              <div className="grid grid-cols-7 gap-2">
                {dayLabels.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`p-2 text-center text-xs border rounded transition-colors ${
                      selectedDays.includes(day.value)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {previewData && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Preview</div>
                    <div className="space-y-1 text-xs">
                      <div>• {previewData.totalSlots} total slots</div>
                      <div>• {previewData.dates.length} working {previewData.dates.length === 1 ? 'day' : 'days'}</div>
                      <div>• {previewData.dailySlots} slots per day</div>
                      <div>• {slotDuration}min appointments with {breakDuration}min breaks</div>
                      {(previewData.weekendDays ?? 0) > 0 && (
                        <div className="pt-1 border-t border-blue-300">
                          <div className="font-medium text-orange-700">Weekend Days:</div>
                          <div>• {previewData.weekendDays} weekend {previewData.weekendDays === 1 ? 'day' : 'days'}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {previewData && (
                <>Ready to create {previewData.totalSlots} slots across {previewData.dates.length} {previewData.dates.length === 1 ? 'day' : 'days'}</>
              )}
            </div>
            <button
              onClick={generateSlots}
              disabled={isGenerating || selectedDays.length === 0}
              className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Generate Schedule
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};