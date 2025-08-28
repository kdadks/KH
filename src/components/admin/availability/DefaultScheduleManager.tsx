import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  AlertCircle,
  Info
} from 'lucide-react';
import { useToast } from '../../shared/toastContext';
import {
  WeeklyScheduleData,
  DAYS_OF_WEEK,
  SLOT_DURATIONS,
  BREAK_DURATIONS
} from './types';
import {
  fetchDefaultSchedule,
  updateDefaultSchedule,
  validateTimeRange,
  validateSlotDuration
} from './utils';

interface DefaultScheduleManagerProps {
  onScheduleUpdated?: () => void;
}

export const DefaultScheduleManager: React.FC<DefaultScheduleManagerProps> = ({
  onScheduleUpdated
}) => {
  const { showSuccess, showError } = useToast();
  const [scheduleData, setScheduleData] = useState<WeeklyScheduleData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDefaultSchedule();
  }, []);

  const loadDefaultSchedule = async () => {
    try {
      setIsLoading(true);
      const schedule = await fetchDefaultSchedule();
      setScheduleData(schedule);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading default schedule:', error);
      showError('Error', 'Failed to load default schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayToggle = (dayOfWeek: number) => {
    setScheduleData(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        isActive: !prev[dayOfWeek]?.isActive
      }
    }));
    setHasChanges(true);
  };

  const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    setScheduleData(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value
      }
    }));
    setHasChanges(true);
    
    // Clear errors for this day
    if (errors[`day-${dayOfWeek}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`day-${dayOfWeek}`];
        return newErrors;
      });
    }
  };

  const handleDurationChange = (dayOfWeek: number, field: 'slotDuration' | 'breakDuration', value: number) => {
    setScheduleData(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const validateSchedule = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    Object.values(scheduleData).forEach(day => {
      if (day.isActive) {
        if (!validateTimeRange(day.startTime, day.endTime)) {
          newErrors[`day-${day.dayOfWeek}`] = 'End time must be after start time';
        }
        
        if (!validateSlotDuration(day.slotDuration)) {
          newErrors[`day-${day.dayOfWeek}`] = 'Invalid slot duration';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateSchedule()) {
      showError('Validation Error', 'Please fix the errors before saving');
      return;
    }

    try {
      setIsSaving(true);
      await updateDefaultSchedule(scheduleData);
      setHasChanges(false);
      showSuccess('Success', 'Default schedule updated successfully');
      onScheduleUpdated?.();
    } catch (error) {
      console.error('Error saving default schedule:', error);
      showError('Error', 'Failed to save default schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    loadDefaultSchedule();
  };

  const copyToAllDays = (sourceDay: number) => {
    const sourceSchedule = scheduleData[sourceDay];
    if (!sourceSchedule) return;

    const newSchedule = { ...scheduleData };
    DAYS_OF_WEEK.forEach(day => {
      if (day.value !== sourceDay) {
        newSchedule[day.value] = {
          ...newSchedule[day.value],
          startTime: sourceSchedule.startTime,
          endTime: sourceSchedule.endTime,
          slotDuration: sourceSchedule.slotDuration,
          breakDuration: sourceSchedule.breakDuration,
          isActive: sourceSchedule.isActive
        };
      }
    });

    setScheduleData(newSchedule);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading default schedule...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="w-5 h-5 text-primary-600 mr-2" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Default Weekly Schedule</h3>
              <p className="text-sm text-gray-600">
                Configure your standard availability hours for each day of the week
              </p>
            </div>
          </div>
          {hasChanges && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">How it works:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Enable days when you're available and set your working hours</li>
                <li>Choose slot duration (how long each appointment lasts)</li>
                <li>Add break time between appointments if needed</li>
                <li>Use "Copy to All" to apply settings to all days quickly</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {DAYS_OF_WEEK.map(day => {
            const daySchedule = scheduleData[day.value] || {
              day: day.label,
              dayOfWeek: day.value,
              isActive: false,
              startTime: '09:00',
              endTime: '17:00',
              slotDuration: 60,
              breakDuration: 0
            };

            const hasError = errors[`day-${day.value}`];

            return (
              <div
                key={day.value}
                className={`border rounded-lg p-4 transition-colors ${
                  daySchedule.isActive
                    ? hasError
                      ? 'border-red-300 bg-red-50'
                      : 'border-primary-200 bg-primary-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={daySchedule.isActive}
                      onChange={() => handleDayToggle(day.value)}
                      className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                    />
                    <label className="ml-3 text-lg font-medium text-gray-900">
                      {day.label}
                    </label>
                  </div>
                  {daySchedule.isActive && (
                    <button
                      onClick={() => copyToAllDays(day.value)}
                      className="text-sm text-primary-600 hover:text-primary-800 transition-colors"
                    >
                      Copy to All
                    </button>
                  )}
                </div>

                {hasError && (
                  <div className="mb-3 flex items-center text-red-600">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    <span className="text-sm">{hasError}</span>
                  </div>
                )}

                {daySchedule.isActive && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={daySchedule.startTime}
                        onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={daySchedule.endTime}
                        onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slot Duration
                      </label>
                      <select
                        value={daySchedule.slotDuration}
                        onChange={(e) => handleDurationChange(day.value, 'slotDuration', parseInt(e.target.value))}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Break Between
                      </label>
                      <select
                        value={daySchedule.breakDuration}
                        onChange={(e) => handleDurationChange(day.value, 'breakDuration', parseInt(e.target.value))}
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
