import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

const SumUpCheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Extract checkout parameters from URL
  const amount = searchParams.get('amount') || '0';
  const currency = searchParams.get('currency') || 'EUR';
  const description = searchParams.get('description') || 'Payment';
  const checkoutReference = searchParams.get('checkout_reference') || '';
  const merchantCode = searchParams.get('merchant_code') || '';
  const returnUrl = searchParams.get('return_url') || '';
  const cancelUrl = searchParams.get('cancel_url') || '';
  const checkoutId = searchParams.get('checkout_id') || '';
  const paymentRequestId = searchParams.get('payment_request_id') || ''; // Extract payment request ID

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);

  // Format amount for display
  const formatAmount = (amountCents: string) => {
    const euros = parseInt(amountCents) / 100;
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency
    }).format(euros);
  };

  // Format card number with spaces
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

  const processPayment = async (success: boolean) => {
    setProcessing(true);
    
    try {
      if (success && checkoutReference) {
        console.log('Processing payment for checkout:', checkoutReference);
        console.log('Payment details:', {
          amount: amount || '10.00',
          currency: currency || 'EUR',
          card: cardNumber.substring(0, 4) + '****',
          paymentRequestId: paymentRequestId || 'none'
        });

        // Simulate successful payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        const transactionId = `txn_sumup_${Date.now()}`;
        
        // If this is for a payment request, process the payment and send confirmation
        if (paymentRequestId) {
          try {
            console.log('🔄 Processing payment request:', paymentRequestId);
            
            // Import payment processing utilities
            const { processPaymentRequest } = await import('../utils/paymentRequestUtils');
            
            // Process the payment request
            const paymentResult = await processPaymentRequest(
              parseInt(paymentRequestId),
              {
                payment_request_id: parseInt(paymentRequestId),
                sumup_checkout_id: checkoutId || checkoutReference,
                sumup_transaction_id: transactionId,
                payment_method: 'sumup',
                sumup_payment_type: 'card'
              }
            );
            
            if (paymentResult.success) {
              console.log('✅ Payment request processed successfully');
              console.log('📧 Payment confirmation email will be sent automatically');
            } else {
              console.error('❌ Payment request processing failed:', paymentResult.error);
            }
          } catch (paymentError) {
            console.error('❌ Error processing payment request:', paymentError);
            // Continue with redirect even if payment processing fails
          }
        }

        // Redirect to success page
        const successUrl = returnUrl || '/payment-success';
        
        if (returnUrl) {
          const successParams = new URLSearchParams({
            transaction_id: transactionId,
            checkout_reference: checkoutReference,
            amount: amount,
            currency: currency,
            status: 'completed'
          });
          
          if (paymentRequestId) {
            successParams.append('payment_request_id', paymentRequestId);
          }
          
          window.location.href = `${successUrl}?${successParams.toString()}`;
        } else {
          navigate('/payment-success', {
            state: {
              transaction_id: transactionId,
              checkout_reference: checkoutReference,
              amount: amount,
              currency: currency,
              payment_request_id: paymentRequestId
            }
          });
        }
      } else {
        // User cancelled or simulation failure
        const failureUrl = cancelUrl || '/payment-cancelled';
        
        if (cancelUrl) {
          const cancelParams = new URLSearchParams({
            checkout_reference: checkoutReference,
            reason: 'user_cancelled'
          });
          
          window.location.href = `${failureUrl}?${cancelParams.toString()}`;
        } else {
          navigate('/payment-cancelled', {
            state: {
              checkout_reference: checkoutReference,
              reason: 'user_cancelled'
            }
          });
        }
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      
      // In case of error, redirect to failure page
      const failureUrl = cancelUrl || '/payment-cancelled';
      
      if (cancelUrl) {
        const cancelParams = new URLSearchParams({
          checkout_reference: checkoutReference,
          reason: 'processing_error'
        });
        
        window.location.href = `${failureUrl}?${cancelParams.toString()}`;
      } else {
        navigate('/payment-cancelled', {
          state: {
            checkout_reference: checkoutReference,
            reason: 'processing_error'
          }
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  // Auto-focus first input on mount
  useEffect(() => {
    const cardInput = document.getElementById('cardNumber') as HTMLInputElement;
    if (cardInput) {
      cardInput.focus();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* SumUp Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-blue-700 mb-1">SumUp</h2>
            <p className="text-gray-600 text-sm">Secure Payment</p>
          </div>

          {/* Test Mode Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <p className="text-yellow-800 text-sm">
              <strong>TEST MODE:</strong> This is a sandbox payment. No real money will be charged.
            </p>
          </div>

          {/* Payment Details */}
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-blue-700 mb-2">
              {formatAmount(amount)}
            </div>
            <div className="text-gray-600 mb-2">{description}</div>
            <div className="text-sm text-gray-500">Merchant: {merchantCode}</div>
          </div>

          {/* Payment Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="cardNumber"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
                <CreditCard className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="flex space-x-4">
              <div className="flex-1">
                <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry
                </label>
                <input
                  type="text"
                  id="expiry"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 mb-1">
                  CVC
                </label>
                <input
                  type="text"
                  id="cvc"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, '').substring(0, 4))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                id="cardName"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
              />
            </div>

            {/* Payment Buttons */}
            <div className="space-y-3 mt-6">
              <button
                onClick={() => processPayment(true)}
                disabled={processing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  `Pay ${formatAmount(amount)}`
                )}
              </button>
              
              <button
                onClick={() => processPayment(false)}
                disabled={processing}
                className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Cancel Payment
              </button>
            </div>
          </div>

          {/* Test Card Info */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Test cards: 4000000000000002 (Success), 4000000000000069 (Decline)
            </p>
          </div>

          {/* Security Notice */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              🔒 Your payment information is secure and encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SumUpCheckoutPage;
