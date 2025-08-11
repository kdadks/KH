import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import { 
  Plus, 
  Clock, 
  Trash2, 
  Calendar as CalendarIcon,
  List,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../shared/toastContext';
import { supabase } from '../../supabaseClient';

const localizer = momentLocalizer(moment);

interface AvailabilitySlot {
  id?: number;
  date: string;
  start: string;
  end_time: string;
}

type AvailabilityProps = Record<string, never>; // no props

export const Availability: React.FC<AvailabilityProps> = () => {
  const { showSuccess, showError } = useToast();
  
  // State management
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [slotToDelete, setSlotToDelete] = useState<AvailabilitySlot | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  // Multi-slots modal state
  const [showMultiSlotsModal, setShowMultiSlotsModal] = useState(false);
  const [selectedDateSlots, setSelectedDateSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDateLabel, setSelectedDateLabel] = useState<string>('');
  
  // Calendar view state
  const [calendarViewType, setCalendarViewType] = useState<View>(Views.MONTH);
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Add slot form state
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotStartTime, setNewSlotStartTime] = useState('');
  const [newSlotEndTime, setNewSlotEndTime] = useState('');
  const [newSlotError, setNewSlotError] = useState('');

  const fetchAvailabilitySlots = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .order('date', { ascending: true })
        .order('start', { ascending: true });

      if (error) {
        showError('Error', `Database error: ${error.message}`);
        return;
      }

      setAvailabilitySlots(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error', `Failed to load availability slots: ${errorMessage}`);
    }
  }, [showError]);

  // Load availability slots from database
  useEffect(() => {
    fetchAvailabilitySlots();
  }, [fetchAvailabilitySlots]);

  // Convert slots to calendar events  
  const formatTime = (t: string) => {
    if (!t) return t;
    const parts = t.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
  };

  const calendarEvents = availabilitySlots.map(slot => {
    const startFmt = formatTime(slot.start);
    const endFmt = formatTime(slot.end_time);
    return {
      id: slot.id,
      title: `${startFmt} - ${endFmt}`,
      start: new Date(`${slot.date}T${slot.start}`),
      end: new Date(`${slot.date}T${slot.end_time}`),
      resource: slot,
      style: {
        backgroundColor: '#10B981',
        borderColor: '#059669',
        color: 'white',
        fontSize: '0.7rem',
        lineHeight: '0.9rem',
        fontWeight: 500,
        padding: '2px 4px'
      }
    };
  });

  // Open modal with all slots for a date if more than one
  const openSlotsModalIfMultiple = (dateStr: string) => {
    const slotsForDate = availabilitySlots.filter(s => s.date === dateStr);
    if (slotsForDate.length > 1) {
      setSelectedDateSlots(slotsForDate);
      setSelectedDateLabel(dateStr);
      setShowMultiSlotsModal(true);
      return true;
    }
    return false;
  };

  // Add new availability slot
  const handleAddSlot = async () => {
    setNewSlotError('');
    
    if (!newSlotDate || !newSlotStartTime || !newSlotEndTime) {
      setNewSlotError('Please fill in all fields');
      return;
    }
    
    if (newSlotStartTime >= newSlotEndTime) {
      setNewSlotError('End time must be after start time');
      return;
    }

    try {
      const { error } = await supabase
        .from('availability')
        .insert([{
          date: newSlotDate,
          start: newSlotStartTime,
          end_time: newSlotEndTime
        }])
        .select();

      if (error) throw error;

      showSuccess('Success', 'Availability slot added successfully');
      setNewSlotDate('');
      setNewSlotStartTime('');
      setNewSlotEndTime('');
      
      // Refresh the data
      await fetchAvailabilitySlots();
    } catch (error) {
      console.error('Error adding availability slot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error', `Failed to add availability slot: ${errorMessage}`);
    }
  };

  // Delete availability slot
  const handleDeleteSlot = (slot: AvailabilitySlot) => {
    setSlotToDelete(slot);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteSlot = async () => {
    if (!slotToDelete?.id) return;

    try {
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('id', slotToDelete.id);

      if (error) throw error;

      showSuccess('Success', 'Availability slot deleted successfully');
      setShowDeleteConfirmModal(false);
      setSlotToDelete(null);
      
      // Refresh the data
      await fetchAvailabilitySlots();
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error', `Failed to delete availability slot: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Availability Management</h2>
          <p className="text-gray-600 mt-1">Manage your available time slots for appointments</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
            className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {viewMode === 'calendar' ? (
              <>
                <List className="w-4 h-4 mr-2" />
                List View
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendar View
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Availability Form (always on top) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Time Slot</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={newSlotDate}
              onChange={(e) => setNewSlotDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
            <input
              type="time"
              value={newSlotStartTime}
              onChange={(e) => setNewSlotStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
            <input
              type="time"
              value={newSlotEndTime}
              onChange={(e) => setNewSlotEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        {newSlotError && (
          <div className="mt-4 flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-sm text-red-700">{newSlotError}</span>
          </div>
        )}
        <button
          onClick={handleAddSlot}
          className="mt-4 flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Time Slot
        </button>
      </div>

      {/* Availability Slots Container (Calendar/List unified like Bookings) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Availability Slots ({availabilitySlots.length})</h3>
          {viewMode === 'calendar' && (
            <div className="flex space-x-2">
              <button
                onClick={() => setCalendarViewType(Views.DAY)}
                className={`px-3 py-1 text-sm rounded ${
                  calendarViewType === Views.DAY
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setCalendarViewType(Views.WEEK)}
                className={`px-3 py-1 text-sm rounded ${
                  calendarViewType === Views.WEEK
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setCalendarViewType(Views.MONTH)}
                className={`px-3 py-1 text-sm rounded ${
                  calendarViewType === Views.MONTH
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Month
              </button>
            </div>
          )}
        </div>

        <div className="overflow-hidden">
          {viewMode === 'calendar' ? (
            <div className="space-y-4">
              <div style={{ height: '600px' }} className="p-4 border rounded-lg">
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  view={calendarViewType}
                  date={calendarDate}
                  onView={setCalendarViewType}
                  onNavigate={setCalendarDate}
                  selectable
                  onSelectSlot={(slotInfo) => {
                    const start = slotInfo.start as Date;
                    const end = slotInfo.end as Date;
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const dateStr = `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`;
                    // If multiple existing slots for that date open modal; otherwise prefill form
                    if (!openSlotsModalIfMultiple(dateStr)) {
                      const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
                      const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
                      setNewSlotDate(dateStr);
                      setNewSlotStartTime(startTime);
                      setNewSlotEndTime(endTime);
                    }
                  }}
                  onSelectEvent={(event) => {
                    if (event.resource?.id) {
                      const slot = event.resource as AvailabilitySlot;
                      // If multiple for date open modal, else proceed to delete confirmation
                      if (!openSlotsModalIfMultiple(slot.date)) {
                        handleDeleteSlot(slot);
                      }
                    }
                  }}
                  eventPropGetter={() => ({
                    style: {
                      backgroundColor: '#059669',
                      borderColor: '#047857',
                      color: 'white',
                      fontSize: '0.7rem',
                      lineHeight: '0.9rem',
                      fontWeight: 500,
                      padding: '2px 4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center'
                    }
                  })}
                  style={{ height: '100%' }}
                />
              </div>
            </div>
          ) : (
            <div className="p-6">
              {availabilitySlots.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No availability slots found</p>
                  <p className="text-sm text-gray-400 mt-1">Add some time slots to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availabilitySlots.map((slot) => (
                    <div
                      key={slot.id || `${slot.date}-${slot.start}-${slot.end_time}`}
                      className="p-4 border border-gray-200 rounded-lg relative hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{slot.date}</p>
                          <p className="text-sm text-gray-500">{formatTime(slot.start)} - {formatTime(slot.end_time)}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <button
                            onClick={() => handleDeleteSlot(slot)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete availability slot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && slotToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Availability Slot</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this slot? This action cannot be undone.</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-700">
              <div className="flex justify-between"><span className="text-gray-500">Date:</span><span className="font-medium text-gray-900">{slotToDelete.date}</span></div>
              <div className="flex justify-between mt-1"><span className="text-gray-500">Time:</span><span className="font-medium text-gray-900">{slotToDelete.start} - {slotToDelete.end_time}</span></div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowDeleteConfirmModal(false); setSlotToDelete(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSlot}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Multi Slots Modal */}
      {showMultiSlotsModal && selectedDateSlots.length > 1 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center mb-4">
              <CalendarIcon className="w-6 h-6 text-primary-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Slots - {selectedDateLabel}</h3>
            </div>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {selectedDateSlots.map(slot => (
                <div key={slot.id || `${slot.date}-${slot.start}-${slot.end_time}`}
                  className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-2">
                  <span className="text-sm font-medium text-gray-800">{formatTime(slot.start)} - {formatTime(slot.end_time)}</span>
                  <button
                    onClick={() => handleDeleteSlot(slot)}
                    className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setShowMultiSlotsModal(false); setSelectedDateSlots([]); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
