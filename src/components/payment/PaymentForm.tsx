import React, { useState } from 'react';
import { CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { 
  createPaymentIntent, 
  processSumUpPayment, 
  formatCurrency,
  validatePaymentAmount,
  generateCheckoutReference,
  PaymentIntent,
  SumUpPaymentResponse
} from '../../utils/paymentUtils';

interface PaymentFormProps {
  amount: number;
  currency?: string;
  description: string;
  bookingId?: string;
  customerId?: string;
  onPaymentSuccess: (response: SumUpPaymentResponse) => void;
  onPaymentFailure: (error: string) => void;
  disabled?: boolean;
}

interface CardDetails {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'EUR',
  description,
  bookingId,
  customerId,
  onPaymentSuccess,
  onPaymentFailure,
  disabled = false
}) => {
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Partial<CardDetails>>({});
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  // Validate card details
  const validateCardDetails = (): boolean => {
    const newErrors: Partial<CardDetails> = {};

    // Card number validation (basic Luhn algorithm would be better)
    if (!cardDetails.number || cardDetails.number.replace(/\s/g, '').length < 13) {
      newErrors.number = 'Please enter a valid card number';
    }

    // Expiry validation
    if (!cardDetails.expiry || !/^\d{2}\/\d{2}$/.test(cardDetails.expiry)) {
      newErrors.expiry = 'Please enter expiry as MM/YY';
    }

    // CVC validation
    if (!cardDetails.cvc || cardDetails.cvc.length < 3) {
      newErrors.cvc = 'Please enter a valid CVC';
    }

    // Name validation
    if (!cardDetails.name.trim()) {
      newErrors.name = 'Please enter the cardholder name';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Format card number with spaces
  const formatCardNumber = (value: string): string => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Format expiry date
  const formatExpiry = (value: string): string => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  // Handle input changes
  const handleInputChange = (field: keyof CardDetails, value: string) => {
    let formattedValue = value;
    
    if (field === 'number') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'expiry') {
      formattedValue = formatExpiry(value);
    } else if (field === 'cvc') {
      formattedValue = value.replace(/[^0-9]/g, '').substring(0, 4);
    }

    setCardDetails(prev => ({
      ...prev,
      [field]: formattedValue
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Handle payment submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled || processing) return;

    // Validate amount
    if (!validatePaymentAmount(amount * 100)) {
      onPaymentFailure('Invalid payment amount');
      return;
    }

    // Validate card details
    if (!validateCardDetails()) {
      return;
    }

    setProcessing(true);
    setPaymentStatus('processing');

    try {
      // Create payment intent
      const checkoutReference = generateCheckoutReference(bookingId);
      const paymentIntent: PaymentIntent = await createPaymentIntent(
        amount,
        currency,
        description,
        checkoutReference,
        customerId
      );

      // Process payment
      const response = await processSumUpPayment(paymentIntent);

      if (response.success) {
        setPaymentStatus('success');
        onPaymentSuccess(response);
      } else {
        setPaymentStatus('error');
        onPaymentFailure(response.error || 'Payment failed');
      }
    } catch (error) {
      setPaymentStatus('error');
      onPaymentFailure(error instanceof Error ? error.message : 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const isFormValid = cardDetails.number && cardDetails.expiry && cardDetails.cvc && cardDetails.name;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <CreditCard className="w-6 h-6 text-primary-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
        <Lock className="w-4 h-4 text-gray-400 ml-auto" />
      </div>

      {/* Payment amount display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Amount:</span>
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(amount * 100, currency)}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      {/* Payment status indicators */}
      {paymentStatus === 'success' && (
        <div className="flex items-center bg-green-50 text-green-800 p-4 rounded-lg mb-4">
          <CheckCircle className="w-5 h-5 mr-2" />
          <span>Payment completed successfully!</span>
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="flex items-center bg-red-50 text-red-800 p-4 rounded-lg mb-4">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Payment failed. Please try again.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card Number */}
        <div>
          <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Card Number
          </label>
          <input
            type="text"
            id="cardNumber"
            placeholder="1234 5678 9012 3456"
            value={cardDetails.number}
            onChange={(e) => handleInputChange('number', e.target.value)}
            disabled={disabled || processing}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              errors.number ? 'border-red-500' : 'border-gray-300'
            }`}
            maxLength={19}
          />
          {errors.number && <p className="text-red-500 text-sm mt-1">{errors.number}</p>}
        </div>

        {/* Expiry and CVC */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="text"
              id="expiry"
              placeholder="MM/YY"
              value={cardDetails.expiry}
              onChange={(e) => handleInputChange('expiry', e.target.value)}
              disabled={disabled || processing}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.expiry ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={5}
            />
            {errors.expiry && <p className="text-red-500 text-sm mt-1">{errors.expiry}</p>}
          </div>

          <div>
            <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 mb-1">
              CVC
            </label>
            <input
              type="text"
              id="cvc"
              placeholder="123"
              value={cardDetails.cvc}
              onChange={(e) => handleInputChange('cvc', e.target.value)}
              disabled={disabled || processing}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.cvc ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={4}
            />
            {errors.cvc && <p className="text-red-500 text-sm mt-1">{errors.cvc}</p>}
          </div>
        </div>

        {/* Cardholder Name */}
        <div>
          <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 mb-1">
            Cardholder Name
          </label>
          <input
            type="text"
            id="cardName"
            placeholder="John Doe"
            value={cardDetails.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={disabled || processing}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={disabled || processing || !isFormValid || paymentStatus === 'success'}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            disabled || processing || !isFormValid || paymentStatus === 'success'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500'
          }`}
        >
          {processing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </div>
          ) : paymentStatus === 'success' ? (
            'Payment Completed'
          ) : (
            `Pay ${formatCurrency(amount * 100, currency)}`
          )}
        </button>
      </form>

      {/* Security notice */}
      <div className="flex items-center justify-center mt-4 text-xs text-gray-500">
        <Lock className="w-3 h-3 mr-1" />
        <span>Your payment information is secure and encrypted</span>
      </div>
    </div>
  );
};

export default PaymentForm;
