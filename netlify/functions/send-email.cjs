const nodemailer = require('nodemailer');

// SMTP Configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true, // Use SSL directly on port 465
    auth: {
      user: process.env.SMTP_USER, // info@khtherapy.ie
      pass: process.env.SMTP_PASS  // Your email password
    },
    debug: true, // Enable debug output
    logger: true // Log to console
  });
};

// Calendar ICS generation function
const generateICS = (data) => {
  // Parse the appointment time more robustly
  let appointmentTime = data.appointment_time;
  
  // Handle different time formats that might come from the system
  if (appointmentTime) {
    // If it's already in HH:MM:SS format, keep it
    if (appointmentTime.match(/^\d{2}:\d{2}:\d{2}$/)) {
      // Already good
    }
    // If it's in HH:MM format, add seconds
    else if (appointmentTime.match(/^\d{2}:\d{2}$/)) {
      appointmentTime += ':00';
    }
    // If it contains extra text, try to extract time
    else {
      const timeMatch = appointmentTime.match(/(\d{1,2}:\d{2})/);
      if (timeMatch) {
        appointmentTime = timeMatch[1].padStart(5, '0') + ':00';
      } else {
        // Fallback to 10:00 AM
        appointmentTime = '10:00:00';
      }
    }
  } else {
    // Default time if not provided
    appointmentTime = '10:00:00';
  }
  
  const startDate = new Date(`${data.appointment_date}T${appointmentTime}`);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
  
  // Validate dates
  if (isNaN(startDate.getTime())) {
    console.error('Invalid start date:', data.appointment_date, appointmentTime);
    return ''; // Return empty string if date is invalid
  }
  
  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KH Therapy//Booking System//EN',
    'BEGIN:VEVENT',
    `UID:${data.booking_reference}@khtherapy.ie`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${data.service_name} - KH Therapy`,
    `DESCRIPTION:${data.service_name} appointment at KH Therapy\\nBooking Reference: ${data.booking_reference}${data.special_instructions ? '\\nSpecial Instructions: ' + data.special_instructions : ''}`,
    `LOCATION:${data.clinic_address || 'KH Therapy Clinic, Dublin, Ireland'}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'DESCRIPTION:Appointment reminder',
    'ACTION:DISPLAY',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
};

// Email templates
const getEmailTemplate = (type, data) => {
  const commonStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background-color: #f9fafb; }
      .footer { background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 14px; }
      .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      .details { background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    </style>
  `;

  switch (type) {
    case 'booking_confirmation':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Confirmation</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Thank you for booking with KH Therapy! Your appointment has been confirmed.</p>
              
              <div class="details">
                <h3>Appointment Details:</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Total Amount:</strong> €${data.total_amount}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                ${data.clinic_address ? `<p><strong>Location:</strong> ${data.clinic_address}</p>` : ''}
              </div>
              
              ${data.special_instructions ? `
                <div class="details">
                  <h3>Special Instructions:</h3>
                  <p>${data.special_instructions}</p>
                </div>
              ` : ''}
              
              <p>We look forward to seeing you!</p>
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie</p>
              <p>If you need to reschedule or have questions, please contact us.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'payment_receipt':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Receipt</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Thank you for your payment. Here are the details:</p>
              
              <div class="details">
                <h3>Payment Details:</h3>
                <p><strong>Transaction ID:</strong> ${data.transaction_id}</p>
                <p><strong>Amount:</strong> €${data.payment_amount}</p>
                <p><strong>Date:</strong> ${data.payment_date}</p>
                <p><strong>Service:</strong> ${data.service_name || 'Therapy Session'}</p>
              </div>
              
              <p>This serves as your official receipt.</p>
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'payment_request':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>You have a new payment request from KH Therapy.</p>
              
              <div class="details">
                <h3>Payment Details:</h3>
                <p><strong>Amount:</strong> €${data.amount}</p>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Due Date:</strong> ${data.due_date}</p>
                ${data.invoice_number ? `<p><strong>Invoice:</strong> ${data.invoice_number}</p>` : ''}
              </div>
              
              ${data.payment_url ? `
                <p style="text-align: center;">
                  <a href="${data.payment_url}" class="button">Pay Now</a>
                </p>
              ` : ''}
              
              <p>Please complete your payment by the due date.</p>
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'booking_reminder':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Reminder</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>This is a friendly reminder about your upcoming appointment.</p>
              
              <div class="details">
                <h3>Appointment Details:</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
              </div>
              
              <p>We look forward to seeing you!</p>
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'admin_notification':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Admin Notification</h1>
            </div>
            <div class="content">
              <h2>New ${data.notification_type}</h2>
              <p>${data.message}</p>
              
              <div class="details">
                <h3>Details:</h3>
                ${Object.keys(data.details || {}).map(key => 
                  `<p><strong>${key.replace(/_/g, ' ').toUpperCase()}:</strong> ${data.details[key]}</p>`
                ).join('')}
              </div>
            </div>
            <div class="footer">
              <p>KH Therapy Admin System</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'welcome':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to KH Therapy</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Welcome to KH Therapy! We're excited to have you as a customer.</p>
              
              <p>Your account has been created and you can now:</p>
              <ul>
                <li>Book appointments online</li>
                <li>View your booking history</li>
                <li>Manage payment requests</li>
                <li>Update your profile</li>
              </ul>
              
              ${data.login_url ? `
                <p style="text-align: center;">
                  <a href="${data.login_url}" class="button">Access Your Account</a>
                </p>
              ` : ''}
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'password_reset':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>You requested a password reset for your KH Therapy account.</p>
              
              ${data.reset_url ? `
                <p style="text-align: center;">
                  <a href="${data.reset_url}" class="button">Reset Password</a>
                </p>
                <p><strong>Note:</strong> This link will expire in 24 hours.</p>
              ` : ''}
              
              <p>If you didn't request this reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'booking_with_payment_completed':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Confirmed - Payment Received</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Great news! Your booking has been confirmed and your payment has been successfully processed.</p>
              
              <div class="details">
                <h3>Booking Details:</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                ${data.clinic_address ? `<p><strong>Location:</strong> ${data.clinic_address}</p>` : ''}
              </div>
              
              <div class="details">
                <h3>Payment Details:</h3>
                <p><strong>Amount Paid:</strong> €${data.payment_amount}</p>
                ${data.transaction_id ? `<p><strong>Transaction ID:</strong> ${data.transaction_id}</p>` : ''}
                <p><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Payment Successful</span></p>
              </div>
              
              ${data.next_steps ? `
                <div class="details">
                  <h3>Next Steps:</h3>
                  <p>${data.next_steps}</p>
                </div>
              ` : `
                <div class="details">
                  <h3>Next Steps:</h3>
                  <p>Your appointment is confirmed. Please arrive 10 minutes early and bring any relevant medical documents.</p>
                  <p>If you need to reschedule or have any questions, please contact us at least 24 hours in advance.</p>
                </div>
              `}
              
              ${data.special_instructions ? `
                <div class="details">
                  <h3>Special Instructions:</h3>
                  <p>${data.special_instructions}</p>
                </div>
              ` : ''}
              
              <p>We look forward to seeing you!</p>
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie</p>
              <p>For any questions or changes, please contact us.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'booking_with_payment_failed':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Created - Payment Required</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Your booking has been created, but we encountered an issue with your payment. Don't worry - your appointment slot is temporarily reserved.</p>
              
              <div class="details">
                <h3>Booking Details:</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                ${data.clinic_address ? `<p><strong>Location:</strong> ${data.clinic_address}</p>` : ''}
              </div>
              
              <div class="details" style="background-color: #fef2f2; border-left: 4px solid #ef4444;">
                <h3>Payment Status:</h3>
                <p><strong>Amount Due:</strong> €${data.payment_amount}</p>
                <p><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">Payment Failed</span></p>
                <p>Please retry your payment to confirm your booking.</p>
              </div>
              
              <div class="details">
                <h3>What happens next?</h3>
                <p>• Your appointment slot is reserved for 24 hours</p>
                <p>• Please complete payment to confirm your booking</p>
                <p>• You can retry payment by contacting us directly</p>
                <p>• If payment is not received within 24 hours, your slot may be released</p>
              </div>
              
              <p style="text-align: center;">
                <a href="mailto:info@khtherapy.ie?subject=Payment Retry - ${data.booking_reference}" class="button">Contact Us to Retry Payment</a>
              </p>
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie</p>
              <p>Need help? Contact us immediately to secure your appointment.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'booking_confirmation_no_payment':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Confirmation</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Thank you for booking with KH Therapy! Your appointment request has been received.</p>
              
              <div class="details">
                <h3>Booking Details:</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                ${data.clinic_address ? `<p><strong>Location:</strong> ${data.clinic_address}</p>` : ''}
              </div>
              
              <div class="details">
                <h3>General Instructions:</h3>
                <p>• Please arrive 10 minutes early for your appointment</p>
                <p>• Bring any relevant medical documents or reports</p>
                <p>• Wear comfortable clothing that allows easy movement</p>
                <p>• Please contact us at least 24 hours in advance if you need to reschedule</p>
              </div>
              
              <div class="details">
                <h3>Payment Information:</h3>
                <p>Payment can be made at the time of your appointment. We accept:</p>
                <p>• Cash</p>
                <p>• Card payments</p>
                <p>• Bank transfer</p>
                <p>For questions about rates and services, please contact us directly.</p>
              </div>
              
              ${data.special_instructions ? `
                <div class="details">
                  <h3>Special Instructions:</h3>
                  <p>${data.special_instructions}</p>
                </div>
              ` : ''}
              
              <p>We look forward to helping you with your physiotherapy needs!</p>
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie</p>
              <p>For any questions or changes, please contact us.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'admin_booking_confirmation':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Booking Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Great news! Your booking has been <strong>confirmed</strong> by our team.</p>
              
              <div class="details">
                <h3>📅 Appointment Details:</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                <p><strong>Location:</strong> ${data.clinic_address || 'KH Therapy Clinic, Dublin, Ireland'}</p>
              </div>
              
              ${data.special_instructions ? `
                <div class="details">
                  <h3>📝 Special Instructions:</h3>
                  <p>${data.special_instructions}</p>
                </div>
              ` : ''}
              
              <div class="details">
                <h3>📋 Important Information:</h3>
                <p>• Please arrive 10 minutes early for your appointment</p>
                <p>• Bring any relevant medical documents or reports</p>
                <p>• Wear comfortable clothing suitable for physical examination</p>
                <p>• If you need to reschedule, please contact us at least 24 hours in advance</p>
              </div>
              
              <p style="text-align: center; margin: 20px 0;">
                📧 <strong>A calendar invite has been attached to help you save this appointment to your calendar.</strong>
              </p>
              
              <p>We look forward to seeing you for your appointment!</p>
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie | Dublin, Ireland</p>
              <p>For questions or changes, please contact us at info@khtherapy.ie</p>
            </div>
          </div>
        </body>
        </html>
      `;

    default:
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>KH Therapy</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name || 'Customer'},</h2>
              <p>${data.message || 'Thank you for choosing KH Therapy.'}</p>
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie</p>
            </div>
          </div>
        </body>
        </html>
      `;
  }
};

// Main handler function
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { emailType, recipientEmail, data, subject } = JSON.parse(event.body);

    // Validate required fields
    if (!emailType || !recipientEmail || !data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: emailType, recipientEmail, data' })
      };
    }

    // Create transporter
    const transporter = createTransporter();
    
    // Verify SMTP connection first
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    // Generate email content
    const htmlContent = getEmailTemplate(emailType, data);

    // Default subject if not provided
    const emailSubject = subject || `KH Therapy - ${emailType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;

    // Email options
    const mailOptions = {
      from: {
        name: 'KH Therapy',
        address: process.env.SMTP_USER || 'info@khtherapy.ie'
      },
      to: recipientEmail,
      subject: emailSubject,
      html: htmlContent
    };

    // Add calendar attachment for booking confirmations
    if (emailType === 'admin_booking_confirmation' && data.appointment_date && data.appointment_time) {
      const icsContent = generateICS(data);
      
      // Only add attachment if ICS content was generated successfully
      if (icsContent && icsContent.length > 0) {
        mailOptions.attachments = [
          {
            filename: 'appointment.ics',
            content: icsContent,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST'
          }
        ];
        console.log('📅 Calendar attachment added for booking confirmation');
      } else {
        console.warn('⚠️ Failed to generate calendar content, sending email without attachment');
      }
    }

    // Send email
    const result = await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        messageId: result.messageId,
        message: 'Email sent successfully' 
      })
    };

  } catch (error) {
    console.error('Email sending error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      })
    };
  }
};
