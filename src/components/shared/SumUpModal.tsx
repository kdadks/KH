import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

interface PaymentSuccessData {
  transaction_id?: string;
  amount?: string;
  currency?: string;
  checkout_reference?: string;
}

interface PaymentErrorData {
  error?: string;
  code?: string;
  message?: string;
}

interface SumUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutUrl: string;
  paymentAmount: number;
  currency: string;
  onSuccess?: (data: PaymentSuccessData) => void;
  onFailure?: (error: PaymentErrorData) => void;
  onCancel?: () => void;
}

interface PaymentMessage {
  type: 'success' | 'failure' | 'cancel' | 'error';
  data?: PaymentSuccessData | PaymentErrorData;
}

const SumUpModal: React.FC<SumUpModalProps> = ({
  isOpen,
  onClose,
  checkoutUrl,
  paymentAmount,
  currency = 'EUR',
  onSuccess,
  onFailure,
  onCancel
}) => {
  const [modalState, setModalState] = useState<'loading' | 'iframe' | 'popup' | 'success' | 'error' | 'cancelled'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successData, setSuccessData] = useState<PaymentSuccessData | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const popupRef = useRef<Window | null>(null);
  const messageListenerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format currency amount
  const formatAmount = (amount: number, curr: string) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: curr
    }).format(amount);
  };

  // Check if URL is from SumUp domain (security check)
  const isSumUpUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('sumup.com') || urlObj.hostname.includes('checkout.sumup.com');
    } catch {
      return false;
    }
  };

  // Handle messages from iframe or popup
  const handlePaymentMessage = (event: MessageEvent) => {
    // Security: Only accept messages from SumUp domains
    if (!event.origin.includes('sumup.com')) return;

    const message: PaymentMessage = event.data;
    
    console.log('Received payment message:', message);
    
    switch (message.type) {
      case 'success':
        if (message.data) {
          setSuccessData(message.data as PaymentSuccessData);
          onSuccess?.(message.data as PaymentSuccessData);
        }
        setModalState('success');
        break;
      case 'failure': {
        const errorData = message.data as PaymentErrorData;
        setErrorMessage(errorData?.error || 'Payment failed');
        setModalState('error');
        if (errorData) {
          onFailure?.(errorData);
        }
        break;
      }
      case 'cancel':
        setModalState('cancelled');
        onCancel?.();
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  // Poll popup for URL changes (fallback method)
  const pollPopupUrl = () => {
    if (!popupRef.current || popupRef.current.closed) {
      setModalState('cancelled');
      onCancel?.();
      return;
    }

    try {
      const popupUrl = popupRef.current.location.href;
      
      // Check for success URL patterns
      if (popupUrl.includes('/payment-success') || popupUrl.includes('success=true')) {
        const urlParams = new URLSearchParams(popupUrl.split('?')[1] || '');
        const successData: PaymentSuccessData = {
          transaction_id: urlParams.get('transaction_id') || undefined,
          amount: urlParams.get('amount') || undefined,
          currency: urlParams.get('currency') || undefined,
          checkout_reference: urlParams.get('checkout_reference') || undefined
        };
        
        setSuccessData(successData);
        setModalState('success');
        popupRef.current.close();
        onSuccess?.(successData);
        return;
      }
      
      // Check for cancel/failure URL patterns
      if (popupUrl.includes('/payment-cancelled') || popupUrl.includes('cancelled=true')) {
        setModalState('cancelled');
        popupRef.current.close();
        onCancel?.();
        return;
      }
      
      if (popupUrl.includes('/payment-failed') || popupUrl.includes('error=true')) {
        const urlParams = new URLSearchParams(popupUrl.split('?')[1] || '');
        const error = urlParams.get('error') || 'Payment failed';
        
        setErrorMessage(error);
        setModalState('error');
        popupRef.current.close();
        onFailure?.({ error });
        return;
      }
      
    } catch {
      // Cross-origin error - popup is still on SumUp domain
      // Continue polling
    }
  };

  // Initialize payment modal
  useEffect(() => {
    if (!isOpen) return;

    setModalState('loading');
    setErrorMessage('');
    setSuccessData(null);

    // Security check
    if (!isSumUpUrl(checkoutUrl)) {
      setErrorMessage('Invalid checkout URL');
      setModalState('error');
      return;
    }

    // Set up message listener
    const messageListener = handlePaymentMessage;
    messageListenerRef.current = messageListener;
    window.addEventListener('message', messageListener);

    // Try iframe first, fallback to popup
    const initTimer = setTimeout(() => {
      // Check if iframe loaded successfully
      const iframe = iframeRef.current;
      if (iframe) {
        try {
          // Try to access iframe content (will fail for cross-origin)
          iframe.contentWindow?.document;
          setModalState('iframe');
        } catch {
          // Cross-origin restriction, iframe is working
          setModalState('iframe');
        }
      } else {
        // Fallback to popup
        const popup = window.open(
          checkoutUrl,
          'sumup-checkout',
          'width=600,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
        );

        if (popup) {
          popupRef.current = popup;
          setModalState('popup');
          
          // Start polling popup URL
          const pollInterval = setInterval(() => {
            if (!popup || popup.closed) {
              clearInterval(pollInterval);
              if (modalState === 'popup') {
                setModalState('cancelled');
                onCancel?.();
              }
            }
          }, 1000);
          
          pollIntervalRef.current = pollInterval;
        } else {
          setErrorMessage('Popup blocked. Please allow popups for this site and try again.');
          setModalState('error');
        }
      }
    }, 2000);

    return () => {
      clearTimeout(initTimer);
      if (messageListenerRef.current) {
        window.removeEventListener('message', messageListenerRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, checkoutUrl]);

  const openPopup = () => {
    const popup = window.open(
      checkoutUrl,
      'sumup-checkout',
      'width=600,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
    );

    if (popup) {
      popupRef.current = popup;
      setModalState('popup');
      
      // Start polling popup URL
      pollIntervalRef.current = setInterval(pollPopupUrl, 1000);
      
      // Check if popup was closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (modalState === 'popup') {
            setModalState('cancelled');
            onCancel?.();
          }
        }
      }, 500);
    } else {
      setErrorMessage('Popup blocked. Please allow popups for this site and try again.');
      setModalState('error');
    }
  };

  const closeModal = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={closeModal}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  SumUp Secure Payment
                </h3>
                <span className="ml-2 text-sm text-gray-500">
                  {formatAmount(paymentAmount, currency)}
                </span>
              </div>
              <button
                onClick={closeModal}
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6" style={{ height: '600px' }}>
            {modalState === 'loading' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading secure payment...</p>
                </div>
              </div>
            )}

            {modalState === 'iframe' && (
              <iframe
                ref={iframeRef}
                src={checkoutUrl}
                className="w-full h-full border-0 rounded"
                title="SumUp Checkout"
                sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation"
              />
            )}

            {modalState === 'popup' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ExternalLink className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Payment window opened in a new tab.
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Complete your payment in the popup window and return here.
                  </p>
                  <button
                    onClick={openPopup}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Reopen Payment Window
                  </button>
                </div>
              </div>
            )}

            {modalState === 'success' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-green-700 mb-2">Payment Successful!</h4>
                  <p className="text-gray-600 mb-4">
                    Your payment of {formatAmount(paymentAmount, currency)} has been processed successfully.
                  </p>
                  {successData?.transaction_id && (
                    <p className="text-sm text-gray-500 mb-4">
                      Transaction ID: {successData.transaction_id}
                    </p>
                  )}
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {modalState === 'error' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-red-700 mb-2">Payment Failed</h4>
                  <p className="text-gray-600 mb-4">{errorMessage}</p>
                  <div className="space-x-2">
                    <button
                      onClick={() => {
                        setModalState('loading');
                        setErrorMessage('');
                        // Retry payment
                        setTimeout(() => setModalState('iframe'), 1000);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {modalState === 'cancelled' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <X className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-gray-700 mb-2">Payment Cancelled</h4>
                  <p className="text-gray-600 mb-4">
                    Your payment was cancelled. You can try again if needed.
                  </p>
                  <div className="space-x-2">
                    <button
                      onClick={() => {
                        setModalState('loading');
                        // Retry payment
                        setTimeout(() => setModalState('iframe'), 1000);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SumUpModal;