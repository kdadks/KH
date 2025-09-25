import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowLeft, Home } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSumUpCheckoutStatus } from '../utils/sumupRealApiImplementation';
import { getPaymentRequestById, processPaymentRequest } from '../utils/paymentRequestUtils';

type VerificationStatus = 'pending' | 'confirmed' | 'already-paid' | 'waiting' | 'error';

const VERIFICATION_STYLES: Record<VerificationStatus, { bg: string; border: string; text: string; heading: string }> = {
  pending: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-600',
    heading: 'Payment Status'
  },
  confirmed: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    heading: 'Payment Verified'
  },
  'already-paid': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    heading: 'Already Processed'
  },
  waiting: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    heading: 'Awaiting Confirmation'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    heading: 'Verification Issue'
  }
};

const DEFAULT_VERIFICATION_MESSAGES: Record<VerificationStatus, string> = {
  pending: '',
  confirmed: 'Payment verified successfully.',
  'already-paid': 'This payment was already confirmed earlier.',
  waiting: 'Awaiting confirmation from SumUp. Payments usually finalise within a few minutes.',
  error: 'We were unable to verify this payment automatically. Please contact support if you have a receipt.'
};

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const transactionIdParam = searchParams.get('transaction_id');
  const checkoutReference = searchParams.get('checkout_reference');
  const amountParam = searchParams.get('amount');
  const currencyParam = searchParams.get('currency') || 'EUR';
  const paymentRequestIdParam = searchParams.get('payment_request_id');
  const checkoutIdParam = searchParams.get('checkout_id');
  const statusParam = searchParams.get('status');

  const [resolvedTransactionId, setResolvedTransactionId] = useState<string | null>(transactionIdParam);
  const [resolvedAmount, setResolvedAmount] = useState<string | null>(amountParam);
  const [resolvedCurrency, setResolvedCurrency] = useState<string>(currencyParam);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending');
  const [verificationMessage, setVerificationMessage] = useState<string>(DEFAULT_VERIFICATION_MESSAGES.pending);
  const [verifying, setVerifying] = useState<boolean>(false);

  const applyVerificationState = (status: VerificationStatus, message?: string) => {
    setVerificationStatus(status);
    setVerificationMessage(message ?? DEFAULT_VERIFICATION_MESSAGES[status]);
  };

  const verificationStyle = VERIFICATION_STYLES[verificationStatus];

  useEffect(() => {
    console.log('Payment success page loaded with params:', {
      transactionIdParam,
      checkoutReference,
      amountParam,
      currencyParam,
      paymentRequestIdParam,
      checkoutIdParam,
      statusParam
    });

    const verifyPayment = async () => {
      if (!paymentRequestIdParam || !checkoutReference) {
        applyVerificationState('waiting', 'Missing payment reference. If you have been charged, please contact support.');
        return;
      }

      setVerifying(true);

      try {
        const existingRequest = await getPaymentRequestById(Number(paymentRequestIdParam));
        if (existingRequest?.status === 'paid') {
          applyVerificationState('already-paid');
          if (existingRequest.updated_at) {
            setResolvedTransactionId(existingRequest.notes || transactionIdParam);
          }
          setResolvedAmount(amountParam);
          setResolvedCurrency(currencyParam);
          return;
        }

        let checkoutId = checkoutIdParam || undefined;
        try {
          const storedMetadataRaw = localStorage.getItem(`sumupCheckout:${checkoutReference}`);
          if (!checkoutId && storedMetadataRaw) {
            const storedMetadata = JSON.parse(storedMetadataRaw);
            checkoutId = storedMetadata?.checkoutId;
          }
        } catch (storageError) {
          console.warn('Unable to read stored SumUp checkout metadata:', storageError);
        }

        if (!checkoutId) {
          applyVerificationState('waiting', 'Payment initiated. Waiting for SumUp confirmation...');
          return;
        }

        const checkoutStatus = await getSumUpCheckoutStatus(checkoutId);

        const normalizedStatus = checkoutStatus.status?.toUpperCase?.() ?? 'PENDING';
        const firstTransaction = checkoutStatus.transactions?.[0];

        if (normalizedStatus === 'PAID') {
          const transactionCode = firstTransaction?.transaction_code || firstTransaction?.id || transactionIdParam || `sumup-${Date.now()}`;

          await processPaymentRequest(Number(paymentRequestIdParam), {
            payment_request_id: Number(paymentRequestIdParam),
            sumup_checkout_id: checkoutId,
            sumup_transaction_id: transactionCode,
            payment_method: 'sumup',
            sumup_payment_type: firstTransaction?.payment_type?.toLowerCase?.() || 'card'
          });

          setResolvedTransactionId(transactionCode);
          const resolvedAmountValue = firstTransaction?.amount?.toString() || checkoutStatus.amount?.toString() || amountParam;
          setResolvedAmount(resolvedAmountValue ?? null);
          setResolvedCurrency(firstTransaction?.currency || checkoutStatus.currency || currencyParam);

          applyVerificationState('confirmed', 'Your payment has been verified successfully.');

          try {
            localStorage.removeItem(`sumupCheckout:${checkoutReference}`);
          } catch (storageError) {
            console.warn('Unable to remove stored SumUp metadata:', storageError);
          }
          return;
        }

        if (normalizedStatus === 'PENDING') {
          applyVerificationState('waiting', 'Your payment is still processing. Please refresh this page in a moment.');
          return;
        }

        applyVerificationState('error', `SumUp reported status: ${normalizedStatus}. Please contact support if you have questions.`);
      } catch (error) {
        console.error('Error verifying SumUp payment:', error);
        applyVerificationState('error', error instanceof Error ? error.message : undefined);
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [paymentRequestIdParam, checkoutReference, checkoutIdParam, transactionIdParam, amountParam, currencyParam, statusParam]);

  const formatAmount = (amountStr: string | null, currencyCode: string) => {
    if (!amountStr) {
      return new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: currencyCode
      }).format(0);
    }

    const numericValue = Number(amountStr);
    const isCents = Number.isFinite(numericValue) && !amountStr.includes('.') && numericValue >= 1000;
    const normalizedAmount = Number.isFinite(numericValue) ? (isCents ? numericValue / 100 : numericValue) : 0;

    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currencyCode
    }).format(normalizedAmount);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-600 mb-8">
            Your payment has been processed successfully.
          </p>

          <div className={`${verificationStyle.bg} ${verificationStyle.border} rounded-lg p-4 mb-8`}>
            <h4 className={`font-medium ${verificationStyle.text} mb-1`}>{verificationStyle.heading}</h4>
            <p className={`${verificationStyle.text} text-sm`}>
              {verifying ? 'Verifying payment with SumUp...' : verificationMessage}
            </p>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
            <div className="space-y-3 text-sm">
              {resolvedAmount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-gray-900">{formatAmount(resolvedAmount, resolvedCurrency)}</span>
                </div>
              )}
              {resolvedTransactionId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-xs text-gray-900">{resolvedTransactionId}</span>
                </div>
              )}
              {checkoutReference && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-mono text-xs text-gray-900">{checkoutReference}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`${verificationStyle.text} font-medium`}>
                  {verificationStatus === 'confirmed' || verificationStatus === 'already-paid'
                    ? 'Completed'
                    : verificationStatus === 'error'
                    ? 'Action required'
                    : 'Pending confirmation'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="text-gray-900">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• A confirmation email will be sent to you shortly</li>
              <li>• Your booking will be reviewed and confirmed by our team</li>
              <li>• You can view your payment history in your account</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/my-account"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to My Account
            </Link>
            <Link
              to="/"
              className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>

          {/* Test Mode Notice */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Development Mode:</strong> This is a test payment. No actual money was charged.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
