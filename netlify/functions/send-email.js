const nodemailer = require('nodemailer');

// SMTP Configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: 'smtp.hostinger.com',
    port: 465, // SSL/TLS port
    secure: true, // Use SSL
    auth: {
      user: process.env.SMTP_USER, // info@khtherapy.ie
      pass: process.env.SMTP_PASS  // Your email password
    }
  });
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
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
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
        body: JSON.stringify({ error: 'Missing required fields: emailType, recipientEmail, data' })
      };
    }

    // Create transporter
    const transporter = createTransporter();

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

    // Send email
    const result = await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST'
      },
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST'
      },
      body: JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      })
    };
  }
};
