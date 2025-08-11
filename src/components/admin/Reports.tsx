import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Calendar,
  Users,
  TrendingUp,
  FileSpreadsheet,
  PieChart,
  BarChart3
} from 'lucide-react';
import { BookingFormData } from './types';
import { useToast } from '../shared/toastContext';
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
}

export const Reports: React.FC<ReportsProps> = ({ allBookings }) => {
  const { showSuccess, showError } = useToast();
  
  // State management
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedService, setSelectedService] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  // Manual generation flag
  const [hasGenerated, setHasGenerated] = useState(false);

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
  const buildStats = useCallback((filteredBookings: BookingFormData[]) => {
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
    return {
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      pendingBookings,
      serviceBreakdown,
      monthlyTrend,
      filteredBookings
    } as ReportData;
  }, []);

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
    setReportData(buildStats(filtered));
    setLoading(false);
  }, [allBookings, dateRange.start, dateRange.end, selectedService, selectedStatus, buildStats]);

  // Baseline stats on initial load / when bookings change before any manual generate
  useEffect(() => {
    if (!hasGenerated) {
      setReportData(buildStats(allBookings));
    }
  }, [allBookings, hasGenerated, buildStats]);

  // Export functions
  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Total Bookings', reportData.totalBookings],
      ['Confirmed Bookings', reportData.confirmedBookings],
      ['Cancelled Bookings', reportData.cancelledBookings],
      ['Pending Bookings', reportData.pendingBookings],
      [''],
      ['Service Breakdown', ''],
      ...Object.entries(reportData.serviceBreakdown).map(([service, count]) => [service, count])
    ];
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

    // Filtered bookings sheet (normalized export)
    const exportBookings = reportData.filteredBookings.map((b, idx) => {
      const { date, time } = deriveDateTime(b);
      return {
        S_No: idx + 1,
        Customer: b.customer_name || b.name || '',
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

    // Monthly trend sheet
    const trendWS = XLSX.utils.json_to_sheet(reportData.monthlyTrend);
    XLSX.utils.book_append_sheet(wb, trendWS, 'Monthly Trend');

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
      doc.text('Summary Statistics', 20, 50);
      
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

      // Service breakdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterSummaryY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 70;
      doc.setFontSize(16);
      doc.text('Service Breakdown', 20, afterSummaryY);
      const serviceData = Object.entries(reportData.serviceBreakdown).map(([service, count]) => [service, count.toString()]);
  autoTable(doc, {
        startY: afterSummaryY + 5,
        head: [['Service', 'Bookings']],
        body: serviceData,
        theme: 'striped'
      });

      // Detailed bookings table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterServicesY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : afterSummaryY + 40;
      doc.setFontSize(16);
      doc.text('Bookings Detail', 20, afterServicesY);
      const bookingRows = reportData.filteredBookings.map((b, i) => {
        const { date, time } = deriveDateTime(b);
        return [
          i + 1,
          b.customer_name || b.name || '',
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

  // Get unique services for filter (normalized and alphabetically sorted)
  const uniqueServices = Array.from(new Set(allBookings.map(b => b.package_name || b.service).filter(Boolean))) as string[];
  uniqueServices.sort(); // Sort alphabetically

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        <p className="text-gray-600 mt-1">View detailed reports and analytics for your bookings</p>
      </div>

      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating report...</p>
        </div>
      )}

  {reportData && !loading && (
        <>
          {/* Summary Statistics */}
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

          {/* Service Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

          {/* Monthly Trend */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
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

  {/* Filters at bottom with Generate Report */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Services</option>
              {uniqueServices.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0 w-full sm:w-auto">
            <button
              onClick={() => { setHasGenerated(true); generateReportData(); }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
            >
              <TrendingUp className="w-4 h-4 mr-2" /> Generate Report
            </button>
            <button
              onClick={() => {
                setDateRange({ start: '', end: '' });
                setSelectedService('');
                setSelectedStatus('');
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

      {/* Results Grid only after manual generate */}
      {hasGenerated && reportData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Report Results</h3>
            <span className="text-sm text-gray-500">{reportData.filteredBookings.length} record(s)</span>
          </div>
          <div className="overflow-x-auto">
            {reportData.filteredBookings.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No bookings match the selected filters.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Customer</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Contact</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Service</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Time</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.filteredBookings.map((b, idx) => {
                    const { date, time } = deriveDateTime(b);
                    const status = b.status || 'pending';
                    const phone = b.customer_phone || b.phone;
                    const email = b.customer_email || b.email;
                    const contact = phone && email ? `${phone} | ${email}` : (phone || email || '—');
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{b.customer_name || b.name || '—'}</td>
                        <td className="px-4 py-2 text-gray-700">{contact}</td>
                        <td className="px-4 py-2 text-gray-700">{b.package_name || b.service || '—'}</td>
                        <td className="px-4 py-2 text-gray-700">{date}</td>
                        <td className="px-4 py-2 text-gray-700">{time || '—'}</td>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
