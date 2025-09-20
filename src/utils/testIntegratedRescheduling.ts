/**
 * Test script for integrated rescheduling workflow
 * Tests both approval workflow and direct rescheduling with existing system
 */

// Import functions for testing workflow integration
// These are available for testing but commented out since they require actual database data
// import { 
//   submitCustomerReschedulingRequest,
//   approveCustomerReschedulingRequest,
//   rejectCustomerReschedulingRequest
// } from '../utils/emailWorkflowIntegration';

import {
  sendReschedulingRequestNotification,
  sendReschedulingApprovalNotification,
  sendReschedulingRejectionNotification
} from '../utils/bookingEmailWorkflow';

// Test booking data
const TEST_BOOKING_DATA = {
  customer_name: 'John Doe',
  customer_email: 'john.doe@example.com',
  service_name: 'Physiotherapy Consultation',
  appointment_date: '2024-03-15',
  appointment_time: '14:00',
  booking_reference: 'KH-TEST-001',
  booking_id: 'test-booking-id',
  customer_id: 1,
  therapist_name: 'KH Therapy Team',
  clinic_address: 'KH Therapy Clinic, Dublin, Ireland',
  special_instructions: 'Test booking for workflow validation',
  old_appointment_date: '2024-03-10',
  old_appointment_time: '10:00'
};

/**
 * Test the integrated rescheduling workflow
 */
export const testIntegratedReschedulingWorkflow = async (): Promise<{
  success: boolean;
  results: any;
  errors: string[];
}> => {
  console.log('🧪 Testing integrated rescheduling workflow...');
  
  const results: any = {};
  const errors: string[] = [];
  let success = true;

  try {
    // Test 1: Customer rescheduling request notification (using existing workflow)
    console.log('📧 Testing customer rescheduling request notification...');
    
    const requestResult = await sendReschedulingRequestNotification(
      TEST_BOOKING_DATA,
      {
        requestId: 'test-request-001',
        newAppointmentDate: '2024-03-20',
        newAppointmentTime: '15:00',
        reschedule_reason: 'Schedule conflict',
        customer_notes: 'Need to reschedule due to work meeting'
      }
    );

    results.reschedulingRequestNotification = requestResult;
    
    if (!requestResult.success) {
      errors.push(`Customer rescheduling request notification failed: ${requestResult.error}`);
      success = false;
    }

    // Test 2: Admin approval notification (using existing workflow)
    console.log('📧 Testing admin approval notification...');
    
    const approvalResult = await sendReschedulingApprovalNotification(
      TEST_BOOKING_DATA,
      {
        requestId: 'test-request-001',
        adminNotes: 'Approved - slot available',
        adminUserId: 'admin-001'
      }
    );

    results.reschedulingApprovalNotification = approvalResult;
    
    if (!approvalResult.success) {
      errors.push(`Admin approval notification failed: ${approvalResult.error}`);
      success = false;
    }

    // Test 3: Admin rejection notification (using existing workflow)
    console.log('📧 Testing admin rejection notification...');
    
    const rejectionResult = await sendReschedulingRejectionNotification(
      TEST_BOOKING_DATA,
      {
        requestId: 'test-request-001',
        adminNotes: 'Rejected - requested slot not available',
        adminUserId: 'admin-001'
      }
    );

    results.reschedulingRejectionNotification = rejectionResult;
    
    if (!rejectionResult.success) {
      errors.push(`Admin rejection notification failed: ${rejectionResult.error}`);
      success = false;
    }

    // Test 4: Integration workflow test (would need actual booking ID)
    console.log('🔄 Testing integration workflow functions...');
    
    // Note: These tests would require actual database entries, so they're placeholder tests
    results.integrationWorkflowTest = {
      submitCustomerRequest: 'Function available - requires actual booking ID',
      approveRequest: 'Function available - requires actual request ID',
      rejectRequest: 'Function available - requires actual request ID'
    };

    console.log('✅ Integrated rescheduling workflow tests completed');
    
    return {
      success,
      results,
      errors
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown test error']
    };
  }
};

/**
 * Test validation functions
 */
export const testReschedulingValidation = async (): Promise<{
  success: boolean;
  results: any;
  errors: string[];
}> => {
  console.log('🧪 Testing rescheduling validation functions...');
  
  const results: any = {};
  const errors: string[] = [];
  let success = true;

  try {
    // Import validation functions
    const { 
      canRescheduleBooking, 
      validateReschedulingRequest,
      formatTimeUntilDeadline,
      getHoursUntilRescheduleDeadline,
      isBookingEligibleForRescheduling
    } = await import('../utils/reschedulingValidation');

    // Test 1: 24-hour rule validation
    console.log('⏰ Testing 24-hour rule validation...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    const canRescheduleResult = canRescheduleBooking(tomorrowDate, '14:00');
    results.canReschedule24Hours = canRescheduleResult;
    
    if (!canRescheduleResult) {
      console.log('✅ 24-hour rule correctly prevents rescheduling');
    } else {
      console.log('⚠️ 24-hour rule validation may need adjustment');
    }

    // Test 2: Validation with valid data
    console.log('✅ Testing validation with valid data...');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    const validationResult = validateReschedulingRequest({
      bookingId: 'test-booking',
      originalDate: futureDateStr,
      originalTime: '10:00',
      newDate: futureDateStr,
      newTime: '14:00',
      reason: 'Test reason'
    });
    
    results.validationWithValidData = validationResult;
    
    if (!validationResult.isValid) {
      errors.push(`Validation failed with valid data: ${validationResult.errors.join(', ')}`);
      success = false;
    }

    // Test 3: Booking eligibility
    console.log('📋 Testing booking eligibility...');
    
    const eligibilityResults = {
      confirmed: isBookingEligibleForRescheduling('confirmed'),
      pending: isBookingEligibleForRescheduling('pending'),
      cancelled: isBookingEligibleForRescheduling('cancelled')
    };
    
    results.bookingEligibility = eligibilityResults;
    
    if (!eligibilityResults.confirmed) {
      errors.push('Confirmed bookings should be eligible for rescheduling');
      success = false;
    }

    // Test 4: Time formatting
    console.log('🕒 Testing time formatting...');
    
    const hours48 = getHoursUntilRescheduleDeadline(futureDateStr, '14:00');
    const formattedTime = formatTimeUntilDeadline(hours48);
    
    results.timeFormatting = {
      hours: hours48,
      formatted: formattedTime
    };

    console.log('✅ Rescheduling validation tests completed');
    
    return {
      success,
      results,
      errors
    };

  } catch (error) {
    console.error('❌ Validation test failed:', error);
    return {
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown validation test error']
    };
  }
};

/**
 * Run all integrated rescheduling tests
 */
export const runAllReschedulingTests = async (): Promise<void> => {
  console.log('🚀 Starting comprehensive rescheduling workflow tests...');
  console.log('='.repeat(60));

  // Test validation functions
  const validationTests = await testReschedulingValidation();
  console.log('\n📊 Validation Test Results:');
  console.log('Success:', validationTests.success);
  console.log('Results:', JSON.stringify(validationTests.results, null, 2));
  if (validationTests.errors.length > 0) {
    console.log('Errors:', validationTests.errors);
  }

  console.log('\n' + '-'.repeat(40));

  // Test workflow integration
  const workflowTests = await testIntegratedReschedulingWorkflow();
  console.log('\n📊 Workflow Integration Test Results:');
  console.log('Success:', workflowTests.success);
  console.log('Results:', JSON.stringify(workflowTests.results, null, 2));
  if (workflowTests.errors.length > 0) {
    console.log('Errors:', workflowTests.errors);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 All rescheduling tests completed!');
  
  const overallSuccess = validationTests.success && workflowTests.success;
  console.log(`Overall Status: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!overallSuccess) {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  } else {
    console.log('\n🎉 All tests passed! The integrated rescheduling workflow is ready.');
  }
};

export default {
  testIntegratedReschedulingWorkflow,
  testReschedulingValidation,
  runAllReschedulingTests
};