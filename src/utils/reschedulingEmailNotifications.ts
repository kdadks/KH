/**
 * Rescheduling Email Notification Functions
 * Handles email notifications for rescheduling workflow
 */

import { getCSRFToken } from './csrfProtection';

/**
 * Simple email sending function using the Netlify function
 * @param emailData - Email data to send
 * @returns {Promise} Result of the email sending operation
 */
const sendEmail = async (emailData: {
  to: string;
  subject: string;
  body: string;
  type: string;
  appointment_date?: string;
  appointment_time?: string;
  customer_name?: string;
  customer_email?: string;
  booking_reference?: string;
  service_name?: string;
  therapist_name?: string;
  clinic_address?: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': getCSRFToken(),
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to send email'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: 'Email sending failed'
    };
  }
};
import { ReschedulingRequestWithDetails } from './reschedulingValidation';

/**
 * Send notification to admin when a new rescheduling request is submitted
 * @param requestDetails - The rescheduling request details
 * @returns {Promise} Result of the email sending operation
 */
export const sendAdminReschedulingNotification = async (
  requestDetails: ReschedulingRequestWithDetails
): Promise<{ success: boolean; error?: string }> => {
  try {
    const adminEmail = 'info@khtherapy.ie';
    
    const subject = `New Rescheduling Request - ${requestDetails.bookingReference}`;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Rescheduling Request</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Request Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 40%;">Booking Reference:</td>
              <td style="padding: 8px 0;">${requestDetails.bookingReference}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Customer:</td>
              <td style="padding: 8px 0;">${requestDetails.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0;">${requestDetails.customerEmail}</td>
            </tr>
            ${requestDetails.customerPhone ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
              <td style="padding: 8px 0;">${requestDetails.customerPhone}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Service:</td>
              <td style="padding: 8px 0;">${requestDetails.serviceName}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">Appointment Change</h3>
          
          <div style="margin: 15px 0;">
            <strong style="color: #dc3545;">Current Appointment:</strong><br>
            ${new Date(requestDetails.originalAppointmentDate + 'T' + requestDetails.originalAppointmentTime).toLocaleDateString('en-IE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at ${new Date('2000-01-01T' + requestDetails.originalAppointmentTime).toLocaleTimeString('en-IE', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>
          
          <div style="margin: 15px 0;">
            <strong style="color: #28a745;">Requested New Appointment:</strong><br>
            ${new Date(requestDetails.requestedAppointmentDate + 'T' + requestDetails.requestedAppointmentTime).toLocaleDateString('en-IE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at ${new Date('2000-01-01T' + requestDetails.requestedAppointmentTime).toLocaleTimeString('en-IE', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>

        ${requestDetails.rescheduleReason ? `
        <div style="background-color: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #495057; margin-top: 0;">Reason for Rescheduling:</h4>
          <p style="margin: 0; color: #6c757d;">${requestDetails.rescheduleReason}</p>
        </div>
        ` : ''}

        ${requestDetails.customerNotes ? `
        <div style="background-color: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #495057; margin-top: 0;">Customer Notes:</h4>
          <p style="margin: 0; color: #6c757d;">${requestDetails.customerNotes}</p>
        </div>
        ` : ''}

        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h4 style="color: #0c5460; margin-top: 0;">Action Required</h4>
          <p style="margin: 0; color: #0c5460;">
            Please review this rescheduling request and approve or reject it through the admin console.
            The customer will be notified of your decision via email.
          </p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
          <p style="margin: 0;">
            This notification was sent automatically from the KH Therapy booking system.<br>
            Request ID: ${requestDetails.id}
          </p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: adminEmail,
      subject: subject,
      body: emailContent,
      type: 'admin_notification'
    });

    return result;

  } catch (error) {
    console.error('Error sending admin rescheduling notification:', error);
    return {
      success: false,
      error: 'Failed to send admin notification'
    };
  }
};

/**
 * Send confirmation email to customer when rescheduling request is submitted
 * @param requestDetails - The rescheduling request details
 * @returns {Promise} Result of the email sending operation
 */
export const sendCustomerReschedulingConfirmation = async (
  requestDetails: ReschedulingRequestWithDetails
): Promise<{ success: boolean; error?: string }> => {
  try {
    const subject = `Rescheduling Request Received - ${requestDetails.bookingReference}`;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Rescheduling Request Received</h2>
        
        <p style="color: #666; font-size: 16px;">
          Dear ${requestDetails.customerName},
        </p>
        
        <p style="color: #666; font-size: 16px;">
          We have received your request to reschedule your appointment. 
          Your request is currently being reviewed and you will receive a confirmation email once it has been processed.
        </p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Request Summary</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 40%;">Booking Reference:</td>
              <td style="padding: 8px 0;">${requestDetails.bookingReference}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Service:</td>
              <td style="padding: 8px 0;">${requestDetails.serviceName}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="color: #856404; margin-top: 0;">Appointment Change Details</h3>
          
          <div style="margin: 15px 0;">
            <strong style="color: #dc3545;">Current Appointment:</strong><br>
            ${new Date(requestDetails.originalAppointmentDate + 'T' + requestDetails.originalAppointmentTime).toLocaleDateString('en-IE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at ${new Date('2000-01-01T' + requestDetails.originalAppointmentTime).toLocaleTimeString('en-IE', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>
          
          <div style="margin: 15px 0;">
            <strong style="color: #28a745;">Requested New Appointment:</strong><br>
            ${new Date(requestDetails.requestedAppointmentDate + 'T' + requestDetails.requestedAppointmentTime).toLocaleDateString('en-IE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at ${new Date('2000-01-01T' + requestDetails.requestedAppointmentTime).toLocaleTimeString('en-IE', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>

        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h4 style="color: #0c5460; margin-top: 0;">What happens next?</h4>
          <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
            <li>Our team will review your rescheduling request</li>
            <li>You will receive an email confirmation once the request is approved or if any issues arise</li>
            <li>If approved, your appointment will be automatically updated and you will receive a new calendar invitation</li>
          </ul>
        </div>

        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h4 style="color: #721c24; margin-top: 0;">Important Note</h4>
          <p style="margin: 0; color: #721c24;">
            Your current appointment is still active until the rescheduling request is approved. 
            Please do not skip your current appointment unless you receive confirmation that the rescheduling has been approved.
          </p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
          <p style="margin: 0;">
            If you have any questions, please contact us at info@khtherapy.ie or call us during business hours.
          </p>
          <p style="margin: 10px 0 0 0;">
            Request ID: ${requestDetails.id}
          </p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: requestDetails.customerEmail,
      subject: subject,
      body: emailContent,
      type: 'customer_notification'
    });

    return result;

  } catch (error) {
    console.error('Error sending customer rescheduling confirmation:', error);
    return {
      success: false,
      error: 'Failed to send customer confirmation'
    };
  }
};

/**
 * Send approval notification with updated ICS calendar file
 * @param requestDetails - The rescheduling request details
 * @returns {Promise} Result of the email sending operation
 */
export const sendReschedulingApprovalNotification = async (
  requestDetails: ReschedulingRequestWithDetails
): Promise<{ success: boolean; error?: string }> => {
  try {
    const subject = `Appointment Rescheduled - ${requestDetails.bookingReference}`;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Appointment Successfully Rescheduled</h2>
        
        <p style="color: #666; font-size: 16px;">
          Dear ${requestDetails.customerName},
        </p>
        
        <p style="color: #666; font-size: 16px;">
          Great news! Your rescheduling request has been approved and your appointment has been updated.
        </p>

        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0;">Your New Appointment</h3>
          
          <div style="font-size: 18px; color: #155724; font-weight: bold;">
            ${new Date(requestDetails.requestedAppointmentDate + 'T' + requestDetails.requestedAppointmentTime).toLocaleDateString('en-IE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at ${new Date('2000-01-01T' + requestDetails.requestedAppointmentTime).toLocaleTimeString('en-IE', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 40%;">Service:</td>
              <td style="padding: 8px 0;">${requestDetails.serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Booking Reference:</td>
              <td style="padding: 8px 0;">${requestDetails.bookingReference}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h4 style="color: #0c5460; margin-top: 0;">📅 Calendar Invitation</h4>
          <p style="margin: 0; color: #0c5460;">
            A calendar invitation with your new appointment details is attached to this email. 
            Please add it to your calendar to ensure you don't miss your appointment.
          </p>
        </div>

        ${requestDetails.adminNotes ? `
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #495057; margin-top: 0;">Additional Notes:</h4>
          <p style="margin: 0; color: #6c757d;">${requestDetails.adminNotes}</p>
        </div>
        ` : ''}

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h4 style="color: #856404; margin-top: 0;">Important Reminders</h4>
          <ul style="color: #856404; margin: 0; padding-left: 20px;">
            <li>Please arrive 10 minutes before your appointment time</li>
            <li>Your previous appointment has been automatically cancelled</li>
            <li>If you need to make further changes, please contact us at least 24 hours in advance</li>
          </ul>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
          <p style="margin: 0;">
            If you have any questions, please contact us at info@khtherapy.ie or call us during business hours.
          </p>
          <p style="margin: 10px 0 0 0;">
            Thank you for choosing KH Therapy.
          </p>
        </div>
      </div>
    `;

    // Send to customer with ICS attachment
    const customerResult = await sendEmail({
      to: requestDetails.customerEmail,
      subject: subject,
      body: emailContent,
      type: 'booking_rescheduled',
      appointment_date: requestDetails.requestedAppointmentDate,
      appointment_time: requestDetails.requestedAppointmentTime,
      customer_name: requestDetails.customerName,
      customer_email: requestDetails.customerEmail,
      booking_reference: requestDetails.bookingReference,
      service_name: requestDetails.serviceName,
      therapist_name: 'KH Therapy Team',
      clinic_address: 'KH Therapy Clinic, Dublin, Ireland'
    });

    // Send to admin with ICS attachment
    await sendEmail({
      to: 'info@khtherapy.ie',
      subject: `Appointment Rescheduled - ${requestDetails.bookingReference}`,
      body: emailContent.replace('Dear ' + requestDetails.customerName, 'Dear Admin'),
      type: 'booking_rescheduled',
      appointment_date: requestDetails.requestedAppointmentDate,
      appointment_time: requestDetails.requestedAppointmentTime,
      customer_name: requestDetails.customerName,
      customer_email: requestDetails.customerEmail,
      booking_reference: requestDetails.bookingReference,
      service_name: requestDetails.serviceName,
      therapist_name: 'KH Therapy Team',
      clinic_address: 'KH Therapy Clinic, Dublin, Ireland'
    });

    // Return success if at least customer email was sent
    return customerResult;

  } catch (error) {
    console.error('Error sending rescheduling approval notification:', error);
    return {
      success: false,
      error: 'Failed to send approval notification'
    };
  }
};

/**
 * Send rejection notification to customer
 * @param requestDetails - The rescheduling request details
 * @returns {Promise} Result of the email sending operation
 */
export const sendReschedulingRejectionNotification = async (
  requestDetails: ReschedulingRequestWithDetails
): Promise<{ success: boolean; error?: string }> => {
  try {
    const subject = `Rescheduling Request Update - ${requestDetails.bookingReference}`;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Rescheduling Request Update</h2>
        
        <p style="color: #666; font-size: 16px;">
          Dear ${requestDetails.customerName},
        </p>
        
        <p style="color: #666; font-size: 16px;">
          We have reviewed your rescheduling request for booking ${requestDetails.bookingReference}. 
          Unfortunately, we are unable to accommodate the requested time change.
        </p>

        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="color: #721c24; margin-top: 0;">Request Details</h3>
          
          <div style="margin: 15px 0; color: #721c24;">
            <strong>Current Appointment:</strong><br>
            ${new Date(requestDetails.originalAppointmentDate + 'T' + requestDetails.originalAppointmentTime).toLocaleDateString('en-IE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at ${new Date('2000-01-01T' + requestDetails.originalAppointmentTime).toLocaleTimeString('en-IE', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>
          
          <div style="margin: 15px 0; color: #721c24;">
            <strong>Requested Time:</strong><br>
            ${new Date(requestDetails.requestedAppointmentDate + 'T' + requestDetails.requestedAppointmentTime).toLocaleDateString('en-IE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })} at ${new Date('2000-01-01T' + requestDetails.requestedAppointmentTime).toLocaleTimeString('en-IE', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>

        ${requestDetails.adminNotes ? `
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #495057; margin-top: 0;">Reason:</h4>
          <p style="margin: 0; color: #6c757d;">${requestDetails.adminNotes}</p>
        </div>
        ` : ''}

        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #17a2b8;">
          <h4 style="color: #0c5460; margin-top: 0;">Your Current Appointment Remains Active</h4>
          <p style="margin: 0; color: #0c5460;">
            Your original appointment is still confirmed and active. Please make sure to attend at the scheduled time.
          </p>
        </div>

        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h4 style="color: #155724; margin-top: 0;">Alternative Options</h4>
          <ul style="color: #155724; margin: 0; padding-left: 20px;">
            <li>Contact us directly at info@khtherapy.ie to discuss alternative appointment times</li>
            <li>Check our availability for appointments that may better suit your schedule</li>
            <li>We'll do our best to accommodate your needs within our availability</li>
          </ul>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
          <p style="margin: 0;">
            If you have any questions or would like to discuss other available times, 
            please contact us at info@khtherapy.ie or call us during business hours.
          </p>
          <p style="margin: 10px 0 0 0;">
            Thank you for your understanding.
          </p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: requestDetails.customerEmail,
      subject: subject,
      body: emailContent,
      type: 'customer_notification'
    });

    return result;

  } catch (error) {
    console.error('Error sending rescheduling rejection notification:', error);
    return {
      success: false,
      error: 'Failed to send rejection notification'
    };
  }
};

export default {
  sendAdminReschedulingNotification,
  sendCustomerReschedulingConfirmation,
  sendReschedulingApprovalNotification,
  sendReschedulingRejectionNotification
};