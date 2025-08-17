/**
 * Invoice Service
 * 
 * High-level service for invoice operations including PDF generation,
 * email sending, and file management. This service acts as the main
 * interface between components and the PDF generation system.
 */

import { 
  PDFGenerationOptions,
  generateInvoiceForDownload,
  generateInvoiceForEmail,
  generateInvoicePreview as generatePDFPreview
} from '../utils/pdfInvoiceGenerator';
import { 
  transformInvoiceData, 
  createSimpleInvoiceData,
  validateInvoiceDataForTransformation 
} from '../utils/invoiceDataTransformer';
import { supabase } from '../supabaseClient';

// Service response types
export interface InvoiceServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface EmailInvoiceOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  includePaymentInstructions?: boolean;
}

export interface InvoiceGenerationOptions extends PDFGenerationOptions {
  sendEmail?: boolean;
  emailOptions?: EmailInvoiceOptions;
  autoDownload?: boolean;
  generatePreview?: boolean;
}

// Legacy data interfaces (matching existing system)
interface LegacyInvoice {
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
  total_paid?: number;  // Total amount paid so far
  total: number;
  notes?: string;
  currency?: string;
}

interface LegacyCustomer {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface LegacyInvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
}

/**
 * Main Invoice Service Class
 */
export class InvoiceService {
  private defaultOptions: PDFGenerationOptions = {
    format: 'A4',
    orientation: 'portrait',
    theme: 'default',
    includeLogos: true,
    includePaymentDetails: true,
    includeFooter: true,
    language: 'en'
  };

  /**
   * Generate and download invoice PDF
   */
  async downloadInvoicePDF(
    invoice: LegacyInvoice,
    customer: LegacyCustomer,
    items: LegacyInvoiceItem[],
    options: InvoiceGenerationOptions = {}
  ): Promise<InvoiceServiceResponse<{ blob: Blob }>> {
    try {
      // Validate input data
      const validation = validateInvoiceDataForTransformation(invoice, customer, items);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid data: ${validation.errors.join(', ')}`
        };
      }

      // Transform data
      const invoiceData = transformInvoiceData(invoice, customer, items);
      
      // Generate PDF options
      const pdfOptions = { ...this.defaultOptions, ...options };
      
      // Generate and download PDF
      const result = await generateInvoiceForDownload(invoiceData, pdfOptions);
      
      if (result.success && result.blob) {
        return {
          success: true,
          data: { blob: result.blob },
          message: `Invoice ${invoice.invoice_number} downloaded successfully`
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to generate PDF'
      };

    } catch (error) {
      console.error('Download invoice error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate invoice PDF for email attachment
   */
  async generateInvoiceForEmailAttachment(
    invoice: LegacyInvoice,
    customer: LegacyCustomer,
    items: LegacyInvoiceItem[],
    options: InvoiceGenerationOptions = {}
  ): Promise<InvoiceServiceResponse<{ base64: string; filename: string }>> {
    try {
      // Validate input data
      const validation = validateInvoiceDataForTransformation(invoice, customer, items);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid data: ${validation.errors.join(', ')}`
        };
      }

      // Transform data
      const invoiceData = transformInvoiceData(invoice, customer, items);
      
      // Generate PDF options
      const pdfOptions = { ...this.defaultOptions, ...options };
      
      // Generate PDF for email
      const result = await generateInvoiceForEmail(invoiceData, pdfOptions);
      
      if (result.success && result.base64 && result.filename) {
        return {
          success: true,
          data: { 
            base64: result.base64,
            filename: result.filename
          },
          message: `Invoice ${invoice.invoice_number} prepared for email`
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to generate PDF for email'
      };

    } catch (error) {
      console.error('Generate invoice for email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send invoice via email (placeholder - will need email service integration)
   */
  async sendInvoiceEmail(
    invoice: LegacyInvoice,
    customer: LegacyCustomer,
    items: LegacyInvoiceItem[],
    emailOptions: EmailInvoiceOptions,
    pdfOptions: InvoiceGenerationOptions = {}
  ): Promise<InvoiceServiceResponse> {
    try {
      // First generate the PDF for email attachment
      const pdfResult = await this.generateInvoiceForEmailAttachment(
        invoice, 
        customer, 
        items, 
        pdfOptions
      );

      if (!pdfResult.success || !pdfResult.data) {
        return pdfResult;
      }

      // Use the new email service with PDF attachment
      const { sendInvoiceNotificationEmail } = await import('../utils/emailSMTP');
      
      const emailResult = await sendInvoiceNotificationEmail(
        customer.email || emailOptions.to[0],
        {
          customer_name: customer.name,
          invoice_number: invoice.invoice_number,
          amount: invoice.total,
          due_date: new Date(invoice.due_date).toLocaleDateString('en-IE'),
          service_name: items[0]?.description || 'Therapy Session'
        },
        {
          filename: pdfResult.data.filename,
          content: pdfResult.data.base64
        }
      );

      if (emailResult.success) {
        return {
          success: true,
          message: `Invoice ${invoice.invoice_number} sent successfully to ${customer.email || emailOptions.to[0]}`,
          data: {
            emailSent: true,
            pdfGenerated: true,
            filename: pdfResult.data.filename
          }
        };
      } else {
        return {
          success: false,
          error: emailResult.error || 'Failed to send email'
        };
      }

    } catch (error) {
      console.error('Send invoice email error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  /**
   * Generate invoice preview (for UI display)
   */
  async generateInvoicePreview(
    invoice: LegacyInvoice,
    customer: LegacyCustomer,
    items: LegacyInvoiceItem[],
    options: InvoiceGenerationOptions = {}
  ): Promise<InvoiceServiceResponse<{ blob: Blob; previewUrl: string }>> {
    try {
      // Validate input data
      const validation = validateInvoiceDataForTransformation(invoice, customer, items);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid data: ${validation.errors.join(', ')}`
        };
      }

      // Transform data
      const invoiceData = transformInvoiceData(invoice, customer, items);
      
      // Generate PDF options
      const pdfOptions = { ...this.defaultOptions, ...options };
      
      // Generate preview PDF
      const result = await generatePDFPreview(invoiceData, pdfOptions);
      
      if (result.success && result.blob) {
        const previewUrl = URL.createObjectURL(result.blob);
        
        return {
          success: true,
          data: { 
            blob: result.blob,
            previewUrl
          },
          message: `Preview generated for invoice ${invoice.invoice_number}`
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to generate preview'
      };

    } catch (error) {
      console.error('Generate invoice preview error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Quick invoice generation for simple use cases
   */
  async generateSimpleInvoice(
    invoiceNumber: string,
    customerName: string,
    customerEmail: string,
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>,
    options: {
      action: 'download' | 'email' | 'preview';
      emailTo?: string[];
      invoiceDate?: string;
      dueDate?: string;
      notes?: string;
    }
  ): Promise<InvoiceServiceResponse> {
    try {
      // Create simple invoice data
      const invoiceData = createSimpleInvoiceData(
        invoiceNumber,
        customerName,
        customerEmail,
        items,
        {
          invoiceDate: options.invoiceDate,
          dueDate: options.dueDate,
          notes: options.notes
        }
      );

      // Execute the requested action
      switch (options.action) {
        case 'download': {
          const downloadResult = await generateInvoiceForDownload(invoiceData);
          return {
            success: downloadResult.success,
            error: downloadResult.error,
            message: downloadResult.success ? 'Invoice downloaded successfully' : undefined
          };
        }

        case 'email': {
          if (!options.emailTo || options.emailTo.length === 0) {
            return {
              success: false,
              error: 'Email recipients are required for email action'
            };
          }
          
          const emailResult = await generateInvoiceForEmail(invoiceData);
          if (emailResult.success) {
            // TODO: Send actual email here
            return {
              success: true,
              message: `Invoice prepared for email to ${options.emailTo.join(', ')}`
            };
          }
          return {
            success: false,
            error: emailResult.error
          };
        }

        case 'preview': {
          const previewResult = await generatePDFPreview(invoiceData);
          return {
            success: previewResult.success,
            data: previewResult.blob ? { blob: previewResult.blob } : undefined,
            error: previewResult.error,
            message: previewResult.success ? 'Preview generated successfully' : undefined
          };
        }

        default:
          return {
            success: false,
            error: 'Invalid action specified'
          };
      }

    } catch (error) {
      console.error('Generate simple invoice error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate invoice data without generating PDF
   */
  validateInvoiceData(
    invoice: Partial<LegacyInvoice>,
    customer: Partial<LegacyCustomer>,
    items: LegacyInvoiceItem[]
  ): InvoiceServiceResponse<{ isValid: boolean; errors: string[] }> {
    try {
      const validation = validateInvoiceDataForTransformation(invoice, customer, items);
      
      return {
        success: true,
        data: {
          isValid: validation.valid,
          errors: validation.errors
        },
        message: validation.valid ? 'Invoice data is valid' : 'Invoice data has validation errors'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation error occurred'
      };
    }
  }

  /**
   * Prepare email data for sending
   */
  private prepareEmailData(
    invoice: LegacyInvoice,
    customer: LegacyCustomer,
    emailOptions: EmailInvoiceOptions,
    pdfData: { base64: string; filename: string }
  ) {
    const defaultSubject = `Invoice ${invoice.invoice_number} - ${customer.name}`;
    const defaultBody = `
      Dear ${customer.name},

      Please find attached your invoice ${invoice.invoice_number}.

      Invoice Details:
      - Invoice Number: ${invoice.invoice_number}
      - Date: ${invoice.invoice_date}
      - Due Date: ${invoice.due_date}
      - Total: €${invoice.total.toFixed(2)}

      ${emailOptions.includePaymentInstructions ? `
      Payment Instructions:
      Bank: Bank of Ireland
      Account Name: Kingsmills Hotel Ltd
      IBAN: IE29 BOFI 9000 0112 3456 78
      BIC: BOFIIE2D
      ` : ''}

      Thank you for your business!

      Best regards,
      Kingsmills Hotel
    `;

    return {
      to: emailOptions.to,
      cc: emailOptions.cc || [],
      bcc: emailOptions.bcc || [],
      subject: emailOptions.subject || defaultSubject,
      body: emailOptions.body || defaultBody,
      attachments: [
        {
          filename: pdfData.filename,
          content: pdfData.base64,
          type: 'application/pdf'
        }
      ]
    };
  }

  /**
   * Clean up preview URLs to prevent memory leaks
   */
  static cleanupPreviewUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

// Export singleton instance
export const invoiceService = new InvoiceService();

// Export convenience functions
export async function downloadInvoicePDF(
  invoice: LegacyInvoice,
  customer: LegacyCustomer,
  items: LegacyInvoiceItem[],
  options?: InvoiceGenerationOptions
) {
  return invoiceService.downloadInvoicePDF(invoice, customer, items, options);
}

/**
 * Unified payment-aware invoice PDF download function
 * Handles payment calculation and PDF generation for both admin and user components
 */
export async function downloadInvoicePDFWithPayments(
  invoiceId: number,
  customerId: number,
  options?: InvoiceGenerationOptions
) {
  try {
    // Load invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return {
        success: false,
        error: `Invoice not found: ${invoiceError?.message || 'Unknown error'}`
      };
    }

    // Load customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return {
        success: false,
        error: `Customer not found: ${customerError?.message || 'Unknown error'}`
      };
    }

    // Load invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (itemsError) {
      console.warn('Error loading invoice items:', itemsError);
    }

    // Load payments for payment calculation
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        invoice_id,
        customer_id,
        booking_id,
        amount,
        currency,
        status,
        payment_method,
        sumup_checkout_id,
        sumup_payment_type,
        payment_date,
        notes,
        created_at
      `)
      .eq('customer_id', customerId);

    if (paymentsError) {
      console.warn('Error loading payments:', paymentsError);
    }

    // Filter payments for this invoice by booking_id or invoice_id
    const invoicePayments = paymentsData?.filter((payment: any) => {
      // Match by booking_id (for deposits) if invoice has booking_id
      if (invoice.booking_id && payment.booking_id === invoice.booking_id) {
        return true;
      }
      // Match by invoice_id (for additional payments)
      if (payment.invoice_id === invoice.id) {
        return true;
      }
      return false;
    }) || [];

    // Calculate deposit and other payments
    let depositAmount = 0;
    let otherPaymentsAmount = 0;
    
    invoicePayments.forEach((payment: any) => {
      if (payment.status === 'paid') {
        // Deposits are payments that have booking_id but no invoice_id
        const isDeposit = payment.booking_id && !payment.invoice_id;
        
        if (isDeposit) {
          depositAmount += payment.amount || 0;
        } else {
          otherPaymentsAmount += payment.amount || 0;
        }
      }
    });

    const totalPaidAmount = depositAmount + otherPaymentsAmount;

    // Round to handle floating point precision issues
    const roundedDepositAmount = Math.round(depositAmount * 100) / 100;
    const roundedTotalPaid = Math.round(totalPaidAmount * 100) / 100;

    // Transform data for PDF service
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
      total: invoice.total_amount,
      total_paid: roundedTotalPaid,
      deposit_paid: roundedDepositAmount,
      notes: invoice.notes,
      currency: 'EUR'
    };

    const customerData = {
      id: customer.id,
      name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || 'Customer',
      email: customer.email,
      phone: customer.phone,
      address: [
        customer.address_line_1,
        customer.address_line_2,
        customer.city,
        customer.county,
        customer.eircode
      ].filter(Boolean).join(', ') || ''
    };

    // Transform items or create default
    let itemsData = items || [];
    if (!itemsData || itemsData.length === 0) {
      itemsData = [{
        id: 1,
        invoice_id: invoice.id,
        description: `Service - Invoice ${invoice.invoice_number}`,
        quantity: 1,
        unit_price: invoice.subtotal,
        total_price: invoice.subtotal
      }];
    }

    const transformedItems = itemsData.map((item: any) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      category: 'Service'
    }));

    // Generate PDF
    return await downloadInvoicePDF(invoiceData, customerData, transformedItems, options);

  } catch (error) {
    console.error('Error in unified PDF download:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function sendInvoiceByEmail(
  invoice: LegacyInvoice,
  customer: LegacyCustomer,
  items: LegacyInvoiceItem[],
  emailOptions: EmailInvoiceOptions,
  pdfOptions?: InvoiceGenerationOptions
) {
  return invoiceService.sendInvoiceEmail(invoice, customer, items, emailOptions, pdfOptions);
}

export async function generateInvoicePreview(
  invoice: LegacyInvoice,
  customer: LegacyCustomer,
  items: LegacyInvoiceItem[],
  options?: InvoiceGenerationOptions
) {
  return invoiceService.generateInvoicePreview(invoice, customer, items, options);
}
