import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle } from 'lucide-react';
import { PaymentEnvironmentIndicator } from '../components/ui/PaymentEnvironmentIndicator';

const SumUpCheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sumupEnvironment = import.meta.env.VITE_SUMUP_ENVIRONMENT || 'sandbox';
  const isProductionMode = sumupEnvironment === 'production';
  
  // Extract checkout parameters from URL (support both new short format and legacy format)
  const amount = searchParams.get('amt') || searchParams.get('amount') || '0';
  const currency = searchParams.get('cur') || searchParams.get('currency') || 'EUR';
  const description = searchParams.get('description') || 'Payment';
  const checkoutReference = searchParams.get('ref') || searchParams.get('checkout_reference') || '';
  const merchantCode = searchParams.get('merchant_code') || '';
  const returnUrl = searchParams.get('return_url') || '';
  const cancelUrl = searchParams.get('cancel_url') || '';
  const checkoutId = searchParams.get('id') || searchParams.get('checkout_id') || '';
  const paymentRequestId = searchParams.get('pr_id') || searchParams.get('payment_request_id') || ''; // Extract payment request ID
  const context = searchParams.get('ctx') || searchParams.get('context') || 'booking'; // Extract context for proper redirect behavior
  // Note: testMode and autoSuccess can be added back when needed for additional functionality
  const environment = searchParams.get('env') || 'sandbox';

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Payment request status checking
  const [paymentRequestStatus, setPaymentRequestStatus] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  
  // Sandbox test simulation
  const [showTestSimulation, setShowTestSimulation] = useState(false);
  
  // Check if returning from SumUp and log debug info
  useEffect(() => {
    const isReturnFromSumup = searchParams.get('checkout-id') && searchParams.get('success');
    
    if (isReturnFromSumup) {
      console.log('=== POST-REDIRECT DEBUG INFO ===');
      console.log('Returned from SumUp with checkout-id:', searchParams.get('checkout-id'));
      console.log('Success:', searchParams.get('success'));
      
      // Check webhook simulation results
      const lastWebhookSuccess = localStorage.getItem('last_webhook_success');
      const lastWebhookFailure = localStorage.getItem('last_webhook_failure');
      const webhookErrors = localStorage.getItem('webhook_simulation_errors');
      
      if (lastWebhookSuccess) {
        console.log('✅ Last webhook success:', JSON.parse(lastWebhookSuccess));
      }
      if (lastWebhookFailure) {
        console.log('❌ Last webhook failure:', JSON.parse(lastWebhookFailure));
      }
      if (webhookErrors) {
        console.log('🚫 Webhook simulation errors:', JSON.parse(webhookErrors));
      }
      
      // Show alert with debug info for immediate visibility
      if (lastWebhookSuccess || lastWebhookFailure || webhookErrors) {
        const debugInfo = [];
        if (lastWebhookSuccess) debugInfo.push('✅ Webhook success recorded');
        if (lastWebhookFailure) debugInfo.push('❌ Webhook failure recorded');
        if (webhookErrors) debugInfo.push('🚫 Webhook errors recorded');
        
        console.log('Debug info available:', debugInfo.join(', '));
      } else {
        console.log('⚠️ No webhook debug info found in localStorage');
      }
    }
  }, [searchParams]);

  // Format amount for display
  const formatAmount = (amountEuros: string) => {
    const euros = parseFloat(amountEuros); // Amount is already in euros, not cents
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

  // Check payment request status on component mount to prevent double payments
  const checkPaymentRequestStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    
    try {
      // Import supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: paymentRequest, error } = await supabase
        .from('payment_requests')
        .select('id, status, service_name, amount, currency')
        .eq('id', parseInt(paymentRequestId))
        .single();

      if (error) {
        console.error('Error fetching payment request:', error);
        setStatusError('Failed to verify payment status. Please try again.');
        return;
      }

      if (paymentRequest) {
        setPaymentRequestStatus(paymentRequest.status);
      }
    } catch (error) {
      console.error('Error checking payment request status:', error);
      setStatusError('Failed to verify payment status. Please try again.');
    } finally {
      setLoadingStatus(false);
    }
  }, [paymentRequestId]);

  // Check payment request status when component mounts and paymentRequestId changes
  useEffect(() => {
    if (paymentRequestId) {
      checkPaymentRequestStatus();
    }
  }, [paymentRequestId, checkPaymentRequestStatus]);

  // Manual debug function to check webhook status
  const checkWebhookDebugInfo = () => {
    console.log('=== MANUAL WEBHOOK DEBUG CHECK ===');
    
    const lastSuccess = localStorage.getItem('last_webhook_success');
    const lastFailure = localStorage.getItem('last_webhook_failure');
    const errors = localStorage.getItem('webhook_simulation_errors');
    
    console.log('Last webhook success:', lastSuccess ? JSON.parse(lastSuccess) : 'None');
    console.log('Last webhook failure:', lastFailure ? JSON.parse(lastFailure) : 'None');
    console.log('Webhook errors:', errors ? JSON.parse(errors) : 'None');
    
    // Also check if we can access the debug info
    console.log('Current checkout reference:', checkoutReference);
    console.log('Current payment request ID:', paymentRequestId);
    
    return {
      success: lastSuccess ? JSON.parse(lastSuccess) : null,
      failure: lastFailure ? JSON.parse(lastFailure) : null,
      errors: errors ? JSON.parse(errors) : null
    };
  };
  
  // Test webhook endpoint connectivity
  const testWebhookEndpoint = async () => {
    const webhookUrl = `${window.location.origin}/.netlify/functions/sumup-return`;
    console.log('🧪 Testing webhook endpoint connectivity:', webhookUrl);
    
    try {
      const testPayload = {
        id: 'test_event_123',
        type: 'test.connection',
        timestamp: new Date().toISOString(),
        data: {
          test: true,
          checkout_reference: 'test_checkout_ref',
          amount: 10.00,
          currency: 'EUR',
          status: 'TESTING'
        }
      };
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });
      
      const responseText = await response.text();
      console.log('🧪 Test webhook response:', response.status, responseText);
      alert(`Webhook Test Result: ${response.status} - ${responseText.substring(0, 100)}`);
      
    } catch (error) {
      console.error('🧪 Webhook endpoint test failed:', error);
      alert(`Webhook Test Failed: ${error}`);
    }
  };

  // Make debug functions globally available for testing
  (window as unknown as { checkWebhookDebugInfo: () => object; testWebhookEndpoint: () => void }).checkWebhookDebugInfo = checkWebhookDebugInfo;
  (window as unknown as { testWebhookEndpoint: () => void }).testWebhookEndpoint = testWebhookEndpoint;

  const processPayment = async (success: boolean) => {
    setProcessing(true);
    
    try {
      if (success && checkoutReference) {
        // Simulate successful payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        const transactionId = `txn_sumup_${Date.now()}`;
        
        // Simulate webhook event in sandbox/UAT environment to update payments table
        // Only simulate in sandbox mode - production will receive real SumUp webhooks
        const currentEnvironment = window.location.hostname === 'khtherapy.ie' ? 'production' : 'sandbox';
        
        // IMMEDIATE DEBUG: Alert to show environment detection
        alert(`🚨 DEBUG: Environment detected as ${currentEnvironment}, hostname: ${window.location.hostname}`);
        console.log('🚨 ENVIRONMENT CHECK - Current hostname:', window.location.hostname);
        console.log('🚨 ENVIRONMENT CHECK - Detected environment:', currentEnvironment);
        
        if (currentEnvironment === 'sandbox') {
          alert(`🚨 DEBUG: Entering SANDBOX webhook simulation path!`);
          console.log('🎯 About to simulate webhook for SUCCESS scenario');
          console.log('📋 Webhook data:', {
            checkout_reference: checkoutReference,
            transaction_id: transactionId,
            amount: parseFloat(amount),
            currency: currency,
            status: success ? 'COMPLETED' : 'FAILED'
          });
          
          try {
            await simulateWebhookEvent(success ? 'checkout.completed' : 'checkout.failed', {
              checkout_reference: checkoutReference,
              transaction_id: transactionId,
              amount: parseFloat(amount),
              currency: currency,
              status: success ? 'COMPLETED' : 'FAILED'
            });
            console.log('✅ Webhook simulation completed successfully');
          } catch (webhookError) {
            console.error('❌ Webhook simulation failed:', webhookError);
            // Store error in localStorage so we can check it later
            const errorMessage = webhookError instanceof Error ? webhookError.message : String(webhookError);
            localStorage.setItem('last_webhook_error', JSON.stringify({
              error: errorMessage,
              timestamp: new Date().toISOString(),
              checkoutReference
            }));
          }
        }
        
        // If this is for a payment request, process the payment and send confirmation
        if (paymentRequestId) {
          try {
            // Import payment processing utilities
            const { processPaymentRequest } = await import('../utils/paymentRequestUtils');
            
            // Process the payment request
            const paymentResult = await processPaymentRequest(
              parseInt(paymentRequestId),
              {
                payment_request_id: parseInt(paymentRequestId),
                sumup_checkout_id: checkoutId,
                sumup_checkout_reference: checkoutReference,
                sumup_transaction_id: transactionId,
                payment_method: 'sumup',
                sumup_payment_type: 'card'
              }
            );
            
            if (!paymentResult.success) {
              console.error('❌ Payment request processing failed:', paymentResult.error);
            }
          } catch (paymentError) {
            console.error('❌ Error processing payment request:', paymentError);
            // Continue with redirect even if payment processing fails
          }
        }

        // Redirect to success page with context-aware behavior
        const getContextBasedRedirect = (context: string, baseUrl: string): string => {
          switch (context) {
            case 'email':
              return `${baseUrl}/`; // Email payments → Home page
            case 'dashboard':
              return `${baseUrl}/my-account`; // Dashboard payments → User portal
            case 'admin':
              return `${baseUrl}/admin`; // Admin payments → Admin section
            case 'booking':
            default:
              return `${baseUrl}/payment-success`; // Booking payments → Success page
          }
        };
        
        const contextRedirectUrl = getContextBasedRedirect(context, window.location.origin);
        const successUrl = returnUrl || contextRedirectUrl;
        
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
          // For email context, redirect to home with success message
          if (context === 'email') {
            window.location.href = `/?payment_success=true&amount=${amount}&currency=${currency}`;
          } else if (context === 'dashboard') {
            window.location.href = `/my-account?payment_success=true&amount=${amount}&currency=${currency}`;
          } else {
            // Default to payment success page
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
        }
      } else {
        // User cancelled or simulation failure - also simulate webhook for failure
        const transactionId = `txn_sumup_failed_${Date.now()}`;
        
        // Simulate webhook event for failure to update payments table
        // Only simulate in sandbox mode - production will receive real SumUp webhooks
        const currentEnvironment = window.location.hostname === 'khtherapy.ie' ? 'production' : 'sandbox';
        if (currentEnvironment === 'sandbox') {
          console.log('🎯 About to simulate webhook for FAILURE scenario');
          
          try {
            await simulateWebhookEvent('checkout.failed', {
              checkout_reference: checkoutReference,
              transaction_id: transactionId,
              amount: parseFloat(amount),
              currency: currency,
              status: 'FAILED'
            });
            console.log('✅ Webhook simulation completed successfully for failure');
          } catch (webhookError) {
            console.error('❌ Webhook simulation failed:', webhookError);
            const errorMessage = webhookError instanceof Error ? webhookError.message : String(webhookError);
            localStorage.setItem('last_webhook_error', JSON.stringify({
              error: errorMessage,
              timestamp: new Date().toISOString(),
              checkoutReference,
              scenario: 'failure'
            }));
          }
        }
        
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

  // Simulate webhook event to trigger payments table update
  const simulateWebhookEvent = async (eventType: string, paymentData: {
    checkout_reference: string;
    transaction_id: string;
    amount: number;
    currency: string;
    status: string;
  }) => {
    // IMMEDIATE DEBUG: Alert to verify function is being called
    alert(`🚨 DEBUG: simulateWebhookEvent called! Event: ${eventType}, Checkout: ${paymentData.checkout_reference}`);
    console.log('🚨 WEBHOOK FUNCTION ENTRY POINT - Function is being called!');
    console.log('🚨 Event Type:', eventType);
    console.log('🚨 Payment Data:', paymentData);
    
    try {
      console.log('🔗 Simulating webhook event:', { eventType, paymentData });
      
      // Create mock webhook payload matching SumUp's expected format
      const webhookPayload = {
        id: `evt_sandbox_${Date.now()}`,
        type: eventType,
        timestamp: new Date().toISOString(),
        data: {
          id: checkoutId || `checkout_${Date.now()}`,
          checkout_reference: paymentData.checkout_reference,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: paymentData.status,
          transaction_id: paymentData.transaction_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          merchant_code: 'SANDBOX_TEST'
        }
      };

      // Call the SumUp return handler (which processes webhooks and handles redirects)
      const webhookUrl = `${window.location.origin}/.netlify/functions/sumup-return`;
      
      console.log('📡 Sending simulated webhook to:', webhookUrl);
      console.log('📡 Webhook payload:', JSON.stringify(webhookPayload, null, 2));
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sumup-Webhook-Signature': 'sandbox-signature', // Mock signature for sandbox
          'User-Agent': 'SumUp-Webhook/Sandbox'
        },
        body: JSON.stringify(webhookPayload)
      });

      console.log('📡 Webhook response status:', response.status);
      console.log('📡 Webhook response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const responseText = await response.text();
        console.log('✅ Webhook simulation successful, response:', responseText);
        
        // Store success info in localStorage for debugging
        localStorage.setItem('last_webhook_success', JSON.stringify({
          status: response.status,
          response: responseText,
          timestamp: new Date().toISOString(),
          checkoutReference: paymentData.checkout_reference
        }));
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Webhook simulation failed:', response.status, response.statusText, errorText);
        
        // Store failure info in localStorage for debugging
        localStorage.setItem('last_webhook_failure', JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          timestamp: new Date().toISOString(),
          checkoutReference: paymentData.checkout_reference
        }));
      }
    } catch (error) {
      console.error('❌ Webhook simulation error:', error);
      // Don't let webhook errors break the payment flow
    }
  };

  // Simulate payment outcomes for sandbox testing
  const simulatePaymentOutcome = async (outcome: 'success' | 'failure') => {
    // IMMEDIATE DEBUG: Alert to verify this function is being called
    alert(`🚨 DEBUG: simulatePaymentOutcome called with outcome: ${outcome}`);
    console.log('🚨 SIMULATE PAYMENT OUTCOME ENTRY POINT');
    console.log(`🧪 Simulating ${outcome} payment outcome for checkout ${checkoutId}`);
    console.log('🧪 Current checkout reference:', checkoutReference);
    console.log('🧪 Current payment request ID:', paymentRequestId);
    
    // Call the existing processPayment function with the outcome
    await processPayment(outcome === 'success');
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
            <div className="flex items-center justify-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-blue-700">SumUp</h2>
              <PaymentEnvironmentIndicator />
            </div>
            <p className="text-gray-600 text-sm">Secure Payment</p>
          </div>

          {/* Test Mode Simulation (Sandbox Only) */}
          {environment === 'sandbox' && checkoutId.includes('mock') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="text-yellow-600 mr-3">🧪</div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">
                    Sandbox Test Mode - Payment Workflow Testing
                  </h3>
                  <p className="text-xs text-yellow-700 mb-4">
                    Simulate different payment scenarios to test the complete workflow including database updates and webhook processing.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    <button
                      onClick={() => simulatePaymentOutcome('success')}
                      disabled={processing}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      ✅ Simulate Success
                    </button>
                    <button
                      onClick={() => simulatePaymentOutcome('failure')}
                      disabled={processing}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      ❌ Simulate Failure
                    </button>
                    <button
                      onClick={() => setShowTestSimulation(!showTestSimulation)}
                      className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      💳 Manual Entry
                    </button>
                    <button
                      onClick={() => {
                        const info = checkWebhookDebugInfo();
                        alert(`Debug Info:\n✅ Success: ${info.success ? 'Yes' : 'No'}\n❌ Failure: ${info.failure ? 'Yes' : 'No'}\n🚫 Errors: ${info.errors ? 'Yes' : 'No'}\n\nCheck console for full details.`);
                      }}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      🐛 Check Debug
                    </button>
                    <button
                      onClick={testWebhookEndpoint}
                      className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      🔌 Test Endpoint
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading Status Check */}
          {paymentRequestId && loadingStatus && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Verifying payment status...</p>
            </div>
          )}

          {/* Status Error */}
          {statusError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{statusError}</p>
              <button
                onClick={checkPaymentRequestStatus}
                className="mt-2 text-red-600 hover:text-red-700 text-sm underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Already Paid State */}
          {paymentRequestId && !loadingStatus && paymentRequestStatus === 'paid' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-green-700 mb-2">Already Paid</h3>
              <p className="text-gray-600 mb-4">
                This payment request has already been completed.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                You have already paid {formatAmount(amount)} for this service.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate('/my-account')}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Go to My Account
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Return to Home
                </button>
              </div>
            </div>
          )}

          {/* Cancelled Payment State */}
          {paymentRequestId && !loadingStatus && paymentRequestStatus === 'cancelled' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-red-700 mb-2">Payment Request Cancelled</h3>
              <p className="text-gray-600 mb-4">
                This payment request has been cancelled and can no longer be processed.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                If you need to make a payment, please contact us to generate a new payment request.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.location.href = 'mailto:info@khtherapy.ie?subject=Payment Request - Need Assistance'}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Contact Support
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Return to Home
                </button>
              </div>
            </div>
          )}

          {/* Expired Payment State */}
          {paymentRequestId && !loadingStatus && paymentRequestStatus === 'expired' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-orange-700 mb-2">Payment Request Expired</h3>
              <p className="text-gray-600 mb-4">
                This payment request has expired and can no longer be processed.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Please contact us to generate a new payment request for {formatAmount(amount)}.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.location.href = 'mailto:info@khtherapy.ie?subject=Payment Request Expired - Need New Link'}
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Contact Support
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Return to Home
                </button>
              </div>
            </div>
          )}

          {/* Payment Form - Only show if payment request is valid */}
          {(!paymentRequestId || (!loadingStatus && paymentRequestStatus && ['pending', 'sent'].includes(paymentRequestStatus))) && !statusError && (
            <>
              {!isProductionMode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                  <p className="text-yellow-800 text-sm">
                    <strong>TEST MODE:</strong> This is a sandbox payment. No real money will be charged.
                  </p>
                </div>
              )}
              {isProductionMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                  <p className="text-blue-800 text-sm">
                    This page is intended for sandbox simulations. Real payments are processed via SumUp's hosted checkout.
                  </p>
                </div>
              )}

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
                    className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SumUpCheckoutPage;
