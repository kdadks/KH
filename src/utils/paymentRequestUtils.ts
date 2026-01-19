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
    // Service price lookup

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
        // Database lookup skipped for quote services
        return null;
      }
    }
    
    // Extract base service name (e.g., "Ultimate Health")
    const baseServiceName = extractBaseServiceName(serviceName);
    // Extract base service name and time slot type
    
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
    
    // Pricing determined for service
    
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
  // Extract price from service name

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
      // Skipping payment request for quote service
      return null;
    }
  }
  
  // Look for fixed package pricing like "Ultimate Health (€150)"
  // This pattern indicates a fixed booking package that requires payment
  const priceMatch = serviceName.match(/€(\d+)(?!\s*\/|\s*per)/);
  
  // Price match calculation complete
  
  if (priceMatch) {
    const price = parseInt(priceMatch[1]);
    return price;
  }
  
  // No price found in service name
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
  customAmount?: number, // New parameter for custom amounts (used for invoice payments)
  paymentType?: 'deposit' | 'full' // New parameter to specify deposit or full payment
): Promise<PaymentRequest | null> {
  try {
    // Creating payment request

    let finalAmount: number;
    let baseCost: number | null = null;

    if (isInvoicePaymentRequest && customAmount !== undefined) {
      // For invoice payment requests, use the custom amount (no deposit calculation)
      finalAmount = customAmount;
    } else {
      // For booking payment requests, get the base service cost
      // First, try to get pricing from database
      baseCost = await getServicePriceFromDatabase(serviceName);
      
      // If database lookup fails, fall back to regex extraction (for backward compatibility)
      if (baseCost === null) {
        baseCost = extractPriceFromServiceName(serviceName);
      }
      
      // If pricing cannot be determined or service requires quote, don't create payment request
      if (baseCost === null) {
        return null; // Return null to indicate no payment request should be created
      }
      
      // Calculate amount based on payment type (default to deposit for backward compatibility)
      if (paymentType === 'full') {
        finalAmount = baseCost; // Full amount
      } else {
        finalAmount = Math.round(baseCost * PAYMENT_CONFIG.DEPOSIT_PERCENTAGE); // 20% deposit
      }
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
        : paymentType === 'full'
          ? `Full payment for ${serviceName} appointment on ${new Date(bookingDate).toLocaleDateString()}`
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
        ),
        booking:bookings!payment_requests_booking_id_fkey(
          visit_type,
          booking_date,
          package_name
        )
      `)
      .eq('customer_id', customerId)
      .in('status', ['pending', 'sent']) // Only show unpaid payment requests
      .not('booking_id', 'is', null) // Exclude orphaned payment requests (where booking was deleted)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get payment requests: ${error.message}`);
    }

    // Extract service name from notes field and decrypt customer data
    const processedData = data.map(request => {
      let serviceName = 'Service Payment';
      
      // Use package_name from booking if available, otherwise try to extract from notes
      if (request.booking?.package_name) {
        serviceName = request.booking.package_name;
      } else if (request.notes) {
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
        visit_type: request.booking?.visit_type || undefined,
        booking_date: request.booking?.booking_date || undefined,
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

    // Check if payment request is in a valid state for processing
    if (paymentRequest.status === 'cancelled') {
      console.error('❌ Attempted to process cancelled payment request:', paymentRequestId);
      throw new Error('This payment request has been cancelled and can no longer be processed. Please contact us if you need assistance.');
    }

    if (paymentRequest.status === 'paid') {
      console.error('❌ Attempted to process already paid payment request:', paymentRequestId);
      throw new Error('This payment has already been processed. If you believe this is an error, please contact us.');
    }

    if (paymentRequest.status === 'expired') {
      console.error('❌ Attempted to process expired payment request:', paymentRequestId);
      throw new Error('This payment request has expired. Please contact us to generate a new payment link.');
    }

    if (paymentRequest.status !== 'pending' && paymentRequest.status !== 'sent') {
      console.error('❌ Attempted to process payment request with invalid status:', paymentRequest.status);
      throw new Error('This payment request is not available for processing. Please contact us for assistance.');
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
      sumup_checkout_reference: paymentData.sumup_checkout_reference, // Add checkout reference
      sumup_transaction_id: paymentData.sumup_transaction_id,
      sumup_payment_type: paymentData.sumup_payment_type,
      booking_id: paymentRequest.booking_id, // Include booking_id from payment request
      payment_request_id: paymentRequestId, // Add payment_request_id for webhook lookup
      notes: `Payment for payment request #${paymentRequestId}`
    };

    // WEBHOOK FIX: Route through sumup-return endpoint to ensure webhook columns are populated
    const sumupEndpoint = `${window.location.origin}/.netlify/functions/sumup-return`;
    let payment;
    
    try {
      // Routing payment through SumUp handler
      // Match real SumUp webhook structure exactly (minimal payload)
      // The webhook handler will fetch full details from SumUp API using the checkout ID
      const requestBody = {
        id: paymentData.sumup_checkout_id,           // Checkout ID
        event_type: 'CHECKOUT_STATUS_CHANGED',      // Real SumUp event type
        timestamp: new Date().toISOString()          // Event timestamp
      };
      
      // Routing payment through SumUp webhook handler

      const response = await fetch(sumupEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Call': 'PaymentRequestUtils',  // Custom header (browsers allow this)
          'X-Payment-Request-Id': paymentRequestId.toString()
        },
        body: JSON.stringify(requestBody)
      });

      // Webhook response received

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Webhook endpoint error response:', errorText);
        throw new Error(`SumUp endpoint returned ${response.status}: ${errorText}`);
      }

      await response.text(); // Consume response body
      // Payment processed successfully through webhook handler
      
      // Get the created payment record for return (most recent for this payment_request_id)
      const { data: createdPayment, error: fetchError } = await supabase
        .from('payments')
        .select()
        .eq('payment_request_id', paymentRequestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch created payment: ${fetchError.message}`);
      }
      
      payment = createdPayment;
      
    } catch (webhookError) {
      console.error('❌ Failed to process through SumUp handler:', webhookError);
      // Fallback: Create payment directly if webhook handler fails
      const { data: fallbackPayment, error: paymentError } = await supabase
        .from('payments')
        .insert([paymentRecord])
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Failed to create payment record: ${paymentError.message}`);
      }
      
      payment = fallbackPayment;
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

    // Update associated booking status based on payment type (deposit vs full payment)
    if (paymentRequest.customer_id) {
      // Determining booking status update

      // Determine if this was a full payment or deposit by comparing against service cost
      let serviceCost = 0;
      let isFullPayment = false;

      try {
        // Detect service cost and payment type

        // Try to get service cost from the payment request's service_name or booking
        if (paymentRequest.service_name) {
          // Attempting to get service cost from payment request
          const dbPrice = await getServicePriceFromDatabase(paymentRequest.service_name);
          // Service cost retrieved from database
          if (dbPrice) {
            serviceCost = dbPrice;
          }
        }

        // If we couldn't get service cost from service_name, try to get it from booking
        if (serviceCost === 0 && paymentRequest.booking_id) {
          // Service cost not found via service_name, trying booking package_name
          const { data: booking } = await supabase
            .from('bookings')
            .select('package_name')
            .eq('id', paymentRequest.booking_id)
            .single();

          // Retrieved booking package name

          if (booking?.package_name) {
            const dbPrice = await getServicePriceFromDatabase(booking.package_name);
            // Service cost retrieved from booking
            if (dbPrice) {
              serviceCost = dbPrice;
            }
          }
        }

        // Determine if this is a full payment (within €2 tolerance for rounding)
        if (serviceCost > 0) {
          // Deposit would be: Math.round(serviceCost * PAYMENT_CONFIG.DEPOSIT_PERCENTAGE)
          isFullPayment = paymentRequest.amount >= (serviceCost - 2); // Allow €2 tolerance

          // Payment type determined based on service cost
        } else {
          // Fallback: assume it's full payment if we can't determine service cost
          isFullPayment = true;
        }
      } catch (error) {
        console.error('❌ Error determining payment type:', error);
        // Fallback: assume full payment on error
        isFullPayment = true;
      }

      // First check the current booking status before attempting update
      if (paymentRequest.booking_id) {
        const { error: checkError } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('id', paymentRequest.booking_id)
          .single();

        if (checkError) {
          console.error('❌ Failed to check current booking status:', checkError);
        } else {
          // Current booking status checked

          // ✅ IMPORTANT: Booking status is NOT automatically updated after payment
          // Bookings remain as 'pending' until admin manually confirms them in the admin console
          // This ensures proper workflow: payment → admin review → manual confirmation
          // Payment processed - booking status remains unchanged (admin must manually confirm)

          // Dispatch event to notify UI that payment was processed (for tracking purposes only)
          window.dispatchEvent(new CustomEvent('bookingPaymentProcessed', {
            detail: {
              bookingId: paymentRequest.booking_id,
              paymentType: isFullPayment ? 'full' : 'deposit',
              amount: paymentRequest.amount
            }
          }));
        }
      } else {
        // Fallback: try to find booking by customer_id if no booking_id in payment request
        // Attempting to find customer booking

        // First find the most recent booking for this customer
        const { data: customerBookings, error: findError } = await supabase
          .from('bookings')
          .select('id, status, created_at')
          .eq('customer_id', paymentRequest.customer_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (findError) {
          console.error('❌ Failed to find customer bookings:', findError);
        } else if (customerBookings && customerBookings.length > 0) {
          // Found most recent booking for customer
          // Payment processed - booking status remains unchanged (admin must manually confirm)
        } else {
          // No bookings found for customer
        }
      }

      // Payment processing complete - booking status NOT changed (awaiting admin confirmation)
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
    // Small delay to ensure database update is committed
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
    
    // Payment request fetched for email notification

    // Generate SumUp checkout URL for direct payment (try real API first)
    let directPaymentUrl = '';
    let baseUrl = '';
    
    // Handle URL generation - check if we're in browser context
    try {
      baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://khtherapy.ie';
    } catch {
      baseUrl = 'https://khtherapy.ie'; // Fallback for server-side rendering
    }
    
    try {
      const { createSumUpCheckoutSession } = await import('./sumupRealApiImplementation');
      
      // Get SumUp configuration from database
      const gatewayConfig = await getActiveSumUpGateway();
      
      if (!gatewayConfig || !gatewayConfig.merchant_id) {
        console.error('Payment gateway not configured for email payment links - using fallback payment URL');
        // Don't return here - continue with fallback URL and send email
        directPaymentUrl = `${baseUrl}/payment?request=${paymentRequestId}`;
      } else {
        // Construct return URLs for SumUp checkout
        const sumupReturnUrl = `${baseUrl}/api/sumup-return`;
        const successRedirectUrl = `${baseUrl}/payment?request=${paymentRequestId}&status=success`;
        const cancelRedirectUrl = `${baseUrl}/payment?request=${paymentRequestId}&status=cancelled`;
        
        // Create SumUp checkout session (needed for payment processing)
        // We don't use the checkout_url from response - we route through internal validation page instead
        await createSumUpCheckoutSession({
          checkout_reference: `payment-request-${paymentRequestId}-${Date.now()}`,
          amount: paymentRequest.amount,
          currency: 'EUR',
          merchant_code: gatewayConfig.merchant_id,
          description: paymentRequest.service_name || 'Payment Request',
          redirect_url: successRedirectUrl, // Where to redirect after successful payment (hosted checkout)
          return_url: sumupReturnUrl, // Webhook callback URL
          cancel_url: cancelRedirectUrl,
          customer: {
            email: paymentRequest.customer.email,
            name: `${paymentRequest.customer.first_name} ${paymentRequest.customer.last_name}`.trim(),
          },
          pay_to_email: paymentRequest.customer.email
        });
        
        // ALWAYS use internal payment page URL to validate status before proceeding to SumUp
        // This prevents cancelled/paid payment requests from being processed via email links
        directPaymentUrl = `${baseUrl}/payment?request=${paymentRequestId}`;
        // Using internal payment validation URL
      }
      
    } catch (realApiError) {
      console.error('SumUp checkout creation failed, using fallback URL:', realApiError);
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

// Booking with payment data interface
interface BookingWithPaymentData {
  id: number;
  booking_date: string;
  service: string;
  status: string;
  total_amount: number;
  customers?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
  [key: string]: unknown;
}

/**
 * Get all bookings with payment information for admin dashboard
 */
export async function getBookingsWithPayments(): Promise<BookingWithPaymentData[]> {
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
export async function getCustomerDepositPayments(customerId: number, _serviceName?: string, bookingId?: string): Promise<{amount: number, payments: PaymentWithCustomer[]}> {
  try {
    // Fetching deposit payments for customer
    
    // Strategy 1: Try to match by booking ID first (most accurate)
    if (bookingId) {
      // Using booking ID to find deposits
      
      const { data: bookingPayments, error: bookingError } = await supabase
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
        .eq('booking_id', bookingId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (!bookingError && bookingPayments && bookingPayments.length > 0) {
        // Fetch payment types separately for all payments
        const paymentRequestIds = bookingPayments
          .map(p => p.payment_request_id)
          .filter(id => id != null);
        
        let paymentTypesMap: Record<number, string> = {};
        if (paymentRequestIds.length > 0) {
          const { data: paymentRequests } = await supabase
            .from('payment_requests')
            .select('id, payment_type')
            .in('id', paymentRequestIds);
          
          if (paymentRequests) {
            paymentTypesMap = Object.fromEntries(
              paymentRequests.map(pr => [pr.id, pr.payment_type])
            );
          }
        }
        // Found payments for booking ID
        // Analyzing all payments for this booking
        
        // Find deposits - only payments where payment_type is 'deposit'
        const deposits = bookingPayments.filter(payment => {
          const paymentType = payment.payment_request_id ? paymentTypesMap[payment.payment_request_id] : null;
          // Analyzing payment for deposit classification
          
          // Only include payments explicitly marked as 'deposit'
          return paymentType === 'deposit';
        });
        
        // Deposit search completed
        
        if (deposits.length > 0) {
          // Use the most recent deposit for this booking
          const deposit = deposits[0];
          // Selected deposit for invoice deduction
          
          // Decrypt customer data if encrypted
          const customer = deposit.customer;
          if (customer) {
            if (customer.first_name && isDataEncrypted(customer.first_name)) {
              customer.first_name = decryptSensitiveData(customer.first_name);
            }
            if (customer.last_name && isDataEncrypted(customer.last_name)) {
              customer.last_name = decryptSensitiveData(customer.last_name);
            }
          }
          
          return { 
            amount: deposit.amount, 
            payments: [{
              ...deposit,
              invoice_number: deposit.invoice?.invoice_number,
              customer: customer
            }] as PaymentWithCustomer[]
          };
        } else {
          // No deposits found for booking ID
          return { amount: 0, payments: [] };
        }
      } else {
        // No payments found for booking ID
        return { amount: 0, payments: [] };
      }
    }
    
    // No booking ID provided, return empty
    return { amount: 0, payments: [] };
  } catch (error) {
    console.error('❌ Error getting customer deposit payments:', error);
    return { amount: 0, payments: [] };
  }
}

/**
 * Manual function to fix booking status based on actual payment data
 * Useful for retroactively fixing bookings that should be confirmed
 */
export async function fixBookingStatusBasedOnPayments(bookingId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Manual booking status fix initiated

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_id, package_name, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, message: 'Booking not found' };
    }

    // Retrieved current booking information

    // Get all payments for this customer
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('customer_id', booking.customer_id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      return { success: false, message: 'Failed to fetch payments' };
    }

    // Find payment that matches this booking
    const matchingPayment = payments?.find(p => p.booking_id === bookingId) ||
                           payments?.find(p => p.notes?.includes(booking.package_name)) ||
                           payments?.[0]; // Last resort: most recent payment

    if (!matchingPayment) {
      return { success: false, message: 'No payments found for this booking' };
    }

    // Found matching payment for booking

    // Get service cost
    let serviceCost = 0;
    const dbPrice = await getServicePriceFromDatabase(booking.package_name);
    if (dbPrice) {
      serviceCost = dbPrice;
    }

    if (serviceCost === 0) {
      return { success: false, message: 'Could not determine service cost' };
    }

    // Deposit would be: Math.round(serviceCost * PAYMENT_CONFIG.DEPOSIT_PERCENTAGE)
    const isFullPayment = matchingPayment.amount >= (serviceCost - 2);
    const targetStatus = isFullPayment ? 'paid' : 'deposit_paid';

    // Payment analysis completed for manual fix

    if (booking.status === targetStatus) {
      return { success: true, message: `Booking already has correct status: ${targetStatus}` };
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('❌ Failed to update booking status:', updateError);
      return { success: false, message: 'Failed to update booking status' };
    }

    // Booking status manually updated

    // Dispatch event to refresh admin views
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bookingStatusUpdated', {
        detail: {
          bookingId: bookingId,
          newStatus: targetStatus,
          customerId: booking.customer_id,
          manualFix: true
        }
      }));
    }

    return {
      success: true,
      message: `Booking status updated from '${booking.status}' to '${targetStatus}' based on payment of €${matchingPayment.amount}`
    };

  } catch (error) {
    console.error('❌ Error in manual booking status fix:', error);
    return { success: false, message: 'Unexpected error occurred' };
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
        booking_reference: bookingDetails?.booking_reference || bookingDetails?.id || paymentRequest.booking_id || `PR-${paymentRequestId}`,
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
