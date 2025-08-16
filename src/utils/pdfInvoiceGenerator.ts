/**
 * Professional PDF Invoice Generator
 * 
 * A comprehensive, reusable utility for generating professional PDF invoices
 * following industry best practices for layout, typography, and branding.
 * 
 * Features:
 * - Template-based design with consistent layouts
 * - Automatic formatting and calculations
 * - Professional typography and spacing
 * - Brand integration with logos and colors
 * - Error handling and fallbacks
 * - Multiple output formats (email, download, preview)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addCompanyLogos, addIAPTLogo, checkPDFSize } from './pdfUtils';

// Core types for invoice generation
export interface InvoiceData {
  // Header Information
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partial';
  
  // Company Information (can be extended for multi-company support)
  company: {
    name: string;
    address: string[];
    contact: {
      phone: string;
      email: string;
      website: string;
    };
    logo?: string;
  };
  
  // Customer Information
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string[];
  };
  
  // Invoice Items
  items: InvoiceItemData[];
  
  // Financial Information
  financial: {
    subtotal: number;
    vatRate?: number;
    vatAmount?: number;
    discountAmount?: number;
    depositPaid?: number;
    totalPaid?: number;      // Total amount paid so far
    total: number;
    currency: string;
  };
  
  // Payment Information
  payment?: {
    bankName: string;
    accountName: string;
    iban: string;
    bic: string;
    reference?: string;
  };
  
  // Additional Information
  notes?: string;
  terms?: string;
  footer?: string;
}

export interface InvoiceItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  theme?: 'default' | 'modern' | 'minimal';
  includeLogos?: boolean;
  includePaymentDetails?: boolean;
  includeFooter?: boolean;
  language?: 'en' | 'ie';
}

export interface PDFOutput {
  success: boolean;
  blob?: Blob;
  base64?: string;
  error?: string;
  metadata?: {
    fileSize: number;
    pageCount: number;
    generationTime: number;
  };
}

/**
 * Main PDF Invoice Generator Class
 */
export class PDFInvoiceGenerator {
  private doc: jsPDF;
  private options: Required<PDFGenerationOptions>;
  private startTime: number;
  
  // Design constants
  private readonly COLORS = {
    primary: '#3b82f6',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    dark: '#1f2937',
    light: '#f8fafc'
  };
  
  private readonly MARGINS = {
    left: 14,
    right: 14,
    top: 10,
    bottom: 20
  };
  
  private readonly LAYOUT = {
    logoHeight: 50,
    headerHeight: 70,
    columnWidths: {
      col1: 70, // Company details - reduced
      col2: 70, // Customer details - reduced
      col3: 50  // Payment details - reduced to fit better
    }
  };

  constructor(options: PDFGenerationOptions = {}) {
    this.options = {
      format: options.format || 'A4',
      orientation: options.orientation || 'portrait',
      theme: options.theme || 'default',
      includeLogos: options.includeLogos !== false,
      includePaymentDetails: options.includePaymentDetails !== false,
      includeFooter: options.includeFooter !== false,
      language: options.language || 'en'
    };
    
    this.doc = new jsPDF({
      orientation: this.options.orientation,
      unit: 'mm',
      format: this.options.format
    });
    
    this.startTime = Date.now();
  }

  /**
   * Generate a professional PDF invoice
   */
  async generateInvoice(invoiceData: InvoiceData): Promise<PDFOutput> {
    try {
      // Validate input data
      this.validateInvoiceData(invoiceData);
      
      // Generate PDF content
      await this.buildInvoiceHeader(invoiceData);
      await this.buildInvoiceDetails(invoiceData);
      this.buildItemsTable(invoiceData);
      this.buildFinancialSummary(invoiceData);
      
      // Payment details are now in the header, so we don't duplicate
      // if (this.options.includePaymentDetails && invoiceData.payment) {
      //   this.buildPaymentDetails();
      // }
      
      if (this.options.includeFooter) {
        await this.buildFooter();
      }
      
      // Generate output
      const output = await this.generateOutput(invoiceData);
      
      return {
        success: true,
        ...output,
        metadata: {
          fileSize: this.estimateFileSize(),
          pageCount: this.doc.getNumberOfPages(),
          generationTime: Date.now() - this.startTime
        }
      };
      
    } catch (error) {
      console.error('PDF generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Build the invoice header with company logo and invoice title
   */
  private async buildInvoiceHeader(invoiceData: InvoiceData): Promise<void> {
    if (this.options.includeLogos) {
      await addCompanyLogos(this.doc, this.MARGINS.left, this.MARGINS.top);
    }

    // Invoice title and number (top right)
    const pageWidth = this.doc.internal.pageSize.width;
    
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(this.COLORS.primary);
    this.doc.text('INVOICE', pageWidth - this.MARGINS.right, 25, { align: 'right' });
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(this.COLORS.dark);
    this.doc.text(invoiceData.invoiceNumber, pageWidth - this.MARGINS.right, 35, { align: 'right' });
    this.doc.text(`Date: ${this.formatDate(invoiceData.invoiceDate)}`, pageWidth - this.MARGINS.right, 45, { align: 'right' });
    this.doc.text(`Due: ${this.formatDate(invoiceData.dueDate)}`, pageWidth - this.MARGINS.right, 55, { align: 'right' });
    
    // Status badge - positioned below the dates to avoid overlap
    this.drawStatusBadge(invoiceData.status, pageWidth - this.MARGINS.right - 40, 65);
  }

  /**
   * Build the three-column invoice details section
   */
  private async buildInvoiceDetails(invoiceData: InvoiceData): Promise<void> {
    const startY = this.LAYOUT.headerHeight + 10; // Start below status badge
    const col1X = this.MARGINS.left;
    const col2X = this.MARGINS.left + this.LAYOUT.columnWidths.col1 + 8; // Reduced spacing
    const col3X = this.MARGINS.left + this.LAYOUT.columnWidths.col1 + this.LAYOUT.columnWidths.col2 + 16; // Reduced spacing

    // Column 1: Company Details
    this.buildCompanyDetails(invoiceData.company, col1X, startY);
    
    // Column 2: Customer Details
    this.buildCustomerDetails(invoiceData.customer, col2X, startY);
    
    // Column 3: Payment Details (if included)
    if (this.options.includePaymentDetails && invoiceData.payment) {
      this.buildPaymentDetailsColumn(invoiceData.payment, col3X, startY);
    }
  }

  /**
   * Build company details column
   */
  private buildCompanyDetails(company: InvoiceData['company'], x: number, y: number): void {
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(this.COLORS.dark);
    this.doc.text(company.name, x, y);
    
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(this.COLORS.secondary);
    
    let currentY = y + 8;
    company.address.forEach(line => {
      this.doc.text(line, x, currentY);
      currentY += 5;
    });
    
    currentY += 3;
    this.doc.text(`Phone: ${company.contact.phone}`, x, currentY);
    currentY += 5;
    this.doc.text(`Email: ${company.contact.email}`, x, currentY);
    currentY += 5;
    this.doc.text(`Web: ${company.contact.website}`, x, currentY);
  }

  /**
   * Build customer details column
   */
  private buildCustomerDetails(customer: InvoiceData['customer'], x: number, y: number): void {
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(this.COLORS.dark);
    this.doc.text('BILL TO:', x, y);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(this.COLORS.dark);
    
    let currentY = y + 8;
    this.doc.text(customer.name, x, currentY);
    currentY += 6;
    
    if (customer.email) {
      this.doc.text(customer.email, x, currentY);
      currentY += 5;
    }
    
    if (customer.phone) {
      this.doc.text(customer.phone, x, currentY);
      currentY += 5;
    }
    
    if (customer.address) {
      customer.address.forEach(line => {
        this.doc.text(line, x, currentY);
        currentY += 5;
      });
    }
  }

  /**
   * Build payment details column
   */
  private buildPaymentDetailsColumn(payment: InvoiceData['payment'], x: number, y: number): void {
    if (!payment) return;
    
    this.doc.setFontSize(10); // Reduced from 12
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(this.COLORS.dark);
    this.doc.text('Payment Details:', x, y);
    
    this.doc.setFontSize(7); // Reduced from 8
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(this.COLORS.secondary);
    
    let currentY = y + 6;
    this.doc.text(`Bank: ${payment.bankName}`, x, currentY);
    currentY += 4;
    this.doc.text(`Account: ${payment.accountName}`, x, currentY);
    currentY += 4;
    this.doc.text('IBAN:', x, currentY);
    currentY += 3;
    // Split IBAN into multiple lines if too long
    const iban = payment.iban;
    if (iban.length > 20) {
      const iban1 = iban.substring(0, 20);
      const iban2 = iban.substring(20);
      this.doc.text(iban1, x, currentY);
      currentY += 3;
      this.doc.text(iban2, x, currentY);
    } else {
      this.doc.text(iban, x, currentY);
    }
    currentY += 4;
    this.doc.text(`BIC: ${payment.bic}`, x, currentY);
  }

  /**
   * Build items table using autoTable
   */
  private buildItemsTable(invoiceData: InvoiceData): void {
    const tableData = invoiceData.items.map(item => [
      item.description,
      item.quantity.toString(),
      this.formatCurrency(item.unitPrice, invoiceData.financial.currency),
      this.formatCurrency(item.totalPrice, invoiceData.financial.currency)
    ]);

    autoTable(this.doc, {
      startY: 130,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 6,
        textColor: this.COLORS.dark,
        fontStyle: 'normal'
      },
      headStyles: {
        fillColor: this.COLORS.primary,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: 11
      },
      alternateRowStyles: {
        fillColor: this.COLORS.light
      },
      columnStyles: {
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 }
      },
      margin: { left: this.MARGINS.left, right: this.MARGINS.right }
    });
  }

  /**
   * Build financial summary section
   */
  private buildFinancialSummary(invoiceData: InvoiceData): void {
    const finalY = (this.doc as any).lastAutoTable.finalY + 20;
    const pageWidth = this.doc.internal.pageSize.width;
    const rightX = pageWidth - this.MARGINS.right;
    const labelX = rightX - 60;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(this.COLORS.dark);
    
    let currentY = finalY;
    
    // Subtotal
    this.doc.text('Subtotal:', labelX, currentY);
    this.doc.text(this.formatCurrency(invoiceData.financial.subtotal, invoiceData.financial.currency), rightX, currentY, { align: 'right' });
    currentY += 8;
    
    // VAT (if applicable)
    if (invoiceData.financial.vatAmount && invoiceData.financial.vatAmount > 0) {
      this.doc.text(`VAT (${invoiceData.financial.vatRate}%):`, labelX, currentY);
      this.doc.text(this.formatCurrency(invoiceData.financial.vatAmount, invoiceData.financial.currency), rightX, currentY, { align: 'right' });
      currentY += 8;
    }
    
    // Discount (if applicable)
    if (invoiceData.financial.discountAmount && invoiceData.financial.discountAmount > 0) {
      this.doc.setTextColor(this.COLORS.success);
      this.doc.text('Discount:', labelX, currentY);
      this.doc.text(`-${this.formatCurrency(invoiceData.financial.discountAmount, invoiceData.financial.currency)}`, rightX, currentY, { align: 'right' });
      this.doc.setTextColor(this.COLORS.dark);
      currentY += 8;
    }
    
    // Payment calculations
    const totalInvoiceAmount = invoiceData.financial.total;
    const totalPaidAmount = invoiceData.financial.totalPaid || 0;
    const depositAmount = invoiceData.financial.depositPaid || 0;
    
    // Payment Breakdown Section - only show if there are payments
    if (totalPaidAmount > 0) {
      currentY += 4;
      
      // Show deposit if applicable
      if (depositAmount > 0) {
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(this.COLORS.dark);
        this.doc.text('Deposit Paid:', labelX, currentY);
        this.doc.text(`-${this.formatCurrency(depositAmount, invoiceData.financial.currency)}`, rightX, currentY, { align: 'right' });
        currentY += 8;
      }
      
      // Show balance paid (additional payments excluding deposit)
      const balancePaid = Math.max(0, totalPaidAmount - depositAmount);
      if (balancePaid > 0) {
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(this.COLORS.dark);
        this.doc.text('Balance Paid:', labelX, currentY);
        this.doc.text(`-${this.formatCurrency(balancePaid, invoiceData.financial.currency)}`, rightX, currentY, { align: 'right' });
        currentY += 8;
      }
      
      // Add spacing before total paid
      currentY += 4;
      
      // Show total paid with emphasis
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(this.COLORS.success);
      this.doc.text('Total Paid:', labelX, currentY);
      this.doc.text(this.formatCurrency(totalPaidAmount, invoiceData.financial.currency), rightX, currentY, { align: 'right' });
      currentY += 12;
    }
    
    // Calculate actual due amount with better precision
    const actualDueAmount = Math.round((totalInvoiceAmount - totalPaidAmount) * 100) / 100;

    // Show amount due or paid status with precise comparison
    if (actualDueAmount >= 0.01) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(this.COLORS.danger);
      this.doc.text('Amount Due:', labelX, currentY);
      this.doc.text(this.formatCurrency(actualDueAmount, invoiceData.financial.currency), rightX, currentY, { align: 'right' });
      
      // Update status to reflect actual payment state
      if (totalPaidAmount > 0) {
        invoiceData.status = 'partial';
      } else {
        invoiceData.status = actualDueAmount > 0 && new Date(invoiceData.dueDate) < new Date() ? 'overdue' : 'sent';
      }
    } else {
      // Invoice is fully paid (actualDueAmount < 0.01)
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(this.COLORS.success);
      this.doc.text('PAID IN FULL', rightX - 40, currentY, { align: 'center' });
      
      // Update status to paid
      invoiceData.status = 'paid';
    }
  }

  /**
   * Build footer with logo and additional information
   */
  private async buildFooter(): Promise<void> {
    const pageHeight = this.doc.internal.pageSize.height;
    // Position footer 10px above the bottom margin
    const footerY = pageHeight - this.MARGINS.bottom - 10;
    
    if (this.options.includeLogos) {
      await addIAPTLogo(this.doc, footerY);
    }
    
    // Notes section removed - payment details are now in the totals section
  }

  /**
   * Draw status badge
   */
  private drawStatusBadge(status: InvoiceData['status'], x: number, y: number): void {
    const colors = {
      draft: this.COLORS.secondary,
      sent: this.COLORS.warning,
      paid: this.COLORS.success,
      partial: this.COLORS.warning,
      overdue: this.COLORS.danger,
      cancelled: this.COLORS.secondary
    };
    
    const color = colors[status] || this.COLORS.secondary;
    const text = status.toUpperCase();
    
    // Draw badge background
    this.doc.setFillColor(color);
    this.doc.roundedRect(x, y - 4, 35, 8, 2, 2, 'F');
    
    // Draw badge text
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor('#ffffff');
    this.doc.text(text, x + 17.5, y, { align: 'center' });
  }

  /**
   * Generate output in various formats
   */
  private async generateOutput(invoiceData: InvoiceData): Promise<Partial<PDFOutput>> {
    const filename = `invoice_${invoiceData.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    
    // Check file size
    checkPDFSize(this.doc, filename);
    
    // Generate blob and base64
    const blob = this.doc.output('blob');
    const base64 = this.doc.output('datauristring');
    
    return {
      blob,
      base64
    };
  }

  /**
   * Validate invoice data
   */
  private validateInvoiceData(data: InvoiceData): void {
    if (!data.invoiceNumber) throw new Error('Invoice number is required');
    if (!data.customer.name) throw new Error('Customer name is required');
    if (!data.items.length) throw new Error('At least one invoice item is required');
    if (data.financial.total <= 0) throw new Error('Invoice total must be greater than zero');
  }

  /**
   * Format currency values
   */
  private formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Format dates
   */
  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IE');
  }

  /**
   * Estimate file size
   */
  private estimateFileSize(): number {
    return Math.round(this.doc.output('blob').size);
  }
}

/**
 * Convenience functions for common use cases
 */

/**
 * Generate invoice PDF for download
 */
export async function generateInvoiceForDownload(
  invoiceData: InvoiceData,
  options?: PDFGenerationOptions
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  const generator = new PDFInvoiceGenerator(options);
  const result = await generator.generateInvoice(invoiceData);
  
  if (result.success && result.blob) {
    // Trigger download
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice_${invoiceData.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  return {
    success: result.success,
    blob: result.blob,
    error: result.error
  };
}

/**
 * Generate invoice PDF for email attachment
 */
export async function generateInvoiceForEmail(
  invoiceData: InvoiceData,
  options?: PDFGenerationOptions
): Promise<{ success: boolean; base64?: string; filename?: string; error?: string }> {
  const generator = new PDFInvoiceGenerator(options);
  const result = await generator.generateInvoice(invoiceData);
  
  return {
    success: result.success,
    base64: result.base64,
    filename: `invoice_${invoiceData.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
    error: result.error
  };
}

/**
 * Generate invoice preview (for UI display)
 */
export async function generateInvoicePreview(
  invoiceData: InvoiceData,
  options?: PDFGenerationOptions
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  const generator = new PDFInvoiceGenerator(options);
  const result = await generator.generateInvoice(invoiceData);
  
  return {
    success: result.success,
    blob: result.blob,
    error: result.error
  };
}
