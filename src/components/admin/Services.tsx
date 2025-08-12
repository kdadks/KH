import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X, Clock, Calendar } from 'lucide-react';
import { Package, ServiceTimeSlot } from './types';
import { useToast } from '../shared/toastContext';
import { supabase } from '../../supabaseClient';

interface ServicesProps {
  packages: Package[];
  setPackages: React.Dispatch<React.SetStateAction<Package[]>>;
  newPackage: Package;
  setNewPackage: React.Dispatch<React.SetStateAction<Package>>;
  editIndex: number | null;
  setEditIndex: React.Dispatch<React.SetStateAction<number | null>>;
  editPackage: Package | null;
  setEditPackage: React.Dispatch<React.SetStateAction<Package | null>>;
}

export const Services: React.FC<ServicesProps> = ({
  packages,
  setPackages,
  newPackage,
  setNewPackage,
  editIndex,
  setEditIndex,
  editPackage,
  setEditPackage
}) => {
  const { showSuccess, showError, showConfirm } = useToast();
  
  // Helper function to format time without seconds
  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5); // Remove seconds (HH:MM:SS -> HH:MM)
  };
  
  // State for time slots management
  const [showTimeSlots, setShowTimeSlots] = useState<number | null>(null);
  const [timeSlots, setTimeSlots] = useState<ServiceTimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState<Partial<ServiceTimeSlot>>({
    slot_type: 'in-hour',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    is_available: true
  });

  // State for bulk time slot creation
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [bulkCreateData, setBulkCreateData] = useState({
    slot_type: 'in-hour' as 'in-hour' | 'out-of-hour',
    days_of_week: [] as number[],
    start_time: '09:00',
    end_time: '17:00',
    apply_to_all_services: false,
    selected_services: [] as number[]
  });

  // Map of service_id -> time slot count
  const [timeSlotCounts, setTimeSlotCounts] = useState<Record<number, number>>({});

  // Fetch time slot counts for all visible services
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const serviceIds = (packages || [])
          .map(p => p.id)
          .filter((id): id is number => typeof id === 'number');
        if (serviceIds.length === 0) {
          setTimeSlotCounts({});
          return;
        }
        const { data, error } = await supabase
          .from('services_time_slots')
          .select('service_id, id')
          .in('service_id', serviceIds);
        if (error) throw error;
        const counts: Record<number, number> = {};
        (data || []).forEach(row => {
          counts[row.service_id] = (counts[row.service_id] || 0) + 1;
        });
        setTimeSlotCounts(counts);
      } catch (err) {
        console.error('Error fetching time slot counts:', err);
      }
    };
    fetchCounts();
  }, [packages]);

  // Days of week for time slot management
  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  // Load services from database on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  // Fetch all services from database
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database format to component format
      const transformedServices: Package[] = (data || []).map(service => ({
        id: service.id,
        name: service.name,
        category: service.category,
        price: service.price,
        inHourPrice: service.in_hour_price,
        outOfHourPrice: service.out_of_hour_price,
        features: service.features || [],
        description: service.description,
        isActive: service.is_active,
        created_at: service.created_at,
        updated_at: service.updated_at
      }));

      setPackages(transformedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
      showError('Error', 'Failed to load services from database');
    }
  };

  // Add new service to database
  const handleAdd = async () => {
    if (!newPackage.name.trim()) {
      showError('Validation Error', 'Service name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('services')
        .insert([{
          name: newPackage.name.trim(),
          category: newPackage.category || null,
          price: newPackage.price || null,
          in_hour_price: newPackage.inHourPrice || null,
          out_of_hour_price: newPackage.outOfHourPrice || null,
          features: newPackage.features.filter(f => f.trim()),
          description: newPackage.description || null,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Transform and add to local state
      const transformedService: Package = {
        id: data.id,
        name: data.name,
        category: data.category,
        price: data.price,
        inHourPrice: data.in_hour_price,
        outOfHourPrice: data.out_of_hour_price,
        features: data.features || [],
        description: data.description,
        isActive: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setPackages(prev => [transformedService, ...prev]);
      setNewPackage({ name: '', price: '', inHourPrice: '', outOfHourPrice: '', features: [''], category: '', description: '' });
      showSuccess('Success', 'Service added successfully');
    } catch (error) {
      console.error('Error adding service:', error);
      showError('Error', 'Failed to add service to database');
    }
  };

  // Delete service from database
  const handleDelete = async (index: number) => {
    const service = packages[index];
    if (!service.id) {
      // If no ID, just remove from local state (shouldn't happen with DB-backed services)
      setPackages(packages.filter((_, i) => i !== index));
      return;
    }

    showConfirm(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"? This action cannot be undone.`,
      async () => {
        try {
          const { error } = await supabase
            .from('services')
            .update({ is_active: false })
            .eq('id', service.id);

          if (error) throw error;

          setPackages(packages.filter((_, i) => i !== index));
          showSuccess('Success', 'Service deleted successfully');
        } catch (error) {
          console.error('Error deleting service:', error);
          showError('Error', 'Failed to delete service');
        }
      }
    );
  };

  // Update service in database
  const handleSaveEdit = async () => {
    if (editIndex === null || !editPackage) return;
    
    if (!editPackage.name.trim()) {
      showError('Validation Error', 'Service name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('services')
        .update({
          name: editPackage.name.trim(),
          category: editPackage.category || null,
          price: editPackage.price || null,
          in_hour_price: editPackage.inHourPrice || null,
          out_of_hour_price: editPackage.outOfHourPrice || null,
          features: editPackage.features.filter(f => f.trim()),
          description: editPackage.description || null
        })
        .eq('id', editPackage.id);

      if (error) throw error;

      // Update local state
      const updated = [...packages];
      updated[editIndex] = { ...editPackage, features: editPackage.features.filter(f => f.trim()) };
      setPackages(updated);
      
      setEditIndex(null);
      setEditPackage(null);
      showSuccess('Success', 'Service updated successfully');
    } catch (error) {
      console.error('Error updating service:', error);
      showError('Error', 'Failed to update service');
    }
  };

  // Fetch time slots for a service
  const fetchTimeSlots = async (serviceId: number) => {
    setIsLoadingSlots(true);
    try {
      const { data, error } = await supabase
        .from('services_time_slots')
        .select('*')
        .eq('service_id', serviceId)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      setTimeSlots(data || []);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      showError('Error', 'Failed to load time slots');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Add time slot
  const handleAddTimeSlot = async (serviceId: number) => {
    if (!newTimeSlot.start_time || !newTimeSlot.end_time) {
      showError('Validation Error', 'Start time and end time are required');
      return;
    }

    if (newTimeSlot.start_time >= newTimeSlot.end_time) {
      showError('Validation Error', 'End time must be after start time');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('services_time_slots')
        .insert([{
          service_id: serviceId,
          slot_type: newTimeSlot.slot_type,
          day_of_week: newTimeSlot.day_of_week,
          start_time: formatTime(newTimeSlot.start_time || ''),
          end_time: formatTime(newTimeSlot.end_time || ''),
          is_available: newTimeSlot.is_available ?? true
        }])
        .select()
        .single();

      if (error) throw error;

      setTimeSlots(prev => [...prev, data].sort((a, b) => 
        a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
      ));
      
      setNewTimeSlot({
        slot_type: 'in-hour',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
        is_available: true
      });
      // Increment count for this service
      setTimeSlotCounts(prev => ({
        ...prev,
        [serviceId]: (prev[serviceId] ?? 0) + 1
      }));
      
      showSuccess('Success', 'Time slot added successfully');
    } catch (error) {
      console.error('Error adding time slot:', error);
      showError('Error', 'Failed to add time slot');
    }
  };

  // Generate 50-minute time slots within a given time range
  const generateTimeSlots = (startTime: string, endTime: string): { start_time: string; end_time: string; }[] => {
    const slots: { start_time: string; end_time: string; }[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;
    
    let currentMinutes = startTotalMinutes;
    
    while (currentMinutes + 50 <= endTotalMinutes) {
      const currentHour = Math.floor(currentMinutes / 60);
      const currentMin = currentMinutes % 60;
      const endSlotMinutes = currentMinutes + 50;
      const endSlotHour = Math.floor(endSlotMinutes / 60);
      const endSlotMin = endSlotMinutes % 60;
      
      const startTimeFormatted = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      const endTimeFormatted = `${endSlotHour.toString().padStart(2, '0')}:${endSlotMin.toString().padStart(2, '0')}`;
      
      slots.push({
        start_time: startTimeFormatted,
        end_time: endTimeFormatted
      });
      
      currentMinutes += 50; // Move to next 50-minute slot
    }
    
    return slots;
  };

  // Bulk create time slots
  const handleBulkCreateTimeSlots = async () => {
    if (bulkCreateData.days_of_week.length === 0) {
      showError('Validation Error', 'Please select at least one day of the week');
      return;
    }

    if (bulkCreateData.start_time >= bulkCreateData.end_time) {
      showError('Validation Error', 'End time must be after start time');
      return;
    }

    const servicesToUpdate = bulkCreateData.apply_to_all_services 
      ? packages.filter(p => p.id).map(p => p.id!)
      : bulkCreateData.selected_services;

    if (servicesToUpdate.length === 0) {
      showError('Validation Error', 'Please select at least one service');
      return;
    }

    try {
      const timeSlots = generateTimeSlots(bulkCreateData.start_time, bulkCreateData.end_time);
      
      if (timeSlots.length === 0) {
        showError('Validation Error', 'No 50-minute slots can fit in the selected time range');
        return;
      }

      // Create slots for each selected service and day
      const slotsToInsert: any[] = [];
      
      servicesToUpdate.forEach(serviceId => {
        bulkCreateData.days_of_week.forEach(dayOfWeek => {
          timeSlots.forEach(slot => {
            slotsToInsert.push({
              service_id: serviceId,
              slot_type: bulkCreateData.slot_type,
              day_of_week: dayOfWeek,
              start_time: slot.start_time,
              end_time: slot.end_time,
              is_available: true
            });
          });
        });
      });

      const { error } = await supabase
        .from('services_time_slots')
        .insert(slotsToInsert);

      if (error) throw error;

      // Update counts for affected services
      const newCounts = { ...timeSlotCounts };
      servicesToUpdate.forEach(serviceId => {
        const slotsForService = bulkCreateData.days_of_week.length * timeSlots.length;
        newCounts[serviceId] = (newCounts[serviceId] || 0) + slotsForService;
      });
      setTimeSlotCounts(newCounts);

      // If we're currently viewing time slots for one of the affected services, refresh
      if (showTimeSlots !== null && packages[showTimeSlots]?.id && servicesToUpdate.includes(packages[showTimeSlots].id!)) {
        fetchTimeSlots(packages[showTimeSlots].id!);
      }

      setShowBulkCreate(false);
      setBulkCreateData({
        slot_type: 'in-hour',
        days_of_week: [],
        start_time: '09:00',
        end_time: '17:00',
        apply_to_all_services: false,
        selected_services: []
      });

      const totalSlotsCreated = slotsToInsert.length;
      showSuccess(
        'Success', 
        `Created ${totalSlotsCreated} time slots across ${servicesToUpdate.length} service(s) and ${bulkCreateData.days_of_week.length} day(s)`
      );
    } catch (error) {
      console.error('Error bulk creating time slots:', error);
      showError('Error', 'Failed to create time slots in bulk');
    }
  };

  // Handle bulk create day selection
  const handleDayToggle = (dayValue: number) => {
    setBulkCreateData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(dayValue)
        ? prev.days_of_week.filter(d => d !== dayValue)
        : [...prev.days_of_week, dayValue].sort()
    }));
  };

  // Handle service selection for bulk create
  const handleServiceToggle = (serviceId: number) => {
    setBulkCreateData(prev => ({
      ...prev,
      selected_services: prev.selected_services.includes(serviceId)
        ? prev.selected_services.filter(id => id !== serviceId)
        : [...prev.selected_services, serviceId]
    }));
  };

  // Delete time slot
  const handleDeleteTimeSlot = async (slotId: number) => {
    try {
      const { error } = await supabase
        .from('services_time_slots')
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      setTimeSlots(prev => prev.filter(slot => slot.id !== slotId));
      // Decrement count for the currently open service, if any
      if (showTimeSlots !== null) {
        const svcId = packages[showTimeSlots]?.id as number | undefined;
        if (typeof svcId === 'number') {
          setTimeSlotCounts(prev => ({
            ...prev,
            [svcId]: Math.max(0, (prev[svcId] ?? 0) - 1)
          }));
        }
      }
      showSuccess('Success', 'Time slot deleted successfully');
    } catch (error) {
      console.error('Error deleting time slot:', error);
      showError('Error', 'Failed to delete time slot');
    }
  };

  // Handle time slots view
  const handleViewTimeSlots = (serviceId: number, index: number) => {
    if (showTimeSlots === index) {
      setShowTimeSlots(null);
      setTimeSlots([]);
    } else {
      setShowTimeSlots(index);
      fetchTimeSlots(serviceId);
    }
  };

  // Handle feature changes for new service
  const handleFeatureChange = (idx: number, value: string) => {
    const features = [...newPackage.features];
    features[idx] = value;
    setNewPackage({ ...newPackage, features });
  };

  const addFeatureField = () => {
    setNewPackage({ ...newPackage, features: [...newPackage.features, ''] });
  };

  // Edit handlers
  const handleEdit = (index: number) => {
    setEditIndex(index);
    setEditPackage({ ...packages[index] });
  };

  const handleEditChange = (field: keyof Package, value: string) => {
    if (!editPackage) return;
    setEditPackage({ ...editPackage, [field]: value });
  };

  const handleEditFeatureChange = (idx: number, value: string) => {
    if (!editPackage) return;
    const features = [...editPackage.features];
    features[idx] = value;
    setEditPackage({ ...editPackage, features });
  };

  const addEditFeatureField = () => {
    if (!editPackage) return;
    setEditPackage({ ...editPackage, features: [...editPackage.features, ''] });
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
    setEditPackage(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Services Management</h2>
          <p className="text-gray-600 mt-1">Manage your treatment packages and services with time slots</p>
        </div>
      </div>

      {/* Add New Service */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Service</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <div className="mb-2 h-12">
              <label className="block text-sm font-medium text-gray-700">Service Name *</label>
            </div>
            <input
              type="text"
              value={newPackage.name}
              onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter service name"
              required
            />
          </div>
          <div>
            <div className="mb-2 h-12">
              <label className="block text-sm font-medium text-gray-700">Category</label>
            </div>
            <select
              value={newPackage.category || ''}
              onChange={(e) => setNewPackage({ ...newPackage, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="">Select category</option>
              <option value="Packages">Packages</option>
              <option value="Individual">Individual</option>
              <option value="Classes">Classes</option>
              <option value="Rehab & Fitness">Rehab & Fitness</option>
              <option value="Corporate Packages">Corporate Packages</option>
            </select>
          </div>
          <div>
            <div className="mb-2 h-12">
              <label className="block text-sm font-medium text-gray-700">
                Flat Price (optional)
              </label>
              <span className="text-xs text-gray-500">Use this OR hourly prices, not both</span>
            </div>
            <input
              type="text"
              value={newPackage.price || ''}
              onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="€25 / class or Contact for Quote"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="mb-2 h-12">
              <label className="block text-sm font-medium text-gray-700">
                In Hour Price
              </label>
              <span className="text-xs text-gray-500">Regular business hours rate</span>
            </div>
            <input
              type="text"
              value={newPackage.inHourPrice || ''}
              onChange={(e) => setNewPackage({ ...newPackage, inHourPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="€65"
            />
          </div>
          <div>
            <div className="mb-2 h-12">
              <label className="block text-sm font-medium text-gray-700">
                Out of Hour Price
              </label>
              <span className="text-xs text-gray-500">After hours/weekend rate</span>
            </div>
            <input
              type="text"
              value={newPackage.outOfHourPrice || ''}
              onChange={(e) => setNewPackage({ ...newPackage, outOfHourPrice: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="€80"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
          <textarea
            value={newPackage.description || ''}
            onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter service description..."
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
          <div className="space-y-2">
            {newPackage.features.map((feature, idx) => (
              <input
                key={idx}
                type="text"
                value={feature}
                onChange={(e) => handleFeatureChange(idx, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={`Feature ${idx + 1}`}
              />
            ))}
            <button
              type="button"
              onClick={addFeatureField}
              className="flex items-center px-3 py-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Feature
            </button>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </button>
      </div>

      {/* Bulk Time Slot Creation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Bulk Time Slot Creation</h3>
            <p className="text-sm text-gray-600 mt-1">Create multiple 50-minute time slots for services</p>
          </div>
          <button
            onClick={() => setShowBulkCreate(!showBulkCreate)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {showBulkCreate ? 'Hide' : 'Bulk Create Slots'}
          </button>
        </div>
        
        {showBulkCreate && (
          <div className="p-6 space-y-6">
            {/* Time Range Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slot Type</label>
                <select
                  value={bulkCreateData.slot_type}
                  onChange={(e) => setBulkCreateData(prev => ({ ...prev, slot_type: e.target.value as 'in-hour' | 'out-of-hour' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="in-hour">In Hours</option>
                  <option value="out-of-hour">Out of Hours</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={bulkCreateData.start_time}
                  onChange={(e) => setBulkCreateData(prev => ({ ...prev, start_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={bulkCreateData.end_time}
                  onChange={(e) => setBulkCreateData(prev => ({ ...prev, end_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Days Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Days of Week</label>
              <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                {daysOfWeek.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      bulkCreateData.days_of_week.includes(day.value)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {day.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Apply to Services</label>
                <button
                  type="button"
                  onClick={() => setBulkCreateData(prev => ({ 
                    ...prev, 
                    apply_to_all_services: !prev.apply_to_all_services,
                    selected_services: []
                  }))}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    bulkCreateData.apply_to_all_services
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {bulkCreateData.apply_to_all_services ? 'All Services Selected' : 'Select All Services'}
                </button>
              </div>
              
              {!bulkCreateData.apply_to_all_services && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {packages.filter(p => p.id).map(pkg => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handleServiceToggle(pkg.id!)}
                      className={`p-2 text-left text-sm rounded border transition-colors ${
                        bulkCreateData.selected_services.includes(pkg.id!)
                          ? 'bg-primary-50 text-primary-700 border-primary-200'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Check className={`w-4 h-4 inline mr-2 ${
                        bulkCreateData.selected_services.includes(pkg.id!)
                          ? 'text-primary-600'
                          : 'text-transparent'
                      }`} />
                      {pkg.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
              <div className="text-sm text-gray-600">
                {(() => {
                  const timeSlots = generateTimeSlots(bulkCreateData.start_time, bulkCreateData.end_time);
                  const selectedServices = bulkCreateData.apply_to_all_services 
                    ? packages.filter(p => p.id).length
                    : bulkCreateData.selected_services.length;
                  const totalSlots = timeSlots.length * bulkCreateData.days_of_week.length * selectedServices;
                  
                  return (
                    <div className="space-y-1">
                      <p><strong>{timeSlots.length}</strong> × 50-minute slots per day</p>
                      <p><strong>{bulkCreateData.days_of_week.length}</strong> days selected</p>
                      <p><strong>{selectedServices}</strong> services selected</p>
                      <p className="text-primary-600 font-medium">Total: <strong>{totalSlots}</strong> time slots will be created</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowBulkCreate(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkCreateTimeSlots}
                disabled={bulkCreateData.days_of_week.length === 0 || 
                         (!bulkCreateData.apply_to_all_services && bulkCreateData.selected_services.length === 0)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Time Slots
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Services List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Current Services ({packages.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {packages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p>No services found</p>
              <p className="text-sm mt-1">Add your first service to get started</p>
            </div>
          ) : (
            packages.map((pkg, idx) => (
              <div key={pkg.id || idx} className="p-6">
                {editIndex === idx && editPackage ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Service</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="mb-1 h-12">
                          <label className="block text-sm font-medium text-gray-700">
                            Service Name *
                          </label>
                        </div>
                        <input
                          type="text"
                          value={editPackage.name}
                          onChange={(e) => handleEditChange('name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Enter service name"
                          required
                        />
                      </div>
                      <div>
                        <div className="mb-1 h-12">
                          <label className="block text-sm font-medium text-gray-700">
                            Category
                          </label>
                        </div>
                        <select
                          value={editPackage.category || ''}
                          onChange={(e) => handleEditChange('category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                          <option value="">Select Category</option>
                          <option value="Packages">Packages</option>
                          <option value="Individual">Individual</option>
                          <option value="Classes">Classes</option>
                          <option value="Rehab & Fitness">Rehab & Fitness</option>
                          <option value="Corporate Packages">Corporate Packages</option>
                        </select>
                      </div>
                      <div>
                        <div className="mb-1 h-12">
                          <label className="block text-sm font-medium text-gray-700">
                            In-Hour Price
                          </label>
                          <span className="text-xs text-gray-500">Regular business hours rate</span>
                        </div>
                        <input
                          type="text"
                          value={editPackage.inHourPrice || ''}
                          onChange={(e) => handleEditChange('inHourPrice', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="e.g., €65"
                        />
                      </div>
                      <div>
                        <div className="mb-1 h-12">
                          <label className="block text-sm font-medium text-gray-700">
                            Out-of-Hour Price
                          </label>
                          <span className="text-xs text-gray-500">After hours/weekend rate</span>
                        </div>
                        <input
                          type="text"
                          value={editPackage.outOfHourPrice || ''}
                          onChange={(e) => handleEditChange('outOfHourPrice', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="e.g., €80"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="mb-1 h-12">
                          <label className="block text-sm font-medium text-gray-700">
                            Fixed Price (if not hourly)
                          </label>
                          <span className="text-xs text-gray-500">Use this OR hourly prices, not both</span>
                        </div>
                        <input
                          type="text"
                          value={editPackage.price || ''}
                          onChange={(e) => handleEditChange('price', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="e.g., €90 or Contact for Quote"
                        />
                      </div>
                      <div>
                        <div className="mb-1 h-12">
                          <label className="block text-sm font-medium text-gray-700">
                            Service Description
                          </label>
                        </div>
                        <textarea
                          value={editPackage.description || ''}
                          onChange={(e) => handleEditChange('description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Detailed description of the service"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Features</label>
                      {editPackage.features.map((feature, fidx) => (
                        <input
                          key={fidx}
                          type="text"
                          value={feature}
                          onChange={(e) => handleEditFeatureChange(fidx, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder={`Feature ${fidx + 1}`}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={addEditFeatureField}
                        className="flex items-center px-3 py-2 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Feature
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-xl font-semibold text-gray-900">{pkg.name}</h4>
                        {pkg.price && (
                          <p className="text-2xl font-bold text-primary-600 mt-1">{pkg.price}</p>
                        )}
                        {pkg.category && (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full mt-2">
                            {pkg.category}
                            {typeof pkg.id === 'number' && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">
                                <Clock className="w-3 h-3 mr-1" />
                                {timeSlotCounts[pkg.id] ?? 0}
                              </span>
                            )}
                          </span>
                        )}
                        {pkg.description && (
                          <p className="text-gray-600 mt-2 text-sm">{pkg.description}</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                          {pkg.inHourPrice && (
                            <div className="text-sm">
                              <span className="text-gray-600">In Hour:</span>
                              <span className="font-medium ml-1 text-green-600">{pkg.inHourPrice}</span>
                            </div>
                          )}
                          {pkg.outOfHourPrice && (
                            <div className="text-sm">
                              <span className="text-gray-600">Out of Hour:</span>
                              <span className="font-medium ml-1 text-orange-600">{pkg.outOfHourPrice}</span>
                            </div>
                          )}
                        </div>
                        {pkg.features.length > 0 && (
                          <ul className="mt-3 space-y-1">
                            {pkg.features.filter(Boolean).map((feature, fidx) => (
                              <li key={fidx} className="text-gray-600 flex items-center text-sm">
                                <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        {pkg.id && (
                          <button
                            onClick={() => handleViewTimeSlots(pkg.id!, idx)}
                            className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            Time Slots
                          </button>
                        )}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(idx)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Service"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(idx)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Service"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Time Slots Section */}
                    {showTimeSlots === idx && pkg.id && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                        <div className="flex justify-between items-center mb-4">
                          <h5 className="text-lg font-semibold text-gray-900">Time Slots</h5>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setBulkCreateData(prev => ({
                                  ...prev,
                                  apply_to_all_services: false,
                                  selected_services: [pkg.id!]
                                }));
                                setShowBulkCreate(true);
                              }}
                              className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              <Calendar className="w-4 h-4 mr-1" />
                              Quick Bulk
                            </button>
                            <button
                              onClick={() => setShowTimeSlots(null)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Add Time Slot Form */}
                        <div className="bg-white p-4 rounded-lg border mb-4">
                          <h6 className="text-md font-medium text-gray-700 mb-3">Add New Time Slot</h6>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
                              <select
                                value={newTimeSlot.slot_type}
                                onChange={(e) => setNewTimeSlot({ ...newTimeSlot, slot_type: e.target.value as 'in-hour' | 'out-of-hour' })}
                                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                              >
                                <option value="in-hour">In Hour</option>
                                <option value="out-of-hour">Out of Hour</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Day</label>
                              <select
                                value={newTimeSlot.day_of_week}
                                onChange={(e) => setNewTimeSlot({ ...newTimeSlot, day_of_week: parseInt(e.target.value) })}
                                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                              >
                                {daysOfWeek.map(day => (
                                  <option key={day.value} value={day.value}>{day.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Start</label>
                              <input
                                type="time"
                                step={60}
                                value={newTimeSlot.start_time}
                                onChange={(e) => setNewTimeSlot({ ...newTimeSlot, start_time: e.target.value })}
                                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">End</label>
                              <input
                                type="time"
                                step={60}
                                value={newTimeSlot.end_time}
                                onChange={(e) => setNewTimeSlot({ ...newTimeSlot, end_time: e.target.value })}
                                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={() => handleAddTimeSlot(pkg.id!)}
                                className="w-full px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                              >
                                Add Slot
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Time Slots List */}
                        <div className="space-y-2">
                          {isLoadingSlots ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                              <p className="text-sm text-gray-600 mt-2">Loading time slots...</p>
                            </div>
                          ) : timeSlots.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                              <p>No time slots configured</p>
                              <p className="text-sm">Add time slots to specify availability</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {timeSlots.map((slot) => (
                                <div key={slot.id} className="bg-white p-3 rounded border flex justify-between items-center">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className={`inline-block w-2 h-2 rounded-full ${
                                        slot.slot_type === 'in-hour' ? 'bg-green-500' : 'bg-orange-500'
                                      }`}></span>
                                      <span className="text-sm font-medium">
                                        {daysOfWeek.find(d => d.value === slot.day_of_week)?.label}
                                      </span>
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        slot.slot_type === 'in-hour' 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {slot.slot_type}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteTimeSlot(slot.id!)}
                                    className="text-red-500 hover:text-red-700 text-sm p-1"
                                    title="Delete time slot"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
