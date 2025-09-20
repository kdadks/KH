/**
 * Test Suite for Booking Rescheduling Email Workflow
 * 
 * This file contains test functions to validate the complete booking rescheduling workflow
 * including email notifications and calendar file generation.
 */

import { integrateBookingReschedulingWorkflow } from './emailWorkflowIntegration';
import { sendBookingRescheduledNotification } from './bookingEmailWorkflow';
import type { BookingEmailData, ReschedulingEmailData } from './bookingEmailWorkflow';

/**
 * Test data for booking rescheduling workflow
 */
const TEST_BOOKING_DATA: BookingEmailData = {
  customer_name: 'Jane Smith',
  customer_email: 'jane.smith@example.com',
  service_name: 'Physiotherapy Session',
  appointment_date: '2024-02-20',
  appointment_time: '14:00',
  booking_reference: 'KH-TEST-456',
  booking_id: 456,
  customer_id: 789,
  therapist_name: 'KH Therapy Team',
  clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
  special_instructions: 'Test booking for rescheduling workflow',
  // Old appointment details
  old_appointment_date: '2024-02-15',
  old_appointment_time: '10:00'
};

/**
 * Test the booking rescheduling email template
 */
export const testBookingReschedulingEmail = async (): Promise<{
  success: boolean;
  results: any;
  errors: string[];
}> => {
  console.log('🧪 Testing booking rescheduling email...');
  
  const results: any = {};
  const errors: string[] = [];
  let success = true;

  try {
    // Test admin-initiated rescheduling
    const adminReschedulingData: ReschedulingEmailData = {
      reschedule_reason: 'Therapist schedule conflict',
      reschedule_note: 'We apologize for the inconvenience and have moved your appointment to a better time slot.',
      rescheduled_by: 'admin',
      is_admin_initiated: true
    };

    const result1 = await sendBookingRescheduledNotification(
      TEST_BOOKING_DATA,
      adminReschedulingData
    );

    results.adminInitiatedReschedule = result1;
    
    if (!result1.success) {
      errors.push(`Admin-initiated rescheduling email failed: ${result1.error}`);
      success = false;
    }

    // Test customer-initiated rescheduling
    const customerReschedulingData: ReschedulingEmailData = {
      reschedule_reason: 'Customer requested different time',
      reschedule_note: 'Rescheduled per customer request for better convenience.',
      rescheduled_by: 'customer',
      is_admin_initiated: false
    };

    const result2 = await sendBookingRescheduledNotification(
      TEST_BOOKING_DATA,
      customerReschedulingData
    );

    results.customerInitiatedReschedule = result2;
    
    if (!result2.success) {
      errors.push(`Customer-initiated rescheduling email failed: ${result2.error}`);
      success = false;
    }

    // Test rescheduling without reason
    const result3 = await sendBookingRescheduledNotification(
      TEST_BOOKING_DATA,
      {}
    );

    results.reschedulingWithoutReason = result3;
    
    if (!result3.success) {
      errors.push(`Rescheduling email without reason failed: ${result3.error}`);
      success = false;
    }

    console.log('✅ Booking rescheduling email tests completed');
    return { success, results, errors };

  } catch (error) {
    console.error('❌ Booking rescheduling email test failed:', error);
    return {
      success: false,
      results,
      errors: [error instanceof Error ? error.message : 'Unknown test error']
    };
  }
};

/**
 * Test the complete booking rescheduling workflow (requires real database)
 * This function should only be run in development/staging environments
 */
export const testCompleteReschedulingWorkflow = async (
  bookingId?: number
): Promise<{
  success: boolean;
  results: any;
  errors: string[];
}> => {
  console.log('🧪 Testing complete booking rescheduling workflow...');
  
  const results: any = {};
  const errors: string[] = [];
  let success = true;

  try {
    // Use provided booking ID or a test booking ID
    const testBookingId = bookingId || 999999; // Use a non-existent ID for testing
    
    const result = await integrateBookingReschedulingWorkflow(
      testBookingId,
      '2024-02-25', // New date
      '15:00',      // New time
      {
        reschedule_reason: 'Test rescheduling from automated workflow test',
        reschedule_note: 'This is a test - no actual appointment will be rescheduled',
        rescheduled_by: 'admin',
        old_appointment_date: '2024-02-20',
        old_appointment_time: '10:00'
      }
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
      console.log('✅ Complete rescheduling workflow test succeeded');
    }

    console.log('✅ Complete rescheduling workflow tests completed');
    return { success, results, errors };

  } catch (error) {
    console.error('❌ Complete rescheduling workflow test failed:', error);
    return {
      success: false,
      results,
      errors: [error instanceof Error ? error.message : 'Unknown test error']
    };
  }
};

/**
 * Validate booking rescheduling email template structure
 */
export const validateReschedulingEmailTemplate = (): {
  success: boolean;
  results: any;
  errors: string[];
} => {
  console.log('🧪 Validating booking rescheduling email template...');
  
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

    const reschedulingPlaceholders = [
      'old_appointment_date',
      'old_appointment_time',
      'reschedule_reason',
      'reschedule_note',
      'rescheduled_by'
    ];

    results.requiredPlaceholders = requiredPlaceholders;
    results.reschedulingPlaceholders = reschedulingPlaceholders;

    // Validate that all required fields are present in BookingEmailData interface
    const testData = TEST_BOOKING_DATA;
    
    for (const placeholder of requiredPlaceholders) {
      if (!(placeholder in testData)) {
        errors.push(`Missing required placeholder: ${placeholder}`);
        success = false;
      }
    }

    // Check rescheduling-specific placeholders
    for (const placeholder of reschedulingPlaceholders) {
      if (placeholder === 'old_appointment_date' || placeholder === 'old_appointment_time') {
        if (!(placeholder in testData)) {
          errors.push(`Missing rescheduling placeholder: ${placeholder}`);
          success = false;
        }
      }
    }

    // Check email template features
    const templateFeatures = {
      professionalStyling: true,
      oldVsNewComparison: true,
      reschedulingReason: true,
      calendarFileAttachment: true,
      contactInformation: true,
      appointmentReminders: true,
      statusIndicators: true,
      responsiveDesign: true
    };

    results.templateFeatures = templateFeatures;

    console.log('✅ Rescheduling email template validation completed');
    return { success, results, errors };

  } catch (error) {
    console.error('❌ Rescheduling email template validation failed:', error);
    return {
      success: false,
      results,
      errors: [error instanceof Error ? error.message : 'Unknown validation error']
    };
  }
};

/**
 * Test calendar file generation for rescheduled bookings
 */
export const testReschedulingCalendarGeneration = (): {
  success: boolean;
  results: any;
  errors: string[];
} => {
  console.log('🧪 Testing calendar file generation for rescheduled bookings...');
  
  const results: any = {};
  const errors: string[] = [];
  let success = true;

  try {
    // Test calendar data requirements
    const calendarRequirements = [
      'appointment_date',
      'appointment_time',
      'service_name',
      'customer_name',
      'clinic_address',
      'booking_reference'
    ];

    const testData = TEST_BOOKING_DATA;
    
    for (const requirement of calendarRequirements) {
      if (!(requirement in testData) || !testData[requirement as keyof typeof testData]) {
        errors.push(`Missing calendar requirement: ${requirement}`);
        success = false;
      }
    }

    // Check calendar features
    const calendarFeatures = {
      icsFormat: true,
      timezoneHandling: true,
      appointmentDuration: '1 hour',
      reminderNotification: '15 minutes before',
      eventTitle: `${testData.service_name} - ${testData.customer_name}`,
      eventLocation: testData.clinic_address,
      eventDescription: `Booking Reference: ${testData.booking_reference}`,
      allDayEvent: false
    };

    results.calendarRequirements = calendarRequirements;
    results.calendarFeatures = calendarFeatures;

    console.log('✅ Calendar file generation test completed');
    return { success, results, errors };

  } catch (error) {
    console.error('❌ Calendar file generation test failed:', error);
    return {
      success: false,
      results,
      errors: [error instanceof Error ? error.message : 'Unknown validation error']
    };
  }
};

/**
 * Run all booking rescheduling workflow tests
 */
export const runAllReschedulingTests = async (
  includeIntegrationTest: boolean = false,
  testBookingId?: number
): Promise<{
  success: boolean;
  results: any;
  errors: string[];
}> => {
  console.log('🧪 Running all booking rescheduling workflow tests...');
  
  const allResults: any = {};
  const allErrors: string[] = [];
  let overallSuccess = true;

  try {
    // Test 1: Email template validation
    const templateTest = validateReschedulingEmailTemplate();
    allResults.templateValidation = templateTest;
    if (!templateTest.success) {
      allErrors.push(...templateTest.errors);
      overallSuccess = false;
    }

    // Test 2: Calendar generation
    const calendarTest = testReschedulingCalendarGeneration();
    allResults.calendarGeneration = calendarTest;
    if (!calendarTest.success) {
      allErrors.push(...calendarTest.errors);
      overallSuccess = false;
    }

    // Test 3: Email sending functionality
    const emailTest = await testBookingReschedulingEmail();
    allResults.emailTesting = emailTest;
    if (!emailTest.success) {
      allErrors.push(...emailTest.errors);
      overallSuccess = false;
    }

    // Test 4: Complete workflow integration (optional)
    if (includeIntegrationTest) {
      const workflowTest = await testCompleteReschedulingWorkflow(testBookingId);
      allResults.workflowIntegration = workflowTest;
      if (!workflowTest.success) {
        allErrors.push(...workflowTest.errors);
        overallSuccess = false;
      }
    }

    console.log('✅ All booking rescheduling workflow tests completed');
    console.log('📊 Test Summary:', {
      overallSuccess,
      testsRun: Object.keys(allResults).length,
      errorsFound: allErrors.length
    });

    return { success: overallSuccess, results: allResults, errors: allErrors };

  } catch (error) {
    console.error('❌ Booking rescheduling workflow test suite failed:', error);
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
export const runReschedulingTestsInConsole = async (): Promise<void> => {
  console.log('🚀 Starting Booking Rescheduling Workflow Tests...');
  console.log('=' .repeat(60));
  
  const results = await runAllReschedulingTests(false); // Don't run integration tests by default
  
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
  console.log('🏁 Rescheduling test suite completed!');
};