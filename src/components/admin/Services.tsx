import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X, Clock } from 'lucide-react';
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
          start_time: newTimeSlot.start_time,
          end_time: newTimeSlot.end_time,
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
      
      showSuccess('Success', 'Time slot added successfully');
    } catch (error) {
      console.error('Error adding time slot:', error);
      showError('Error', 'Failed to add time slot');
    }
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
                          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full mt-2">
                            {pkg.category}
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
                          <button
                            onClick={() => setShowTimeSlots(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-5 h-5" />
                          </button>
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
                                value={newTimeSlot.start_time}
                                onChange={(e) => setNewTimeSlot({ ...newTimeSlot, start_time: e.target.value })}
                                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">End</label>
                              <input
                                type="time"
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
                                      {slot.start_time} - {slot.end_time}
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
