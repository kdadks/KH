import React, { useState, useEffect, useCallback } from 'react';
import logger from '../../utils/logger';
import { X, CreditCard, Shield, CheckCircle, AlertCircle, Calendar, Clock } from 'lucide-react';
import { PaymentRequestWithCustomer, ProcessPaymentData } from '../../types/paymentTypes';
import { createSumUpCheckoutSession, getSumUpCheckoutStatus } from '../../utils/sumupRealApiImplementation';
import type { SumUpCreateCheckoutResponse } from '../../utils/sumupRealApiImplementation';
import SumUpModal from './SumUpModal';

// Extended interfaces for better type safety
interface ExtendedCheckoutResponse extends SumUpCreateCheckoutResponse {
  hosted_checkout_url?: string;
  redirect_url?: string;
  payment_link?: string;
  links?: Array<{
    href: string;
    rel: string;
    method?: string;
  }>;
}

interface PaymentLogEntry {
  timestamp: string;
  message: string;
  data?: Record<string, unknown>;
}

// Window interface extension for debug functions
declare global {
  interface Window {
    viewPaymentLogs?: () => void;
    clearPaymentLogs?: () => void;
  }
}
import { processPaymentRequest, sendPaymentFailedNotification } from '../../utils/paymentRequestUtils';
import { PaymentEnvironmentIndicator } from '../ui/PaymentEnvironmentIndicator';
// Gateway management now handled by domain-based environment detection
import { getPaymentEnvironment, getSumUpEnvironmentConfig, clearEnvironmentCache } from '../../utils/environmentDetection';
import { useToast } from './toastContext';
import { supabase } from '../../supabaseClient';
import { handlePaymentModalCancellation } from '../../utils/paymentCancellation';

interface SumUpPaymentFormProps {
  amount: number;
  currency: string;
  description: string;
  onPaymentComplete: () => void;
  onPaymentError: (error: string) => void;
}

const SumUpPaymentForm: React.FC<SumUpPaymentFormProps> = ({
  amount,
  currency,
  description,
  onPaymentComplete,
  onPaymentError
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    return parts.length ? parts.join(' ') : v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
  };

  const handlePayment = async () => {
    if (processing) return;
    
    setProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      logger.devOnly(() => console.log('Payment processed:', {
        amount,
        currency,
        description,
        cardLast4: cardNumber.slice(-4)
      }));
      
      onPaymentComplete();
    } catch (error) {
      console.error('Payment processing error:', error);
      onPaymentError('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-lg font-medium text-gray-700">
          {formatCurrency(amount, currency)}
        </p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cardholder Name
          </label>
          <input
            type="text"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="John Smith"
            disabled={processing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Card Number
          </label>
          <input
            type="text"
            value={cardNumber}
            onChange={handleCardNumberChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            disabled={processing}
          />
        </div>

        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="MM/YY"
              maxLength={5}
              disabled={processing}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CVC
            </label>
            <input
              type="text"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="123"
              maxLength={4}
              disabled={processing}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handlePayment}
        disabled={processing}
        className="w-full bg-[#71db77] text-white py-3 px-6 rounded-lg hover:bg-[#5fcf68] transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {processing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing...
          </>
        ) : (
          `Pay ${formatCurrency(amount, currency)}`
        )}
      </button>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          🔒 Secured by SumUp
        </p>
      </div>
    </div>
  );
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentRequest: PaymentRequestWithCustomer;
  onPaymentComplete?: () => void;
  onPaymentFailed?: (error: string) => void; // New prop for payment failure callback
  redirectAfterPayment?: string | false; // New prop to control redirect behavior
  context?: 'email' | 'dashboard' | 'admin' | 'booking'; // Context to determine redirect behavior
}

const extractCheckoutUrl = (
  checkout: ExtendedCheckoutResponse | null | undefined
): string | null => {
  if (!checkout) {
    return null;
  }

  const directUrlCandidates = [
    checkout.hosted_checkout_url,
    checkout.checkout_url,
    checkout.redirect_url,
    checkout.payment_link
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  if (directUrlCandidates.length > 0) {
    return directUrlCandidates[0];
  }

  const links = checkout.links;
  if (Array.isArray(links)) {
    const linkMatch = links.find((link) => {
      if (!link || typeof link !== 'object') return false;
      const relation = typeof link.rel === 'string' ? link.rel.toLowerCase() : '';
      return relation.includes('checkout') || relation.includes('redirect');
    });
    if (linkMatch?.href && typeof linkMatch.href === 'string') {
      return linkMatch.href;
    }
  } else if (links && typeof links === 'object') {
    const linkKeys = ['checkout_url', 'redirect_url', 'pay_to_url', 'pay_to_card_url'];
    for (const key of linkKeys) {
      const candidate = (links as Record<string, unknown>)[key];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
  }

  return null;
};

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  paymentRequest,
  onPaymentComplete,
  onPaymentFailed,
  redirectAfterPayment,
  context = 'booking' // Default context
}) => {
  // Store payment logs in localStorage for post-redirect analysis
  const logToStorage = (message: string, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, data };
    
        // Debug log: ${message}
    
    const existingLogs = localStorage.getItem('payment_debug_logs');
    const logs = existingLogs ? JSON.parse(existingLogs) : [];
    logs.push(logEntry);
    
    // Keep only last 50 logs
    if (logs.length > 50) logs.splice(0, logs.length - 50);
    
    localStorage.setItem('payment_debug_logs', JSON.stringify(logs));
  };

  // Function to view debug logs
  const viewDebugLogs = () => {
    const logs = localStorage.getItem('payment_debug_logs');
    if (logs) {
      const parsedLogs = JSON.parse(logs);
      // Debug logs retrieved
      console.table(parsedLogs.map((log: PaymentLogEntry) => ({ 
        time: new Date(log.timestamp).toLocaleTimeString(),
        message: log.message 
      })));
      return parsedLogs;
    } else {
      // No debug logs found
      return [];
    }
  };

  // Make debug functions globally available
  window.viewPaymentLogs = viewDebugLogs;
  window.clearPaymentLogs = () => {
    localStorage.removeItem('payment_debug_logs');
    // Debug logs cleared
  };

  // Log PaymentModal initialization
  if (isOpen) {
    logToStorage('PaymentModal opened', { 
      paymentRequestId: paymentRequest.id, 
      amount: paymentRequest.amount,
      context: context 
    });
  }
  
  const { showSuccess, showError, showInfo } = useToast();

  // Handle modal close with payment cancellation
  const handleModalClose = async () => {
    // Prevent multiple cancellation attempts
    if (isCancelling) {
      logger.devOnly(() => console.log('🚫 Cancellation already in progress, ignoring duplicate click'));
      return;
    }

    // Only cancel if we're in the middle of a payment process and payment hasn't been completed
    if (currentStep === 'payment' || currentStep === 'processing' || currentStep === 'confirm') {
      setIsCancelling(true);
      try {
        logger.devOnly(() => console.log('🚫 Starting payment cancellation process...'));
        await handlePaymentModalCancellation(paymentRequest.id, onClose, showInfo);
      } catch (error) {
        console.error('Error during cancellation:', error);
        // Still close the modal even if cancellation fails
        onClose();
      } finally {
        setIsCancelling(false);
      }
    } else {
      // For success, error, or redirect states, just close normally
      onClose();
    }
  };
  const [currentStep, setCurrentStep] = useState<'confirm' | 'processing' | 'payment' | 'success' | 'error' | 'modal'>('confirm');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [bookingDetails, setBookingDetails] = useState<{
    booking_date: string;
    timeslot_start_time: string;
    timeslot_end_time: string;
    package_name: string;
    notes?: string;
  } | null>(null);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState<boolean>(false);
  const [gatewayEnvironment, setGatewayEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [checkoutReference, setCheckoutReference] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [showSumUpModal, setShowSumUpModal] = useState<boolean>(false);

  const getRedirectUrl = (isSuccess: boolean = true): string | null => {
    // If redirectAfterPayment is explicitly set, use it
    if (redirectAfterPayment !== undefined) {
      return redirectAfterPayment !== false ? redirectAfterPayment : null;
    }
    
    // Use context-based redirect logic
    switch (context) {
      case 'email':
        return '/'; // Email payments redirect to home
      case 'dashboard':
        return isSuccess ? '/my-account' : null; // Dashboard - redirect to user portal for success, no redirect for error
      case 'admin':
        return isSuccess ? '/admin' : '/admin'; // Admin context - redirect back to admin section
      case 'booking':
      default:
        return '/'; // Booking payments redirect to home
    }
  };

  // Fetch booking details if booking_id is available
  const fetchBookingDetails = useCallback(async () => {
    if (!paymentRequest.booking_id) {
      setBookingDetails(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_date, timeslot_start_time, timeslot_end_time, package_name, notes')
        .eq('id', paymentRequest.booking_id)
        .single();

      if (error) {
        console.error('Error fetching booking details:', error);
        setBookingDetails(null);
      } else {
        setBookingDetails(data);
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setBookingDetails(null);
    }
  }, [paymentRequest.booking_id]);

  // SumUp Modal Handlers
  const handleSumUpSuccess = useCallback((data: { transaction_id?: string; amount?: string; checkout_reference?: string }) => {
    logger.devOnly(() => console.log('SumUp payment successful:', data));
    setShowSumUpModal(false);
    setCurrentStep('success');
    
    // Process the successful payment
    if (data.transaction_id) {
      logger.info('Payment completed successfully via SumUp modal', {
        transaction_id: data.transaction_id,
        amount: data.amount,
        checkout_reference: data.checkout_reference
      });
    }
    
    // Call success handler if provided
    onPaymentComplete?.();
  }, [onPaymentComplete]);

  const handleSumUpFailure = useCallback((error: { error?: string; code?: string; message?: string }) => {
    console.error('SumUp payment failed:', error);
    setShowSumUpModal(false);
    setErrorMessage(error.error || 'Payment failed. Please try again.');
    setCurrentStep('error');
    
    // Log the error
    logger.error('Payment failed in SumUp modal', error);
    
    // Call failure handler if provided
    onPaymentFailed?.(error.error || 'Payment failed');
  }, [onPaymentFailed]);

  const handleSumUpCancel = useCallback(() => {
    logger.devOnly(() => console.log('SumUp payment cancelled by user'));
    setShowSumUpModal(false);
    setCurrentStep('confirm');
    
    // Log the cancellation
    logger.info('Payment cancelled by user in SumUp modal');
  }, []);

  const handleSumUpModalClose = useCallback(() => {
    setShowSumUpModal(false);
    // Return to confirm step if modal is closed without completion
    if (currentStep === 'modal') {
      setCurrentStep('confirm');
    }
  }, [currentStep]);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('confirm');
      setCheckoutUrl('');
      setErrorMessage('');
      setIsDevelopmentMode(false);
      setCheckoutReference(null);
      setCheckoutSessionId(null);
      setIsCancelling(false);
      setShowSumUpModal(false);
      logger.debug('PaymentModal opening with booking_id:', paymentRequest.booking_id);
      fetchBookingDetails();
      
      // Pre-fetch gateway config to show correct environment immediately
      const loadGatewayConfig = async () => {
        try {
          // Use domain-based environment detection instead of database config
          const currentEnvironment = getPaymentEnvironment();
          // Set development mode based on environment (sandbox = development mode)
          const developmentMode = currentEnvironment === 'sandbox';
          setIsDevelopmentMode(developmentMode);
          setGatewayEnvironment(currentEnvironment);
          
          // Environment detection completed
        } catch (error) {
          console.warn('Failed to detect environment, defaulting to sandbox:', error);
          setIsDevelopmentMode(true);
          setGatewayEnvironment('sandbox');
        }
      };
      
      loadGatewayConfig();
    }
  }, [isOpen, paymentRequest.booking_id, fetchBookingDetails]);

  const handleStartPayment = async () => {
    // SIMPLE CONSOLE OUTPUT
    // Payment process initiated
    
    logToStorage('Payment process started', {
      paymentRequestId: paymentRequest.id,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      context: context
    });
    
    try {
      setCurrentStep('processing');
      
      // Validate payment request status before proceeding
      const { data: currentPaymentRequest, error: fetchError } = await supabase
        .from('payment_requests')
        .select('id, status, amount, service_name')
        .eq('id', paymentRequest.id)
        .single();

      if (fetchError || !currentPaymentRequest) {
        throw new Error('Payment request not found. Please refresh the page and try again.');
      }

      if (currentPaymentRequest.status === 'cancelled') {
        setCurrentStep('error');
        setErrorMessage('This payment request has been cancelled and can no longer be processed. Please contact us if you need assistance.');
        return;
      }

      if (currentPaymentRequest.status === 'paid') {
        setCurrentStep('error');
        setErrorMessage('This payment has already been processed. If you believe this is an error, please contact us.');
        return;
      }

      if (currentPaymentRequest.status === 'expired') {
        setCurrentStep('error');
        setErrorMessage('This payment request has expired. Please contact us to generate a new payment link.');
        return;
      }

      if (currentPaymentRequest.status !== 'pending' && currentPaymentRequest.status !== 'sent') {
        setCurrentStep('error');
        setErrorMessage('This payment request is not available for processing. Please contact us for assistance.');
        return;
      }
      
      // Use domain-based environment detection for payment processing
      const currentEnvironment = getPaymentEnvironment();
      const environmentConfig = getSumUpEnvironmentConfig();
      
      // Set development mode based on environment (sandbox = development mode)
      const developmentMode = currentEnvironment === 'sandbox';
      setIsDevelopmentMode(developmentMode);
      setGatewayEnvironment(currentEnvironment);
      
      logger.devOnly(() => console.log('💳 Payment Environment:', {
        environment: currentEnvironment,
        developmentMode,
        config: environmentConfig
      }));

      const newCheckoutReference = `payment-request-${paymentRequest.id}-${Date.now()}`;
      setCheckoutReference(newCheckoutReference);

      // DUPLICATE FIX: Don't create initial payment - let SumUp webhook/return handler create the only payment record
      // Payment record will be created by webhook
      logToStorage('Payment flow initiated - no initial record created', { 
        checkoutReference: newCheckoutReference,
        reason: 'Preventing duplicate payments - SumUp handler will create single record'
      });

      // Set up return URL for SumUp to call (handles both webhook processing and user redirect)
      const sumupReturnUrl = `${window.location.origin}/.netlify/functions/sumup-return`;
      
      // Set up user redirect URLs (these will be handled by our payment success/cancel pages)
      const successRedirectUrl = new URL(`${window.location.origin}/payment-success`);
      successRedirectUrl.searchParams.set('payment_request_id', paymentRequest.id.toString());
      successRedirectUrl.searchParams.set('checkout_reference', newCheckoutReference);
      successRedirectUrl.searchParams.set('context', context);

      const cancelRedirectUrl = new URL(`${window.location.origin}/payment-cancelled`);
      cancelRedirectUrl.searchParams.set('payment_request_id', paymentRequest.id.toString());
      cancelRedirectUrl.searchParams.set('checkout_reference', newCheckoutReference);
      cancelRedirectUrl.searchParams.set('context', context);

      logger.devOnly(() => console.log('Creating SumUp checkout session...', {
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        merchant_code: environmentConfig.merchantCode,
        environment: currentEnvironment,
        return_url: sumupReturnUrl,
        success_redirect: successRedirectUrl.toString(),
        cancel_redirect: cancelRedirectUrl.toString()
      }));

      const checkoutResponse = await createSumUpCheckoutSession({
        checkout_reference: newCheckoutReference,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency || 'EUR',
        merchant_code: environmentConfig.merchantCode,
        description: `Payment for ${paymentRequest.service_name || 'Service'}`,
        redirect_url: cancelRedirectUrl.toString(), // Where to redirect after successful payment (hosted checkout)
        return_url: sumupReturnUrl, // Webhook callback URL
        cancel_url: cancelRedirectUrl.toString(), // Where users go when they cancel
        customer: {
          email: paymentRequest.customer.email,
          name: `${paymentRequest.customer.first_name} ${paymentRequest.customer.last_name}`.trim(),
        },
        pay_to_email: paymentRequest.customer.email // Alternative email field for SumUp
      });

      // SumUp checkout session created successfully

      setCheckoutSessionId(checkoutResponse.id);

      const resolveCheckoutUrl = async (
        initial: SumUpCreateCheckoutResponse
      ): Promise<string | null> => {
        let latestPayload: ExtendedCheckoutResponse | null = initial;

        for (let attempt = 0; attempt < 3; attempt++) {
          const derivedUrl = extractCheckoutUrl(latestPayload);
          if (derivedUrl) {
            if (attempt > 0) {
              logger.devOnly(() => console.info('Resolved SumUp checkout URL after retry.', { attempts: attempt + 1 }));
            }
            return derivedUrl;
          }

          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 400));
          }

          try {
            latestPayload = await getSumUpCheckoutStatus(initial.id);
          } catch (statusError) {
            console.warn('Failed to fetch SumUp checkout status while searching for redirect URL.', statusError);
            return null;
          }
        }

        console.warn('SumUp checkout missing redirect URL after multiple attempts.', {
          initial,
          latestPayload
        });

        return null;
      };

      try {
        localStorage.setItem(
          `sumupCheckout:${newCheckoutReference}`,
          JSON.stringify({
            paymentRequestId: paymentRequest.id,
            checkoutId: checkoutResponse.id,
            merchantCode: checkoutResponse.merchant_code,
            environment: currentEnvironment,
            createdAt: new Date().toISOString()
          })
        );
      } catch (storageError) {
        console.warn('Unable to persist SumUp checkout metadata locally:', storageError);
      }

      const responseCheckoutUrl = await resolveCheckoutUrl(checkoutResponse);
      const shouldStayInApp = developmentMode || currentEnvironment !== 'production';

      if (shouldStayInApp) {
        // Create a shorter, cleaner checkout URL for sandbox mode
        const fallbackCheckoutUrl = responseCheckoutUrl || `/sumup-checkout?ref=${checkoutResponse.checkout_reference}&amt=${paymentRequest.amount}&cur=${paymentRequest.currency || 'EUR'}&id=${checkoutResponse.id}&env=${currentEnvironment}&pr_id=${paymentRequest.id}&ctx=booking`;
        setCheckoutUrl(fallbackCheckoutUrl);
        setCurrentStep('payment');

        logger.devOnly(() => console.log('Sandbox checkout session ready:', {
          checkoutUrl: fallbackCheckoutUrl,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency
        }));
        return;
      }

      if (!responseCheckoutUrl) {
        console.error('SumUp checkout response missing checkout URL after refresh attempts.', checkoutResponse);
        throw new Error('SumUp did not return a checkout URL. Please ensure hosted checkout is enabled for your SumUp account or try again later.');
      }

      setCheckoutUrl(responseCheckoutUrl);
      // Open SumUp checkout in modal instead of redirecting
      setCurrentStep('modal');
      setShowSumUpModal(true);

      logger.devOnly(() => console.log('Opening SumUp checkout in modal', {
        checkoutUrl: responseCheckoutUrl,
        checkoutId: checkoutResponse.id,
        reference: newCheckoutReference
      }));

      // Store SumUp checkout details in localStorage
      logToStorage('SumUp checkout session created - opening in modal', {
        checkoutUrl: responseCheckoutUrl,
        checkoutId: checkoutResponse.id,
        checkoutReference: newCheckoutReference,
        returnUrl: sumupReturnUrl,
        fullResponse: checkoutResponse
      });
      
      // Environment-based redirect handling
      // Clear cache to ensure fresh detection
      clearEnvironmentCache();
      const paymentEnv = getPaymentEnvironment();
      const isProduction = paymentEnv === 'production';
      
      logger.devOnly(() => console.log('🚀 PaymentModal Environment Check:', { paymentEnv, isProduction, hostname: window.location.hostname }));
      
      if (isProduction) {
        // Production: Redirect to SumUp checkout
        // Removed: Modal handles the checkout now, no page redirect needed
        // setTimeout(() => {
        //   window.location.href = responseCheckoutUrl;
        // }, 350);
        logger.devOnly(() => console.log('✅ SumUp checkout will open in modal only (redirect disabled)'));
      } else {
        // Development/Sandbox: Prevent redirect for debugging
        logToStorage('SumUp redirect prevented for debugging (sandbox mode)', { 
          wouldRedirectTo: responseCheckoutUrl,
          environment: paymentEnv
        });
        
        logger.devOnly(() => {
          console.log('� SumUp checkout created successfully. Redirect prevented for debugging (sandbox mode).');
          console.log('� Check localStorage payment_debug_logs for full details');
          console.log('� Redirect URL:', responseCheckoutUrl);
        });
      }
      
    } catch (error) {
      console.error('Failed to create payment checkout:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
      setErrorMessage(errorMessage);
      setCurrentStep('error');
      
      // Send payment failed notification
      handlePaymentFailure(`Payment initialization failed: ${errorMessage}`);
      // Notify parent component about payment failure
      onPaymentFailed?.(`Payment initialization failed: ${errorMessage}`);
      
      showError('Payment Error', 'Failed to initialize payment. Please try again.');
    }
  };

  const handlePaymentComplete = async () => {
    if (!isDevelopmentMode) {
      console.warn('handlePaymentComplete invoked outside development mode; ignoring direct completion call.');
      return;
    }

    try {
      setCurrentStep('processing');
      
      const fallbackCheckoutId = checkoutSessionId || checkoutReference || `dev-checkout-${Date.now()}`;
      const generatedTransactionId = `dev-transaction-${Date.now()}`;

      // Create payment processing data
      const paymentData: ProcessPaymentData = {
        payment_request_id: paymentRequest.id,
        sumup_checkout_id: fallbackCheckoutId,
        sumup_transaction_id: generatedTransactionId,
        // NOTE: NOT adding sumup_checkout_reference here to avoid duplicates
        // The webhook handler will handle payment creation with proper reference
        payment_method: 'card',
        sumup_payment_type: 'card'
      };

      logger.devOnly(() => console.log('Processing payment request:', paymentData));

      // Update payment request amount in database if it differs (for full payments)
      const { data: currentPaymentRequest } = await supabase
        .from('payment_requests')
        .select('amount')
        .eq('id', paymentRequest.id)
        .single();

      if (currentPaymentRequest && currentPaymentRequest.amount !== paymentRequest.amount) {
        logger.devOnly(() => console.log(`🔄 Updating payment request amount from €${currentPaymentRequest.amount} to €${paymentRequest.amount}`));

        const { error: updateError } = await supabase
          .from('payment_requests')
          .update({
            amount: paymentRequest.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentRequest.id);

        if (updateError) {
          console.error('❌ Failed to update payment request amount:', updateError);
          throw new Error('Failed to update payment amount');
        } else {
          logger.devOnly(() => console.log('✅ Payment request amount updated successfully'));
        }
      }

      // Process the payment request (updates status to 'paid' and creates payment record)
      const result = await processPaymentRequest(paymentRequest.id, paymentData);

      if (result.success) {
        setCurrentStep('success');
        showSuccess('Payment Successful!', 'Your payment has been processed and moved to payment history.');

        // Dispatch events to notify admin views of payment completion
        window.dispatchEvent(new CustomEvent('bookingUpdated', {
          detail: {
            paymentRequest: paymentRequest,
            paymentCompleted: true,
            paymentStatus: 'paid'
          }
        }));

        // Also dispatch specific booking status update event
        if (paymentRequest.booking_id) {
          window.dispatchEvent(new CustomEvent('bookingStatusUpdated', {
            detail: {
              bookingId: paymentRequest.booking_id,
              newStatus: 'paid', // Changed from 'confirmed' to 'paid' - requires manual admin confirmation
              paymentRequestId: paymentRequest.id,
              customerId: paymentRequest.customer_id
            }
          }));
        }

        // Close modal and handle redirect after a short delay
        setTimeout(() => {
          onPaymentComplete?.();
          onClose();

          // For dashboard context, trigger a data refresh event instead of redirect
          if (context === 'dashboard') {
            // Dispatch custom event to refresh dashboard data
            window.dispatchEvent(new CustomEvent('refreshDashboard'));
            return;
          }

          // Get redirect URL for successful payment (non-dashboard contexts)
          const redirectUrl = getRedirectUrl(true);

          // Perform redirect if needed
          if (redirectUrl) {
            // Use window.location.href for email and booking contexts
            window.location.href = redirectUrl;
          }
        }, 2000);
      } else {
        setCurrentStep('error');
        setErrorMessage(result.error || 'Failed to process payment');
        showError('Payment Processing Error', result.error || 'Failed to process payment');
        // Send payment failed notification
        handlePaymentFailure(result.error || 'Payment processing failed');
        // Notify parent component about payment failure
        onPaymentFailed?.(result.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Error completing payment:', error);
      setCurrentStep('error');
      setErrorMessage('Failed to complete payment processing');
      showError('Payment Error', 'Failed to complete payment processing');
      // Send payment failed notification
      handlePaymentFailure('Failed to complete payment processing');
      // Notify parent component about payment failure
      onPaymentFailed?.('Failed to complete payment processing');
    }
  };

  const handlePaymentFailure = async (reason: string) => {
    try {
      logger.devOnly(() => console.log('📧 Sending payment failed notification for payment request:', paymentRequest.id, 'Reason:', reason));
      const emailResult = await sendPaymentFailedNotification(paymentRequest.id);
      
      if (emailResult.success) {
        logger.devOnly(() => console.log('✅ Payment failed notification sent successfully'));
        showInfo('Notification Sent', 'We have sent you an email with instructions to retry your payment.');
      } else {
        console.error('❌ Failed to send payment failed notification:', emailResult.error);
      }
    } catch (error) {
      console.error('Error sending payment failed notification:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatBookingDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const formatTimeForDisplay = (timeString: string) => {
    try {
      if (!timeString) return '';

      // Handle time in HH:MM:SS or HH:MM format
      const [hours, minutes] = timeString.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" 
      style={{ 
        zIndex: 999999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative" 
        style={{ 
          zIndex: 999999,
          maxHeight: '90vh',
          marginTop: '5vh'
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center">
            <CreditCard className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                Secure Payment
                <PaymentEnvironmentIndicator />
              </h3>
              <p className="text-sm text-gray-600">
                {paymentRequest.service_name || 'Service Payment'}
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            disabled={currentStep === 'processing' || isCancelling}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Confirmation Step */}
          {currentStep === 'confirm' && (
            <div className="text-center space-y-6">
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">KH Therapy</h4>
                  <p className="text-gray-600">
                    Payment for {paymentRequest.service_name || 'Service'}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600 mb-2">
                    Total: {formatCurrency(paymentRequest.amount, paymentRequest.currency)}
                  </div>
                  {paymentRequest.payment_due_date && (
                    <p className="text-sm text-gray-500">
                      Due: {new Date(paymentRequest.payment_due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center space-x-3 text-sm text-gray-600">
                <Shield className="w-5 h-5 text-green-600" />
                <span>
                  Secured by SumUp • 256-bit SSL encryption • {gatewayEnvironment === 'production' ? 'Production mode' : 'Sandbox mode'}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">
                    {paymentRequest.customer.first_name} {paymentRequest.customer.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{paymentRequest.customer.email}</span>
                </div>

                {/* Show booking details if available */}
                {bookingDetails && (
                  <>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex items-center text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span className="font-medium">Appointment Details</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium">{bookingDetails.package_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{formatBookingDate(bookingDetails.booking_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimeForDisplay(bookingDetails.timeslot_start_time)} - {formatTimeForDisplay(bookingDetails.timeslot_end_time)}
                      </span>
                    </div>
                    {bookingDetails.notes && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Notes:</span>
                        <span className="font-medium text-right max-w-xs truncate" title={bookingDetails.notes}>
                          {bookingDetails.notes}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 mt-2"></div>
                  </>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="font-medium font-mono">#{paymentRequest.id}</span>
                </div>
              </div>

              {/* Debug buttons removed for production */}

              <button
                onClick={handleStartPayment}
                className="w-full bg-[#71db77] text-white py-3 px-6 rounded-lg hover:bg-[#5fcf68] transition-colors font-medium text-lg"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {/* Processing Step */}
          {(currentStep === 'processing' || isCancelling) && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className={`animate-spin rounded-full h-16 w-16 border-b-4 ${isCancelling ? 'border-red-600' : 'border-blue-600'}`}></div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {isCancelling ? 'Cancelling Payment' : 'Preparing Your Payment'}
                </h4>
                <p className="text-gray-600">
                  {isCancelling 
                    ? 'Please wait while we cancel your payment request and send confirmation...' 
                    : 'Please wait while we set up your secure payment session...'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Payment Step */}
          {currentStep === 'payment' && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Complete Your Payment
                </h4>
              </div>

              {/* Integrated SumUp Payment Form */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
                <div className="text-center mb-6">
                  <CreditCard className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h5 className="text-lg font-medium text-green-700 mb-2">
                    SumUp Secure Payment
                  </h5>
                  <p className="text-gray-700 mb-2">
                    {formatCurrency(paymentRequest.amount, paymentRequest.currency)}
                  </p>
                  <p className="text-sm text-green-600">
                    {isDevelopmentMode ? 'Sandbox mode (no real charges)' : 'Production mode — redirecting to SumUp checkout'}
                  </p>
                </div>

                {isDevelopmentMode ? (
                  <SumUpPaymentForm 
                    amount={paymentRequest.amount}
                    currency={paymentRequest.currency || 'EUR'}
                    description={`Payment for ${paymentRequest.service_name || 'Service'}`}
                    onPaymentComplete={handlePaymentComplete}
                    onPaymentError={(error) => {
                      setCurrentStep('error');
                      setErrorMessage(error);
                      handlePaymentFailure(error);
                    }}
                  />
                ) : (
                  <div className="space-y-4 text-sm text-gray-600">
                    <p>
                      We have opened a secure SumUp checkout in a new browser tab. Please complete your payment there to finish this request.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                      <p className="text-blue-800 font-medium mb-1">Don&apos;t see the checkout window?</p>
                      <button
                        type="button"
                        className="text-blue-700 hover:text-blue-900 font-semibold underline"
                        onClick={() => checkoutUrl && window.open(checkoutUrl, '_blank', 'noopener')}
                      >
                        Open SumUp checkout
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {checkoutUrl && (
                <div className="text-xs text-gray-500 text-center">
                  <p>Checkout URL (for reference): <br />
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                    {checkoutUrl}
                  </code></p>
                </div>
              )}
            </div>
          )}

          {currentStep === 'modal' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Opening SumUp Checkout
                </h4>
                <p className="text-gray-600">
                  SumUp's secure payment window is loading. Complete your payment in the modal that opens.
                </p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {currentStep === 'success' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-green-700 mb-2">
                  Payment Successful!
                </h4>
                <p className="text-gray-600">
                  Your payment of {formatCurrency(paymentRequest.amount, paymentRequest.currency)} has been processed successfully.
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
                A confirmation email will be sent to {paymentRequest.customer.email}
              </div>
            </div>
          )}

          {/* Error Step */}
          {currentStep === 'error' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-red-700 mb-2">
                  Payment Failed
                </h4>
                <p className="text-gray-600">
                  {errorMessage || 'Something went wrong with your payment. Please try again.'}
                </p>
              </div>
              <button
                onClick={() => setCurrentStep('confirm')}
                className="w-full bg-[#71db77] text-white py-2 px-4 rounded-lg hover:bg-[#5fcf68] transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Secure Payment • PCI Compliant</span>
          </div>
          {currentStep !== 'processing' && currentStep !== 'success' && (
            <button
              onClick={handleModalClose}
              disabled={isCancelling}
              className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
        </div>
      </div>

      {/* SumUp Modal */}
      {showSumUpModal && checkoutUrl && (
        <SumUpModal
          isOpen={showSumUpModal}
          onClose={handleSumUpModalClose}
          checkoutUrl={checkoutUrl}
          paymentAmount={paymentRequest.amount}
          currency={paymentRequest.currency || 'EUR'}
          onSuccess={handleSumUpSuccess}
          onFailure={handleSumUpFailure}
          onCancel={handleSumUpCancel}
        />
      )}
    </div>
  );
};

export default PaymentModal;
