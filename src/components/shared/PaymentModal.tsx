import React, { useState, useEffect } from 'react';
import { X, CreditCard, Shield, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { PaymentRequestWithCustomer, ProcessPaymentData } from '../../types/paymentTypes';
import { createSumUpCheckoutUrl } from '../../utils/paymentUtils';
import { processPaymentRequest, sendPaymentFailedNotification } from '../../utils/paymentRequestUtils';
import { useToast } from './toastContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentRequest: PaymentRequestWithCustomer;
  onPaymentComplete?: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  paymentRequest,
  onPaymentComplete
}) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [currentStep, setCurrentStep] = useState<'confirm' | 'processing' | 'payment' | 'success' | 'error'>('confirm');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentTimer, setPaymentTimer] = useState<number>(0);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('confirm');
      setCheckoutUrl('');
      setErrorMessage('');
      setPaymentTimer(0);
    }
  }, [isOpen]);

  // Simulate payment status checking (in production, this would be real webhook/polling)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (currentStep === 'payment' && paymentTimer < 300) { // 5 minutes max
      interval = setInterval(() => {
        setPaymentTimer(prev => {
          const newTimer = prev + 1;
          
          // Simulate payment completion after 10-30 seconds (for demo)
          if (newTimer >= 10 && newTimer <= 30 && Math.random() > 0.7) {
            setCurrentStep('success');
            return newTimer;
          }
          
          // Timeout after 5 minutes
          if (newTimer >= 300) {
            setCurrentStep('error');
            setErrorMessage('Payment session timed out. Please try again.');
            // Send payment failed notification
            handlePaymentFailure('Payment session timed out');
            return newTimer;
          }
          
          return newTimer;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentStep, paymentTimer]);

  const handleStartPayment = async () => {
    try {
      setCurrentStep('processing');
      
      // Create SumUp checkout URL
      const url = await createSumUpCheckoutUrl(
        paymentRequest.amount,
        paymentRequest.currency || 'EUR',
        `Payment for ${paymentRequest.service_name || 'Service'}`,
        `payment-request-${paymentRequest.id}`,
        paymentRequest.customer.email
      );
      
      setCheckoutUrl(url);
      setCurrentStep('payment');
      
      // Show different messages for demo vs production
      if (import.meta.env.DEV) {
        showInfo('Demo Payment Started', 'This is a demo payment using mock SumUp integration.');
      } else {
        showInfo('Payment Started', 'Complete your payment in the embedded checkout below.');
      }
      
    } catch (error) {
      console.error('Failed to create payment checkout:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
      setErrorMessage(errorMessage);
      setCurrentStep('error');
      
      // Send payment failed notification
      handlePaymentFailure(`Payment initialization failed: ${errorMessage}`);
      
      // Provide more helpful error message in development
      if (import.meta.env.DEV) {
        showError('Payment Configuration Error', `Development error: ${errorMessage}. Check your .env file or SumUp configuration.`);
      } else {
        showError('Payment Error', 'Failed to initialize payment. Please try again.');
      }
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
        
        // Call the completion callback after a short delay
        setTimeout(() => {
          onPaymentComplete?.();
          onClose();
        }, 2000);
      } else {
        setCurrentStep('error');
        setErrorMessage(result.error || 'Failed to process payment');
        showError('Payment Processing Error', result.error || 'Failed to process payment');
        // Send payment failed notification
        handlePaymentFailure(result.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Error completing payment:', error);
      setCurrentStep('error');
      setErrorMessage('Failed to complete payment processing');
      showError('Payment Error', 'Failed to complete payment processing');
      // Send payment failed notification
      handlePaymentFailure('Failed to complete payment processing');
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Payment session: {formatTime(paymentTimer)}</span>
                </div>
              </div>

              {/* Embedded Payment Frame Simulation */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-lg p-8 text-center min-h-[300px] flex flex-col justify-center">
                <div className="mb-4">
                  <CreditCard className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                  <h5 className="text-lg font-medium text-gray-700 mb-2">
                    SumUp Secure Checkout
                  </h5>
                  <p className="text-gray-600 mb-4">
                    {formatCurrency(paymentRequest.amount, paymentRequest.currency)}
                  </p>
                </div>

                {/* Simulated Payment Form */}
                <div className="bg-white rounded-lg p-6 shadow-sm text-left max-w-md mx-auto">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Card Number</label>
                      <div className="bg-gray-100 rounded p-2 text-sm text-gray-500">
                        **** **** **** 1234 (Demo)
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm text-gray-600 mb-1">Expiry</label>
                        <div className="bg-gray-100 rounded p-2 text-sm text-gray-500">
                          MM/YY
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm text-gray-600 mb-1">CVV</label>
                        <div className="bg-gray-100 rounded p-2 text-sm text-gray-500">
                          ***
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handlePaymentComplete}
                    className="w-full mt-6 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors font-medium"
                  >
                    Complete Payment (Demo)
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Demo Mode: Click "Complete Payment" to simulate successful payment
                </p>
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
