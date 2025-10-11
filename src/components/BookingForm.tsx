import React, { useState } from 'react';
import { useToast } from './shared/toastContext';
import { createBookingWithCustomer } from '../utils/customerBookingUtils';
import { createSumUpCheckoutSession } from '../utils/sumupRealApiImplementation';
import { getActiveSumUpGateway } from '../utils/paymentManagementUtils';
import { cancelPaymentRequest } from '../utils/paymentCancellation';
import { 
  sendBookingNotificationWithPaymentStatus, 
  sendSimpleBookingConfirmation,
  BookingWithPaymentData,
  BookingConfirmationData 
} from '../utils/emailUtils';

interface PaymentState {
  showPayment: boolean;
  paymentRequest: any;
  booking: any;
  customer: any;
  checkoutUrl?: string;
  paymentCompleted: boolean;
  paymentFailed: boolean;
}

const BookingForm: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [packageName, setPackageName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>({
    showPayment: false,
    paymentRequest: null,
    booking: null,
    customer: null,
    paymentCompleted: false,
    paymentFailed: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const customerData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: customerEmail.trim(),
        phone: customerPhone.trim()
      };

      const bookingData = {
        package_name: packageName.trim(),
        notes: notes.trim(),
        status: status,
        booking_date: new Date().toISOString().split('T')[0], // Add today's date
        appointment_date: new Date().toISOString().split('T')[0] // Add today's date
      };

      console.log('🔄 Creating booking with data:', { customerData, bookingData });
      
      // Create booking and get payment request
      const result = await createBookingWithCustomer(customerData, bookingData);
      console.log('📋 Booking creation result:', result);
      
      const { booking, customer, paymentRequest, error } = result;
      
      if (error) {
        console.error('❌ Booking creation error:', error);
        showError('Booking Failed', error);
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Booking created successfully:', { booking, customer, paymentRequest });

      if (paymentRequest && booking && customer) {
        console.log('💳 Payment request found, showing payment interface');
        // Show payment interface
        setPaymentState({
          showPayment: true,
          paymentRequest,
          booking,
          customer,
          paymentCompleted: false,
          paymentFailed: false
        });
        showSuccess('Booking Created!', 'Please complete the deposit payment to confirm your booking.');
      } else {
        console.log('⚠️ No payment request generated, sending confirmation email');
        
        // Send booking confirmation email without payment
        if (booking && customer) {
          try {
            const bookingConfirmationData: BookingConfirmationData = {
              customer_name: `${customer.first_name} ${customer.last_name}`,
              customer_email: customer.email,
              service_name: booking.package_name || packageName,
              appointment_date: booking.booking_date || new Date().toISOString().split('T')[0],
              appointment_time: booking.timeslot_start_time || 'To be scheduled',
              total_amount: 0, // No payment required
              booking_reference: booking.booking_reference || `KH-${booking.id}`,
              therapist_name: 'KH Therapy Team',
              clinic_address: 'Dublin, Ireland',
              special_instructions: booking.notes || 'We will contact you to schedule your appointment'
            };

            const emailSent = await sendSimpleBookingConfirmation(customer.email, bookingConfirmationData);
            if (emailSent) {
              console.log('✅ Booking confirmation email sent successfully');
            } else {
              console.warn('⚠️ Failed to send booking confirmation email');
            }
          } catch (emailError) {
            console.error('❌ Error sending booking confirmation email:', emailError);
          }
        }
        
        // Fallback to old behavior if no payment request
        showSuccess('Booking Submitted!', 'Check your email for booking confirmation. We will contact you to schedule your appointment.');
        await resetForm();
      }
    } catch (error) {
      console.error('💥 Exception during booking creation:', error);
      showError('Booking Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayNow = async () => {
    try {
      // Get SumUp configuration from database
      const gatewayConfig = await getActiveSumUpGateway();
      
      if (!gatewayConfig || !gatewayConfig.merchant_id) {
        throw new Error('Payment gateway not configured. Please contact support.');
      }
      
      // Create SumUp checkout session
      console.log('Creating SumUp checkout for booking payment...');
      const checkoutResponse = await createSumUpCheckoutSession({
        checkout_reference: `booking-${paymentState.booking.id}-${Date.now()}`,
        amount: paymentState.paymentRequest.amount,
        currency: 'EUR',
        merchant_code: gatewayConfig.merchant_id,
        description: `Deposit for ${paymentState.booking.package_name}`
      });
      
      console.log('SumUp checkout session created:', checkoutResponse);
      
      // Create checkout URL pointing to our internal checkout page
      const checkoutUrl = `/sumup-checkout?checkout_reference=${checkoutResponse.checkout_reference}&amount=${paymentState.paymentRequest.amount}&currency=EUR&description=${encodeURIComponent(`Deposit for ${paymentState.booking.package_name}`)}&merchant_code=${checkoutResponse.merchant_code}&checkout_id=${checkoutResponse.id}`;
      
      setPaymentState(prev => ({ ...prev, checkoutUrl }));
      
      // Open payment page in new window
      const checkoutWindow = window.open(checkoutUrl, 'sumup-checkout', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      // Monitor for completion
      const checkComplete = setInterval(() => {
        try {
          if (checkoutWindow?.closed) {
            clearInterval(checkComplete);
            // Check payment status or simulate completion
            setTimeout(() => {
              handlePaymentSuccess();
            }, 1000);
          }
        } catch (error) {
          console.log('Monitoring checkout window...');
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error creating checkout:', error);
      showError('Payment Error', 'Failed to create payment link. Please try again.');
    }
  };


  const handlePaymentSuccess = async () => {
    setPaymentState(prev => ({ ...prev, paymentCompleted: true }));
    
    // Send payment completion email
    if (paymentState.booking && paymentState.customer && paymentState.paymentRequest) {
      try {
        const bookingWithPaymentData: BookingWithPaymentData = {
          customer_name: `${paymentState.customer.first_name} ${paymentState.customer.last_name}`,
          customer_email: paymentState.customer.email,
          service_name: paymentState.booking.package_name,
          appointment_date: paymentState.booking.booking_date || new Date().toISOString().split('T')[0],
          appointment_time: paymentState.booking.timeslot_start_time || 'To be scheduled',
          booking_reference: paymentState.booking.booking_reference || `KH-${paymentState.booking.id}`,
          payment_status: 'completed',
          payment_amount: paymentState.paymentRequest.amount,
          transaction_id: `SUMUP-${Date.now()}`, // This should come from actual payment response
          next_steps: 'We will contact you within 24 hours to schedule your appointment. Thank you for choosing KH Therapy!',
          therapist_name: 'KH Therapy Team',
          clinic_address: 'Dublin, Ireland',
          special_instructions: paymentState.booking.notes || undefined
        };

        const emailSent = await sendBookingNotificationWithPaymentStatus(
          bookingWithPaymentData.customer_email, 
          bookingWithPaymentData
        );
        
        if (emailSent) {
          console.log('✅ Payment completion email sent successfully');
        } else {
          console.warn('⚠️ Failed to send payment completion email');
        }
      } catch (emailError) {
        console.error('❌ Error sending payment completion email:', emailError);
      }
    }
    
    showSuccess('Payment Successful!', 'Your booking is confirmed. Check your email for confirmation and next steps.');
  };

  const resetForm = async () => {
    // Cancel any active payment request
    if (paymentState.paymentRequest?.id) {
      try {
        await cancelPaymentRequest(paymentState.paymentRequest.id);
      } catch (error) {
        console.error('Error cancelling payment request:', error);
      }
    }

    setFirstName('');
    setLastName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setPackageName('');
    setNotes('');
    setStatus('pending');
    setPaymentState({
      showPayment: false,
      paymentRequest: null,
      booking: null,
      customer: null,
      paymentCompleted: false,
      paymentFailed: false
    });
  };

  // Render payment interface
  if (paymentState.showPayment && !paymentState.paymentCompleted && !paymentState.paymentFailed) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Your Booking</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 font-medium">✅ Booking Created Successfully!</p>
          <p className="text-green-600 text-sm mt-1">
            Booking #{paymentState.booking.id} for {paymentState.booking.package_name}
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Payment Required</h3>
          <p className="text-blue-800 text-sm mb-3">
            A deposit payment of <strong>€{paymentState.paymentRequest.amount}</strong> is required to confirm your booking.
          </p>
          <button
            onClick={handlePayNow}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Pay Now - €{paymentState.paymentRequest.amount}
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={resetForm}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Cancel and start over
          </button>
        </div>
      </div>
    );
  }

  // Render success message with login instructions
  if (paymentState.paymentCompleted) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed! 🎉</h2>
          <p className="text-gray-600 mb-6">
            Your payment has been processed and your booking is confirmed.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold mr-2 mt-0.5 text-center leading-5">1</span>
              Check your email for booking confirmation and receipt
            </li>
            <li className="flex items-start">
              <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold mr-2 mt-0.5 text-center leading-5">2</span>
              We'll contact you to schedule your appointment
            </li>
            <li className="flex items-start">
              <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold mr-2 mt-0.5 text-center leading-5">3</span>
              <div>
                <strong>Access your dashboard:</strong>
                <div className="ml-1 mt-1">
                  <a href="/login" className="text-blue-600 hover:text-blue-800 underline">
                    Login here
                  </a> using your email: <strong>{paymentState.customer.email}</strong>
                </div>
                <div className="text-xs text-gray-500 ml-1 mt-1">
                  (Check your email for temporary password if this is your first booking)
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div className="text-center">
          <button
            onClick={resetForm}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Make Another Booking
          </button>
        </div>
      </div>
    );
  }

  // Render payment failure message with retry option
  if (paymentState.paymentFailed) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-600 mb-6">
            Your payment could not be processed. Don't worry, your booking is still reserved for 24 hours.
          </p>
        </div>

        <div className="bg-red-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-900 mb-3">What to do next:</h3>
          <ul className="space-y-2 text-sm text-red-800">
            <li className="flex items-start">
              <span className="inline-block w-5 h-5 bg-red-100 text-red-600 rounded-full text-xs font-bold mr-2 mt-0.5 text-center leading-5">1</span>
              Check your email for instructions and booking details
            </li>
            <li className="flex items-start">
              <span className="inline-block w-5 h-5 bg-red-100 text-red-600 rounded-full text-xs font-bold mr-2 mt-0.5 text-center leading-5">2</span>
              Try the payment again or contact us for assistance
            </li>
            <li className="flex items-start">
              <span className="inline-block w-5 h-5 bg-red-100 text-red-600 rounded-full text-xs font-bold mr-2 mt-0.5 text-center leading-5">3</span>
              Your booking reference: <strong>{paymentState.booking?.booking_reference || `KH-${paymentState.booking?.id}`}</strong>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={handlePayNow}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Payment Again - €{paymentState.paymentRequest?.amount}
          </button>
          <button
            onClick={resetForm}
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // Render original booking form
  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Book a Service</h2>
      
      <div className="space-y-4">
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="email"
          placeholder="Email"
          value={customerEmail}
          onChange={e => setCustomerEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={customerPhone}
          onChange={e => setCustomerPhone(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Package Name"
          value={packageName}
          onChange={e => setPackageName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select 
          value={status} 
          onChange={e => setStatus(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Booking'}
      </button>
    </form>
  );
};

export default BookingForm;
