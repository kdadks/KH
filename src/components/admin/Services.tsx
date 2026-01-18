import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Check, X, Clock, Calendar, Eye } from 'lucide-react';
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
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  
  // Available categories for services
  const availableCategories = [
    'Packages',
    'Individual',
    'Classes',
    'Rehab & Fitness',
    'Corporate Packages',
    'Online Session'
  ];

  // Filter states
  const [filterVisitType, setFilterVisitType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Helper functions for category management
  const handleCategoryToggle = (category: string, isForNew: boolean = true) => {
    if (isForNew) {
      const currentCategories = newPackage.categories || [];
      const newCategories = currentCategories.includes(category)
        ? currentCategories.filter(c => c !== category)
        : [...currentCategories, category];
      setNewPackage({ ...newPackage, categories: newCategories });
    } else if (editPackage) {
      const currentCategories = editPackage.categories || [];
      const newCategories = currentCategories.includes(category)
        ? currentCategories.filter(c => c !== category)
        : [...currentCategories, category];
      setEditPackage({ ...editPackage, categories: newCategories });
    }
  };

  const isCategorySelected = (category: string, isForNew: boolean = true) => {
    if (isForNew) {
      return (newPackage.categories || []).includes(category);
    } else if (editPackage) {
      return (editPackage.categories || []).includes(category);
    }
    return false;
  };
  
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
    slot_duration: 50,
    is_available: true
  });

  // State for modals
  const [showAddService, setShowAddService] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);

  // Helper function to determine slot type based on time
  const calculateSlotType = (startTime: string, endTime: string): 'in-hour' | 'out-of-hour' => {
    // In-hour: 09:00 - 17:00 (business hours)
    // Out-of-hour: before 09:00 or after 17:00
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    
    // If any part is outside business hours, it's out-of-hour
    if (startHour < 9 || endHour > 17) {
      return 'out-of-hour';
    }
    return 'in-hour';
  };

  // State for bulk time slot creation
  const [bulkCreateData, setBulkCreateData] = useState({
    slot_type: 'in-hour' as 'in-hour' | 'out-of-hour',
    slot_duration: 50,
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
        categories: Array.isArray(service.category) ? service.category : 
                   (service.category ? [service.category] : []), // Handle both array and string formats
        category: service.category, // Keep for backward compatibility
        price: service.price,
        inHourPrice: service.in_hour_price,
        outOfHourPrice: service.out_of_hour_price,
        features: service.features || [],
        description: service.description,
        isActive: service.is_active,
        bookingType: service.booking_type || 'book_now',
        visitType: service.visit_type || 'clinic',
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
          category: (newPackage.categories && newPackage.categories.length > 0) ? newPackage.categories : null,
          price: newPackage.price || null,
          in_hour_price: newPackage.inHourPrice || null,
          out_of_hour_price: newPackage.outOfHourPrice || null,
          features: newPackage.features.filter(f => f.trim()),
          description: newPackage.description || null,
          booking_type: newPackage.bookingType || 'book_now',
          visit_type: newPackage.visitType || 'clinic',
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Transform and add to local state
      const transformedService: Package = {
        id: data.id,
        name: data.name,
        categories: Array.isArray(data.category) ? data.category : 
                   (data.category ? [data.category] : []),
        category: data.category, // Keep for backward compatibility
        price: data.price,
        inHourPrice: data.in_hour_price,
        outOfHourPrice: data.out_of_hour_price,
        features: data.features || [],
        description: data.description,
        isActive: data.is_active,
        bookingType: data.booking_type || 'book_now',
        visitType: data.visit_type || 'clinic',
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setPackages(prev => [transformedService, ...prev]);
      setNewPackage({ name: '', price: '', inHourPrice: '', outOfHourPrice: '', features: [''], categories: [], category: '', description: '', bookingType: 'book_now', visitType: 'clinic' });
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
          category: (editPackage.categories && editPackage.categories.length > 0) ? editPackage.categories : null,
          price: editPackage.price || null,
          in_hour_price: editPackage.inHourPrice || null,
          out_of_hour_price: editPackage.outOfHourPrice || null,
          features: editPackage.features.filter(f => f.trim()),
          description: editPackage.description || null,
          booking_type: editPackage.bookingType || 'book_now',
          visit_type: editPackage.visitType || 'clinic'
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
          slot_duration: newTimeSlot.slot_duration || 50,
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
        slot_duration: 50,
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

  // Generate time slots within a given time range with specified duration
  const generateTimeSlots = (startTime: string, endTime: string, slotDuration: number = 50): { start_time: string; end_time: string; }[] => {
    const slots: { start_time: string; end_time: string; }[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;
    
    let currentMinutes = startTotalMinutes;
    
    while (currentMinutes + slotDuration <= endTotalMinutes) {
      const currentHour = Math.floor(currentMinutes / 60);
      const currentMin = currentMinutes % 60;
      const endSlotMinutes = currentMinutes + slotDuration;
      const endSlotHour = Math.floor(endSlotMinutes / 60);
      const endSlotMin = endSlotMinutes % 60;
      
      const startTimeFormatted = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      const endTimeFormatted = `${endSlotHour.toString().padStart(2, '0')}:${endSlotMin.toString().padStart(2, '0')}`;
      
      slots.push({
        start_time: startTimeFormatted,
        end_time: endTimeFormatted
      });
      
      currentMinutes += slotDuration; // Move to next slot
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
      const timeSlots = generateTimeSlots(bulkCreateData.start_time, bulkCreateData.end_time, bulkCreateData.slot_duration);
      
      if (timeSlots.length === 0) {
        showError('Validation Error', `No ${bulkCreateData.slot_duration}-minute slots can fit in the selected time range`);
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
              slot_duration: bulkCreateData.slot_duration,
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
        slot_duration: 50,
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
      // Scroll to time slots section after a short delay to allow rendering
      setTimeout(() => {
        timeSlotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
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
    const pkg = packages[index];
    setEditIndex(index);
    setEditPackage({
      ...pkg,
      categories: pkg.categories || (pkg.category ? [pkg.category] : [])
    });
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

  // Filter services based on selected filters
  const filteredPackages = packages.filter(pkg => {
    const matchesVisitType = filterVisitType === 'all' || pkg.visitType === filterVisitType;
    const matchesCategory = filterCategory === 'all' || 
      (pkg.categories && pkg.categories.includes(filterCategory));
    return matchesVisitType && matchesCategory;
  });

  // State for view service modal
  const [viewServiceIndex, setViewServiceIndex] = useState<number | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Services Management</h2>
          <p className="text-gray-600 mt-1">Manage your treatment packages and services</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkCreate(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Bulk Create Slots
          </button>
          <button
            onClick={() => setShowAddService(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </button>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">All Services ({filteredPackages.length})</h3>
            
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Visit Type:</label>
                <select
                  value={filterVisitType}
                  onChange={(e) => setFilterVisitType(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="all">All</option>
                  <option value="clinic">Clinic</option>
                  <option value="online">Online</option>
                  <option value="home">Home</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Category:</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="all">All</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              {(filterVisitType !== 'all' || filterCategory !== 'all') && (
                <button
                  onClick={() => {
                    setFilterVisitType('all');
                    setFilterCategory('all');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
        
        {filteredPackages.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            {packages.length === 0 ? (
              <>
                <p className="text-lg font-medium">No services found</p>
                <p className="text-sm mt-2">Add your first service to get started</p>
                <button
                  onClick={() => setShowAddService(true)}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Service
                </button>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">No services match your filters</p>
                <p className="text-sm mt-2">Try adjusting your filter criteria</p>
                <button
                  onClick={() => {
                    setFilterVisitType('all');
                    setFilterCategory('all');
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    In-Hour Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Out-of-Hour Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slots
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visit Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPackages.map((pkg, index) => {
                  // Find the original index in the packages array
                  const originalIndex = packages.findIndex(p => p.id === pkg.id);
                  return (
                  <tr key={pkg.id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{pkg.name}</div>
                      {pkg.bookingType === 'contact_me' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 mt-1">
                          Contact Only
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pkg.inHourPrice || pkg.price || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pkg.outOfHourPrice || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => pkg.id && handleViewTimeSlots(pkg.id, originalIndex)}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        {pkg.id ? (timeSlotCounts[pkg.id] || 0) : 0}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        pkg.visitType === 'home' ? 'bg-purple-100 text-purple-800' :
                        pkg.visitType === 'online' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {pkg.visitType === 'home' ? '🏠 Home' :
                         pkg.visitType === 'online' ? '💻 Online' : '🏥 Clinic'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(pkg.categories && pkg.categories.length > 0) ? (
                          pkg.categories.slice(0, 2).map((cat, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                        {pkg.categories && pkg.categories.length > 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                            +{pkg.categories.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewServiceIndex(originalIndex)}
                          className="text-gray-600 hover:text-blue-600 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(originalIndex)}
                          className="text-gray-600 hover:text-blue-600 transition-colors"
                          title="Edit service"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(originalIndex)}
                          className="text-gray-600 hover:text-red-600 transition-colors"
                          title="Delete service"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Time Slots Expansion Section */}
      {showTimeSlots !== null && packages[showTimeSlots] && (
        <div ref={timeSlotsRef} className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Time Slots for: {packages[showTimeSlots].name}
            </h3>
            <button
              onClick={() => setShowTimeSlots(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Add Time Slot Form */}
          <div className="bg-gray-50 p-4 rounded-lg border mb-4">
            <h4 className="text-md font-medium text-gray-700 mb-3">Add New Time Slot</h4>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
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
                <label className="block text-sm font-medium text-gray-600 mb-1">Duration</label>
                <select
                  value={newTimeSlot.slot_duration}
                  onChange={(e) => setNewTimeSlot({ ...newTimeSlot, slot_duration: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value={50}>50 min</option>
                  <option value={30}>30 min</option>
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
                  onClick={() => packages[showTimeSlots].id && handleAddTimeSlot(packages[showTimeSlots].id!)}
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
              <div className="text-center py-8">
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
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {slot.slot_duration || 50}min
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

      {/* View Service Details Modal */}
      {viewServiceIndex !== null && packages[viewServiceIndex] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-semibold text-gray-900">Service Details</h3>
                <button
                  onClick={() => setViewServiceIndex(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Service Name and Type */}
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{packages[viewServiceIndex].name}</h4>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    packages[viewServiceIndex].visitType === 'home' ? 'bg-purple-100 text-purple-800' :
                    packages[viewServiceIndex].visitType === 'online' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {packages[viewServiceIndex].visitType === 'home' ? '🏠 Home Visit' :
                     packages[viewServiceIndex].visitType === 'online' ? '💻 Online Session' : '🏥 Clinic Visit'}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    packages[viewServiceIndex].bookingType === 'contact_me' ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {packages[viewServiceIndex].bookingType === 'contact_me' ? '📞 Contact Me' : '📅 Book Now'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {packages[viewServiceIndex].description && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Description</h5>
                  <p className="text-gray-600">{packages[viewServiceIndex].description}</p>
                </div>
              )}

              {/* Pricing */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Pricing</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {packages[viewServiceIndex].price && (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <div className="text-sm text-gray-600">Standard Price</div>
                      <div className="text-lg font-semibold text-gray-900 mt-1">{packages[viewServiceIndex].price}</div>
                    </div>
                  )}
                  {packages[viewServiceIndex].inHourPrice && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="text-sm text-green-700">In-Hour Price</div>
                      <div className="text-lg font-semibold text-green-900 mt-1">{packages[viewServiceIndex].inHourPrice}</div>
                      <div className="text-xs text-green-600 mt-1">9:00 AM - 5:00 PM</div>
                    </div>
                  )}
                  {packages[viewServiceIndex].outOfHourPrice && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="text-sm text-orange-700">Out-of-Hour Price</div>
                      <div className="text-lg font-semibold text-orange-900 mt-1">{packages[viewServiceIndex].outOfHourPrice}</div>
                      <div className="text-xs text-orange-600 mt-1">After hours & weekends</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Categories */}
              {packages[viewServiceIndex].categories && packages[viewServiceIndex].categories!.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Categories</h5>
                  <div className="flex flex-wrap gap-2">
                    {packages[viewServiceIndex].categories!.map((cat, idx) => (
                      <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Features */}
              {packages[viewServiceIndex].features.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Features</h5>
                  <ul className="space-y-2">
                    {packages[viewServiceIndex].features.filter(Boolean).map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Time Slots Summary */}
              {packages[viewServiceIndex].id && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">Time Slots</h5>
                  <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <Clock className="w-8 h-8 text-blue-600" />
                    <div>
                      <div className="text-lg font-semibold text-blue-900">
                        {timeSlotCounts[packages[viewServiceIndex].id!] || 0} time slots configured
                      </div>
                      <button
                        onClick={() => {
                          const idx = viewServiceIndex;
                          setViewServiceIndex(null);
                          handleViewTimeSlots(packages[idx].id!, idx);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-1"
                      >
                        View and manage time slots →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setViewServiceIndex(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const idx = viewServiceIndex;
                  setViewServiceIndex(null);
                  handleEdit(idx);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Service
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Add Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Add New Service</h3>
                <button
                  onClick={() => setShowAddService(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Name *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visit Type *</label>
                  <select
                    value={newPackage.visitType || 'clinic'}
                    onChange={(e) => setNewPackage({ ...newPackage, visitType: e.target.value as 'home' | 'online' | 'clinic' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="clinic">🏥 Clinic Visit</option>
                    <option value="online">💻 Online</option>
                    <option value="home">🏠 Home Visit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Booking Action *</label>
                  <select
                    value={newPackage.bookingType || 'book_now'}
                    onChange={(e) => setNewPackage({ ...newPackage, bookingType: e.target.value as 'book_now' | 'contact_me' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="book_now">📅 Book Now</option>
                    <option value="contact_me">📞 Contact Me</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Standard Price</label>
                  <input
                    type="text"
                    value={newPackage.price}
                    onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="€100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">In Hours Price</label>
                  <input
                    type="text"
                    value={newPackage.inHourPrice}
                    onChange={(e) => setNewPackage({ ...newPackage, inHourPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="€80"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Out of Hours Price</label>
                  <input
                    type="text"
                    value={newPackage.outOfHourPrice}
                    onChange={(e) => setNewPackage({ ...newPackage, outOfHourPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="€120"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableCategories.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryToggle(category, true)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        isCategorySelected(category, true)
                          ? 'bg-primary-100 text-primary-700 border-primary-300'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Check className={`w-4 h-4 inline mr-2 ${
                        isCategorySelected(category, true) ? 'text-primary-600' : 'text-transparent'
                      }`} />
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newPackage.description}
                  onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Describe the service..."
                />
              </div>

              <div>
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
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddService(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulkCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Bulk Create Time Slots</h3>
                <button
                  onClick={() => setShowBulkCreate(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Time Range Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slot Duration</label>
                  <select
                    value={bulkCreateData.slot_duration}
                    onChange={(e) => setBulkCreateData(prev => ({ ...prev, slot_duration: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value={50}>50 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={bulkCreateData.start_time}
                    onChange={(e) => {
                      const newStartTime = e.target.value;
                      setBulkCreateData(prev => ({
                        ...prev,
                        start_time: newStartTime,
                        slot_type: calculateSlotType(newStartTime, prev.end_time)
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={bulkCreateData.end_time}
                    onChange={(e) => {
                      const newEndTime = e.target.value;
                      setBulkCreateData(prev => ({
                        ...prev,
                        end_time: newEndTime,
                        slot_type: calculateSlotType(prev.start_time, newEndTime)
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Auto-calculated Slot Type Display */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  Auto-calculated Slot Type:
                  <span className={`ml-2 font-bold ${
                    bulkCreateData.slot_type === 'out-of-hour'
                      ? 'text-orange-600'
                      : 'text-green-600'
                  }`}>
                    {bulkCreateData.slot_type === 'out-of-hour' ? '🌙 Out of Hour' : '🏢 In Hour'}
                  </span>
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  In Hour: 09:00 - 17:00 | Out of Hour: Before 09:00 or After 17:00
                </p>
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
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowBulkCreate(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCreateTimeSlots}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Time Slots
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editIndex !== null && editPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Edit Service</h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Name *</label>
                  <input
                    type="text"
                    value={editPackage.name}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visit Type *</label>
                  <select
                    value={editPackage.visitType || 'clinic'}
                    onChange={(e) => handleEditChange('visitType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="clinic">🏥 Clinic Visit</option>
                    <option value="online">💻 Online</option>
                    <option value="home">🏠 Home Visit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Booking Action *</label>
                  <select
                    value={editPackage.bookingType || 'book_now'}
                    onChange={(e) => handleEditChange('bookingType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="book_now">📅 Book Now</option>
                    <option value="contact_me">📞 Contact Me</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Standard Price</label>
                  <input
                    type="text"
                    value={editPackage.price}
                    onChange={(e) => handleEditChange('price', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">In Hours Price</label>
                  <input
                    type="text"
                    value={editPackage.inHourPrice}
                    onChange={(e) => handleEditChange('inHourPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Out of Hours Price</label>
                  <input
                    type="text"
                    value={editPackage.outOfHourPrice}
                    onChange={(e) => handleEditChange('outOfHourPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableCategories.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryToggle(category, false)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        isCategorySelected(category, false)
                          ? 'bg-primary-100 text-primary-700 border-primary-300'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Check className={`w-4 h-4 inline mr-2 ${
                        isCategorySelected(category, false) ? 'text-primary-600' : 'text-transparent'
                      }`} />
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editPackage.description}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                <div className="space-y-2">
                  {editPackage.features.map((feature, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={feature}
                      onChange={(e) => handleEditFeatureChange(idx, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder={`Feature ${idx + 1}`}
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
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
