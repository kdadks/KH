/**
 * Data transformation utilities for converting existing invoice data
 * to the new PDF generator format
 */

import { InvoiceData, InvoiceItemData } from './pdfInvoiceGenerator';

// Import existing types
interface ExistingInvoice {
  id?: number;
  invoice_number: string;
  customer_id: number;
  invoice_date: string;
  due_date: string;
  status: string;
  subtotal: number;
  vat_rate?: number;
  vat_amount?: number;
  discount_amount?: number;
  deposit_paid?: number;
  total_paid?: number;    // Total amount paid so far
  total: number;
  notes?: string;
  currency?: string;
}

interface ExistingCustomer {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface ExistingInvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
}

/**
 * Company information - centralized configuration
 */
const COMPANY_INFO = {
  name: 'KH Therapy',
  address: [
    'Kelly Hodgins',
    'Business Number: 0838009404',
    'Neilstown Village Court',
    'Neilstown Rd',
    'Clondalkin, D22E8P2'
  ],
  contact: {
    phone: '(083) 8009404',
    email: 'info@khtherapy.ie',
    website: 'www.khtherapy.ie'
  },
  registrationNumber: 'PT 040091'
};

/**
 * Banking information - centralized configuration
 */
const BANKING_INFO = {
  bankName: 'Bank of Ireland',
  accountName: 'KH Therapy',
  iban: 'IE11 BOFI 9001 2140 1957 46',
  bic: 'BOFIIE2DXXX'
};

/**
 * Transform existing invoice data to new PDF generator format
 */
export function transformInvoiceData(
  invoice: ExistingInvoice,
  customer: ExistingCustomer,
  items: ExistingInvoiceItem[]
): InvoiceData {
  return {
    // Header Information
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    status: mapInvoiceStatus(invoice.status),
    
    // Company Information
    company: COMPANY_INFO,
    
    // Customer Information
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address ? parseAddress(customer.address) : undefined
    },
    
    // Invoice Items
    items: items.map(transformInvoiceItem),
    
    // Financial Information
    financial: {
      subtotal: invoice.subtotal,
      vatRate: invoice.vat_rate,
      vatAmount: invoice.vat_amount,
      discountAmount: invoice.discount_amount,
      depositPaid: invoice.deposit_paid || 0,
      totalPaid: invoice.total_paid || 0,
      total: invoice.total,
      currency: invoice.currency || 'EUR'
    },
    
    // Payment Information
    payment: BANKING_INFO,
    
    // Additional Information
    notes: invoice.notes,
    terms: 'Payment is due within 30 days of invoice date. Late payment charges may apply.',
    footer: 'Thank you for your business!'
  };
}

/**
 * Transform individual invoice item
 */
function transformInvoiceItem(item: ExistingInvoiceItem): InvoiceItemData {
  return {
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    category: item.category
  };
}

/**
 * Map invoice status from existing system to new system
 */
function mapInvoiceStatus(status: string): InvoiceData['status'] {
  const statusMap: Record<string, InvoiceData['status']> = {
    'draft': 'draft',
    'pending': 'sent',
    'sent': 'sent',
    'paid': 'paid',
    'partially_paid': 'partial',
    'partial': 'partial',
    'overdue': 'overdue',
    'cancelled': 'cancelled',
    'canceled': 'cancelled'
  };
  
  return statusMap[status.toLowerCase()] || 'draft';
}

/**
 * Parse address string into array
 */
function parseAddress(addressString: string): string[] {
  return addressString
    .split(/[,\n\r]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Quick transformation for simple invoice data (when you have minimal data)
 */
export function createSimpleInvoiceData(
  invoiceNumber: string,
  customerName: string,
  customerEmail: string,
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>,
  options: {
    invoiceDate?: string;
    dueDate?: string;
    status?: InvoiceData['status'];
    vatRate?: number;
    currency?: string;
    notes?: string;
  } = {}
): InvoiceData {
  const now = new Date();
  const defaultDueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  
  const transformedItems = items.map(item => ({
    ...item,
    totalPrice: item.quantity * item.unitPrice
  }));
  
  const subtotal = transformedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const vatAmount = options.vatRate ? subtotal * (options.vatRate / 100) : 0;
  const total = subtotal + vatAmount;
  
  return {
    invoiceNumber,
    invoiceDate: options.invoiceDate || now.toISOString().split('T')[0],
    dueDate: options.dueDate || defaultDueDate.toISOString().split('T')[0],
    status: options.status || 'draft',
    
    company: COMPANY_INFO,
    
    customer: {
      name: customerName,
      email: customerEmail
    },
    
    items: transformedItems,
    
    financial: {
      subtotal,
      vatRate: options.vatRate,
      vatAmount,
      total,
      currency: options.currency || 'EUR'
    },
    
    payment: BANKING_INFO,
    
    notes: options.notes,
    terms: 'Payment is due within 30 days of invoice date.',
    footer: 'Thank you for your business!'
  };
}

/**
 * Validate that required data is present before transformation
 */
export function validateInvoiceDataForTransformation(
  invoice: Partial<ExistingInvoice>,
  customer: Partial<ExistingCustomer>,
  items: ExistingInvoiceItem[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!invoice.invoice_number) {
    errors.push('Invoice number is required');
  }
  
  if (!customer.name) {
    errors.push('Customer name is required');
  }
  
  if (!items || items.length === 0) {
    errors.push('At least one invoice item is required');
  }
  
  if (!invoice.total || invoice.total <= 0) {
    errors.push('Invoice total must be greater than zero');
  }
  
  if (!invoice.invoice_date) {
    errors.push('Invoice date is required');
  }
  
  if (!invoice.due_date) {
    errors.push('Due date is required');
  }
  
  // Validate items
  items.forEach((item, index) => {
    if (!item.description) {
      errors.push(`Item ${index + 1}: Description is required`);
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be greater than zero`);
    }
    if (!item.unit_price || item.unit_price < 0) {
      errors.push(`Item ${index + 1}: Unit price must be zero or greater`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Helper to update company information (for multi-tenant support in future)
 */
export function updateCompanyInfo(companyInfo: Partial<typeof COMPANY_INFO>) {
  Object.assign(COMPANY_INFO, companyInfo);
}

/**
 * Helper to update banking information
 */
export function updateBankingInfo(bankingInfo: Partial<typeof BANKING_INFO>) {
  Object.assign(BANKING_INFO, bankingInfo);
}

/**
 * Get current company information
 */
export function getCompanyInfo() {
  return { ...COMPANY_INFO };
}

/**
 * Get current banking information
 */
export function getBankingInfo() {
  return { ...BANKING_INFO };
}
