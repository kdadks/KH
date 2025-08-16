/**
 * Migration Guide: From Legacy PDF Generation to New Invoice Service
 * 
 * This file contains examples and utilities to help migrate from the old
 * PDF generation code embedded in components to the new clean service.
 */

import { invoiceService, downloadInvoicePDF, sendInvoiceByEmail } from '../services/invoiceService';

/**
 * BEFORE (Legacy Code in Components):
 * 
 * const sendInvoicePDF = async (invoice: Invoice, customer: Customer, items: InvoiceItem[]) => {
 *   const doc = new jsPDF();
 *   // ... 200+ lines of PDF generation code
 *   const pdfBlob = doc.output('blob');
 *   // ... email sending logic
 * };
 * 
 * AFTER (New Service):
 */

// Example 1: Download Invoice PDF (replaces downloadInvoicePDF in components)
export async function exampleDownloadInvoice() {
  const invoice = {
    invoice_number: 'INV-001',
    customer_id: 1,
    invoice_date: '2024-01-15',
    due_date: '2024-02-14',
    status: 'sent',
    subtotal: 100.00,
    vat_rate: 21,
    vat_amount: 21.00,
    total: 121.00,
    currency: 'EUR'
  };

  const customer = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+353 1 234 5678',
    address: '123 Main St, Dublin 2, Ireland'
  };

  const items = [
    {
      description: 'Hotel Stay - Superior Room',
      quantity: 2,
      unit_price: 50.00,
      total_price: 100.00
    }
  ];

  // New way: One simple function call
  const result = await downloadInvoicePDF(invoice, customer, items);
  
  if (result.success) {
    console.log('Invoice downloaded successfully');
  } else {
    console.error('Download failed:', result.error);
  }
}

// Example 2: Send Invoice via Email (replaces sendInvoicePDF in components)
export async function exampleSendInvoice() {
  const invoice = {
    invoice_number: 'INV-002',
    customer_id: 2,
    invoice_date: '2024-01-15',
    due_date: '2024-02-14',
    status: 'sent',
    subtotal: 200.00,
    total: 200.00,
    currency: 'EUR'
  };

  const customer = {
    name: 'Jane Smith',
    email: 'jane@example.com'
  };

  const items = [
    {
      description: 'Conference Room Rental',
      quantity: 1,
      unit_price: 200.00,
      total_price: 200.00
    }
  ];

  // Email options
  const emailOptions = {
    to: ['jane@example.com'],
    cc: ['manager@kingsmillshotel.com'],
    subject: 'Your Invoice from Kingsmills Hotel',
    includePaymentInstructions: true
  };

  // New way: One simple function call
  const result = await sendInvoiceByEmail(invoice, customer, items, emailOptions);
  
  if (result.success) {
    console.log('Invoice sent successfully');
  } else {
    console.error('Send failed:', result.error);
  }
}

// Example 3: Generate Preview (new capability)
export async function exampleGeneratePreview() {
  const invoice = {
    invoice_number: 'INV-003',
    customer_id: 3,
    invoice_date: '2024-01-15',
    due_date: '2024-02-14',
    status: 'draft',
    subtotal: 150.00,
    total: 150.00,
    currency: 'EUR'
  };

  const customer = {
    name: 'Bob Johnson',
    email: 'bob@example.com'
  };

  const items = [
    {
      description: 'Spa Package',
      quantity: 1,
      unit_price: 150.00,
      total_price: 150.00
    }
  ];

  const result = await invoiceService.generateInvoicePreview(invoice, customer, items);
  
  if (result.success && result.data) {
    // Use the preview URL to display in an iframe or new window
    console.log('Preview URL:', result.data.previewUrl);
    
    // Remember to clean up when done
    // InvoiceService.cleanupPreviewUrl(result.data.previewUrl);
  }
}

/**
 * MIGRATION STEPS FOR COMPONENTS:
 * 
 * 1. Remove old PDF generation functions from components
 * 2. Import the new service functions
 * 3. Replace function calls with service calls
 * 4. Remove jsPDF and autoTable dependencies from components
 * 5. Update error handling to use service response format
 * 6. Test all functionality
 */

/**
 * EXAMPLE COMPONENT MIGRATION:
 * 
 * BEFORE (InvoiceManagement.tsx):
 * ```
 * import jsPDF from 'jspdf';
 * import autoTable from 'jspdf-autotable';
 * 
 * const InvoiceManagement = () => {
 *   const sendInvoicePDF = async (invoice: Invoice) => {
 *     // 200+ lines of PDF code
 *   };
 * 
 *   const downloadInvoicePDF = async (invoice: Invoice) => {
 *     // 200+ lines of PDF code
 *   };
 * 
 *   return (
 *     <button onClick={() => sendInvoicePDF(invoice)}>Send</button>
 *   );
 * };
 * ```
 * 
 * AFTER (InvoiceManagement.tsx):
 * ```
 * import { downloadInvoicePDF, sendInvoiceByEmail } from '../services/invoiceService';
 * 
 * const InvoiceManagement = () => {
 *   const handleSendInvoice = async (invoice: Invoice) => {
 *     const result = await sendInvoiceByEmail(
 *       invoice, 
 *       customer, 
 *       items, 
 *       { to: [customer.email] }
 *     );
 *     
 *     if (result.success) {
 *       setMessage('Invoice sent successfully');
 *     } else {
 *       setError(result.error);
 *     }
 *   };
 * 
 *   const handleDownload = async (invoice: Invoice) => {
 *     const result = await downloadInvoicePDF(invoice, customer, items);
 *     
 *     if (!result.success) {
 *       setError(result.error);
 *     }
 *   };
 * 
 *   return (
 *     <>
 *       <button onClick={() => handleSendInvoice(invoice)}>Send</button>
 *       <button onClick={() => handleDownload(invoice)}>Download</button>
 *     </>
 *   );
 * };
 * ```
 */

/**
 * BENEFITS OF THE NEW SYSTEM:
 * 
 * 1. ✅ Clean separation of concerns
 * 2. ✅ Reusable across components
 * 3. ✅ Consistent error handling
 * 4. ✅ Better TypeScript support
 * 5. ✅ Easier to test and maintain
 * 6. ✅ Professional PDF layout
 * 7. ✅ Configurable options
 * 8. ✅ Built-in validation
 * 9. ✅ Extensible for future features
 * 10. ✅ No more duplicate code
 */

/**
 * QUICK MIGRATION CHECKLIST:
 * 
 * □ Create new service instance
 * □ Remove old PDF generation functions
 * □ Update component imports
 * □ Replace function calls
 * □ Update error handling
 * □ Test download functionality
 * □ Test email functionality
 * □ Clean up unused dependencies
 * □ Update TypeScript types if needed
 * □ Test all edge cases
 */
