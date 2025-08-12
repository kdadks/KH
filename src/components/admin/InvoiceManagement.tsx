import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Search,
  Send,
  AlertCircle,
  Check,
  Clock,
  X as XIcon,
  Filter,
  Save,
  ArrowLeft,
  Download,
  Calendar,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Invoice, Customer, InvoiceItem, InvoiceFormData, BookingFormData } from './types';
import { getCustomerDisplayName } from './utils/customerUtils';
import { useToast } from '../shared/toastContext';

// Service type that matches database schema
interface Service {
  id: number;
  name: string;
  category?: string;
  price?: string;
  in_hour_price?: string;
  out_of_hour_price?: string;
  features?: string[];
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface InvoiceManagementProps {
  onClose?: () => void;
}

type ViewMode = 'list' | 'form' | 'preview';

const InvoiceManagement: React.FC<InvoiceManagementProps> = ({ onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const { showSuccess, showError } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerBookings, setCustomerBookings] = useState<BookingFormData[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [previewingInvoice, setPreviewingInvoice] = useState<Invoice | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<InvoiceFormData>({
    customer_id: 0,
    booking_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    notes: ''
  });
  const [selectedBooking, setSelectedBooking] = useState<BookingFormData | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          items:invoice_items(
            *,
            service:services(*)
          )
        `)
        .order('invoice_date', { ascending: false });

      if (invoiceError) throw invoiceError;

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .order('last_name', { ascending: true });

      if (customerError) throw customerError;

      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (serviceError) throw serviceError;

      setInvoices(invoiceData || []);
      setCustomers(customerData || []);
      setServices(serviceData || []);
    } catch (err) {
      showError('Data Fetch Error', 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerBookings = async (customerId: number) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', customerId)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setCustomerBookings(data || []);
    } catch (err) {
      console.error('Error fetching customer bookings:', err);
      setCustomerBookings([]);
    }
  };

  const handleCustomerChange = async (customerId: number) => {
    setFormData(prev => ({ ...prev, customer_id: customerId, booking_id: '' }));
    setSelectedBooking(null);
    
    if (customerId > 0) {
      await fetchCustomerBookings(customerId);
    } else {
      setCustomerBookings([]);
    }
  };

  const handleBookingChange = (bookingId: string) => {
    setFormData(prev => ({ ...prev, booking_id: bookingId }));
    
    const booking = customerBookings.find(b => b.id === bookingId);
    setSelectedBooking(booking || null);
    
    // Auto-populate first invoice item with service details
    if (booking) {
      const serviceName = booking.package_name || booking.service;
      
      // Try to find matching service in services data
      const matchingService = services.find(s => s.name === serviceName);
      
      if (matchingService && serviceName) {
        // Determine if it's in-hour or out-of-hour based on booking time
        const isInHour = isBookingInHour(booking);
        const unitPrice = isInHour ? 
          parseFloat(matchingService.in_hour_price?.replace('€', '') || '0') :
          parseFloat(matchingService.out_of_hour_price?.replace('€', '') || '0');
        
        const newItem: InvoiceItem = {
          description: `${serviceName} ${isInHour ? '(In-Hour)' : '(Out-of-Hour)'}`,
          quantity: 1,
          unit_price: unitPrice,
          total_price: unitPrice
        };
        
        setFormData(prev => ({
          ...prev,
          items: [newItem]
        }));
      }
    }
  };

  const isBookingInHour = (booking: BookingFormData): boolean => {
    // Simple logic: assume 9 AM - 5 PM weekdays are in-hour
    // You can make this more sophisticated based on your business rules
    if (!booking.booking_date && !booking.appointment_time) return true;
    
    try {
      let bookingDateTime: Date;
      if (booking.booking_date) {
        bookingDateTime = new Date(booking.booking_date);
      } else if (booking.appointment_date && booking.appointment_time) {
        bookingDateTime = new Date(`${booking.appointment_date}T${booking.appointment_time}`);
      } else {
        return true; // Default to in-hour
      }
      
      const hour = bookingDateTime.getHours();
      const day = bookingDateTime.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Monday-Friday (1-5), 9 AM - 5 PM (17:00)
      return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
    } catch {
      return true; // Default to in-hour if parsing fails
    }
  };

  const filterInvoices = () => {
    let filtered = invoices;

    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCustomerDisplayName(invoice.customer).toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer?.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    setFilteredInvoices(filtered);
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${randomNum}`;
  };

  const handleCreateInvoice = () => {
    setEditingInvoice(null);
    setSelectedBooking(null);
    setCustomerBookings([]);
    setFormData({
      customer_id: 0,
      booking_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [],
      notes: ''
    });
    setViewMode('form');
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    setEditingInvoice(invoice);
    
    // Fetch customer bookings for editing
    if (invoice.customer_id) {
      await fetchCustomerBookings(invoice.customer_id);
    }
    
    setFormData({
      customer_id: invoice.customer_id,
      booking_id: invoice.booking_id || '',
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      items: invoice.items || [],
      notes: invoice.notes || ''
    });
    setViewMode('form');
  };

  const handlePreviewInvoice = (invoice: Invoice) => {
    setPreviewingInvoice(invoice);
    setViewMode('preview');
  };

  const handleSubmitForm = async () => {
    try {
      if (!formData.customer_id || formData.customer_id === 0) {
        showError('Validation Error', 'Please select a customer');
        return;
      }

      if (!formData.items.length || formData.items.some(item => !item.description || item.quantity <= 0 || item.unit_price <= 0)) {
        showError('Validation Error', 'Please add valid invoice items');
        return;
      }

      const totalAmount = formData.items.reduce((sum, item) => sum + item.total_price, 0);

      if (editingInvoice) {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            customer_id: formData.customer_id,
            booking_id: formData.booking_id || null,
            invoice_date: formData.invoice_date,
            due_date: formData.due_date,
            subtotal: totalAmount,
            vat_rate: 0,
            vat_amount: 0,
            total_amount: totalAmount,
            notes: formData.notes
          })
          .eq('id', editingInvoice.id);

        if (invoiceError) throw invoiceError;

        await supabase.from('invoice_items').delete().eq('invoice_id', editingInvoice.id);

        if (formData.items.length > 0) {
          const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(formData.items.map(item => ({
              invoice_id: editingInvoice.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price
            })));

          if (itemsError) throw itemsError;
        }

        showSuccess('Invoice Updated', 'Invoice updated successfully');
      } else {
        const invoiceNumber = generateInvoiceNumber();
        
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            customer_id: formData.customer_id,
            booking_id: formData.booking_id || null,
            invoice_date: formData.invoice_date,
            due_date: formData.due_date,
            subtotal: totalAmount,
            vat_rate: 0,
            vat_amount: 0,
            total_amount: totalAmount,
            status: 'draft',
            notes: formData.notes
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        if (formData.items.length > 0) {
          const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(formData.items.map(item => ({
              invoice_id: newInvoice.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price
            })));

          if (itemsError) throw itemsError;
        }

        showSuccess('Invoice Created', 'Invoice created successfully');
      }

      setViewMode('list');
      await fetchData();
    } catch (err) {
      showError('Save Error', 'Failed to save invoice');
      console.error('Error saving invoice:', err);
    }
  };

  const handleDeleteInvoice = async (invoiceId: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
      const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
      if (error) throw error;

      showSuccess('Invoice Deleted', 'Invoice deleted successfully');
      fetchData();
    } catch (err) {
      showError('Delete Error', 'Failed to delete invoice');
      console.error('Error deleting invoice:', err);
    }
  };

  const addInvoiceItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit_price: 0, total_price: 0 }]
    }));
  };

  const removeInvoiceItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unit_price') {
            updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <Check size={14} />;
      case 'sent':
        return <Send size={14} />;
      case 'overdue':
        return <AlertCircle size={14} />;
      case 'cancelled':
        return <XIcon size={14} />;
      case 'draft':
        return <Clock size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Invoice Form View
  if (viewMode === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
              </h2>
              <p className="text-gray-600">Fill in the invoice details below</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitForm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Save size={16} />
              <span>{editingInvoice ? 'Update' : 'Create'} Invoice</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 space-y-6">
            {/* Customer Information Section */}
            <div className="bg-blue-50 rounded-lg p-4 sm:p-5">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Customer Information
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer *
                  </label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => handleCustomerChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value={0}>Select a customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {getCustomerDisplayName(customer)} - {customer.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Reference
                  </label>
                  <select
                    value={formData.booking_id}
                    onChange={(e) => handleBookingChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!formData.customer_id || formData.customer_id === 0}
                  >
                    <option value="">Select a booking (optional)</option>
                    {customerBookings.map(booking => (
                      <option key={booking.id} value={booking.id}>
                        {booking.package_name || booking.service} - {
                          booking.booking_date 
                            ? new Date(booking.booking_date).toLocaleDateString()
                            : (booking.appointment_date || booking.date || 'No date')
                        }
                      </option>
                    ))}
                  </select>
                  {selectedBooking && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-md text-xs text-blue-700">
                      <p><strong>Selected:</strong> {selectedBooking.package_name || selectedBooking.service}</p>
                      <p><strong>Date:</strong> {
                        selectedBooking.booking_date 
                          ? new Date(selectedBooking.booking_date).toLocaleDateString()
                          : (selectedBooking.appointment_date || selectedBooking.date || 'No date')
                      }</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Details Section */}
            <div className="bg-green-50 rounded-lg p-4 sm:p-5">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-green-600" />
                Invoice Details
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Invoice Items Section */}
            <div className="bg-gray-50 rounded-lg p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-gray-600" />
                  Invoice Items
                </h4>
                <button
                  onClick={addInvoiceItem}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
                >
                  <Plus size={14} />
                  <span>Add Item</span>
                </button>
              </div>
              <div className="space-y-3">
                {formData.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No invoice items yet. Add an item to get started.</p>
                    <button
                      onClick={addInvoiceItem}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <Plus size={16} />
                      <span>Add First Item</span>
                    </button>
                  </div>
                ) : (
                  formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 lg:grid-cols-6 gap-3 p-3 bg-white rounded-lg border">
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Service or item description"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unit Price (€) *
                      </label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateInvoiceItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Total (€)
                      </label>
                      <input
                        type="number"
                        value={item.total_price}
                        readOnly
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => removeInvoiceItem(index)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        disabled={formData.items.length <= 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
                )}
              </div>

              {/* Invoice Summary */}
              <div className="mt-6 bg-white rounded-lg border p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(formData.items.reduce((sum, item) => sum + item.total_price, 0))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-yellow-50 rounded-lg p-4 sm:p-5">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Additional Notes
              </h4>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Any additional notes or payment terms..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invoice Preview View
  if (viewMode === 'preview' && previewingInvoice) {
    const customer = previewingInvoice.customer;
    const items = previewingInvoice.items || [];
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Invoice Preview</h2>
              <p className="text-gray-600">{previewingInvoice.invoice_number}</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to List
            </button>
            <button
              onClick={() => handleEditInvoice(previewingInvoice)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Edit size={16} />
              <span>Edit</span>
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download size={16} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">KH Therapy</h1>
              <p className="text-gray-600">Professional Physiotherapy Services</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h2>
              <p className="text-gray-600">{previewingInvoice.invoice_number}</p>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(previewingInvoice.status)}`}>
                  {getStatusIcon(previewingInvoice.status)}
                  <span className="ml-1 capitalize">{previewingInvoice.status}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
              {customer && (
                <div className="space-y-1 text-gray-700">
                  <p className="font-medium">{getCustomerDisplayName(customer)}</p>
                  <p className="flex items-center"><Mail size={14} className="mr-2" />{customer.email}</p>
                  {customer.phone && <p className="flex items-center"><Phone size={14} className="mr-2" />{customer.phone}</p>}
                  {customer.address_line_1 && (
                    <div className="mt-2">
                      <p>{customer.address_line_1}</p>
                      {customer.address_line_2 && <p>{customer.address_line_2}</p>}
                      <p>{[customer.city, customer.county].filter(Boolean).join(', ')}</p>
                      {customer.eircode && <p>{customer.eircode}</p>}
                      <p>{customer.country || 'Ireland'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Date:</span>
                  <span className="font-medium">{formatDate(previewingInvoice.invoice_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-medium">{formatDate(previewingInvoice.due_date)}</span>
                </div>
                {previewingInvoice.booking_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booking Ref:</span>
                    <span className="font-medium">{previewingInvoice.booking_id}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 font-semibold text-gray-900">Description</th>
                  <th className="text-center py-3 font-semibold text-gray-900">Qty</th>
                  <th className="text-right py-3 font-semibold text-gray-900">Unit Price</th>
                  <th className="text-right py-3 font-semibold text-gray-900">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 text-gray-700">{item.description}</td>
                    <td className="py-3 text-center text-gray-700">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-700">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(previewingInvoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {previewingInvoice.notes && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes:</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{previewingInvoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List View (Default)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice Management</h2>
          <p className="text-gray-600">Create, manage, and track invoices for KH Therapy</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCreateInvoice}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus size={20} />
            <span>Create Invoice</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <XIcon size={20} />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by invoice number, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new invoice.</p>
            <div className="mt-6">
              <button
                onClick={handleCreateInvoice}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2" size={16} />
                New Invoice
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="mr-3 text-gray-400" size={20} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                          <div className="text-sm text-gray-500">Due: {formatDate(invoice.due_date)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{getCustomerDisplayName(invoice.customer)}</div>
                        <div className="text-sm text-gray-500">{invoice.customer?.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(invoice.invoice_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        <span className="ml-1 capitalize">{invoice.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePreviewInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Preview invoice"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEditInvoice(invoice)}
                          className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                          title="Edit invoice"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id!)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete invoice"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceManagement;
