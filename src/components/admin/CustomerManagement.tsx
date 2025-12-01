import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Save,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Customer } from './types';
import { getCustomerDisplayName, validateCustomerName } from './utils/customerUtils';
import { decryptCustomersArrayForAdmin, logAdminDataAccess } from '../../utils/adminGdprUtils';
import { encryptSensitiveData } from '../../utils/gdprUtils';
import * as XLSX from 'xlsx';

interface CustomerManagementProps {
  onCustomerSelect?: (customer: Customer) => void;
  selectedCustomerId?: number;
  customers?: Customer[];
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
  onRefresh?: (silent?: boolean) => void;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ 
  onCustomerSelect,
  selectedCustomerId,
  customers: propCustomers,
  onRefresh
}) => {
  const [customers, setCustomers] = useState<Customer[]>(propCustomers || []);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(!propCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Customer>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    county: '',
    eircode: '',
    country: 'Ireland',
    date_of_birth: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [hasAssociatedRecords, setHasAssociatedRecords] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    if (propCustomers) {
      // Use provided data from parent but decrypt it for admin viewing
      const decryptedCustomers = decryptCustomersArrayForAdmin(propCustomers);
      setCustomers(decryptedCustomers);
      setLoading(false);
    } else {
      // Fetch data if not provided
      fetchCustomers();
    }
  }, [propCustomers]);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, statusFilter]);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000); // 5 seconds

      return () => clearTimeout(timer); // Cleanup timer on unmount or success change
    }
  }, [success]);

  const fetchCustomers = async () => {
    // Don't fetch if data is provided from parent
    if (propCustomers) return;
    
    try {
      setLoading(true);
      console.log('Fetching customers...');
      
      // Query with all fields needed for customer management and export
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id, 
          first_name, 
          last_name, 
          email, 
          phone, 
          address_line_1,
          address_line_2,
          city,
          county,
          eircode,
          country,
          date_of_birth,
          emergency_contact_name,
          emergency_contact_phone,
          medical_notes,
          is_active, 
          created_at, 
          updated_at
        `)
        .order('created_at', { ascending: false }) // Most recent first
        .limit(100); // Reduced limit for faster loading

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Customers data loaded:', data?.length, 'records');
      
      // Decrypt customer data for admin viewing
      const decryptedCustomers = decryptCustomersArrayForAdmin(data || []);
      
      // Log admin access for GDPR audit
      const customerIds = decryptedCustomers.map(c => c.id).filter(Boolean);
      if (customerIds.length > 0) {
        logAdminDataAccess(null, 'VIEW_CUSTOMERS', customerIds, 'Customer management dashboard access'); // Auto-detect current admin user
      }
      
      setCustomers(decryptedCustomers);
    } catch (err) {
      console.error('Full error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch customers: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;
    
    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(customer => customer.is_active !== false);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(customer => customer.is_active === false);
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        getCustomerDisplayName(customer).toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm)
      );
    }
    
    setFilteredCustomers(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!validateCustomerName(formData.first_name, formData.last_name)) {
      setError('First name and last name are required');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    try {
      if (editingCustomer) {
        // Update existing customer - encrypt sensitive data
        const encryptedUpdateData = { ...formData };
        
        // Encrypt sensitive fields before updating
        if (encryptedUpdateData.first_name) {
          encryptedUpdateData.first_name = encryptSensitiveData(encryptedUpdateData.first_name);
        }
        if (encryptedUpdateData.last_name) {
          encryptedUpdateData.last_name = encryptSensitiveData(encryptedUpdateData.last_name);
        }
        if (encryptedUpdateData.phone) {
          encryptedUpdateData.phone = encryptSensitiveData(encryptedUpdateData.phone);
        }
        
        const { error } = await supabase
          .from('customers')
          .update(encryptedUpdateData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        setSuccess('Customer updated successfully');
      } else {
        // Create new customer - encrypt sensitive data
        const encryptedFormData = { ...formData };
        
        // Encrypt sensitive fields before creating
        if (encryptedFormData.first_name) {
          encryptedFormData.first_name = encryptSensitiveData(encryptedFormData.first_name);
        }
        if (encryptedFormData.last_name) {
          encryptedFormData.last_name = encryptSensitiveData(encryptedFormData.last_name);
        }
        if (encryptedFormData.phone) {
          encryptedFormData.phone = encryptSensitiveData(encryptedFormData.phone);
        }
        
        const { error } = await supabase
          .from('customers')
          .insert([encryptedFormData]);

        if (error) throw error;
        setSuccess('Customer created successfully');
      }

      resetForm();
      
      // If using prop customers, call parent refresh; otherwise fetch directly
      if (propCustomers && onRefresh) {
        onRefresh(true); // Silent refresh to preserve creation/update success message
      } else {
        fetchCustomers();
      }
    } catch (err: any) {
      if (err.code === '23505') {
        // Check if it's a primary key violation (ID sequence issue) or other constraint
        if (err.message.includes('customers_pkey')) {
          setError('Database ID sequence error. Please try again or contact support.');
        } else {
          setError('Failed to save customer due to constraint violation');
        }
      } else {
        setError('Failed to save customer');
      }
      console.error('Error saving customer:', err);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ ...customer });
    setShowForm(true);
  };

  const checkAssociatedRecords = async (customerId: number) => {
    try {
      // Check for bookings associated with this customer
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);

      // Check for invoices associated with this customer
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);

      const hasRecords = (bookings && bookings.length > 0) || (invoices && invoices.length > 0);
      setHasAssociatedRecords(!!hasRecords);
      return !!hasRecords;
    } catch (error) {
      console.error('Error checking associated records:', error);
      return false;
    }
  };

  const handleDeleteClick = async (customer: Customer) => {
    setCustomerToDelete(customer);
    await checkAssociatedRecords(customer.id!);
    setDeleteConfirmationOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      if (hasAssociatedRecords) {
        // Soft delete - mark as inactive
        const { error } = await supabase
          .from('customers')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', customerToDelete.id);

        if (error) throw error;
        setSuccess('Customer has been archived due to associated bookings/invoices.');
      } else {
        // Hard delete - completely remove the customer
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', customerToDelete.id);

        if (error) throw error;
        setSuccess('Customer has been permanently deleted.');
      }

      setDeleteConfirmationOpen(false);
      setCustomerToDelete(null);
      
      // If using prop customers, call parent refresh; otherwise fetch directly
      if (propCustomers && onRefresh) {
        onRefresh(true); // Silent refresh to preserve deletion success message
      } else {
        fetchCustomers();
      }
    } catch (err) {
      setError('Failed to delete customer');
      console.error('Error deleting customer:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      county: '',
      eircode: '',
      country: 'Ireland',
      date_of_birth: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      medical_notes: ''
    });
    setEditingCustomer(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleCustomerSelect = (customer: Customer) => {
    if (onCustomerSelect) {
      onCustomerSelect(customer);
    }
  };

  const exportToExcel = () => {
    if (!filteredCustomers.length) {
      setError('No customers to export');
      return;
    }

    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Prepare customer data for export (already decrypted for admin viewing)
      const exportData = filteredCustomers.map((customer, index) => ({
        S_No: index + 1,
        First_Name: customer.first_name || '',
        Last_Name: customer.last_name || '',
        Email: customer.email || '',
        Phone: customer.phone || '',
        Address_Line_1: customer.address_line_1 || '',
        Address_Line_2: customer.address_line_2 || '',
        City: customer.city || '',
        County: customer.county || '',
        Eircode: customer.eircode || '',
        Country: customer.country || '',
        Date_of_Birth: customer.date_of_birth || '',
        Emergency_Contact_Name: customer.emergency_contact_name || '',
        Emergency_Contact_Phone: customer.emergency_contact_phone || '',
        Medical_Notes: customer.medical_notes || '',
        Status: customer.is_active ? 'Active' : 'Inactive',
        Created_Date: customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '',
        Updated_Date: customer.updated_at ? new Date(customer.updated_at).toLocaleDateString() : ''
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');

      // Generate filename with current date
      const filename = `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      setSuccess(`Successfully exported ${exportData.length} customers to ${filename}`);
      
      // Log admin data access for GDPR compliance
      const customerIds = filteredCustomers.map(c => c.id).filter((id): id is number => typeof id === 'number');
      if (customerIds.length > 0) {
        logAdminDataAccess(
          null, // Auto-detect current admin user
          'EXPORT_CUSTOMERS', 
          customerIds, 
          `Customer data export to Excel (${exportData.length} records)`
        );
      }
    } catch (error) {
      console.error('Error exporting customers:', error);
      setError('Failed to export customers to Excel');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-gray-600 mt-1">Manage all customer information and profiles</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
        >
          <Plus size={20} />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by name, email, or phone..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Customers</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={exportToExcel}
              disabled={!filteredCustomers.length}
              className={`w-full px-4 py-2 rounded-lg flex items-center justify-center text-white transition-colors ${
                !filteredCustomers.length 
                  ? 'bg-green-400 cursor-not-allowed opacity-60' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              title={!filteredCustomers.length ? 'No customers to export' : 'Export filtered customers to Excel'}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="mr-2 w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Customer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-4 sm:my-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
            {/* Fixed Header */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-gray-200 bg-white rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <form id="customer-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information Section */}
                <div className="bg-gray-50 rounded-lg p-4 sm:p-5">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-blue-600" />
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information Section */}
                <div className="bg-blue-50 rounded-lg p-4 sm:p-5">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Mail className="w-5 h-5 mr-2 text-blue-600" />
                    Address Information
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        name="address_line_1"
                        value={formData.address_line_1 || ''}
                        onChange={handleInputChange}
                        placeholder="Street address, apartment, building, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="lg:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        name="address_line_2"
                        value={formData.address_line_2 || ''}
                        onChange={handleInputChange}
                        placeholder="Apartment, suite, unit, floor, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        County
                      </label>
                      <input
                        type="text"
                        name="county"
                        value={formData.county || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Eircode
                      </label>
                      <input
                        type="text"
                        name="eircode"
                        value={formData.eircode || ''}
                        onChange={handleInputChange}
                        placeholder="A12 B3C4"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        maxLength={8}
                      />
                    </div>
                  </div>
                </div>

                {/* Personal & Emergency Contact Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="bg-green-50 rounded-lg p-4 sm:p-5">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Personal Details</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          name="country"
                          value={formData.country || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="bg-orange-50 rounded-lg p-4 sm:p-5">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <Phone className="w-5 h-5 mr-2 text-orange-600" />
                      Emergency Contact
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          name="emergency_contact_name"
                          value={formData.emergency_contact_name || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Phone
                        </label>
                        <input
                          type="tel"
                          name="emergency_contact_phone"
                          value={formData.emergency_contact_phone || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="bg-purple-50 rounded-lg p-4 sm:p-5">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medical Notes
                    </label>
                    <textarea
                      name="medical_notes"
                      value={formData.medical_notes || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Any relevant medical history, conditions, or notes..."
                    />
                  </div>
                </div>

              </form>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-200 rounded-b-lg">
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="customer-form"
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
                >
                  <Save size={16} />
                  <span>{editingCustomer ? 'Update' : 'Create'} Customer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm || statusFilter !== 'all' ? 'No customers found matching your criteria.' : 'No customers found. Add your first customer!'}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {paginatedCustomers.map((customer) => {
                  const isInactive = customer.is_active === false;
                  return (
                    <tr
                      key={customer.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedCustomerId === customer.id ? 'bg-blue-50' : ''
                      } ${isInactive ? 'opacity-50 bg-gray-50' : ''}`}
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">
                                {getCustomerDisplayName(customer)}
                              </div>
                              {isInactive && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="mr-2 text-gray-400 w-4 h-4" />
                            {customer.email}
                          </div>
                          {customer.phone && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="mr-2 text-gray-400 w-4 h-4" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(customer);
                            }}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                            title="Edit customer"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(customer);
                            }}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                            title="Delete customer"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-4">
              {paginatedCustomers.map((customer) => {
                const isInactive = customer.is_active === false;
                return (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    className={`border border-gray-200 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedCustomerId === customer.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    } ${isInactive ? 'opacity-50 bg-gray-50' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">
                                {getCustomerDisplayName(customer)}
                              </p>
                              {isInactive && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="mt-1 space-y-1">
                              {customer.email && (
                                <div className="flex items-center text-sm text-gray-500">
                                  <Mail className="w-3 h-3 mr-1" />
                                  <span className="truncate">{customer.email}</span>
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center text-sm text-gray-500">
                                  <Phone className="w-3 h-3 mr-1" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(customer);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Edit customer"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(customer);
                              }}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete customer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredCustomers.length > 0 && (
        <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-gray-200 rounded-b-lg shadow-sm">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, filteredCustomers.length)}</span> of{' '}
                <span className="font-medium">{filteredCustomers.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="sr-only">Previous</span>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmationOpen && customerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="text-amber-500 mr-3" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">
                  {hasAssociatedRecords ? 'Archive Customer' : 'Delete Customer'}
                </h3>
              </div>
              
              {hasAssociatedRecords ? (
                <div className="mb-6">
                  <p className="text-gray-600 mb-3">
                    This customer has associated bookings or invoices and cannot be permanently deleted.
                  </p>
                  <p className="text-gray-600">
                    The customer <strong>{getCustomerDisplayName(customerToDelete)}</strong> will be archived instead. 
                    This will gray them out in the customer list while preserving the booking and invoice history.
                  </p>
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-gray-600 mb-3">
                    Are you sure you want to permanently delete <strong>{getCustomerDisplayName(customerToDelete)}</strong>?
                  </p>
                  <p className="text-red-600 text-sm">
                    This action cannot be undone as the customer has no associated bookings or invoices.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeleteConfirmationOpen(false);
                    setCustomerToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    hasAssociatedRecords 
                      ? 'bg-amber-600 hover:bg-amber-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {hasAssociatedRecords ? 'Archive Customer' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
