/**
 * Example: InvoiceManagement Component Migration
 * 
 * This file shows exactly how to migrate the InvoiceManagement component
 * from the old PDF generation system to the new service-based approach.
 */

// STEP 1: Update imports
// ❌ Remove these imports
/*
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addCompanyLogos, addIAPTLogo, calculateFooterPosition, checkPDFSize } from '../../utils/pdfUtils';
*/

// ✅ Add these imports instead
import { downloadInvoicePDF, sendInvoiceByEmail } from '../../services/invoiceService';

// STEP 2: Replace the sendInvoicePDF function
// ❌ Old function (200+ lines of PDF code)
/*
const sendInvoicePDF = async (invoice: Invoice) => {
  // ... 200+ lines of PDF generation code
  try {
    const doc = new jsPDF();
    await addCompanyLogos(doc, 14, 10);
    // ... lots more PDF code
    const pdfBlob = doc.output('blob');
    // ... email sending logic
  } catch (error) {
    console.error('Error sending invoice:', error);
  }
};
*/

// ✅ New function (clean and simple)
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

    // Send invoice using the new service
    const result = await sendInvoiceByEmail(
      invoice,
      invoice.customer,
      invoice.items || [],
      emailOptions
    );

    if (result.success) {
      showSuccess('Email Sent', `Invoice ${invoice.invoice_number} sent successfully to ${invoice.customer.email}`);
      
      // Update invoice status to 'sent' if it was 'draft'
      if (invoice.status === 'draft') {
        await updateInvoiceStatus(invoice.id!, 'sent');
        await loadInvoices(); // Reload to show updated status
      }
    } else {
      showError('Email Error', result.error || 'Failed to send invoice');
    }

  } catch (error) {
    console.error('Error sending invoice:', error);
    showError('Email Error', 'An unexpected error occurred while sending the invoice');
  } finally {
    setSendingInvoice(prev => ({ ...prev, [invoiceId]: false }));
  }
};

// STEP 3: Replace the downloadInvoicePDF function
// ❌ Old function (another 200+ lines of duplicate PDF code)
/*
const downloadInvoicePDF = async (invoice: Invoice) => {
  // ... 200+ lines of duplicate PDF generation code
  try {
    const doc = new jsPDF();
    await addCompanyLogos(doc, 14, 10);
    // ... lots more PDF code (duplicate of above)
    doc.save(`invoice_${invoice.invoice_number}.pdf`);
  } catch (error) {
    console.error('Error downloading invoice:', error);
  }
};
*/

// ✅ New function (clean and simple)
const downloadInvoicePDF = async (invoice: Invoice) => {
  if (!invoice) {
    showError('Download Error', 'Invoice data not found');
    return;
  }

  try {
    // Download invoice using the new service
    const result = await downloadInvoicePDF(
      invoice,
      invoice.customer,
      invoice.items || []
    );

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

// STEP 4: Add preview functionality (new feature!)
// ✅ New function - preview capability that wasn't available before
const previewInvoicePDF = async (invoice: Invoice) => {
  if (!invoice) {
    showError('Preview Error', 'Invoice data not found');
    return;
  }

  try {
    const result = await invoiceService.generateInvoicePreview(
      invoice,
      invoice.customer,
      invoice.items || []
    );

    if (result.success && result.data) {
      // Open preview in a new window
      const previewWindow = window.open(result.data.previewUrl, '_blank');
      
      if (!previewWindow) {
        showError('Preview Error', 'Please allow popups to view the preview');
      }
      
      // Clean up the URL after some time
      setTimeout(() => {
        invoiceService.cleanupPreviewUrl(result.data.previewUrl);
      }, 60000); // Clean up after 1 minute
      
    } else {
      showError('Preview Error', result.error || 'Failed to generate preview');
    }

  } catch (error) {
    console.error('Error generating preview:', error);
    showError('Preview Error', 'An unexpected error occurred while generating preview');
  }
};

/**
 * STEP 5: Update the JSX to include preview button
 * 
 * Before:
 * ```tsx
 * <button onClick={() => downloadInvoicePDF(invoice)}>
 *   Download PDF
 * </button>
 * <button onClick={() => sendInvoicePDF(invoice)}>
 *   Send Email
 * </button>
 * ```
 * 
 * After:
 * ```tsx
 * <button onClick={() => downloadInvoicePDF(invoice)}>
 *   Download PDF
 * </button>
 * <button onClick={() => previewInvoicePDF(invoice)}>
 *   Preview PDF
 * </button>
 * <button onClick={() => sendInvoicePDF(invoice)}>
 *   Send Email
 * </button>
 * ```
 */

/**
 * BENEFITS OF THIS MIGRATION:
 * 
 * 1. ✅ Reduced file size: ~400 lines removed from component
 * 2. ✅ No more duplicate PDF code
 * 3. ✅ Better error handling with consistent messaging
 * 4. ✅ New preview feature added
 * 5. ✅ Easier to maintain and test
 * 6. ✅ Better TypeScript support
 * 7. ✅ Consistent PDF layout across all invoices
 * 8. ✅ Professional appearance with proper branding
 * 9. ✅ Centralized configuration (company info, banking details)
 * 10. ✅ Future-proof for new features
 */

/**
 * COMPLETE MIGRATION CHECKLIST FOR InvoiceManagement.tsx:
 * 
 * □ Remove jsPDF and autoTable imports
 * □ Remove pdfUtils imports (addCompanyLogos, etc.)
 * □ Add invoiceService imports
 * □ Replace sendInvoicePDF function (remove ~200 lines)
 * □ Replace downloadInvoicePDF function (remove ~200 lines)
 * □ Add optional previewInvoicePDF function
 * □ Update error handling to use showError/showSuccess
 * □ Test download functionality
 * □ Test email functionality
 * □ Test preview functionality (new)
 * □ Update any TypeScript types if needed
 * □ Remove unused state variables related to PDF generation
 * □ Clean up any PDF-related utility functions in the component
 */

export {
  sendInvoicePDF,
  downloadInvoicePDF,
  previewInvoicePDF
};
