/**
 * Rescheduling Validation Utilities
 * Handles validation logic for booking rescheduling requests
 */

/**
 * Check if a booking can be rescheduled based on 24-hour rule
 * @param appointmentDate - The appointment date (YYYY-MM-DD format)
 * @param appointmentTime - The appointment time (HH:MM or HH:MM:SS format)
 * @returns {boolean} True if booking can be rescheduled, false otherwise
 */
export const canRescheduleBooking = (appointmentDate: string, appointmentTime: string): boolean => {
  try {
    // Parse the appointment date and time
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const currentTime = new Date();
    
    // Calculate the difference in milliseconds
    const timeDifference = appointmentDateTime.getTime() - currentTime.getTime();
    
    // Convert to hours
    const hoursUntilAppointment = timeDifference / (1000 * 60 * 60);
    
    // Must be at least 24 hours before appointment
    return hoursUntilAppointment >= 24;
  } catch (error) {
    console.error('Error checking rescheduling eligibility:', error);
    return false;
  }
};

/**
 * Get the deadline for rescheduling a booking
 * @param appointmentDate - The appointment date (YYYY-MM-DD format)
 * @param appointmentTime - The appointment time (HH:MM or HH:MM:SS format)
 * @returns {Date} The latest time when rescheduling is allowed
 */
export const getRescheduleDeadline = (appointmentDate: string, appointmentTime: string): Date => {
  const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
  // Subtract 24 hours to get deadline
  return new Date(appointmentDateTime.getTime() - (24 * 60 * 60 * 1000));
};

/**
 * Get hours remaining until rescheduling deadline
 * @param appointmentDate - The appointment date (YYYY-MM-DD format)
 * @param appointmentTime - The appointment time (HH:MM or HH:MM:SS format)
 * @returns {number} Hours remaining (negative if deadline has passed)
 */
export const getHoursUntilRescheduleDeadline = (appointmentDate: string, appointmentTime: string): number => {
  const deadline = getRescheduleDeadline(appointmentDate, appointmentTime);
  const currentTime = new Date();
  const timeDifference = deadline.getTime() - currentTime.getTime();
  return timeDifference / (1000 * 60 * 60);
};

/**
 * Validate rescheduling request data
 * @param requestData - The rescheduling request data
 * @returns {Object} Validation result with success flag and errors
 */
export const validateReschedulingRequest = (requestData: {
  bookingId: string;
  originalDate: string;
  originalTime: string;
  newDate: string;
  newTime: string;
  reason?: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check if booking ID is provided
  if (!requestData.bookingId) {
    errors.push('Booking ID is required');
  }

  // Check if original appointment details are provided
  if (!requestData.originalDate) {
    errors.push('Original appointment date is required');
  }

  if (!requestData.originalTime) {
    errors.push('Original appointment time is required');
  }

  // Check if new appointment details are provided
  if (!requestData.newDate) {
    errors.push('New appointment date is required');
  }

  if (!requestData.newTime) {
    errors.push('New appointment time is required');
  }

  // If we have the required data, check 24-hour rule
  if (requestData.originalDate && requestData.originalTime) {
    if (!canRescheduleBooking(requestData.originalDate, requestData.originalTime)) {
      const deadline = getRescheduleDeadline(requestData.originalDate, requestData.originalTime);
      errors.push(`Rescheduling must be requested at least 24 hours before appointment. Deadline was ${deadline.toLocaleString()}`);
    }
  }

  // Validate date formats
  if (requestData.newDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(requestData.newDate)) {
      errors.push('New appointment date must be in YYYY-MM-DD format');
    } else {
      // Check if new date is in the future
      const newDate = new Date(requestData.newDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (newDate < today) {
        errors.push('New appointment date must be in the future');
      }
    }
  }

  // Validate time format
  if (requestData.newTime) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (!timeRegex.test(requestData.newTime)) {
      errors.push('New appointment time must be in HH:MM or HH:MM:SS format');
    }
  }

  // Check if new appointment is different from original
  if (requestData.originalDate === requestData.newDate && requestData.originalTime === requestData.newTime) {
    errors.push('New appointment must be different from the original appointment');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format remaining time until deadline in a user-friendly way
 * @param hours - Hours remaining
 * @returns {string} Formatted time string
 */
export const formatTimeUntilDeadline = (hours: number): string => {
  if (hours < 0) {
    return 'Deadline has passed';
  }

  if (hours < 1) {
    const minutes = Math.floor(hours * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  }

  if (hours < 24) {
    const wholeHours = Math.floor(hours);
    const minutes = Math.floor((hours - wholeHours) * 60);
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  return `${days} day${days !== 1 ? 's' : ''} and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''} remaining`;
};

/**
 * Check if a booking status allows rescheduling
 * @param bookingStatus - The current booking status
 * @returns {boolean} True if rescheduling is allowed for this status
 */
export const isBookingEligibleForRescheduling = (bookingStatus: string): boolean => {
  // Only confirmed bookings can be rescheduled
  const allowedStatuses = ['confirmed', 'paid'];
  return allowedStatuses.includes(bookingStatus.toLowerCase());
};

/**
 * Rescheduling request status types
 */
export type ReschedulingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * Rescheduling request interface
 */
export interface ReschedulingRequest {
  id?: string;
  bookingId: string;
  customerId: number;
  originalAppointmentDate: string;
  originalAppointmentTime: string;
  requestedAppointmentDate: string;
  requestedAppointmentTime: string;
  rescheduleReason?: string;
  customerNotes?: string;
  status: ReschedulingStatus;
  adminNotes?: string;
  adminUserId?: string;
  requestedAt?: string;
  processedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Extended rescheduling request with booking details
 */
export interface ReschedulingRequestWithDetails extends ReschedulingRequest {
  bookingReference: string;
  serviceName: string;
  bookingStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  canReschedule: boolean;
}

export default {
  canRescheduleBooking,
  getRescheduleDeadline,
  getHoursUntilRescheduleDeadline,
  validateReschedulingRequest,
  formatTimeUntilDeadline,
  isBookingEligibleForRescheduling
};