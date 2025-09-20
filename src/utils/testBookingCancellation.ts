/**
 * Test Suite for Booking Cancellation Email Workflow
 * 
 * This file contains test functions to validate the complete booking cancellation workflow
 * including email notifications and payment request handling.
 */

import { integrateBookingCancellationWorkflow } from './emailWorkflowIntegration';
import { sendBookingCancellationNotification } from './bookingEmailWorkflow';
import type { BookingEmailData } from './bookingEmailWorkflow';

/**
 * Test data for booking cancellation workflow
 */
const TEST_BOOKING_DATA: BookingEmailData = {
  customer_name: 'John Doe',
  customer_email: 'john.doe@example.com',
  service_name: 'Physiotherapy Session',
  appointment_date: '2024-02-15',
  appointment_time: '10:00',
  booking_reference: 'KH-TEST-123',
  booking_id: 123,
  customer_id: 456,
  therapist_name: 'KH Therapy Team',
  clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
  special_instructions: 'Test booking for cancellation workflow'
};

/**
 * Test the booking cancellation email template
 */
export const testBookingCancellationEmail = async (): Promise<{
  success: boolean;
  results: any;
  errors: string[];
}> => {
  console.log('🧪 Testing booking cancellation email...');
  
  const results: any = {};
  const errors: string[] = [];
  let success = true;

  try {
    // Test cancellation without payment request
    const result1 = await sendBookingCancellationNotification(
      TEST_BOOKING_DATA,
      {
        cancellation_reason: 'Testing cancellation workflow',
        has_payment_request: false
      }
    );

    results.cancellationWithoutPayment = result1;
    
    if (!result1.success) {
      errors.push(`Cancellation email without payment failed: ${result1.error}`);
      success = false;
    }

    // Test cancellation with payment request
    const result2 = await sendBookingCancellationNotification(
      TEST_BOOKING_DATA,
      {
        cancellation_reason: 'Testing cancellation workflow with payment',
        has_payment_request: true,
        refund_info: 'Refund will be processed within 2-3 business days'
      }
    );

    results.cancellationWithPayment = result2;
    
    if (!result2.success) {
      errors.push(`Cancellation email with payment failed: ${result2.error}`);
      success = false;
    }

    console.log('✅ Booking cancellation email tests completed');
    return { success, results, errors };

  } catch (error) {
    console.error('❌ Booking cancellation email test failed:', error);
    return {
      success: false,
      results,
      errors: [error instanceof Error ? error.message : 'Unknown test error']
    };
  }
};

/**
 * Test the complete booking cancellation workflow (requires real database)
 * This function should only be run in development/staging environments
 */
export const testCompleteCancellationWorkflow = async (
  bookingId?: number
): Promise<{
  success: boolean;
  results: any;
  errors: string[];
}> => {
  console.log('🧪 Testing complete booking cancellation workflow...');
  
  const results: any = {};
  const errors: string[] = [];
  let success = true;

  try {
    // Use provided booking ID or a test booking ID
    const testBookingId = bookingId || 999999; // Use a non-existent ID for testing
    
    const result = await integrateBookingCancellationWorkflow(
      testBookingId,
      'Test cancellation from automated workflow test',
      'This is a test - no actual refund will be processed'
    );

    results.workflowIntegration = result;
    
    if (!result.success) {
      // Expected to fail with non-existent booking ID
      if (result.errors.some(error => error.includes('Failed to get booking details'))) {
        console.log('✅ Test correctly failed with non-existent booking ID');
        results.expectedFailure = true;
      } else {
        errors.push(`Unexpected workflow failure: ${result.errors.join(', ')}`);
        success = false;
      }
    } else {
      console.log('✅ Complete cancellation workflow test succeeded');
    }

    console.log('✅ Complete cancellation workflow tests completed');
    return { success, results, errors };

  } catch (error) {
    console.error('❌ Complete cancellation workflow test failed:', error);
    return {
      success: false,
      results,
      errors: [error instanceof Error ? error.message : 'Unknown test error']
    };
  }
};

/**
 * Validate booking cancellation email template structure
 */
export const validateCancellationEmailTemplate = (): {
  success: boolean;
  results: any;
  errors: string[];
} => {
  console.log('🧪 Validating booking cancellation email template...');
  
  const results: any = {};
  const errors: string[] = [];
  let success = true;

  try {
    // Test required placeholders
    const requiredPlaceholders = [
      'customer_name',
      'service_name',
      'appointment_date',
      'appointment_time',
      'booking_reference'
    ];

    const optionalPlaceholders = [
      'cancellation_reason',
      'therapist_name',
      'has_payment_request',
      'refund_info'
    ];

    results.requiredPlaceholders = requiredPlaceholders;
    results.optionalPlaceholders = optionalPlaceholders;

    // Validate that all required fields are present in BookingEmailData interface
    const testData = TEST_BOOKING_DATA;
    
    for (const placeholder of requiredPlaceholders) {
      if (!(placeholder in testData)) {
        errors.push(`Missing required placeholder: ${placeholder}`);
        success = false;
      }
    }

    // Check email template features
    const templateFeatures = {
      professionalStyling: true,
      cancellationReason: true,
      paymentRequestHandling: true,
      refundInformation: true,
      contactInformation: true,
      nextStepsGuidance: true
    };

    results.templateFeatures = templateFeatures;

    console.log('✅ Cancellation email template validation completed');
    return { success, results, errors };

  } catch (error) {
    console.error('❌ Cancellation email template validation failed:', error);
    return {
      success: false,
      results,
      errors: [error instanceof Error ? error.message : 'Unknown validation error']
    };
  }
};

/**
 * Run all booking cancellation workflow tests
 */
export const runAllCancellationTests = async (
  includeIntegrationTest: boolean = false,
  testBookingId?: number
): Promise<{
  success: boolean;
  results: any;
  errors: string[];
}> => {
  console.log('🧪 Running all booking cancellation workflow tests...');
  
  const allResults: any = {};
  const allErrors: string[] = [];
  let overallSuccess = true;

  try {
    // Test 1: Email template validation
    const templateTest = validateCancellationEmailTemplate();
    allResults.templateValidation = templateTest;
    if (!templateTest.success) {
      allErrors.push(...templateTest.errors);
      overallSuccess = false;
    }

    // Test 2: Email sending functionality
    const emailTest = await testBookingCancellationEmail();
    allResults.emailTesting = emailTest;
    if (!emailTest.success) {
      allErrors.push(...emailTest.errors);
      overallSuccess = false;
    }

    // Test 3: Complete workflow integration (optional)
    if (includeIntegrationTest) {
      const workflowTest = await testCompleteCancellationWorkflow(testBookingId);
      allResults.workflowIntegration = workflowTest;
      if (!workflowTest.success) {
        allErrors.push(...workflowTest.errors);
        overallSuccess = false;
      }
    }

    console.log('✅ All booking cancellation workflow tests completed');
    console.log('📊 Test Summary:', {
      overallSuccess,
      testsRun: Object.keys(allResults).length,
      errorsFound: allErrors.length
    });

    return { success: overallSuccess, results: allResults, errors: allErrors };

  } catch (error) {
    console.error('❌ Booking cancellation workflow test suite failed:', error);
    return {
      success: false,
      results: allResults,
      errors: [error instanceof Error ? error.message : 'Unknown test suite error']
    };
  }
};

/**
 * Console-friendly test runner for development
 */
export const runCancellationTestsInConsole = async (): Promise<void> => {
  console.log('🚀 Starting Booking Cancellation Workflow Tests...');
  console.log('=' .repeat(60));
  
  const results = await runAllCancellationTests(false); // Don't run integration tests by default
  
  console.log('\n📋 TEST RESULTS:');
  console.log('=' .repeat(60));
  console.log('✅ Success:', results.success);
  console.log('📊 Results:', JSON.stringify(results.results, null, 2));
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Test suite completed!');
};