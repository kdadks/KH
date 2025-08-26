import { supabase } from '../supabaseClient';
import { 
  PaymentRequest, 
  Payment, 
  PaymentRequestWithCustomer, 
  PaymentWithCustomer, 
  CreatePaymentRequestData, 
  ProcessPaymentData 
} from '../types/paymentTypes';
import { sendPaymentRequestEmail, sendPaymentConfirmationEmail } from './emailUtils';
import { PAYMENT_CONFIG } from '../config/paymentConfig';
import { decryptSensitiveData, isDataEncrypted } from './gdprUtils';
import { getActiveSumUpGateway } from './paymentManagementUtils';
import { 
  fetchServicePricing, 
  getServicePrice, 
  extractBaseServiceName, 
  determineTimeSlotType
} from '../services/pricingService';

/**
 * Fetches the actual service price from the database
 * @param serviceName - The full service name (e.g., "Ultimate Health - Out of Hour (€280)")
 * @returns The base cost from database or null if not found
 */
async function getServicePriceFromDatabase(serviceName: string): Promise<number | null> {
  try {
    // First check if this service should skip payment request creation
    const skipPatterns = [
      /contact\s+for\s+quote/i,
      /€\d+\s*\/\s*class/i,
      /€\d+\s*per\s*class/i,
      /€\d+\s*\/\s*session/i,
      /€\d+\s*per\s*session/i
    ];
    
    // Check if service matches any skip pattern
    for (const pattern of skipPatterns) {
      if (pattern.test(serviceName)) {
        console.log('⏭️ Database lookup skipped - service requires quote or is per-session:', serviceName);
        return null;
      }
    }
    
    // Extract base service name (e.g., "Ultimate Health")
    const baseServiceName = extractBaseServiceName(serviceName);
    
    // Determine if it's in-hour or out-of-hour
    const timeSlotType = determineTimeSlotType(serviceName);
    
    // Fetch pricing from database
    const servicePricing = await fetchServicePricing(baseServiceName);
    
    if (!servicePricing) {
      console.warn(`Service pricing not found for: ${baseServiceName}`);
      return null;
    }
    
    // Get the appropriate price based on time slot type
    const price = getServicePrice(servicePricing, timeSlotType);
    
    console.log(`Pricing for ${serviceName}:`, {
      baseServiceName,
      timeSlotType,
      price
    });
    
    return price;
  } catch (error) {
    console.error('Error fetching service price from database:', error);
    return null;
  }
}

/**
 * Extracts price from service name if it represents a fixed booking amount
 * @param serviceName - The full service name with price
 * @returns The extracted price or null if not found or not a fixed booking amount
 */
function extractPriceFromServiceName(serviceName: string): number | null {
  // Skip payment request creation for services with these patterns:
  // - "Contact for Quote" - indicates pricing needs to be discussed
  // - "/class" or "per class" - indicates per-session pricing, not a booking package
  // - "/session" or "per session" - indicates per-session pricing
  
  const skipPatterns = [
    /contact\s+for\s+quote/i,
    /€\d+\s*\/\s*class/i,
    /€\d+\s*per\s*class/i,
    /€\d+\s*\/\s*session/i,
    /€\d+\s*per\s*session/i
  ];
  
  // Check if service matches any skip pattern
  for (const pattern of skipPatterns) {
    if (pattern.test(serviceName)) {
      return null;
    }
  }
  
  // Look for fixed package pricing like "Ultimate Health (€150)"
  // This pattern indicates a fixed booking package that requires payment
  const priceMatch = serviceName.match(/€(\d+)(?!\s*\/|\s*per)/);
  
  if (priceMatch) {
    const price = parseInt(priceMatch[1]);
    return price;
  }
  
  return null;
}

/**
 * Creates a payment request for a booking with configurable deposit percentage
 */
export async function createPaymentRequest(
  customerId: number,
  serviceName: string,
  bookingDate: string,
  invoiceId?: number | null,
  bookingId?: string | null, // Changed to string (UUID)
  isInvoicePaymentRequest?: boolean, // New parameter to distinguish invoice payments
  customAmount?: number // New parameter for custom amounts (used for invoice payments)
): Promise<PaymentRequest | null> {
  try {
    let finalAmount: number;

    if (isInvoicePaymentRequest && customAmount !== undefined) {
      // For invoice payment requests, use the custom amount (no deposit calculation)
      finalAmount = customAmount;
    } else {
      // For booking payment requests, calculate 20% deposit
      // First, try to get pricing from database
      let baseCost: number | null = await getServicePriceFromDatabase(serviceName);
      
      // If database lookup fails, fall back to regex extraction (for backward compatibility)
      if (baseCost === null) {
        baseCost = extractPriceFromServiceName(serviceName);
      }
      
      // If pricing cannot be determined or service requires quote, don't create payment request
      if (baseCost === null) {
        return null; // Return null to indicate no payment request should be created
      }
      
      // Calculate deposit using configurable percentage (20%)
      finalAmount = Math.round(baseCost * PAYMENT_CONFIG.DEPOSIT_PERCENTAGE);
    }
    
    // Set payment due date (7 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    
    const requestData: CreatePaymentRequestData = {
      customer_id: customerId,
      invoice_id: invoiceId,
      booking_id: bookingId,
      service_name: serviceName, // Add service_name to the database insert
      amount: finalAmount,
      currency: PAYMENT_CONFIG.DEFAULT_CURRENCY,
      payment_due_date: dueDate.toISOString(), // Use payment_due_date to match existing database column
      notes: isInvoicePaymentRequest 
        ? `Payment for ${serviceName} - remaining balance after deposit deduction`
        : `${PAYMENT_CONFIG.DEPOSIT_PERCENTAGE * 100}% deposit for ${serviceName} appointment on ${new Date(bookingDate).toLocaleDateString()}`
    };

    const { data, error } = await supabase
      .from('payment_requests')
      .insert([requestData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error creating payment request:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to create payment request: ${error.message}`);
    }

    return data as PaymentRequest;
  } catch (error) {
    console.error('Error creating payment request:', error);
    throw error;
  }
}

/**
 * Gets payment requests for a customer with customer details
 */
export async function getCustomerPaymentRequests(customerId: number): Promise<PaymentRequestWithCustomer[]> {
  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(`
        *,
        customer:customers!payment_requests_customer_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('customer_id', customerId)
      .in('status', ['pending', 'sent']) // Only show unpaid payment requests
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get payment requests: ${error.message}`);
    }

    // Extract service name from notes field and decrypt customer data
    const processedData = data.map(request => {
      let serviceName = 'Service Payment';
      
      if (request.notes) {
        // Try to extract service name from notes like "20% deposit for Sports / Deep Tissue Massage - Out of Hour (€85) appointment on 8/15/2025"
        const depositMatch = request.notes.match(/deposit for (.+?) appointment/);
        if (depositMatch) {
          serviceName = depositMatch[1].trim();
        }
      }

      // Decrypt customer data if encrypted
      const customer = request.customer;
      if (customer) {
        if (customer.first_name && isDataEncrypted(customer.first_name)) {
          customer.first_name = decryptSensitiveData(customer.first_name);
        }
        if (customer.last_name && isDataEncrypted(customer.last_name)) {
          customer.last_name = decryptSensitiveData(customer.last_name);
        }
      }
      
      return {
        ...request,
        service_name: serviceName,
        customer: customer
      } as PaymentRequestWithCustomer;
    });

    return processedData;
  } catch (error) {
    console.error('Error getting customer payment requests:', error);
    throw error;
  }
}

/**
 * Gets a specific payment request by ID with customer details
 */
export async function getPaymentRequestById(paymentRequestId: number): Promise<PaymentRequestWithCustomer | null> {
  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(`
        *,
        customer:customers!payment_requests_customer_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', paymentRequestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No matching record found
        return null;
      }
      throw new Error(`Failed to get payment request: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Extract service name from notes field
    let serviceName = 'Service Payment';
    
    if (data.notes) {
      // Try to extract service name from notes like "20% deposit for Sports / Deep Tissue Massage - Out of Hour (€85) appointment on 8/15/2025"
      const depositMatch = data.notes.match(/deposit for (.+?) appointment/);
      if (depositMatch) {
        serviceName = depositMatch[1].trim();
      } else if (data.notes.includes('Invoice ')) {
        // Handle invoice payment requests like "Payment for Invoice INV-202508-228 - remaining balance after deposit deduction"
        const invoiceMatch = data.notes.match(/Payment for Invoice (INV-\d+-\d+)/);
        if (invoiceMatch) {
          serviceName = `Invoice ${invoiceMatch[1]}`;
        }
      }
    }

    // Decrypt customer data if encrypted
    const customer = data.customer;
    if (customer) {
      if (customer.first_name && isDataEncrypted(customer.first_name)) {
        customer.first_name = decryptSensitiveData(customer.first_name);
      }
      if (customer.last_name && isDataEncrypted(customer.last_name)) {
        customer.last_name = decryptSensitiveData(customer.last_name);
      }
    }
    
    return {
      ...data,
      service_name: serviceName,
      customer: customer
    } as PaymentRequestWithCustomer;
  } catch (error) {
    console.error('Error getting payment request by ID:', error);
    throw error;
  }
}

/**
 * Gets customer payments with customer details
 */
export async function getCustomerPayments(customerId: number): Promise<PaymentWithCustomer[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        customer:customers!payments_customer_id_fkey(
          first_name,
          last_name,
          email
        ),
        invoice:invoices(
          invoice_number
        )
      `)
      .eq('customer_id', customerId)
      .in('status', ['paid', 'processing']) // Show completed and processing payments in history
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get payments: ${error.message}`);
    }

    return data.map(payment => {
      // Decrypt customer data if encrypted
      const customer = payment.customer;
      if (customer) {
        if (customer.first_name && isDataEncrypted(customer.first_name)) {
          customer.first_name = decryptSensitiveData(customer.first_name);
        }
        if (customer.last_name && isDataEncrypted(customer.last_name)) {
          customer.last_name = decryptSensitiveData(customer.last_name);
        }
      }

      return {
        ...payment,
        invoice_number: payment.invoice?.invoice_number,
        customer: customer
      };
    }) as PaymentWithCustomer[];
  } catch (error) {
    console.error('Error getting customer payments:', error);
    throw error;
  }
}

/**
 * Process payment for a payment request
 */
export async function processPaymentRequest(
  paymentRequestId: number,
  paymentData: ProcessPaymentData
): Promise<{ success: boolean; payment?: Payment; error?: string }> {
  try {
    // First get the payment request
    const { data: paymentRequest, error: requestError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', paymentRequestId)
      .single();

    if (requestError || !paymentRequest) {
      throw new Error('Payment request not found');
    }

    // Create payment record
    const paymentRecord = {
      customer_id: paymentRequest.customer_id,
      invoice_id: paymentRequest.invoice_id,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency || 'EUR',
      status: 'processing' as const,
      payment_method: paymentData.payment_method || 'card',
      sumup_checkout_id: paymentData.sumup_checkout_id,
      sumup_transaction_id: paymentData.sumup_transaction_id,
      sumup_payment_type: paymentData.sumup_payment_type,
      booking_id: paymentRequest.booking_id, // Include booking_id from payment request
      notes: `Payment for payment request #${paymentRequestId}`
    };

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([paymentRecord])
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    // Update payment request status to 'paid'
    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({ 
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequestId);

    if (updateError) {
      console.error('Failed to update payment request status:', updateError);
    }

    // Update payment status to 'paid' and set payment date
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (paymentUpdateError) {
      console.error('Failed to update payment status:', paymentUpdateError);
    }

    // Send payment confirmation email
    try {
      await sendPaymentConfirmation(payment.id);
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError);
      // Don't fail the payment processing if email fails
    }

    return { success: true, payment: payment as Payment };
  } catch (error) {
    console.error('Error processing payment request:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send payment request email to customer
 */
export async function sendPaymentRequestNotification(
  paymentRequestId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get payment request with customer details
    const { data: paymentRequest, error } = await supabase
      .from('payment_requests')
      .select(`
        *,
        customer:customers!payment_requests_customer_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', paymentRequestId)
      .single();

    if (error || !paymentRequest) {
      throw new Error('Payment request not found');
    }

    // Generate SumUp checkout URL for direct payment (try real API first)
    let directPaymentUrl = '';
    let baseUrl = '';
    
    // Handle URL generation - check if we're in browser context
    try {
      baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://khtherapy.ie';
    } catch (error) {
      baseUrl = 'https://khtherapy.ie'; // Fallback for server-side rendering
    }
    
    try {
      const { createSumUpCheckoutSession } = await import('./sumupRealApiImplementation');
      
      // Get SumUp configuration from database
      const gatewayConfig = await getActiveSumUpGateway();
      
      if (!gatewayConfig || !gatewayConfig.merchant_id) {
        console.error('Payment gateway not configured for email payment links');
        return { success: false, error: 'Payment gateway not configured' };
      }
      
      const checkoutResponse = await createSumUpCheckoutSession({
        checkout_reference: `payment-request-${paymentRequestId}-${Date.now()}`,
        amount: paymentRequest.amount,
        currency: 'EUR',
        merchant_code: gatewayConfig.merchant_id,
        description: paymentRequest.service_name || 'Payment Request'
      });
      
      // Create direct checkout URL with email context for proper redirect behavior
      directPaymentUrl = `${baseUrl}/sumup-checkout?checkout_reference=${checkoutResponse.checkout_reference}&amount=${paymentRequest.amount}&currency=EUR&description=${encodeURIComponent(paymentRequest.service_name || 'Payment Request')}&merchant_code=${checkoutResponse.merchant_code}&checkout_id=${checkoutResponse.id}&payment_request_id=${paymentRequestId}&context=email&return_url=${encodeURIComponent(baseUrl)}`;
      
    } catch (realApiError) {
      // Fallback to the existing payment page URL
      directPaymentUrl = `${baseUrl}/payment?request=${paymentRequestId}`;
    }

    // Send email notification
    const emailResult = await sendPaymentRequestEmail(
      paymentRequest.customer.email,
      {
        customer_name: `${paymentRequest.customer.first_name} ${paymentRequest.customer.last_name}`,
        amount: paymentRequest.amount,
        service_name: paymentRequest.service_name || paymentRequest.description || 'Therapy Session',
        due_date: new Date(paymentRequest.payment_due_date).toLocaleDateString('en-IE', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        }),
        payment_url: directPaymentUrl,
        // Only show invoice number if this is actually an invoice payment request
        // For 20% deposit requests, there's no invoice yet, so no invoice number should be shown
        invoice_number: paymentRequest.service_name?.includes('Invoice ') 
          ? paymentRequest.service_name.replace('Invoice ', '') 
          : null // Don't show invoice number for deposit payment requests
      }
    );

    if (emailResult.success) {
      // Update email_sent_at timestamp
      await supabase
        .from('payment_requests')
        .update({ 
          email_sent_at: new Date().toISOString(),
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRequestId);
    }

    return emailResult;
  } catch (error) {
    console.error('Error sending payment request notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmation(
  paymentId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get payment with customer details
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        customer:customers!payments_customer_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      throw new Error('Payment not found');
    }

    // Send confirmation email
    const emailResult = await sendPaymentConfirmationEmail(
      payment.customer.email,
      {
        customer_name: `${payment.customer.first_name} ${payment.customer.last_name}`,
        transaction_id: payment.sumup_transaction_id || payment.id.toString(),
        amount: payment.amount,
        service_name: payment.description || 'Therapy Session'
      }
    );

    return emailResult;
  } catch (error) {
    console.error('Error sending payment confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all bookings with payment information for admin dashboard
 */
export async function getBookingsWithPayments(): Promise<any[]> {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customers!bookings_customer_id_fkey(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .order('booking_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to get bookings: ${error.message}`);
    }

    // Get payment requests for each booking's customer
    const bookingsWithPayments = await Promise.all(
      bookings.map(async (booking) => {
        const { data: paymentRequests } = await supabase
          .from('payment_requests')
          .select('*')
          .eq('customer_id', booking.customer_id);

        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .eq('customer_id', booking.customer_id);

        // Calculate service cost and payment status using database pricing
        let totalCost = 75; // Default fallback
        const depositPercentage = PAYMENT_CONFIG.DEPOSIT_PERCENTAGE;
        
        try {
          // Try to get pricing from database first
          const dbPrice = await getServicePriceFromDatabase(booking.package_name);
          if (dbPrice) {
            totalCost = dbPrice;
          } else {
            // Fallback to regex extraction
            const extractedPrice = extractPriceFromServiceName(booking.package_name);
            if (extractedPrice) {
              totalCost = extractedPrice;
            }
          }
        } catch (error) {
          console.warn('Failed to get pricing for booking:', booking.package_name, error);
        }

        const depositAmount = Math.round(totalCost * depositPercentage);
        const totalPaid = payments?.reduce((sum, p) => sum + (p.status === 'paid' ? p.amount : 0), 0) || 0;

        let paymentStatus = 'unpaid';
        if (totalPaid >= totalCost) {
          paymentStatus = 'fully_paid';
        } else if (totalPaid >= depositAmount) {
          paymentStatus = 'deposit_paid';
        }

        return {
          ...booking,
          service_cost: totalCost,
          deposit_amount: depositAmount,
          total_paid: totalPaid,
          payment_status: paymentStatus,
          payment_requests: paymentRequests || [],
          payments: payments || []
        };
      })
    );

    return bookingsWithPayments;
  } catch (error) {
    console.error('Error getting bookings with payments:', error);
    throw error;
  }
}

/**
 * Gets customer deposit payments (for deducting from invoices)
 */
export async function getCustomerDepositPayments(customerId: number, serviceName?: string): Promise<{amount: number, payments: PaymentWithCustomer[]}> {
  try {
    console.log('🔍 Fetching deposit payments for customer:', customerId, 'service:', serviceName);
    
    // Strategy 1: Try to match through payment request service names
    if (serviceName) {
      const { data: paymentRequestData, error: prError } = await supabase
        .from('payments')
        .select(`
          *,
          customer:customers!payments_customer_id_fkey(
            first_name,
            last_name,
            email
          ),
          invoice:invoices(
            invoice_number
          )
        `)
        .eq('customer_id', customerId)
        .eq('status', 'paid')
        .like('notes', '%payment request%')
        .order('created_at', { ascending: false });

      if (!prError && paymentRequestData && paymentRequestData.length > 0) {
        console.log('💳 Found payment request deposits:', paymentRequestData.length);
        
        // Extract payment request IDs from notes
        const matchingPayments = [];
        for (const payment of paymentRequestData) {
          const match = payment.notes?.match(/payment request #(\d+)/i);
          if (match) {
            const requestId = parseInt(match[1]);
            
            // Check if this payment request matches the service
            const { data: requestData } = await supabase
              .from('payment_requests')
              .select('service_name, description')
              .eq('id', requestId)
              .single();
              
            if (requestData) {
              console.log('🎯 Checking payment request service:', requestData.service_name, 'vs', serviceName);
              
              // Clean and compare service names
              const cleanRequestService = requestData.service_name?.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              const cleanTargetService = serviceName.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              
              if (cleanRequestService && cleanTargetService &&
                  (cleanRequestService.includes(cleanTargetService) || 
                   cleanTargetService.includes(cleanRequestService) ||
                   cleanRequestService === cleanTargetService)) {
                console.log('✅ Service match found!');
                
                // Decrypt customer data if encrypted
                const customer = payment.customer;
                if (customer) {
                  if (customer.first_name && isDataEncrypted(customer.first_name)) {
                    customer.first_name = decryptSensitiveData(customer.first_name);
                  }
                  if (customer.last_name && isDataEncrypted(customer.last_name)) {
                    customer.last_name = decryptSensitiveData(customer.last_name);
                  }
                }
                
                matchingPayments.push({
                  ...payment,
                  invoice_number: payment.invoice?.invoice_number,
                  customer: customer
                });
              }
            }
          }
        }
        
        if (matchingPayments.length > 0) {
          const totalAmount = matchingPayments.reduce((sum, payment) => sum + payment.amount, 0);
          console.log('💰 Total matching deposits:', totalAmount);
          return { amount: totalAmount, payments: matchingPayments as PaymentWithCustomer[] };
        }
      }
    }

    // Strategy 2: Get all paid deposits for this customer if no service match
    console.log('📋 Fetching all customer deposits...');
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        customer:customers!payments_customer_id_fkey(
          first_name,
          last_name,
          email
        ),
        invoice:invoices(
          invoice_number
        )
      `)
      .eq('customer_id', customerId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get deposit payments: ${error.message}`);
    }

    const payments = data.map(payment => ({
      ...payment,
      invoice_number: payment.invoice?.invoice_number
    })) as PaymentWithCustomer[];

    const totalDepositAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    console.log('💰 Total customer deposits (all services):', totalDepositAmount);

    return {
      amount: totalDepositAmount,
      payments
    };
  } catch (error) {
    console.error('❌ Error getting customer deposit payments:', error);
    return { amount: 0, payments: [] };
  }
}

/**
 * Send payment failed notification email
 */
export async function sendPaymentFailedNotification(
  paymentRequestId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get payment request with customer and booking details
    const { data: paymentRequest, error } = await supabase
      .from('payment_requests')
      .select(`
        *,
        customer:customers!payment_requests_customer_id_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', paymentRequestId)
      .single();

    if (error || !paymentRequest) {
      throw new Error('Payment request not found');
    }

    // If there's a booking_id, fetch booking details
    let bookingDetails = null;
    if (paymentRequest.booking_id) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', paymentRequest.booking_id)
        .single();

      if (!bookingError && booking) {
        bookingDetails = booking;
      }
    }

    // Import the sendBookingWithPaymentEmail function
    const { sendBookingWithPaymentEmail } = await import('./emailSMTP');

    // Send payment failed email
    const emailResult = await sendBookingWithPaymentEmail(
      paymentRequest.customer.email,
      {
        customer_name: `${paymentRequest.customer.first_name} ${paymentRequest.customer.last_name}`,
        service_name: paymentRequest.service_name || bookingDetails?.package_name || 'Therapy Session',
        appointment_date: bookingDetails?.booking_date ? new Date(bookingDetails.booking_date).toLocaleDateString('en-IE') : new Date().toLocaleDateString('en-IE'),
        appointment_time: bookingDetails ? `${bookingDetails.timeslot_start_time} - ${bookingDetails.timeslot_end_time}` : 'To be confirmed',
        booking_reference: bookingDetails?.id || paymentRequest.booking_id || `PR-${paymentRequestId}`,
        payment_amount: paymentRequest.amount,
        payment_status: 'failed', // This will trigger the booking_with_payment_failed template
        therapist_name: 'KH Therapy Team',
        clinic_address: 'Neilstown Village Court, Neilstown Rd, Clondalkin, D22E8P2'
      }
    );

    return { success: emailResult };
  } catch (error) {
    console.error('Error sending payment failed notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
