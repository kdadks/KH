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
  Mail,
  CreditCard
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { Invoice, Customer, InvoiceItem, InvoiceFormData, BookingFormData, Service } from './types';
import { getCustomerDisplayName } from './utils/customerUtils';
import { useToast } from '../shared/toastContext';
import { downloadInvoicePDFWithPayments, sendInvoiceByEmail } from '../../services/invoiceService';
import { createPaymentRequest } from '../../utils/paymentRequestUtils';
import { extractBaseServiceName, getServicePrice, fetchServicePricing, determineTimeSlotType } from '../../services/pricingService';

interface InvoiceManagementProps {
  onClose?: () => void;
  invoices?: Invoice[];
  setInvoices?: React.Dispatch<React.SetStateAction<Invoice[]>>;
  customers?: Customer[];
  services?: Service[];
  onRefresh?: () => void;
}

type ViewMode = 'list' | 'form' | 'preview';

const InvoiceManagement: React.FC<InvoiceManagementProps> = ({ 
  onClose,
  invoices: propInvoices,
  customers: propCustomers,
  services: propServices
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const { showSuccess, showError } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>(propInvoices || []);
  const [customers, setCustomers] = useState<Customer[]>(propCustomers || []);
  const [services, setServices] = useState<Service[]>(propServices || []);
  const [customerBookings, setCustomerBookings] = useState<BookingFormData[]>([]);
  const [availableBookings, setAvailableBookings] = useState<BookingFormData[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(!propInvoices || !propCustomers || !propServices);
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
  const [bookingPayments, setBookingPayments] = useState<any[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);
  const [previewInvoiceItems, setPreviewInvoiceItems] = useState<InvoiceItem[]>([]);
  
  // Invoice type selection
  const [invoiceType, setInvoiceType] = useState<'online' | 'offline'>('online');
  
  // Deposit tracking
  const [customerDeposits, setCustomerDeposits] = useState<{amount: number, serviceName?: string}>({
    amount: 0,
    serviceName: undefined
  });

  // Payment request and invoice sending states
  const [sendingInvoice, setSendingInvoice] = useState<{ [key: string]: boolean }>({});
  const [sendingPaymentRequest, setSendingPaymentRequest] = useState<{ [key: string]: boolean }>({});
  const [invoicePaymentStatus, setInvoicePaymentStatus] = useState<{ [key: string]: 'paid' | 'unpaid' | 'checking' }>({});

  useEffect(() => {
    if (propInvoices && propCustomers && propServices) {
      // Use provided data from parent
      setInvoices(propInvoices);
      setCustomers(propCustomers);
      setServices(propServices);
      setLoading(false);
    } else {
      // Fetch data if not provided
      fetchData();
    }
  }, [propInvoices, propCustomers, propServices]);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, statusFilter]);

  // Check payment status for invoices when they are loaded
  useEffect(() => {
    const checkAllPaymentStatuses = async () => {
      if (invoices.length === 0) return;
      
      const statusPromises = invoices.map(async (invoice) => {
        if (invoice.id && invoice.status === 'sent') {
          const status = await checkInvoicePaymentStatus(invoice.id);
          return { invoiceId: invoice.id.toString(), status };
        }
        return null;
      });

      const results = await Promise.all(statusPromises);
      const statusMap = results.reduce((acc, result) => {
        if (result) {
          acc[result.invoiceId] = result.status as 'paid' | 'unpaid' | 'checking';
        }
        return acc;
      }, {} as { [key: string]: 'paid' | 'unpaid' | 'checking' });

      setInvoicePaymentStatus(statusMap);

      // Update invoice status to 'paid' if payment found
      for (const result of results) {
        if (result && result.status === 'paid') {
          const invoice = invoices.find(inv => inv.id?.toString() === result.invoiceId);
          if (invoice && invoice.status !== 'paid') {
            try {
              await supabase
                .from('invoices')
                .update({ status: 'paid', payment_date: new Date().toISOString() })
                .eq('id', invoice.id);
              
              // Refresh data to show updated status
              await fetchData();
            } catch (error) {
              console.error('Error updating invoice status:', error);
            }
          }
        }
      }
    };

    checkAllPaymentStatuses();
  }, [invoices]);

  const fetchData = async () => {
    // Don't fetch if data is provided from parent
    if (propInvoices && propCustomers && propServices) return;
    
    try {
      setLoading(true);
      
      // Set up timeout protection - increased to 30 seconds
      const timeoutId = setTimeout(() => {
        showError('Timeout Error', 'Data loading is taking too long. Please check your connection.');
      }, 30000); // 30 second timeout instead of 15
      
      // Fetch data in parallel for better performance
      const [invoiceResult, customerResult, serviceResult] = await Promise.allSettled([
        supabase
          .from('invoices')
          .select(`
            *,
            customer:customers(*),
            items:invoice_items(*)
          `)
          .order('invoice_date', { ascending: false })
          .limit(100), // Reduced limit for better performance
        
        supabase
          .from('customers')
          .select('*')
          .order('last_name', { ascending: true })
          .limit(500), // Reduced limit
        
        supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })
      ]);

      // Clear timeout since queries completed
      clearTimeout(timeoutId);
      
      // Process invoice data
      if (invoiceResult.status === 'fulfilled' && !invoiceResult.value.error) {
        setInvoices(invoiceResult.value.data || []);
      } else {
        console.error('❌ Invoice error:', invoiceResult.status === 'fulfilled' ? invoiceResult.value.error : invoiceResult.reason);
        showError('Invoice Load Error', 'Failed to load invoices');
      }

      // Process customer data
      if (customerResult.status === 'fulfilled' && !customerResult.value.error) {
        setCustomers(customerResult.value.data || []);
      } else {
        console.error('❌ Customer error:', customerResult.status === 'fulfilled' ? customerResult.value.error : customerResult.reason);
        showError('Customer Load Error', 'Failed to load customers');
      }

      // Process service data
      if (serviceResult.status === 'fulfilled' && !serviceResult.value.error) {
        setServices(serviceResult.value.data || []);
      } else {
        console.error('❌ Service error:', serviceResult.status === 'fulfilled' ? serviceResult.value.error : serviceResult.reason);
        showError('Service Load Error', 'Failed to load services');
      }

    } catch (err) {
      console.error('❌ Critical error in fetchData:', err);
      showError('Data Fetch Error', 'Failed to fetch data. Please try again.');
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
        .eq('status', 'confirmed')
        .order('booking_date', { ascending: false });

      if (error) throw error;
      
      const allBookings = data || [];
      setCustomerBookings(allBookings);
      
      // Filter out fully paid bookings for invoice creation
      const unpaidBookings: BookingFormData[] = [];
      
      for (const booking of allBookings) {
        const isFullyPaid = await isBookingFullyPaid(booking);
        if (!isFullyPaid) {
          unpaidBookings.push(booking);
        }
      }
      
      setAvailableBookings(unpaidBookings);
      console.log(`📋 Found ${allBookings.length} total bookings, ${unpaidBookings.length} available for invoicing`);
    } catch (err) {
      console.error('Error fetching customer bookings:', err);
      setCustomerBookings([]);
      setAvailableBookings([]);
    }
  };

  const handleCustomerChange = async (customerId: number) => {
    console.log('🎯 Customer selected:', customerId);
    
    try {
      setFormData(prev => ({ ...prev, customer_id: customerId, booking_id: '' }));
      setSelectedBooking(null);
      setCustomerDeposits({ amount: 0, serviceName: undefined });
      
      // Clear any existing invoice items when customer changes
      setFormData(prev => ({
        ...prev,
        items: []
      }));
      
      if (customerId > 0) {
        console.log('� Fetching bookings for customer...');
        await fetchCustomerBookings(customerId);
        console.log('✅ Customer bookings loaded, please select a specific booking/service');
      } else {
        setCustomerBookings([]);
        setAvailableBookings([]);
      }
    } catch (error) {
      console.error('❌ Error in handleCustomerChange:', error);
    }
  };

  const fetchBookingPayments = async (bookingId: string) => {
    try {
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          currency,
          status,
          payment_method,
          payment_date,
          created_at,
          booking_id,
          invoice_id,
          notes
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching booking payments:', error);
        setBookingPayments([]);
        return;
      }

      setBookingPayments(payments || []);
      console.log(`💳 Found ${payments?.length || 0} payments for booking ${bookingId}:`, payments);
    } catch (error) {
      console.error('Error fetching booking payments:', error);
      setBookingPayments([]);
    }
  };

  // Function to check if a booking is fully paid (deposit + remaining balance)
  const isBookingFullyPaid = async (booking: BookingFormData): Promise<boolean> => {
    try {
      // Get service name and extract base name
      const serviceName = booking.package_name || booking.service || '';
      const baseServiceName = extractBaseServiceName(serviceName);
      
      // Get the service pricing data
      const servicePricing = await fetchServicePricing(baseServiceName);
      if (!servicePricing) {
        // If we can't find the service, don't exclude the booking
        return false;
      }
      
      // Determine time slot type and get price
      const serviceNameWithDetails = booking.package_name || booking.service || '';
      const timeSlotType = determineTimeSlotType(serviceNameWithDetails);
      const servicePrice = getServicePrice(servicePricing, timeSlotType);
      
      if (!servicePrice || servicePrice === 0) {
        // If we can't determine the price, don't exclude the booking
        return false;
      }
      
      // Fetch all payments for this booking (both 'paid' and 'completed' status)
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, status')
        .eq('booking_id', booking.id)
        .in('status', ['paid', 'completed']);
        
      if (error) {
        console.error('Error checking booking payments:', error);
        return false;
      }
      
      // Calculate total paid amount
      const totalPaid = (payments || []).reduce((sum, payment) => sum + payment.amount, 0);
      
      // Check if total paid equals or exceeds service price
      const isFullyPaid = totalPaid >= servicePrice;
      
      console.log(`💰 Booking ${booking.id} payment check: Service price: €${servicePrice}, Total paid: €${totalPaid}, Fully paid: ${isFullyPaid}`);
      
      return isFullyPaid;
    } catch (error) {
      console.error('Error checking if booking is fully paid:', error);
      return false;
    }
  };

  const handleBookingChange = async (bookingId: string) => {
    console.log('📋 Booking selected:', bookingId);
    setFormData(prev => ({ ...prev, booking_id: bookingId }));
    
    // Fetch payments for this booking
    if (bookingId) {
      await fetchBookingPayments(bookingId);
    } else {
      setBookingPayments([]);
    }

    const booking = customerBookings.find(b => b.id === bookingId);
    setSelectedBooking(booking || null);
    
    // Clear previous invoice items and deposits
    setFormData(prev => ({ ...prev, items: [] }));
    setCustomerDeposits({ amount: 0, serviceName: undefined });
    
    // Auto-populate invoice item with selected booking's service details
    if (booking) {
      console.log('🎯 Processing selected booking:', booking);
      const serviceName = booking.package_name || booking.service;
      console.log('🎨 Service name from booking:', serviceName);
      
      if (serviceName) {
        try {
          // Clean service name by removing price info in parentheses
          const cleanServiceName = serviceName.replace(/\s*\([^)]*\)$/, '').trim();
          console.log('🧹 Cleaned service name:', cleanServiceName);
          
          // Try to find matching service by exact name or cleaned name
          let matchingService = services.find(s => s.name === serviceName);
          if (!matchingService) {
            matchingService = services.find(s => s.name === cleanServiceName);
          }
          // Also try partial matching
          if (!matchingService) {
            matchingService = services.find(s => 
              cleanServiceName.toLowerCase().includes(s.name.toLowerCase()) ||
              s.name.toLowerCase().includes(cleanServiceName.toLowerCase())
            );
          }
          
          console.log('🔎 Found matching service:', matchingService ? 'Yes' : 'No');
          console.log('🔎 Matching service details:', matchingService);
          
          if (matchingService) {
            // Determine if it's in-hour or out-of-hour based on service name first, then booking time
            const isOutOfHour = cleanServiceName.toLowerCase().includes('out of hour');
            const isInHourByName = cleanServiceName.toLowerCase().includes('in hour');
            const isInHour = isInHourByName || (!isOutOfHour && isBookingInHour(booking));
            
            console.log('🕐 Pricing determination:', {
              serviceName: cleanServiceName,
              isOutOfHour,
              isInHourByName,
              bookingTimeInHour: isBookingInHour(booking),
              finalIsInHour: isInHour
            });
            
            let unitPrice = isInHour ? 
              parseFloat(matchingService.in_hour_price?.replace('€', '') || '0') :
              parseFloat(matchingService.out_of_hour_price?.replace('€', '') || '0');
            
            // Fallback: If service price is 0 or not set, try to extract from booking service name
            if (unitPrice === 0) {
              const priceMatch = serviceName.match(/€(\d+)/);
              if (priceMatch) {
                unitPrice = parseFloat(priceMatch[1]);
                console.log('💡 Using price from booking name:', unitPrice);
              }
            }
            
            console.log('⏰ Is Out of Hour:', isOutOfHour, 'Is In Hour:', isInHour);
            console.log('💰 Final unit price:', unitPrice);
            console.log('🏷️ Service prices - In Hour:', matchingService.in_hour_price, 'Out of Hour:', matchingService.out_of_hour_price);
            
            const newItem: InvoiceItem = {
              description: cleanServiceName,
              quantity: 1,
              unit_price: unitPrice,
              total_price: unitPrice
            };
            
            console.log('📝 Auto-populating invoice item for selected booking:', newItem);
            
            setFormData(prev => ({
              ...prev,
              items: [newItem]
            }));
            
            // Fetch deposit payments for this customer and service
            if (formData.customer_id) {
              console.log('🏦 Fetching deposit payments for selected service...');
              const { getCustomerDepositPayments } = await import('../../utils/paymentRequestUtils');
              const depositData = await getCustomerDepositPayments(formData.customer_id, cleanServiceName, bookingId);
              console.log('💳 Deposit found for selected service:', depositData.amount, 'using booking ID:', bookingId);
              
              // Verify deposit calculation: deposit should be 20% of the unit price
              const expectedDeposit = Math.round(unitPrice * 0.20);
              console.log('🔍 Deposit verification - Expected:', expectedDeposit, 'Found:', depositData.amount, 'Service Price:', unitPrice);
              
              // Use the actual deposit amount found in payments (not calculated)
              setCustomerDeposits({
                amount: depositData.amount,
                serviceName: cleanServiceName
              });
              
              // Log discrepancy if any
              if (depositData.amount > 0 && Math.abs(depositData.amount - expectedDeposit) > 1) {
                console.warn('⚠️ Deposit amount discrepancy detected:', {
                  expected: expectedDeposit,
                  actual: depositData.amount,
                  servicePrice: unitPrice,
                  difference: Math.abs(depositData.amount - expectedDeposit)
                });
              }
            }
            
            console.log('✅ Booking-based auto-population completed successfully!');
          } else {
            console.log('❌ No matching service found for selected booking');
            console.log('❌ Available services:', services.map(s => s.name));
          }
        } catch (error) {
          console.error('❌ Error processing selected booking:', error);
        }
      } else {
        console.log('❌ No service name found in selected booking');
      }
    } else {
      console.log('ℹ️ No booking selected or found');
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
    setCustomerDeposits({ amount: 0, serviceName: undefined });
    setInvoiceType('online'); // Reset to default online type
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
    
    // Determine invoice type based on existing invoice data
    const isOfflineInvoice = invoice.status === 'paid' && 
                           invoice.notes?.includes('Offline Payment Received');
    setInvoiceType(isOfflineInvoice ? 'offline' : 'online');
    
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
    
    // Fetch payments for the booking if available
    if (invoice.booking_id) {
      await fetchBookingPayments(invoice.booking_id);
    }
    
    setViewMode('form');
  };

  // Function to fetch all payments for a booking (both with and without invoice_id)
  const fetchAllBookingPayments = async (bookingId: string) => {
    try {
      console.log(`🔍 Fetching payments for booking: ${bookingId}`);
      
      // First, let's fetch ALL payments for this booking regardless of status
      const { data: allPayments, error: allError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          currency,
          status,
          payment_method,
          payment_date,
          created_at,
          booking_id,
          invoice_id,
          notes
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (allError) {
        console.error('Error fetching all booking payments:', allError);
        return [];
      }

      console.log(`� Found ${allPayments?.length || 0} total payments (all statuses) for booking ${bookingId}:`, allPayments);

      // Now filter for paid payments (status can be 'paid' or 'completed')
      const paidPayments = (allPayments || []).filter(p => p.status === 'paid' || p.status === 'completed');
      console.log(`✅ Found ${paidPayments.length} paid payments:`, paidPayments);

      return paidPayments;
    } catch (error) {
      console.error('Error fetching all booking payments:', error);
      return [];
    }
  };

  // Function to fetch invoice items and calculate offline payments
  const fetchInvoicePaymentData = async (invoice: Invoice) => {
    try {
      console.log(`🧾 Fetching payment data for invoice: ${invoice.id}`);
      
      // Fetch all online payments for this booking
      const onlinePayments = invoice.booking_id ? await fetchAllBookingPayments(invoice.booking_id) : [];
      
      // Fetch invoice items to get the actual invoice total
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);
      
      if (itemsError) {
        console.error('Error fetching invoice items:', itemsError);
        return { onlinePayments, offlinePayment: null, invoiceTotal: invoice.total_amount, actualItems: invoice.items || [] };
      }
      
      // Calculate actual invoice total from items
      const invoiceTotal = invoiceItems?.reduce((sum, item) => sum + item.total_price, 0) || invoice.total_amount;
      
      // Update the invoice object with actual items from database
      const actualItems = invoiceItems || invoice.items || [];
      
      // Calculate total online payments
      const totalOnlinePayments = onlinePayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      // Calculate offline payment amount
      const offlineAmount = invoiceTotal - totalOnlinePayments;
      
      console.log(`💰 Invoice Payment Breakdown:`, {
        invoiceId: invoice.id,
        invoiceTotal,
        totalOnlinePayments,
        offlineAmount,
        onlinePayments,
        actualItems
      });
      
      // Create offline payment object if there's an offline amount
      const offlinePayment = offlineAmount > 0 ? {
        id: `offline-${invoice.id}`,
        amount: offlineAmount,
        currency: 'EUR',
        status: 'paid',
        payment_method: 'offline',
        payment_date: invoice.created_at,
        created_at: invoice.created_at,
        booking_id: invoice.booking_id,
        invoice_id: invoice.id,
        notes: 'Offline payment'
      } : null;
      
      return { onlinePayments, offlinePayment, invoiceTotal, actualItems };
    } catch (error) {
      console.error('Error fetching invoice payment data:', error);
      return { onlinePayments: [], offlinePayment: null, invoiceTotal: invoice.total_amount, actualItems: invoice.items || [] };
    }
  };

  const handlePreviewInvoice = async (invoice: Invoice) => {
    setPreviewingInvoice(invoice);
    setViewMode('preview');
    
    // Fetch comprehensive payment data (online + offline calculation)
    const { onlinePayments, offlinePayment, actualItems } = await fetchInvoicePaymentData(invoice);
    
    // Combine online and offline payments
    const allPayments = [...onlinePayments];
    if (offlinePayment) {
      allPayments.push(offlinePayment);
    }
    
    // Update states
    setInvoicePayments(allPayments);
    setPreviewInvoiceItems(actualItems);
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

      const subtotalAmount = formData.items.reduce((sum, item) => sum + item.total_price, 0);
      
      // Calculate amounts based on invoice type
      let finalAmount: number;
      let invoiceStatus: string;
      let invoiceNotes: string;
      
      if (invoiceType === 'offline') {
        // Offline invoice: full amount, no deposit deduction, marked as paid
        finalAmount = subtotalAmount;
        invoiceStatus = editingInvoice ? editingInvoice.status : 'paid';
        
        // Build notes for offline invoice with deposit information
        let offlineNotes = `${formData.notes}\n\nOffline Payment Received: €${subtotalAmount.toFixed(2)} - Full payment received offline, no amount due.`;
        
        if (customerDeposits.amount > 0) {
          offlineNotes += `\n\nNote: Previous deposit of €${customerDeposits.amount.toFixed(2)} was paid online${customerDeposits.serviceName ? ` for ${customerDeposits.serviceName}` : ''}. The offline payment includes the remaining balance plus this deposit amount for a total payment of €${subtotalAmount.toFixed(2)}.`;
        }
        
        invoiceNotes = offlineNotes;
      } else {
        // Online invoice: deposit deduction applied, draft status
        finalAmount = Math.max(0, subtotalAmount - customerDeposits.amount);
        invoiceStatus = editingInvoice ? editingInvoice.status : 'draft';
        invoiceNotes = `${formData.notes}${customerDeposits.amount > 0 ? `\n\nDeposit Deducted: €${customerDeposits.amount.toFixed(2)}${customerDeposits.serviceName ? ` (${customerDeposits.serviceName})` : ''}` : ''}`;
      }

      if (editingInvoice) {
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            customer_id: formData.customer_id,
            booking_id: formData.booking_id || null,
            invoice_date: formData.invoice_date,
            due_date: formData.due_date,
            subtotal: subtotalAmount,
            vat_rate: 0,
            vat_amount: 0,
            total_amount: finalAmount,
            status: invoiceStatus,
            notes: invoiceNotes
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

        showSuccess('Invoice Updated', `Invoice updated successfully${invoiceType === 'offline' ? ' - marked as paid with offline payment' : ''}`);
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
            subtotal: subtotalAmount,
            vat_rate: 0,
            vat_amount: 0,
            total_amount: finalAmount,
            status: invoiceStatus,
            notes: invoiceNotes
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

        showSuccess('Invoice Created', `Invoice created successfully${invoiceType === 'offline' ? ' - marked as paid with offline payment' : ''}`);
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
      case 'partial':
        return 'bg-orange-100 text-orange-800';
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
      case 'partial':
        return <CreditCard size={14} />;
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

  // Check if invoice has been paid by checking payments table
  const checkInvoicePaymentStatus = async (invoiceId: number) => {
    try {
      // Get the invoice to find its booking_id
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('booking_id, total_amount')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) {
        console.error('Error fetching invoice for payment check:', invoiceError);
        return 'unpaid';
      }

      // Check for payments linked to this invoice or its booking
      let paymentsQuery = supabase
        .from('payments')
        .select('amount, status')
        .eq('status', 'paid');

      if (invoice.booking_id) {
        paymentsQuery = paymentsQuery.or(`invoice_id.eq.${invoiceId},booking_id.eq.${invoice.booking_id}`);
      } else {
        paymentsQuery = paymentsQuery.eq('invoice_id', invoiceId);
      }

      const { data: payments, error } = await paymentsQuery;

      if (error) {
        console.error('Error checking payment status:', error);
        return 'unpaid';
      }

      // Calculate total paid amount
      const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      
      // Consider invoice paid if total payments >= invoice total
      return totalPaid >= (invoice.total_amount || 0) ? 'paid' : 'unpaid';
    } catch (error) {
      console.error('Error checking payment status:', error);
      return 'unpaid';
    }
  };

  // Send invoice PDF via email
  const sendInvoicePDF = async (invoice: Invoice) => {
    if (!invoice || !invoice.customer?.email) {
      showError('Email Error', 'Customer email not found');
      return;
    }

    const invoiceId = invoice.id!.toString();
    setSendingInvoice(prev => ({ ...prev, [invoiceId]: true }));

    try {
      // Prepare email options
      const emailOptions = {
        to: [invoice.customer.email],
        subject: `Invoice ${invoice.invoice_number} - KH Therapy`,
        includePaymentInstructions: true
      };

      // Transform Invoice to the format expected by the service
      const invoiceData = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        status: invoice.status,
        subtotal: invoice.subtotal,
        vat_amount: invoice.vat_amount,
        total_amount: invoice.total_amount,
        total: invoice.total_amount, // Map total_amount to total for compatibility
        notes: invoice.notes,
        currency: 'EUR'
      };

      // Transform customer data
      const customerData = {
        id: invoice.customer.id,
        name: getCustomerDisplayName(invoice.customer),
        email: invoice.customer.email || '',
        phone: invoice.customer.phone || '',
        address_line_1: invoice.customer.address_line_1 || '',
        address_line_2: invoice.customer.address_line_2 || '',
        city: invoice.customer.city || '',
        county: invoice.customer.county || '',
        eircode: invoice.customer.eircode || ''
      };

      // Send invoice using the new service
      const result = await sendInvoiceByEmail(
        invoiceData,
        customerData,
        invoice.items || [],
        emailOptions
      );

      if (result.success) {
        // Update invoice status to 'sent'
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ 
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.id);

        if (updateError) {
          console.error('Update error details:', updateError);
          throw new Error(`Failed to update invoice status: ${updateError.message}`);
        }

        // Refresh the data to show updated status
        await fetchData();

        showSuccess('Invoice Sent', `Invoice ${invoice.invoice_number} has been sent to ${invoice.customer.email}. Customer will now see this invoice in their dashboard.`);
      } else {
        showError('Email Error', result.error || 'Failed to send invoice');
      }

    } catch (error) {
      console.error('Error sending invoice:', error);
      showError('Send Failed', 'Failed to send invoice PDF');
    } finally {
      setSendingInvoice(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  // Send payment request for invoice
  const sendInvoicePaymentRequest = async (invoice: Invoice) => {
    if (!invoice || !invoice.customer?.email) {
      showError('Error', 'Customer email not found');
      return;
    }

    const invoiceId = invoice.id!.toString();
    setSendingPaymentRequest(prev => ({ ...prev, [invoiceId]: true }));

    try {
      // Calculate the remaining amount after any deposit deductions
      // If invoice has deposit deduction notes, extract the deposit amount
      let depositAmount = 0;
      if (invoice.notes?.includes('Deposit Deducted:')) {
        const depositMatch = invoice.notes.match(/Deposit Deducted: €([\d.]+)/);
        if (depositMatch) {
          depositAmount = parseFloat(depositMatch[1]);
        }
      }

      // The payment request amount should be the full invoice total (which already has deposit deducted)
      const remainingAmount = invoice.total_amount;

      console.log('💳 Creating invoice payment request:', {
        invoiceNumber: invoice.invoice_number,
        totalAmount: invoice.total_amount,
        depositAmount: depositAmount,
        remainingAmount: remainingAmount,
        hasDepositDeduction: depositAmount > 0
      });

      // Create payment request using existing utility with invoice-specific parameters
      const paymentRequest = await createPaymentRequest(
        invoice.customer_id,
        `Invoice ${invoice.invoice_number}`, // serviceName
        invoice.due_date, // bookingDate
        invoice.id!, // invoiceId
        invoice.booking_id, // bookingId - pass the invoice's booking_id so payments get linked properly
        true, // isInvoicePaymentRequest - this tells the function it's for an invoice
        remainingAmount // customAmount - the exact amount to be paid
      );

      if (!paymentRequest) {
        throw new Error('Failed to create payment request');
      }

      // Send payment request email notification
      const { sendPaymentRequestNotification } = await import('../../utils/paymentRequestUtils');
      const { success: emailSuccess, error: emailError } = await sendPaymentRequestNotification(paymentRequest.id);
      
      if (!emailSuccess) {
        console.error('Failed to send payment request email:', emailError);
        showSuccess('Payment Request Created', 'Payment request created but email notification failed');
      } else {
        showSuccess('Payment Request Sent', `Payment request for ${formatCurrency(remainingAmount)} sent to ${invoice.customer.email}`);
      }

      // Refresh the data
      await fetchData();

    } catch (error) {
      console.error('Error sending payment request:', error);
      showError('Send Failed', 'Failed to send payment request');
    } finally {
      setSendingPaymentRequest(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  const downloadInvoicePDF = async (invoice: Invoice) => {
    if (!invoice) {
      showError('Download Error', 'Invoice data not found');
      return;
    }

    if (!invoice.customer) {
      showError('Download Error', 'Customer information not found');
      return;
    }

    try {
      // Check for required data
      const customerId = invoice.customer_id;
      if (!customerId) {
        showError('Download Error', 'Customer information missing for this invoice');
        return;
      }
      
      // Use the unified payment-aware PDF download function
      // @ts-ignore - customerId is checked above, TypeScript type guard not working
      const result = await downloadInvoicePDFWithPayments(invoice.id, customerId);

      if (result.success) {
        showSuccess('Download Complete', `Invoice ${invoice.invoice_number} downloaded successfully`);
      } else {
        showError('Download Error', result.error || 'Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      showError('Download Error', 'An unexpected error occurred while downloading the invoice');
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
              disabled={!formData.booking_id}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                formData.booking_id 
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
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
                    Select Service/Booking (Confirmed Only) *
                  </label>
                  <select
                    value={formData.booking_id}
                    onChange={(e) => handleBookingChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!formData.customer_id || formData.customer_id === 0}
                  >
                    <option value="">Select a confirmed service/booking to auto-populate invoice</option>
                    {availableBookings.map(booking => (
                      <option key={booking.id} value={booking.id}>
                        {booking.package_name || booking.service} - {
                          booking.booking_date 
                            ? new Date(booking.booking_date).toLocaleDateString()
                            : (booking.appointment_date || booking.date || 'No date')
                        }
                      </option>
                    ))}
                  </select>
                  {formData.customer_id === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      First select a customer to see their bookings
                    </p>
                  )}
                  {formData.customer_id > 0 && availableBookings.length === 0 && customerBookings.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No confirmed bookings found for this customer. Only confirmed bookings can be used for invoice generation.
                    </p>
                  )}
                  {formData.customer_id > 0 && availableBookings.length === 0 && customerBookings.length > 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      All bookings for this customer are fully paid. No bookings available for invoicing.
                    </p>
                  )}
                  {formData.customer_id > 0 && availableBookings.length > 0 && !formData.booking_id && (
                    <p className="mt-1 text-xs text-blue-600">
                      💡 Select a booking to automatically populate the invoice item with correct pricing
                      {customerBookings.length > availableBookings.length && (
                        <span className="block text-gray-500 mt-1">
                          ℹ️ {customerBookings.length - availableBookings.length} fully paid booking(s) excluded from list
                        </span>
                      )}
                    </p>
                  )}
                  {selectedBooking && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-xs">
                      <p className="text-green-800"><strong>✅ Selected Service:</strong> {selectedBooking.package_name || selectedBooking.service}</p>
                      <p className="text-green-600"><strong>Date:</strong> {
                        selectedBooking.booking_date 
                          ? new Date(selectedBooking.booking_date).toLocaleDateString()
                          : (selectedBooking.appointment_date || selectedBooking.date || 'No date')
                      }</p>
                      {customerDeposits.amount > 0 && (
                        <p className="text-green-600"><strong>💳 Deposit Available:</strong> €{customerDeposits.amount.toFixed(2)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Booking Payments Section */}
            {formData.booking_id && bookingPayments.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4 sm:p-5">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-yellow-600" />
                  Payments for Selected Booking
                </h4>
                <div className="space-y-3">
                  {bookingPayments.map((payment) => (
                    <div key={payment.id} className="bg-white rounded-lg p-3 border border-yellow-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              payment.status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : payment.status === 'processing'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {payment.status}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              €{payment.amount?.toFixed(2) || '0.00'}
                            </span>
                            <span className="text-xs text-gray-500">
                              via {payment.payment_method || 'Unknown'}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            <span>Booking ID: {payment.booking_id}</span>
                            {payment.invoice_id && (
                              <span className="ml-2">• Invoice ID: {payment.invoice_id}</span>
                            )}
                          </div>
                          {payment.notes && (
                            <div className="mt-1 text-xs text-gray-500">
                              {payment.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.payment_date 
                            ? new Date(payment.payment_date).toLocaleDateString()
                            : new Date(payment.created_at).toLocaleDateString()
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="bg-white rounded-lg p-3 border border-yellow-300">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Total Paid:</span>
                      <span className="font-bold text-green-600">
                        €{bookingPayments
                          .filter(p => p.status === 'paid')
                          .reduce((sum, p) => sum + (p.amount || 0), 0)
                          .toFixed(2)
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Type Selection Tabs */}
            {formData.customer_id > 0 && formData.booking_id && (
              <div className="bg-gray-50 rounded-lg p-4 sm:p-5">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
                  Invoice Type
                </h4>
                
                {/* Show warning if editing a paid invoice */}
                {editingInvoice && editingInvoice.status === 'paid' && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      ⚠️ This is a paid invoice. Invoice type cannot be changed once payment is received.
                    </p>
                  </div>
                )}
                
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                  <button
                    onClick={() => setInvoiceType('online')}
                    disabled={!!(editingInvoice && editingInvoice.status === 'paid')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      invoiceType === 'online'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : editingInvoice && editingInvoice.status === 'paid'
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Online Invoice
                  </button>
                  <button
                    onClick={() => setInvoiceType('offline')}
                    disabled={!!(editingInvoice && editingInvoice.status === 'paid')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      invoiceType === 'offline'
                        ? 'bg-green-600 text-white shadow-sm'
                        : editingInvoice && editingInvoice.status === 'paid'
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Offline Invoice
                  </button>
                </div>
                
                {/* Invoice Type Descriptions */}
                <div className="mt-4 p-3 rounded-lg border">
                  {invoiceType === 'online' ? (
                    <div className="text-sm text-gray-700">
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="font-medium text-blue-800">Online Invoice</p>
                          <p className="text-gray-600 mt-1">
                            Deposit will be deducted from total amount, customer pays remaining balance online.
                            {customerDeposits.amount > 0 && (
                              <span className="text-green-600 font-medium">
                                {' '}Deposit of €{customerDeposits.amount.toFixed(2)} will be deducted.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700">
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="font-medium text-green-800">Offline Invoice</p>
                          <p className="text-gray-600 mt-1">
                            Payment received offline - full amount is marked as paid with zero balance due. 
                            <span className="text-green-600 font-medium">
                              {' '}Final invoice will show full payment received.
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-1 text-sm"
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
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(formData.items.reduce((sum, item) => sum + item.total_price, 0))}</span>
                  </div>
                  
                  {/* Deposit Deduction - only for online invoices */}
                  {invoiceType === 'online' && customerDeposits.amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        Deposit Paid
                        {customerDeposits.serviceName && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({customerDeposits.serviceName})
                          </span>
                        )}:
                      </span>
                      <span>-{formatCurrency(customerDeposits.amount)}</span>
                    </div>
                  )}
                  
                  {/* Offline Invoice Payment */}
                  {invoiceType === 'offline' && (
                    <>
                      {customerDeposits.amount > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>
                            Deposit Paid
                            {customerDeposits.serviceName && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({customerDeposits.serviceName})
                              </span>
                            )}:
                          </span>
                          <span>-{formatCurrency(customerDeposits.amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-green-600">
                        <span>Offline Paid:</span>
                        <span>{formatCurrency(formData.items.reduce((sum, item) => sum + item.total_price, 0) - customerDeposits.amount)}</span>
                      </div>
                    </>
                  )}
                  
                  <hr className="border-gray-200" />
                  
                  {/* Amount Due calculation based on invoice type */}
                  <div className="flex justify-between font-medium text-lg">
                    <span>{invoiceType === 'offline' ? 'Amount Fully Paid:' : 'Amount Due:'}</span>
                    <span className={invoiceType === 'offline' ? 'text-green-600' : ''}>
                      {invoiceType === 'offline' 
                        ? formatCurrency(formData.items.reduce((sum, item) => sum + item.total_price, 0))
                        : formatCurrency(
                            Math.max(0, formData.items.reduce((sum, item) => sum + item.total_price, 0) - customerDeposits.amount)
                          )
                      }
                    </span>
                  </div>
                  
                  {/* Information messages for online invoice only */}
                  {invoiceType === 'online' && customerDeposits.amount > 0 && (
                    <div className="text-xs text-gray-600 mt-2 p-2 bg-blue-50 rounded">
                      <div className="flex items-start space-x-1">
                        <span>💡</span>
                        <div>
                          <p>Deposit of {formatCurrency(customerDeposits.amount)} has been automatically deducted from the total amount.</p>
                          {(() => {
                            const subtotal = formData.items.reduce((sum, item) => sum + item.total_price, 0);
                            const expectedDeposit = Math.round(subtotal * 0.20);
                            const actualDeposit = customerDeposits.amount;
                            
                            if (subtotal > 0 && Math.abs(actualDeposit - expectedDeposit) > 1) {
                              return (
                                <p className="text-amber-600 mt-1">
                                  ⚠️ Note: Expected 20% deposit would be {formatCurrency(expectedDeposit)}, but {formatCurrency(actualDeposit)} was actually paid.
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {invoiceType === 'online' && customerDeposits.amount === 0 && (
                    <div className="text-xs text-amber-600 mt-2 p-2 bg-amber-50 rounded">
                      ⚠️ No deposit payment found for this service. Full amount will be due.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-yellow-50 rounded-lg p-4 sm:p-5">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Additional Notes
              </h4>
              
              {/* Auto-generated notes for offline invoices */}
              {invoiceType === 'offline' && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ Offline Payment Received
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Full payment has been received offline. No amount is due. This invoice serves as a final payment confirmation.
                  </p>
                </div>
              )}
              
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
    const items = previewInvoiceItems.length > 0 ? previewInvoiceItems : (previewingInvoice.items || []);
    
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
            {/* Only show edit button for draft and sent invoices (not partial or fully paid) */}
            {!['partial', 'paid', 'cancelled'].includes(previewingInvoice.status) && (
              <button
                onClick={() => handleEditInvoice(previewingInvoice)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit size={16} />
                <span>Edit</span>
              </button>
            )}
            <button
              onClick={() => downloadInvoicePDF(previewingInvoice)}
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
            <div className="w-80 space-y-2">
              {(() => {
                const itemsSubtotal = items.reduce((sum, item) => sum + item.total_price, 0);
                
                // Calculate total payments from all booking payments
                const totalPaid = invoicePayments.reduce((sum, payment) => sum + payment.amount, 0);
                
                // Separate payments by type and method
                const depositPayments = invoicePayments.filter(p => !p.invoice_id);
                const invoicePayments_filtered = invoicePayments.filter(p => p.invoice_id);
                
                // Further separate invoice payments by method (online vs offline)
                const onlineInvoicePayments = invoicePayments_filtered.filter(p => p.payment_method !== 'offline');
                const offlineInvoicePayments = invoicePayments_filtered.filter(p => p.payment_method === 'offline');
                
                const totalDepositPaid = depositPayments.reduce((sum, payment) => sum + payment.amount, 0);
                const totalOnlineInvoicePaid = onlineInvoicePayments.reduce((sum, payment) => sum + payment.amount, 0);
                const totalOfflineInvoicePaid = offlineInvoicePayments.reduce((sum, payment) => sum + payment.amount, 0);
                const totalInvoicePaid = totalOnlineInvoicePaid + totalOfflineInvoicePaid;
                
                const remainingBalance = itemsSubtotal - totalPaid;
                const isFullyPaid = remainingBalance <= 0;
                
                console.log('💰 Payment Summary:', {
                  itemsSubtotal,
                  totalPaid,
                  totalDepositPaid,
                  totalOnlineInvoicePaid,
                  totalOfflineInvoicePaid,
                  totalInvoicePaid,
                  remainingBalance,
                  isFullyPaid,
                  allPayments: invoicePayments
                });

                return (
                  <>
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(itemsSubtotal)}</span>
                    </div>
                    
                    {/* Show all payments if any exist */}
                    {invoicePayments.length > 0 && (
                      <div className="border-t pt-2 mt-2 space-y-1">
                        <div className="text-sm font-medium text-gray-700 mb-2">Payments Received:</div>
                        
                        {depositPayments.map((payment, index) => (
                          <div key={`deposit-${index}`} className="flex justify-between items-center text-sm text-blue-600 min-w-0">
                            <span className="whitespace-nowrap mr-2">
                              Deposit Payment {payment.payment_date ? 
                                `(${new Date(payment.payment_date).toLocaleDateString()})` :
                                `(${new Date(payment.created_at).toLocaleDateString()})`
                              }:
                            </span>
                            <span className="whitespace-nowrap">-{formatCurrency(payment.amount)}</span>
                          </div>
                        ))}
                        
                        {onlineInvoicePayments.map((payment, index) => (
                          <div key={`online-invoice-${index}`} className="flex justify-between items-center text-sm text-green-600 min-w-0">
                            <span className="whitespace-nowrap mr-2">
                              Online Payment {payment.payment_date ? 
                                `(${new Date(payment.payment_date).toLocaleDateString()})` :
                                `(${new Date(payment.created_at).toLocaleDateString()})`
                              }:
                            </span>
                            <span className="whitespace-nowrap">-{formatCurrency(payment.amount)}</span>
                          </div>
                        ))}
                        
                        {offlineInvoicePayments.map((payment, index) => (
                          <div key={`offline-invoice-${index}`} className="flex justify-between items-center text-sm text-purple-600 min-w-0">
                            <span className="whitespace-nowrap mr-2">
                              Offline Payment {payment.payment_date ? 
                                `(${new Date(payment.payment_date).toLocaleDateString()})` :
                                `(${new Date(payment.created_at).toLocaleDateString()})`
                              }:
                            </span>
                            <span className="whitespace-nowrap">-{formatCurrency(payment.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                      {isFullyPaid ? (
                        <>
                          <span className="text-green-600">Status: Fully Paid</span>
                          <span className="text-green-600">{formatCurrency(itemsSubtotal)}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-red-600">Amount Due:</span>
                          <span className="text-red-600">{formatCurrency(Math.max(0, remainingBalance))}</span>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
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
                      <div className="flex space-x-1">
                        {/* Preview Invoice */}
                        <button
                          onClick={() => handlePreviewInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Preview invoice"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {/* Send Invoice PDF - Only show for draft status */}
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => sendInvoicePDF(invoice)}
                            disabled={sendingInvoice[invoice.id!.toString()]}
                            className="text-green-600 hover:text-green-900 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Send invoice PDF to customer"
                          >
                            {sendingInvoice[invoice.id!.toString()] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : (
                              <Send size={16} />
                            )}
                          </button>
                        )}
                        
                        {/* Payment Request - Only show for sent status */}
                        {invoice.status === 'sent' && invoicePaymentStatus[invoice.id!.toString()] !== 'paid' && (
                          <button
                            onClick={() => sendInvoicePaymentRequest(invoice)}
                            disabled={sendingPaymentRequest[invoice.id!.toString()]}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Send payment request to customer"
                          >
                            {sendingPaymentRequest[invoice.id!.toString()] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                            ) : (
                              <CreditCard size={16} />
                            )}
                          </button>
                        )}
                        
                        {/* Edit - Only show for draft and sent status (not partial or fully paid) */}
                        {!['partial', 'paid', 'cancelled'].includes(invoice.status) && 
                         invoicePaymentStatus[invoice.id!.toString()] !== 'paid' && (
                          <button
                            onClick={() => handleEditInvoice(invoice)}
                            className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                            title="Edit invoice"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        
                        {/* Delete - Only show for draft status */}
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleDeleteInvoice(invoice.id!)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Delete invoice"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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
