import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Calendar,
  Users,
  TrendingUp,
  FileSpreadsheet,
  PieChart,
  BarChart3,
  Euro,
  Receipt,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { BookingFormData, Invoice } from './types';
import { useToast } from '../shared/toastContext';
import { supabase } from '../../supabaseClient';
import { decryptCustomerPII } from '../../utils/gdprUtils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  allBookings: BookingFormData[];
}

interface ReportData {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  serviceBreakdown: { [key: string]: number };
  monthlyTrend: { month: string; bookings: number }[];
  filteredBookings: BookingFormData[]; // retain the exact rows contributing to the stats & exports
  
  // Invoice-related data
  totalInvoices: number;
  draftInvoices: number;
  sentInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
  unpaidRevenue: number;
  monthlyRevenueTrend: { month: string; revenue: number }[];
  invoiceStatusBreakdown: { [key: string]: number };
  filteredInvoices: Invoice[];
}

export const Reports: React.FC<ReportsProps> = ({ allBookings }) => {
  const { showSuccess, showError } = useToast();
  
  // State management
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedService, setSelectedService] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedInvoiceStatus, setSelectedInvoiceStatus] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<'bookings' | 'invoices'>('bookings');
  // Manual generation flag
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Pagination helpers
  const getTotalPages = (totalItems: number, itemsPerPage: number) => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const getCurrentPageData = <T,>(data: T[], currentPage: number, itemsPerPage: number): T[] => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Reset pagination when switching tabs
  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Fetch invoices from database
  const fetchInvoices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          items:invoice_items(*)
        `)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      setAllInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setAllInvoices([]);
    }
  }, []);

  // Fetch invoices on component mount
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Reset pagination when tab changes
  useEffect(() => {
    resetPagination();
  }, [activeMainTab]);

  // ---------- Helpers for normalization (mirrors Dashboard / Bookings logic) ----------
  const extractDateOnly = (b: BookingFormData): string | null => {
    const sources = [b.appointment_date, b.date, b.booking_date, b.created_at].filter(Boolean) as string[];
    if (sources.length === 0) return null;
    const raw = sources[0];
    return raw.split('T')[0].split(' ')[0];
  };

  const getDateObjForSort = (b: BookingFormData): Date => {
    // Prefer appointment_date + time; fall back progressively
    if (b.appointment_date) {
      const base = b.appointment_date;
      const time = b.appointment_time || b.time || '00:00';
      return new Date(`${base}T${time}`);
    }
    if (b.date) {
      const time = b.time || b.appointment_time || '00:00';
      return new Date(`${b.date}T${time}`);
    }
    if (b.booking_date) return new Date(b.booking_date);
    if (b.created_at) return new Date(b.created_at);
    return new Date('1970-01-01');
  };

  // Helper to derive display date & time prioritizing explicit fields then booking_date
  const deriveDateTime = (b: BookingFormData) => {
    // Priority: appointment_date + appointment_time/time
    if (b.appointment_date) {
      const datePart = b.appointment_date;
      const timePart = b.appointment_time || b.time || '';
      return { date: datePart, time: timePart };
    }
    // Legacy separate date/time
    if (b.date) {
      const timePart = b.time || '';
      return { date: b.date, time: timePart };
    }
    // booking_date timestamp fallback
    if (b.booking_date) {
      // Avoid timezone shift by string split if ISO
      if (b.booking_date.includes('T')) {
        const [d, rest] = b.booking_date.split('T');
        const time = rest ? rest.substring(0,5) : '';
        return { date: d, time };
      }
      // Fallback to Date parsing
      const dt = new Date(b.booking_date);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth()+1).padStart(2,'0');
        const d = String(dt.getDate()).padStart(2,'0');
        const hh = String(dt.getHours()).padStart(2,'0');
        const mm = String(dt.getMinutes()).padStart(2,'0');
        return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
      }
    }
    // created_at as last resort
    if (b.created_at) {
      if (b.created_at.includes('T')) {
        const [d, rest] = b.created_at.split('T');
        const time = rest ? rest.substring(0,5) : '';
        return { date: d, time };
      }
      const dt = new Date(b.created_at);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth()+1).padStart(2,'0');
        const d = String(dt.getDate()).padStart(2,'0');
        const hh = String(dt.getHours()).padStart(2,'0');
        const mm = String(dt.getMinutes()).padStart(2,'0');
        return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
      }
    }
    return { date: '—', time: '—' };
  };

  // Build stats helper (optionally filteredBookings input)
  const buildStats = useCallback((filteredBookings: BookingFormData[], filteredInvoices?: Invoice[]) => {
    const totalBookings = filteredBookings.length;
    const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed').length;
    const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled').length;
    const pendingBookings = filteredBookings.filter(b => !b.status || b.status === 'pending').length;
    const serviceBreakdown: { [key: string]: number } = {};
    filteredBookings.forEach(b => {
      const key = b.package_name || b.service || 'Unknown';
      serviceBreakdown[key] = (serviceBreakdown[key] || 0) + 1;
    });
    const monthlyTrend: { month: string; bookings: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = ref.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const monthCount = filteredBookings.reduce((acc, b) => {
        const dt = getDateObjForSort(b);
        return dt.getFullYear() === ref.getFullYear() && dt.getMonth() === ref.getMonth() ? acc + 1 : acc;
      }, 0);
      monthlyTrend.push({ month: monthName, bookings: monthCount });
    }

    // Invoice statistics
    const invoicesForStats = filteredInvoices || allInvoices;
    const totalInvoices = invoicesForStats.length;
    const draftInvoices = invoicesForStats.filter(inv => inv.status === 'draft').length;
    const sentInvoices = invoicesForStats.filter(inv => inv.status === 'sent').length;
    const paidInvoices = invoicesForStats.filter(inv => inv.status === 'paid').length;
    const overdueInvoices = invoicesForStats.filter(inv => inv.status === 'overdue').length;
    const totalRevenue = invoicesForStats.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0);
    const unpaidRevenue = invoicesForStats.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((sum, inv) => sum + inv.total_amount, 0);
    
    const invoiceStatusBreakdown: { [key: string]: number } = {};
    invoicesForStats.forEach(inv => {
      const status = inv.status || 'draft';
      invoiceStatusBreakdown[status] = (invoiceStatusBreakdown[status] || 0) + 1;
    });

    const monthlyRevenueTrend: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = ref.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const monthRevenue = invoicesForStats.reduce((acc, inv) => {
        const dt = new Date(inv.invoice_date);
        return dt.getFullYear() === ref.getFullYear() && dt.getMonth() === ref.getMonth() && inv.status === 'paid' 
          ? acc + inv.total_amount : acc;
      }, 0);
      monthlyRevenueTrend.push({ month: monthName, revenue: monthRevenue });
    }

    return {
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      pendingBookings,
      serviceBreakdown,
      monthlyTrend,
      filteredBookings,
      totalInvoices,
      draftInvoices,
      sentInvoices,
      paidInvoices,
      overdueInvoices,
      totalRevenue,
      unpaidRevenue,
      monthlyRevenueTrend,
      invoiceStatusBreakdown,
      filteredInvoices: invoicesForStats
    } as ReportData;
  }, [allInvoices]);

  // Manual generate using current filters
  const generateReportData = useCallback(() => {
    setLoading(true);
    let filtered = [...allBookings];
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(b => {
        const d = extractDateOnly(b); return !!d && d >= dateRange.start && d <= dateRange.end;
      });
    }
    if (selectedService) {
      const needle = selectedService.toLowerCase();
      filtered = filtered.filter(b => (
        (b.package_name && b.package_name.toLowerCase().includes(needle)) ||
        (b.service && b.service.toLowerCase().includes(needle))
      ));
    }
    if (selectedStatus) {
      filtered = filtered.filter(b => (b.status || 'pending') === selectedStatus);
    }

    // Filter invoices based on the same date range and status
    let filteredInvoices = [...allInvoices];
    if (dateRange.start && dateRange.end) {
      filteredInvoices = filteredInvoices.filter(inv => {
        const invoiceDate = inv.invoice_date;
        return invoiceDate >= dateRange.start && invoiceDate <= dateRange.end;
      });
    }
    if (selectedInvoiceStatus) {
      filteredInvoices = filteredInvoices.filter(inv => inv.status === selectedInvoiceStatus);
    }

    setReportData(buildStats(filtered, filteredInvoices));
    setLoading(false);
  }, [allBookings, allInvoices, dateRange.start, dateRange.end, selectedService, selectedStatus, selectedInvoiceStatus, buildStats]);

  // Baseline stats on initial load / when bookings change before any manual generate
  useEffect(() => {
    if (!hasGenerated && allInvoices.length > 0) {
      setReportData(buildStats(allBookings, allInvoices));
    }
  }, [allBookings, allInvoices, hasGenerated, buildStats]);

  // Export functions
  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['BOOKING STATISTICS', ''],
      ['Total Bookings', reportData.totalBookings],
      ['Confirmed Bookings', reportData.confirmedBookings],
      ['Cancelled Bookings', reportData.cancelledBookings],
      ['Pending Bookings', reportData.pendingBookings],
      [''],
      ['INVOICE STATISTICS', ''],
      ['Total Invoices', reportData.totalInvoices],
      ['Draft Invoices', reportData.draftInvoices],
      ['Sent Invoices', reportData.sentInvoices],
      ['Paid Invoices', reportData.paidInvoices],
      ['Overdue Invoices', reportData.overdueInvoices],
      ['Total Revenue (Paid)', `€${reportData.totalRevenue.toFixed(2)}`],
      ['Unpaid Revenue', `€${reportData.unpaidRevenue.toFixed(2)}`],
      [''],
      ['SERVICE BREAKDOWN', ''],
      ...Object.entries(reportData.serviceBreakdown).map(([service, count]) => [service, count])
    ];
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

    // Filtered bookings sheet (normalized export)
    const exportBookings = reportData.filteredBookings.map((b, idx) => {
      const { date, time } = deriveDateTime(b);
      
      // Build customer name from various possible sources
      let customerName = '';
      if (b.customer_details?.first_name && b.customer_details?.last_name) {
        customerName = `${b.customer_details.first_name} ${b.customer_details.last_name}`;
      } else if (b.customer_name) {
        customerName = b.customer_name;
      } else if (b.name) {
        customerName = b.name;
      }
      
      return {
        S_No: idx + 1,
        Customer: customerName,
        Contact_Phone: b.customer_phone || b.phone || '',
        Contact_Email: b.customer_email || b.email || '',
        Service: b.package_name || b.service || '',
        Date: date,
        Time: time,
        Status: b.status || 'pending',
        Notes: b.notes || ''
      };
    });
    const bookingsWS = XLSX.utils.json_to_sheet(exportBookings);
    XLSX.utils.book_append_sheet(wb, bookingsWS, 'Filtered Bookings');

    // Invoices sheet
    if (reportData.filteredInvoices.length > 0) {
      const exportInvoices = reportData.filteredInvoices.map((inv, idx) => {
        // Decrypt customer data for export
        const decryptedCustomer = inv.customer ? decryptCustomerPII(inv.customer) : null;
        const customerName = decryptedCustomer ? `${decryptedCustomer.first_name || ''} ${decryptedCustomer.last_name || ''}`.trim() : '';
        
        return {
          S_No: idx + 1,
          Invoice_Number: inv.invoice_number,
          Customer: customerName,
          Date: inv.invoice_date,
          Due_Date: inv.due_date,
          Status: inv.status,
          Amount: inv.total_amount,
          Payment_Date: inv.payment_date || '',
          Payment_Method: inv.payment_method || '',
          Notes: inv.notes || ''
        };
      });
      const invoicesWS = XLSX.utils.json_to_sheet(exportInvoices);
      XLSX.utils.book_append_sheet(wb, invoicesWS, 'Invoices');
    }

    // Monthly trend sheet
    const trendWS = XLSX.utils.json_to_sheet(reportData.monthlyTrend);
    XLSX.utils.book_append_sheet(wb, trendWS, 'Monthly Bookings');

    // Revenue trend sheet
    if (reportData.monthlyRevenueTrend.length > 0) {
      const revenueTrendWS = XLSX.utils.json_to_sheet(reportData.monthlyRevenueTrend);
      XLSX.utils.book_append_sheet(wb, revenueTrendWS, 'Monthly Revenue');
    }

    XLSX.writeFile(wb, `bookings_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Export Successful', 'Report has been exported to Excel');
  };

  const exportToPDF = () => {
    if (!reportData) return;

    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text('Booking Report', 20, 20);
      
      // Date range
      if (dateRange.start && dateRange.end) {
        doc.setFontSize(12);
        doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 20, 35);
      }

      // Summary statistics
      doc.setFontSize(16);
      doc.text('Booking Statistics', 20, 50);
      
      const summaryData = [
        ['Metric', 'Count'],
        ['Total Bookings', reportData.totalBookings.toString()],
        ['Confirmed Bookings', reportData.confirmedBookings.toString()],
        ['Cancelled Bookings', reportData.cancelledBookings.toString()],
        ['Pending Bookings', reportData.pendingBookings.toString()]
      ];

  autoTable(doc, {
        startY: 55,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'striped'
      });

      // Invoice statistics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterBookingY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 85;
      doc.setFontSize(16);
      doc.text('Invoice Statistics', 20, afterBookingY);
      
      const invoiceSummaryData = [
        ['Metric', 'Value'],
        ['Total Invoices', reportData.totalInvoices.toString()],
        ['Draft Invoices', reportData.draftInvoices.toString()],
        ['Sent Invoices', reportData.sentInvoices.toString()],
        ['Paid Invoices', reportData.paidInvoices.toString()],
        ['Overdue Invoices', reportData.overdueInvoices.toString()],
        ['Total Revenue', formatCurrency(reportData.totalRevenue)],
        ['Unpaid Revenue', formatCurrency(reportData.unpaidRevenue)]
      ];

  autoTable(doc, {
        startY: afterBookingY + 5,
        head: [invoiceSummaryData[0]],
        body: invoiceSummaryData.slice(1),
        theme: 'striped'
      });

      // Service breakdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterInvoiceY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 140;
      doc.setFontSize(16);
      doc.text('Service Breakdown', 20, afterInvoiceY);
      const serviceData = Object.entries(reportData.serviceBreakdown).map(([service, count]) => [service, count.toString()]);
  autoTable(doc, {
        startY: afterInvoiceY + 5,
        head: [['Service', 'Bookings']],
        body: serviceData,
        theme: 'striped'
      });

      // Detailed bookings table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterServicesY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : afterInvoiceY + 40;
      doc.setFontSize(16);
      doc.text('Bookings Detail', 20, afterServicesY);
      const bookingRows = reportData.filteredBookings.map((b, i) => {
        const { date, time } = deriveDateTime(b);
        
        // Build customer name from various possible sources
        let customerName = '';
        if (b.customer_details?.first_name && b.customer_details?.last_name) {
          customerName = `${b.customer_details.first_name} ${b.customer_details.last_name}`;
        } else if (b.customer_name) {
          customerName = b.customer_name;
        } else if (b.name) {
          customerName = b.name;
        }
        
        return [
          i + 1,
          customerName,
            (b.customer_phone || b.phone || ''),
            (b.customer_email || b.email || ''),
          b.package_name || b.service || '',
          date,
          time,
          b.status || 'pending'
        ];
      });
  autoTable(doc, {
        startY: afterServicesY + 5,
        head: [[
          '#', 'Customer', 'Phone', 'Email', 'Service', 'Date', 'Time', 'Status'
        ]],
        body: bookingRows,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: '#3f83f8', textColor: '#ffffff' }
      });

      doc.save(`bookings_report_${new Date().toISOString().split('T')[0]}.pdf`);
      showSuccess('Export Successful', 'Report has been exported to PDF');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      showError('Export Failed', 'Failed to export report to PDF');
    }
  };

  // Pagination Component
  const PaginationComponent = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    itemsPerPage, 
    onItemsPerPageChange, 
    totalItems 
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    onItemsPerPageChange: (items: number) => void;
    totalItems: number;
  }) => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {pageNumbers.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Get unique services for filter (normalized and alphabetically sorted)
  const uniqueServices = Array.from(new Set(allBookings.map(b => b.package_name || b.service).filter(Boolean))) as string[];
  uniqueServices.sort(); // Sort alphabetically

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600 mt-1">View detailed reports and analytics for your business</p>
        </div>

        {/* Main Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
            <button
              onClick={() => setActiveMainTab('bookings')}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center ${
                activeMainTab === 'bookings'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Booking Reports & Analytics
            </button>
            <button
              onClick={() => setActiveMainTab('invoices')}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-colors flex items-center ${
                activeMainTab === 'invoices'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Invoice Reports & Analytics
            </button>
          </div>

          {/* Tab Content */}
          {activeMainTab === 'bookings' ? (
            <div className="space-y-6">
              {/* Booking Reports Content */}
              {loading && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Generating booking report...</p>
                </div>
              )}

              {reportData && !loading && (
                <>
                  {/* Booking Summary Statistics */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-blue-600" />
                      Booking Statistics
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Users className="h-8 w-8 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                            <p className="text-2xl font-semibold text-gray-900">{reportData.totalBookings}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <TrendingUp className="h-8 w-8 text-green-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Confirmed</p>
                            <p className="text-2xl font-semibold text-gray-900">{reportData.confirmedBookings}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Calendar className="h-8 w-8 text-yellow-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Pending</p>
                            <p className="text-2xl font-semibold text-gray-900">{reportData.pendingBookings}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <PieChart className="h-8 w-8 text-red-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Cancelled</p>
                            <p className="text-2xl font-semibold text-gray-900">{reportData.cancelledBookings}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Service Breakdown */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Service Breakdown
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(reportData.serviceBreakdown).map(([service, count]) => {
                        const percentage = (count / reportData.totalBookings) * 100;
                        return (
                          <div key={service} className="flex items-center space-x-4">
                            <div className="w-32 text-sm font-medium text-gray-700 truncate" title={service}>
                              {service}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-primary-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="text-sm text-gray-600 w-20 text-right">
                                  {count} ({percentage.toFixed(1)}%)
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Monthly Booking Trend */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Booking Trend</h3>
                    <div className="space-y-4">
                      {reportData.monthlyTrend.map((item, index) => {
                        const maxBookings = Math.max(...reportData.monthlyTrend.map(m => m.bookings));
                        const percentage = maxBookings > 0 ? (item.bookings / maxBookings) * 100 : 0;
                        return (
                          <div key={index} className="flex items-center space-x-4">
                            <div className="w-20 text-sm font-medium text-gray-700">
                              {item.month}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-3">
                                  <div
                                    className="bg-blue-600 h-3 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="text-sm text-gray-600 w-12 text-right">
                                  {item.bookings}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Invoice Reports Content */}
              {loading && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Generating invoice report...</p>
                </div>
              )}

              {reportData && !loading && (
                <>
                  {/* Invoice Summary Statistics */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Receipt className="w-5 h-5 mr-2 text-green-600" />
                      Invoice & Revenue Statistics
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Receipt className="h-8 w-8 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                            <p className="text-2xl font-semibold text-gray-900">{reportData.totalInvoices}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Euro className="h-8 w-8 text-green-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
                            <p className="text-2xl font-semibold text-gray-900">{reportData.paidInvoices}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Overdue</p>
                            <p className="text-2xl font-semibold text-gray-900">{reportData.overdueInvoices}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Euro className="h-8 w-8 text-purple-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(reportData.totalRevenue)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Status Breakdown */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Receipt className="w-5 h-5 mr-2" />
                      Invoice Status Breakdown
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(reportData.invoiceStatusBreakdown).map(([status, count]) => {
                        const percentage = reportData.totalInvoices > 0 ? (count / reportData.totalInvoices) * 100 : 0;
                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case 'paid': return 'bg-green-600';
                            case 'sent': return 'bg-blue-600';
                            case 'overdue': return 'bg-red-600';
                            case 'draft': return 'bg-yellow-600';
                            default: return 'bg-gray-600';
                          }
                        };
                        return (
                          <div key={status} className="flex items-center space-x-4">
                            <div className="w-24 text-sm font-medium text-gray-700 capitalize">
                              {status}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${getStatusColor(status)}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="text-sm text-gray-600 w-20 text-right">
                                  {count} ({percentage.toFixed(1)}%)
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Monthly Revenue Trend */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
                    <div className="space-y-4">
                      {reportData.monthlyRevenueTrend.map((item, index) => {
                        const maxRevenue = Math.max(...reportData.monthlyRevenueTrend.map(m => m.revenue));
                        const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                        return (
                          <div key={index} className="flex items-center space-x-4">
                            <div className="w-20 text-sm font-medium text-gray-700">
                              {item.month}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-3">
                                  <div
                                    className="bg-green-600 h-3 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="text-sm text-gray-600 w-20 text-right">
                                  {formatCurrency(item.revenue)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters Section - Show appropriate filters based on active tab */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-600" />
          {activeMainTab === 'bookings' ? 'Booking Report Filters' : 'Invoice Report Filters'}
        </h3>
        
        {/* Filter Controls Section */}
        <div className="bg-blue-50 rounded-lg p-4 sm:p-5">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Filter Options
          </h4>
          <div className={`grid grid-cols-1 ${activeMainTab === 'bookings' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {activeMainTab === 'bookings' ? (
              <>
                <div className="lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Services</option>
                    {uniqueServices.map(service => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Status
                </label>
                <select
                  value={selectedInvoiceStatus}
                  onChange={(e) => setSelectedInvoiceStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Invoices</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons Section */}
        <div className="bg-green-50 rounded-lg p-4 sm:p-5 mt-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
            Report Actions
          </h4>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0 w-full sm:w-auto">
              <button
                onClick={() => { setHasGenerated(true); generateReportData(); }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
              >
                <TrendingUp className="w-4 h-4 mr-2" /> 
                Generate {activeMainTab === 'bookings' ? 'Booking' : 'Invoice'} Report
              </button>
              <button
                onClick={() => {
                  setDateRange({ start: '', end: '' });
                  setSelectedService('');
                  setSelectedStatus('');
                  setSelectedInvoiceStatus('');
                  setHasGenerated(false);
                  setReportData(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
              <button
                onClick={exportToExcel}
                disabled={!hasGenerated || !reportData}
                className={`px-4 py-2 rounded-lg flex items-center justify-center text-white transition-colors ${!hasGenerated || !reportData ? 'bg-green-400 cursor-not-allowed opacity-60' : 'bg-green-600 hover:bg-green-700'}`}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
              </button>
              <button
                onClick={exportToPDF}
                disabled={!hasGenerated || !reportData}
                className={`px-4 py-2 rounded-lg flex items-center justify-center text-white transition-colors ${!hasGenerated || !reportData ? 'bg-red-400 cursor-not-allowed opacity-60' : 'bg-red-600 hover:bg-red-700'}`}
              >
                <FileText className="w-4 h-4 mr-2" /> PDF
              </button>
            </div>
            <p className="text-xs text-gray-500">Click Generate Report to view results.</p>
          </div>
        </div>
      </div>

      {/* Results Section - Show data based on active tab */}
      {hasGenerated && reportData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {activeMainTab === 'bookings' ? 'Booking Report Results' : 'Invoice Report Results'}
              </h3>
              <div className="text-sm text-gray-500">
                {activeMainTab === 'bookings' 
                  ? `${reportData.filteredBookings.length} booking(s)`
                  : `${reportData.filteredInvoices.length} invoice(s)`
                }
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {activeMainTab === 'bookings' ? (
              // Bookings Table
              reportData.filteredBookings.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No bookings match the selected filters.</div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Customer Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Email</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Phone</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Service</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getCurrentPageData(reportData.filteredBookings, currentPage, itemsPerPage).map((b, idx) => {
                      const status = b.status || 'pending';
                      const phone = b.customer_phone || b.phone;
                      const email = b.customer_email || b.email;
                      const service = b.package_name || b.service || '—';
                      
                      // Build customer name from various possible sources
                      let customerName = '—';
                      if (b.customer_details?.first_name && b.customer_details?.last_name) {
                        customerName = `${b.customer_details.first_name} ${b.customer_details.last_name}`;
                      } else if (b.customer_name) {
                        customerName = b.customer_name;
                      } else if (b.name) {
                        customerName = b.name;
                      }
                      
                      const { date } = deriveDateTime(b);
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-900">{customerName}</td>
                          <td className="px-4 py-2 text-gray-700">{email || '—'}</td>
                          <td className="px-4 py-2 text-gray-700">{phone || '—'}</td>
                          <td className="px-4 py-2 text-gray-700">{service}</td>
                          <td className="px-4 py-2 text-gray-700">{date}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <PaginationComponent
                  currentPage={currentPage}
                  totalPages={getTotalPages(reportData.filteredBookings.length, itemsPerPage)}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  totalItems={reportData.filteredBookings.length}
                />
                </>
              )
            ) : (
              // Invoices Table
              reportData.filteredInvoices.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No invoices match the selected filters.</div>
              ) : (
                <>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Invoice #</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Customer</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Due Date</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Amount</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {getCurrentPageData(reportData.filteredInvoices, currentPage, itemsPerPage).map((inv, idx) => {
                      // Decrypt customer data for display
                      const decryptedCustomer = inv.customer ? decryptCustomerPII(inv.customer) : null;
                      const customerName = decryptedCustomer ? `${decryptedCustomer.first_name || ''} ${decryptedCustomer.last_name || ''}`.trim() : '—';
                      
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case 'paid': return 'bg-green-100 text-green-800';
                          case 'sent': return 'bg-blue-100 text-blue-800';
                          case 'overdue': return 'bg-red-100 text-red-800';
                          case 'draft': return 'bg-yellow-100 text-yellow-800';
                          case 'cancelled': return 'bg-gray-100 text-gray-800';
                          default: return 'bg-gray-100 text-gray-800';
                        }
                      };
                      
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-900">{inv.invoice_number}</td>
                          <td className="px-4 py-2 text-gray-700">{customerName}</td>
                          <td className="px-4 py-2 text-gray-700">{inv.invoice_date}</td>
                          <td className="px-4 py-2 text-gray-700">{inv.due_date}</td>
                          <td className="px-4 py-2 font-medium text-gray-900">{formatCurrency(inv.total_amount)}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(inv.status)}`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <PaginationComponent
                  currentPage={currentPage}
                  totalPages={getTotalPages(reportData.filteredInvoices.length, itemsPerPage)}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  totalItems={reportData.filteredInvoices.length}
                />
                </>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
};
