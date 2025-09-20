/**
 * Complete Rescheduling Workflow Integration
 * Combines API operations with email notifications for seamless workflow
 */

import { 
  submitReschedulingRequest,
  approveReschedulingRequest,
  rejectReschedulingRequest,
  getReschedulingRequestDetails
} from './reschedulingApi';
import {
  sendAdminReschedulingNotification,
  sendCustomerReschedulingConfirmation,
  sendReschedulingApprovalNotification,
  sendReschedulingRejectionNotification
} from './reschedulingEmailNotifications';

/**
 * Complete workflow: Submit rescheduling request with notifications
 * @param requestData - The rescheduling request data
 * @returns {Promise} Result of the complete workflow
 */
export const submitReschedulingRequestWithNotifications = async (requestData: {
  bookingId: string;
  originalDate: string;
  originalTime: string;
  newDate: string;
  newTime: string;
  reason?: string;
  customerNotes?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    // Step 1: Submit the rescheduling request
    const submitResult = await submitReschedulingRequest(requestData);
    
    if (!submitResult.success) {
      return submitResult;
    }

    // Step 2: Get the full request details for email notifications
    const detailsResult = await getReschedulingRequestDetails(submitResult.data.id);
    
    if (!detailsResult.success || !detailsResult.data) {
      // Request was created but we can't get details for emails
      return {
        success: true,
        data: submitResult.data,
        error: 'Rescheduling request created but email notifications may have failed'
      };
    }

    // Step 3: Send customer confirmation email
    const customerEmailResult = await sendCustomerReschedulingConfirmation(detailsResult.data);
    
    // Step 4: Send admin notification email
    const adminEmailResult = await sendAdminReschedulingNotification(detailsResult.data);

    // Return success even if emails failed (request was created)
    const emailIssues = [];
    if (!customerEmailResult.success) {
      emailIssues.push('customer notification');
    }
    if (!adminEmailResult.success) {
      emailIssues.push('admin notification');
    }

    return {
      success: true,
      data: submitResult.data,
      error: emailIssues.length > 0 ? `Email issues: ${emailIssues.join(', ')}` : undefined
    };

  } catch (error) {
    console.error('Error in complete rescheduling workflow:', error);
    return {
      success: false,
      error: 'Failed to process rescheduling request'
    };
  }
};

/**
 * Complete workflow: Approve rescheduling request with notifications
 * @param requestId - The rescheduling request ID
 * @param adminUserId - The admin user ID processing the request
 * @param adminNotes - Optional admin notes
 * @returns {Promise} Result of the complete workflow
 */
export const approveReschedulingRequestWithNotifications = async (
  requestId: string,
  adminUserId: string,
  adminNotes?: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    // Step 1: Get current request details before approval
    const beforeDetailsResult = await getReschedulingRequestDetails(requestId);
    
    if (!beforeDetailsResult.success || !beforeDetailsResult.data) {
      return {
        success: false,
        error: 'Rescheduling request not found'
      };
    }

    // Step 2: Approve the rescheduling request
    const approvalResult = await approveReschedulingRequest(requestId, adminUserId, adminNotes);
    
    if (!approvalResult.success) {
      return approvalResult;
    }

    // Step 3: Get updated request details with admin notes
    const afterDetailsResult = await getReschedulingRequestDetails(requestId);
    
    if (!afterDetailsResult.success || !afterDetailsResult.data) {
      return {
        success: true,
        data: approvalResult.data,
        error: 'Request approved but notification emails may have failed'
      };
    }

    // Step 4: Send approval notification with updated ICS calendar
    const emailResult = await sendReschedulingApprovalNotification(afterDetailsResult.data);

    return {
      success: true,
      data: approvalResult.data,
      error: !emailResult.success ? 'Request approved but email notification failed' : undefined
    };

  } catch (error) {
    console.error('Error in approval workflow:', error);
    return {
      success: false,
      error: 'Failed to process approval'
    };
  }
};

/**
 * Complete workflow: Reject rescheduling request with notifications
 * @param requestId - The rescheduling request ID
 * @param adminUserId - The admin user ID processing the request
 * @param adminNotes - Optional admin notes explaining the rejection
 * @returns {Promise} Result of the complete workflow
 */
export const rejectReschedulingRequestWithNotifications = async (
  requestId: string,
  adminUserId: string,
  adminNotes?: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    // Step 1: Reject the rescheduling request
    const rejectionResult = await rejectReschedulingRequest(requestId, adminUserId, adminNotes);
    
    if (!rejectionResult.success) {
      return rejectionResult;
    }

    // Step 2: Get updated request details
    const detailsResult = await getReschedulingRequestDetails(requestId);
    
    if (!detailsResult.success || !detailsResult.data) {
      return {
        success: true,
        data: rejectionResult.data,
        error: 'Request rejected but notification email may have failed'
      };
    }

    // Step 3: Send rejection notification
    const emailResult = await sendReschedulingRejectionNotification(detailsResult.data);

    return {
      success: true,
      data: rejectionResult.data,
      error: !emailResult.success ? 'Request rejected but email notification failed' : undefined
    };

  } catch (error) {
    console.error('Error in rejection workflow:', error);
    return {
      success: false,
      error: 'Failed to process rejection'
    };
  }
};

/**
 * Utility function to check rescheduling eligibility for a booking
 * @param bookingId - The booking ID to check
 * @returns {Promise} Eligibility result with details
 */
export const checkReschedulingEligibility = async (bookingId: string): Promise<{
  success: boolean;
  eligible: boolean;
  reason?: string;
  details?: any;
}> => {
  try {
    // This would typically fetch booking details from the database
    // For now, we'll return a basic structure that can be implemented
    // TODO: Implement actual booking validation using bookingId
    console.log('Checking eligibility for booking:', bookingId);
    
    return {
      success: true,
      eligible: true,
      details: {
        message: 'Eligibility check needs to be implemented with actual booking data'
      }
    };

  } catch (error) {
    console.error('Error checking rescheduling eligibility:', error);
    return {
      success: false,
      eligible: false,
      reason: 'Failed to check eligibility'
    };
  }
};

/**
 * Get rescheduling statistics for admin dashboard
 * @param timeframe - Time period to analyze ('week', 'month', 'quarter')
 * @returns {Promise} Statistics data
 */
export const getReschedulingStatistics = async (timeframe: 'week' | 'month' | 'quarter' = 'month'): Promise<{
  success: boolean;
  data?: {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    cancelledRequests: number;
    averageProcessingTime: number; // in hours
    mostCommonReasons: Array<{ reason: string; count: number }>;
  };
  error?: string;
}> => {
  try {
    // This would typically query the database for statistics
    // TODO: Implement actual statistics querying based on timeframe
    console.log('Getting statistics for timeframe:', timeframe);
    
    return {
      success: true,
      data: {
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        cancelledRequests: 0,
        averageProcessingTime: 0,
        mostCommonReasons: []
      }
    };

  } catch (error) {
    console.error('Error getting rescheduling statistics:', error);
    return {
      success: false,
      error: 'Failed to get statistics'
    };
  }
};

export default {
  submitReschedulingRequestWithNotifications,
  approveReschedulingRequestWithNotifications,
  rejectReschedulingRequestWithNotifications,
  checkReschedulingEligibility,
  getReschedulingStatistics
};