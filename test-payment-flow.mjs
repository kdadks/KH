// Test script to check payment data for invoice INV-202508-953
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPaymentFlow() {
  console.log('🔍 Testing payment flow for INV-202508-953');
  
  // Get the specific invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_number', 'INV-202508-953')
    .single();
    
  if (invoiceError) {
    console.error('❌ Error getting invoice:', invoiceError);
    return;
  }
  
  console.log('📄 Invoice data:', {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    customer_id: invoice.customer_id,
    booking_id: invoice.booking_id,
    total_amount: invoice.total_amount,
    status: invoice.status
  });
  
  // Get all payments for this customer
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .eq('customer_id', invoice.customer_id);
    
  if (paymentsError) {
    console.error('❌ Error getting payments:', paymentsError);
    return;
  }
  
  console.log('💳 All payments for customer:', payments?.map(p => ({
    id: p.id,
    invoice_id: p.invoice_id,
    booking_id: p.booking_id,
    amount: p.amount,
    status: p.status,
    notes: p.notes?.substring(0, 50) + '...'
  })));
  
  // Filter payments for this invoice/booking
  const relatedPayments = payments?.filter(payment => {
    if (invoice.booking_id && payment.booking_id === invoice.booking_id) {
      return true;
    }
    if (payment.invoice_id === invoice.id) {
      return true;
    }
    return false;
  }) || [];
  
  console.log('🎯 Related payments:', relatedPayments?.map(p => ({
    id: p.id,
    invoice_id: p.invoice_id,
    booking_id: p.booking_id,
    amount: p.amount,
    status: p.status,
    classification: (invoice.booking_id && p.booking_id === invoice.booking_id && !p.invoice_id) ? 'DEPOSIT' : 'ADDITIONAL'
  })));
  
  // Calculate totals
  let depositAmount = 0;
  let otherPaymentsAmount = 0;
  
  relatedPayments?.forEach(payment => {
    if (payment.status === 'paid') {
      const isDeposit = payment.booking_id && !payment.invoice_id;
      if (isDeposit) {
        depositAmount += payment.amount || 0;
      } else {
        otherPaymentsAmount += payment.amount || 0;
      }
    }
  });
  
  console.log('💰 Payment totals:', {
    depositAmount,
    otherPaymentsAmount,
    totalPaid: depositAmount + otherPaymentsAmount,
    invoiceTotal: invoice.total_amount,
    amountDue: invoice.total_amount - (depositAmount + otherPaymentsAmount)
  });
}

testPaymentFlow().catch(console.error);
