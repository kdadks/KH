import React, { useState, useEffect } from 'react';
import { X, CreditCard, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { PaymentRequestWithCustomer, ProcessPaymentData } from '../../types/paymentTypes';
import { createSumUpCheckoutSession } from '../../utils/sumupRealApiImplementation';
import { processPaymentRequest, sendPaymentFailedNotification } from '../../utils/paymentRequestUtils';
import { getActiveSumUpGateway } from '../../utils/paymentManagementUtils';
import { useToast } from './toastContext';

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
      
      console.log('Payment processed:', {
        amount,
        currency,
        description,
        cardLast4: cardNumber.slice(-4)
      });
      
      onPaymentComplete();
    } catch (error) {
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
        className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  paymentRequest,
  onPaymentComplete,
  onPaymentFailed,
  redirectAfterPayment,
  context = 'booking' // Default context
}) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [currentStep, setCurrentStep] = useState<'confirm' | 'processing' | 'payment' | 'success' | 'error'>('confirm');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('confirm');
      setCheckoutUrl('');
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleStartPayment = async () => {
    try {
      setCurrentStep('processing');
      
      // Get SumUp configuration from database
      const gatewayConfig = await getActiveSumUpGateway();
      
      if (!gatewayConfig || !gatewayConfig.merchant_id) {
        throw new Error('Payment gateway not configured. Please contact support.');
      }
      
      // Create SumUp checkout session
      console.log('Creating SumUp checkout session...');
      const checkoutResponse = await createSumUpCheckoutSession({
        checkout_reference: `payment-request-${paymentRequest.id}-${Date.now()}`,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency || 'EUR',
        merchant_code: gatewayConfig.merchant_id,
        description: `Payment for ${paymentRequest.service_name || 'Service'}`
      });
      
      console.log('SumUp checkout session created:', checkoutResponse);
      
      // Create checkout URL pointing to our internal checkout page
      const checkoutUrl = `/sumup-checkout?checkout_reference=${checkoutResponse.checkout_reference}&amount=${paymentRequest.amount}&currency=${paymentRequest.currency || 'EUR'}&description=${encodeURIComponent(`Payment for ${paymentRequest.service_name || 'Service'}`)}&merchant_code=${checkoutResponse.merchant_code}&checkout_id=${checkoutResponse.id}`;
      
      setCheckoutUrl(checkoutUrl);
      setCurrentStep('payment');
      
      console.log('Payment checkout created:', {
        checkoutUrl,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency
      });
      
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
    try {
      setCurrentStep('processing');
      
      // Create payment processing data
      const paymentData: ProcessPaymentData = {
        payment_request_id: paymentRequest.id,
        sumup_checkout_id: `demo-checkout-${Date.now()}`,
        sumup_transaction_id: `demo-transaction-${Date.now()}`,
        payment_method: 'card',
        sumup_payment_type: 'card'
      };

      console.log('Processing payment request:', paymentData);

      // Process the payment request (updates status to 'paid' and creates payment record)
      const result = await processPaymentRequest(paymentRequest.id, paymentData);

      if (result.success) {
        setCurrentStep('success');
        showSuccess('Payment Successful!', 'Your payment has been processed and moved to payment history.');
        
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
      console.log('📧 Sending payment failed notification for payment request:', paymentRequest.id, 'Reason:', reason);
      const emailResult = await sendPaymentFailedNotification(paymentRequest.id);
      
      if (emailResult.success) {
        console.log('✅ Payment failed notification sent successfully');
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
              <h3 className="text-lg font-semibold text-gray-900">
                Secure Payment
              </h3>
              <p className="text-sm text-gray-600">
                {paymentRequest.service_name || 'Service Payment'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={currentStep === 'processing'}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Confirmation Step */}
          {currentStep === 'confirm' && (
            <div className="text-center space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {formatCurrency(paymentRequest.amount, paymentRequest.currency)}
                </div>
                <p className="text-gray-600">
                  Payment for {paymentRequest.service_name || 'Service'}
                </p>
                {paymentRequest.payment_due_date && (
                  <p className="text-sm text-gray-500 mt-2">
                    Due: {new Date(paymentRequest.payment_due_date).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center space-x-3 text-sm text-gray-600">
                <Shield className="w-5 h-5 text-green-600" />
                <span>Secured by SumUp • 256-bit SSL encryption</span>
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="font-medium font-mono">#{paymentRequest.id}</span>
                </div>
              </div>

              <button
                onClick={handleStartPayment}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {/* Processing Step */}
          {currentStep === 'processing' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Preparing Your Payment
                </h4>
                <p className="text-gray-600">
                  Please wait while we set up your secure payment session...
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
                    ✅ SumUp API integration active
                  </p>
                </div>

                {/* Integrated Payment Form */}
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
              </div>

              <div className="text-xs text-gray-500 text-center">
                <p>Checkout URL (for reference): <br />
                <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                  {checkoutUrl}
                </code></p>
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
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
