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
    }
  });
};

// Date formatting function for email display
const formatDisplayDate = (dateString) => {
  try {
    // Handle various date formats
    let date;

    // If it's already a readable format (e.g., "15th January 2025"), return as is
    if (isNaN(Date.parse(dateString)) && /\d+(st|nd|rd|th)/.test(dateString)) {
      return dateString;
    }

    // Parse the date string
    date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original if can't parse
    }

    // Format as "Wednesday, 15th January 2025"
    const options = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    let formatted = date.toLocaleDateString('en-IE', options);

    // Add ordinal suffix to day (1st, 2nd, 3rd, 4th, etc.)
    const day = date.getDate();
    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';

    // Replace the day number with day + suffix
    formatted = formatted.replace(/\b\d+\b/, day + suffix);

    return formatted;
  } catch (error) {
    return dateString; // Return original if any error occurs
  }
};

// Calendar ICS generation function
const generateICS = (data, isRescheduled = false) => {
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
    console.error('❌ DEBUG: Invalid date generated, returning empty ICS');
    return ''; // Return empty string if date is invalid
  }
  
  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  // For rescheduled appointments, increment sequence number to update calendar entries
  const sequenceNumber = isRescheduled ? 1 : 0;
  
  // Enhanced description for rescheduled appointments
  let description = `${data.service_name} appointment at KH Therapy\\nBooking Reference: ${data.booking_reference}`;
  
  if (isRescheduled && data.old_appointment_date && data.old_appointment_time) {
    description += `\\nRescheduled from: ${data.old_appointment_date} at ${data.old_appointment_time}`;
  }
  
  if (data.reschedule_reason) {
    description += `\\nReschedule Reason: ${data.reschedule_reason}`;
  }
  
  if (data.special_instructions) {
    description += `\\nSpecial Instructions: ${data.special_instructions}`;
  }
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KH Therapy//Booking System//EN',
    'BEGIN:VEVENT',
    `UID:${data.booking_reference}@khtherapy.ie`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${data.service_name} - KH Therapy${isRescheduled ? ' (Rescheduled)' : ''}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${data.clinic_address || 'KH Therapy Clinic, Dublin, Ireland'}`,
    'STATUS:CONFIRMED',
    `SEQUENCE:${sequenceNumber}`,
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
      /* Email client reset and compatibility */
      body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
      
      /* Gmail-compatible main styles */
      body { 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important; 
        line-height: 1.6; 
        color: #333333 !important; 
        background-color: #f9fafb; 
        margin: 0; 
        padding: 0; 
        width: 100% !important;
        min-width: 100%;
      }
      .container { 
        max-width: 600px; 
        margin: 0 auto; 
        padding: 20px; 
        background-color: #ffffff; 
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); 
        border-radius: 12px; 
      }
      .header { 
        background-color: #059669; 
        background: linear-gradient(135deg, #059669 0%, #10B981 100%); 
        color: white !important; 
        padding: 25px 20px; 
        text-align: center; 
        border-radius: 12px 12px 0 0; 
        position: relative; 
      }
      .logo { 
        width: 80px !important; 
        height: auto !important; 
        margin: 0 4px 10px 4px !important; 
        border-radius: 8px; 
        display: inline-block !important; 
        vertical-align: middle;
      }
      .header h1 { 
        margin: 5px 0 0 0 !important; 
        font-size: 24px !important; 
        font-weight: 600 !important; 
        color: white !important; 
        text-shadow: 1px 1px 2px rgba(0,0,0,0.3); 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
      }
      .content { 
        padding: 25px 20px; 
        background-color: #ffffff; 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
      }
      .footer { 
        background-color: #f3f4f6; 
        padding: 20px; 
        text-align: center; 
        font-size: 14px; 
        color: #6b7280; 
        border-radius: 0 0 12px 12px; 
        border-top: 1px solid #e5e7eb; 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
      }
      .button { 
        display: inline-block; 
        padding: 14px 28px; 
        background-color: #059669; 
        background: linear-gradient(135deg, #059669 0%, #10B981 100%); 
        color: white !important; 
        text-decoration: none; 
        border-radius: 8px; 
        margin: 15px 0; 
        font-weight: 600; 
        box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2); 
        transition: all 0.3s ease; 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
      }
      .button:hover { 
        background: linear-gradient(135deg, #047857 0%, #059669 100%); 
        transform: translateY(-1px); 
        box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3); 
      }
      .details { 
        background-color: #f0fdf4; 
        padding: 20px; 
        border-radius: 10px; 
        margin: 20px 0; 
        border-left: 4px solid #10B981; 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
      }
      .details h3 { 
        color: #047857; 
        margin-top: 0; 
        margin-bottom: 15px; 
        font-size: 18px; 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
      }
      .highlight { 
        background-color: #d1fae5; 
        border: 1px solid #a7f3d0; 
        color: #065f46; 
        padding: 15px; 
        border-radius: 8px; 
        margin: 15px 0; 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
      }
      .payment-instructions { 
        background-color: #ecfdf5; 
        border: 1px solid #a7f3d0; 
        padding: 20px; 
        border-radius: 10px; 
        margin: 20px 0; 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
      }
      .payment-instructions h3 { 
        color: #047857; 
        margin-top: 0; 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
      }
      .bank-details { 
        background-color: #ffffff; 
        padding: 15px; 
        border-radius: 8px; 
        border: 1px solid #d1fae5; 
        margin-top: 15px; 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
      }
      .success-icon { color: #059669; font-size: 20px; }
      .warning-icon { color: #f59e0b; font-size: 18px; }
      
      /* Gmail-specific fixes */
      u + .body .container { width: 600px !important; }
      @media only screen and (max-width: 600px) {
        .container { width: 100% !important; margin: 0 !important; padding: 10px !important; }
        .header { padding: 15px 10px !important; }
        .content { padding: 15px 10px !important; }
        .logo { width: 60px !important; margin: 0 2px 8px 2px !important; }
      }
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
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Booking Confirmation</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Thank you for booking with KH Therapy! Your appointment has been confirmed.</p>
              
              <div class="details">
                <h3>📅 Appointment Details</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Total Amount:</strong> €${data.total_amount}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                ${data.clinic_address ? `<p><strong>Location:</strong> ${data.clinic_address}</p>` : ''}
              </div>
              
              ${data.special_instructions ? `
                <div class="highlight">
                  <h3>📝 Special Instructions</h3>
                  <p>${data.special_instructions}</p>
                </div>
              ` : ''}
              
              <div class="highlight">
                <p><strong>🎯 What's Next?</strong></p>
                <p>• Please arrive 5-10 minutes before your appointment</p>
                <p>• Bring any relevant medical documents or insurance cards</p>
                <p>• Wear comfortable clothing appropriate for your treatment</p>
              </div>
              
              <p>We look forward to seeing you and helping you with your physiotherapy journey!</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>If you need to reschedule or have questions, please contact us.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
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
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Payment Receipt</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Thank you for your payment! Your transaction has been processed successfully.</p>
              
              <div class="details">
                <h3>💳 Payment Details</h3>
                <p><strong>Transaction ID:</strong> ${data.transaction_id}</p>
                <p><strong>Amount:</strong> €${data.payment_amount}</p>
                <p><strong>Date:</strong> ${data.payment_date}</p>
                <p><strong>Service:</strong> ${data.service_name || 'Therapy Session'}</p>
                <p><strong>Status:</strong> <span class="success-icon">✅</span> Completed</p>
              </div>
              
              <div class="highlight">
                <p><strong>📄 Receipt Information</strong></p>
                <p>This email serves as your official receipt for tax and insurance purposes. Please keep this for your records.</p>
              </div>
              
              <p>If you have any questions about this payment or need a formal invoice, please don't hesitate to contact us.</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>Thank you for choosing KH Therapy for your healthcare needs.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
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
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Payment Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>You have a new payment request from KH Therapy. Please review the details below and complete your payment at your convenience.</p>
              
              <div class="details">
                <h3>💰 Payment Details</h3>
                <p><strong>Amount:</strong> €${data.amount}</p>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Due Date:</strong> ${data.due_date}</p>
                ${data.invoice_number ? `<p><strong>Invoice Number:</strong> ${data.invoice_number}</p>` : ''}
              </div>
              
              ${data.payment_url ? `
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${data.payment_url}" class="button" style="color: white !important; text-decoration: none; background: linear-gradient(135deg, #059669 0%, #10B981 100%) !important;">💳 Pay Now</a>
                </div>
                <div class="highlight">
                  <p><strong>🔒 Secure Payment</strong></p>
                  <p>Click the "Pay Now" button above to securely complete your payment using our encrypted payment system. All transactions are protected and processed safely.</p>
                </div>
              ` : ''}
              
              <p>If you have any questions about this payment request or need assistance, please contact us.</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p><strong>Address:</strong> Neilstown Village Court, Neilstown Rd, Clondalkin, D22E8P2</p>
              <p>Thank you for choosing KH Therapy for your healthcare needs.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'invoice_notification':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Invoice Notification</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>You have received a new invoice from KH Therapy. Please find the invoice attached as a PDF file.</p>
              
              <div class="details">
                <h3>📄 Invoice Details</h3>
                <p><strong>Invoice Number:</strong> ${data.invoice_number}</p>
                <p><strong>Amount:</strong> €${data.amount}</p>
                <p><strong>Due Date:</strong> ${data.due_date}</p>
                <p><strong>Service:</strong> ${data.service_name || 'Therapy Session'}</p>
              </div>
              
              <div class="payment-instructions">
                <h3>💳 Payment Instructions</h3>
                <p>You can pay this invoice using any of the following methods:</p>
                <ul style="margin: 15px 0; padding-left: 25px; line-height: 1.8;">
                  <li><strong>🏦 Bank Transfer:</strong> Transfer to our bank account (details below)</li>
                  <li><strong>💻 Online Payment:</strong> We can send you a secure payment link if requested</li>
                  <li><strong>🏢 In-Person:</strong> Pay during your appointment via cash or card</li>
                </ul>
                
                <div class="bank-details">
                  <h4 style="color: white; margin-top: 0;">🏦 Bank Transfer Details</h4>
                  <p style="margin: 8px 0;"><strong>Bank:</strong> Bank of Ireland</p>
                  <p style="margin: 8px 0;"><strong>Account Name:</strong> KH Therapy</p>
                  <p style="margin: 8px 0;"><strong>IBAN:</strong> IE11 BOFI 9001 2140 1957 46</p>
                  <p style="margin: 8px 0;"><strong>BIC:</strong> BOFIIE2DXXX</p>
                  <p style="margin-top: 15px; font-size: 14px; color: #059669; background-color: #d1fae5; padding: 10px; border-radius: 6px;">
                    <strong>📝 Important:</strong> Please include your invoice number (${data.invoice_number}) as the payment reference.
                  </p>
                </div>
              </div>
              
              <div class="highlight">
                <p><strong>📎 Attached Documents</strong></p>
                <p>The invoice PDF is attached to this email. Please review it carefully and contact us if you have any questions about the charges or services listed.</p>
              </div>
              
              <p>If you need assistance with payment or have any questions about this invoice, please don't hesitate to contact us. We're here to help!</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>Thank you for choosing KH Therapy for your healthcare needs.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
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
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Appointment Reminder</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>This is a friendly reminder about your upcoming appointment with KH Therapy.</p>
              
              <div class="details">
                <h3>📅 Appointment Details</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
              </div>
              
              <div class="highlight">
                <p><strong>📋 Before Your Appointment</strong></p>
                <p>• Please arrive 5-10 minutes before your scheduled time</p>
                <p>• Bring any relevant medical documents or insurance cards</p>
                <p>• Wear comfortable clothing appropriate for your treatment</p>
                <p>• If you need to reschedule, please contact us as soon as possible</p>
              </div>
              
              <p>We look forward to seeing you and helping you with your physiotherapy journey!</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>If you need to reschedule or have questions, please contact us.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
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
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Admin Notification</h1>
            </div>
            <div class="content">
              <h2>🔔 New ${data.notification_type}</h2>
              <p>${data.message}</p>
              
              <div class="details">
                <h3>📊 Details</h3>
                ${Object.keys(data.details || {}).map(key => 
                  `<p><strong>${key.replace(/_/g, ' ').toUpperCase()}:</strong> ${data.details[key]}</p>`
                ).join('')}
              </div>
              
              <div class="highlight">
                <p><strong>⚡ Action Required</strong></p>
                <p>Please review this notification and take any necessary action through the admin console.</p>
              </div>
            </div>
            <div class="footer">
              <p><strong>KH Therapy Admin System</strong> | Generated at ${new Date().toLocaleString()}</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
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
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Welcome to KH Therapy</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Welcome to KH Therapy! We're thrilled to have you join our community of patients. Our dedicated team of qualified physiotherapists is committed to helping you achieve your health and wellness goals through personalized, evidence-based treatment.</p>
              
              <div class="details">
                <h3>🏥 Your New Patient Portal</h3>
                <p>We've created a secure online account for you that provides 24/7 access to manage your healthcare journey. Please proceed with your first login using your booking email id as user id and same as password. Your patient portal includes:</p>
                <ul style="margin: 15px 0; padding-left: 25px; line-height: 1.8;">
                  <li><strong>📅 Online Appointment Booking</strong> - Schedule, reschedule, or cancel appointments at your convenience</li>
                  <li><strong>📋 Medical History</strong> - View all your appointments, treatments </li>
                  <li><strong>💳 Financial Management</strong> - Handle payments, view invoices, and manage billing information</li>
                  <li><strong>👤 Profile Management</strong> - Update personal information, emergency contacts, and preferences</li> 
                </ul>
              </div>

              <div class="payment-instructions">
                <h3>🔐 First-Time Login Instructions</h3>
                <p><strong>Important:</strong> Since this is your first time accessing our patient portal, please follow these steps:</p>
                
                <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; margin: 15px 0;">
                  <h4 style="color: white; margin-top: 0; margin-bottom: 10px;">Step 1: Access the Portal</h4>
                  <p style="margin: 0;">Visit our website and click on "Patient Login" or use the button below to go directly to the login page.</p>
                </div>

                <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border: 2px solid #ffc107; margin: 15px 0; box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);">
                  <h4 style="color: #856404; margin-top: 0; margin-bottom: 15px; text-align: center;">🔑 Step 2: Your First-Time Login Credentials</h4>
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #28a745; margin: 10px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #155724;">📧 Your Login Email: <span style="color: #007bff;">${data.customer_email || 'Your registered email address'}</span></p>
                  </div>
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #dc3545; margin: 10px 0;">
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #721c24;">🔐 Your Temporary Password: <span style="color: #dc3545;">Same as your email address</span></p>
                  </div>
                  <div style="background-color: #e7f3ff; padding: 12px; border-radius: 6px; margin: 10px 0; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #0066cc; font-weight: bold;">⚠️ IMPORTANT: Use your email address as both username AND password for first login</p>
                  </div>
                </div>

                <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; margin: 15px 0;">
                  <h4 style="color: white; margin-top: 0; margin-bottom: 10px;">Step 3: Complete Your Profile</h4>
                  <p style="margin: 0;">Once logged in, please update your profile with any missing information and review your emergency contact details.</p>
                </div>

                <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; margin: 15px 0;">
                  <h4 style="color: white; margin-top: 0; margin-bottom: 10px;">Step 4: Explore Your Dashboard</h4>
                  <p style="margin: 0;">Familiarize yourself with the portal features and don't hesitate to contact us if you need assistance navigating the system.</p>
                </div>
              </div>
              
              ${data.login_url ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.login_url}" class="button" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; text-decoration: none; display: inline-block; padding: 14px 28px; border-radius: 8px; margin: 15px 0; font-weight: 600;">🔐 Access Your Patient Portal</a>
                </div>
              ` : `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://khtherapy.netlify.app" class="button" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; text-decoration: none; display: inline-block; padding: 14px 28px; border-radius: 8px; margin: 15px 0; font-weight: 600;">🔐 Go to Patient Login</a>
                </div>
              `}
              
              <div class="highlight">
                <p><strong>🎯 Getting Started with Your Care</strong></p>
                <p>Here's what you can do right away:</p>
                <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.6;">
                  <li><strong>Book Your First Appointment:</strong> Choose from available time slots that suit your schedule</li>
                  <li><strong>Health Questionnaire:</strong> Complete any pre-appointment health assessments if required</li>
                  <li><strong>Insurance Information:</strong> Upload your insurance cards and relevant documentation</li>
                  <li><strong>Medical History:</strong> Provide details about your condition and previous treatments</li>
                  <li><strong>Contact Preferences:</strong> Set how you'd like to receive appointment reminders and updates</li>
                </ul>
              </div>

              <div class="details">
                <h3>🤝 What to Expect</h3>
                <p><strong>Our Commitment to You:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.6;">
                  <li>Personalized treatment plans tailored to your specific needs and goals</li>
                  <li>Regular progress assessments and treatment plan adjustments</li>
                  <li>Professional, compassionate care from qualified physiotherapists</li>
                  <li>Clear communication about your treatment and recovery process</li>
                  <li>Flexible scheduling to accommodate your lifestyle</li>
                  <li>Ongoing support throughout your recovery journey</li>
                </ul>
              </div>

              <div class="highlight">
                <p><strong>📞 Need Help or Have Questions?</strong></p>
                <p>Our patient support team is here to assist you:</p>
                <p>• <strong>Technical Support:</strong> Having trouble with the portal? Call us during business hours</p>
                <p>• <strong>Appointment Questions:</strong> Need help scheduling or have concerns about your visit?</p>
                <p>• <strong>Treatment Inquiries:</strong> Questions about our services or what to expect?</p>
                <p><strong>We're here to help make your experience as smooth as possible!</strong></p>
              </div>
              
              <p>Thank you for choosing KH Therapy. We look forward to partnering with you on your journey to better health and helping you achieve your wellness goals. Your trust in our care means everything to us!</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p><strong>Clinic Address:</strong> KH Therapy Clinic, Dublin, Ireland</p>
              <p><strong>Business Hours:</strong> Monday-Friday 8:00 AM - 6:00 PM | Saturday 9:00 AM - 2:00 PM</p>
              <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                This welcome email contains important information about your patient portal access. 
                Please save this email for your records. If you need assistance, don't hesitate to contact us.
              </p>
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
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>You requested a password reset for your KH Therapy patient account. To create a new password, please click the button below.</p>
              
              ${data.reset_url ? `
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${data.reset_url}" class="button" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; text-decoration: none; display: inline-block; padding: 14px 28px; border-radius: 8px; margin: 15px 0; font-weight: 600;">🔐 Reset Password</a>
                </div>
                
                <div class="highlight">
                  <p><strong>🕒 Important Security Information</strong></p>
                  <p>• This reset link will expire in 24 hours for your security</p>
                  <p>• The link can only be used once</p>
                  <p>• If you didn't request this reset, please ignore this email</p>
                </div>
              ` : ''}
              
              <div class="highlight">
                <p><strong>🛡️ Account Security Tips</strong></p>
                <p>• Use a strong, unique password for your account</p>
                <p>• Never share your login credentials with others</p>
                <p>• Contact us immediately if you suspect unauthorized access</p>
              </div>
              
              <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged. If you have concerns about your account security, please contact us immediately.</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>Your account security is important to us.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
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
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Booking Confirmed - Payment Received</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Excellent! Your booking has been confirmed and your payment has been successfully processed. We're excited to help you on your health journey!</p>
              
              <div class="details">
                <h3>📅 Booking Details</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                ${data.clinic_address ? `<p><strong>Location:</strong> ${data.clinic_address}</p>` : ''}
              </div>
              
              <div class="details">
                <h3>💳 Payment Confirmation</h3>
                <p><strong>Amount Paid:</strong> €${data.payment_amount}</p>
                ${data.transaction_id ? `<p><strong>Transaction ID:</strong> ${data.transaction_id}</p>` : ''}
                <p><strong>Status:</strong> <span class="success-icon">✅ Payment Successful</span></p>
              </div>
              
              ${data.next_steps ? `
                <div class="highlight">
                  <h3>🎯 Next Steps</h3>
                  <p>${data.next_steps}</p>
                </div>
              ` : `
                <div class="highlight">
                  <h3>🎯 Before Your Appointment</h3>
                  <p>• Please arrive 10 minutes early for check-in</p>
                  <p>• Bring any relevant medical documents or insurance cards</p>
                  <p>• Wear comfortable clothing appropriate for your treatment</p>
                  <p>• If you need to reschedule, please contact us at least 24 hours in advance</p>
                </div>
              `}
              
              ${data.special_instructions ? `
                <div class="details">
                  <h3>📝 Special Instructions</h3>
                  <p>${data.special_instructions}</p>
                </div>
              ` : ''}
              
              <p>Thank you for choosing KH Therapy. We look forward to providing you with excellent care and helping you achieve your health goals!</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>For any questions or changes, please contact us.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
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
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Booking Created - Payment Required</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Your booking has been created, but we encountered an issue with your payment. Don't worry - your appointment slot is temporarily reserved while we resolve this.</p>
              
              <div class="details">
                <h3>📅 Booking Details</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                ${data.clinic_address ? `<p><strong>Location:</strong> ${data.clinic_address}</p>` : ''}
              </div>
              
              <div class="details" style="background-color: #fef2f2; border-left: 4px solid #ef4444;">
                <h3>⚠️ Payment Status</h3>
                <p><strong>Amount Due:</strong> €${data.payment_amount}</p>
                <p><strong>Status:</strong> <span class="warning-icon">❌ Payment Failed</span></p>
                <p>Please retry your payment to confirm your booking.</p>
              </div>
              
              <div class="highlight">
                <h3>🔄 What happens next?</h3>
                <p>• Your appointment slot is reserved for 24 hours</p>
                <p>• Please complete payment to confirm your booking</p>
                <p>• You can retry payment by contacting us directly</p>
                <p>• If payment is not received within 24 hours, your slot may be released</p>
              </div>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="mailto:info@khtherapy.ie?subject=Payment Retry - ${data.booking_reference}" class="button" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; text-decoration: none; display: inline-block; padding: 14px 28px; border-radius: 8px; margin: 15px 0; font-weight: 600;">📞 Contact Us to Retry Payment</a>
              </div>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>Need help? Contact us immediately to secure your appointment.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'booking_with_payment_pending':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Booking With Payment Pending</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Great news! Your booking has been successfully created. To secure your appointment, please complete the required deposit payment.</p>
              
              <div class="details">
                <h3>📅 Booking Details</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                ${data.clinic_address ? `<p><strong>Location:</strong> ${data.clinic_address}</p>` : ''}
              </div>
              
              <div class="details" style="background-color: #fef9e7; border-left: 4px solid #f59e0b;">
                <h3>💳 Payment Required</h3>
                <p><strong>Deposit Amount:</strong> 20% of service fee</p>
                <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: 600;">⏳ Payment Pending</span></p>
                <p>A payment request has been sent to you separately. Please complete the deposit to confirm your booking.</p>
              </div>
              
              <div class="highlight">
                <h3>🔄 Next Steps</h3>
                ${data.next_steps ? `<p>${data.next_steps}</p>` : `
                <p>• Check your email for the payment request with secure payment link</p>
                <p>• Complete the 20% deposit payment to confirm your booking</p>
                <p>• You can also pay through your patient dashboard</p>
                <p>• Your appointment slot is reserved while payment is pending</p>
                `}
              </div>
              
              <div class="details">
                <h3>📋 Appointment Preparation</h3>
                <p>Once your payment is confirmed:</p>
                <ul style="margin: 10px 0; padding-left: 25px; line-height: 1.6;">
                  <li>You'll receive a booking confirmation email</li>
                  <li>Please arrive 10 minutes early for your appointment</li>
                  <li>Bring any relevant medical documents or reports</li>
                  <li>Wear comfortable clothing appropriate for treatment</li>
                  <li>Contact us at least 24 hours in advance for any changes</li>
                </ul>
              </div>
              
              ${data.special_instructions ? `
                <div class="details">
                  <h3>📝 Special Instructions</h3>
                  <p>${data.special_instructions}</p>
                </div>
              ` : ''}
              
              <p>Thank you for choosing KH Therapy! We look forward to providing you with excellent care and helping you achieve your health goals.</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>Questions about your booking or payment? Contact us anytime.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
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
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Booking Confirmation</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Thank you for booking with KH Therapy! Your appointment request has been received and confirmed.</p>
              
              <div class="details">
                <h3>📅 Booking Details</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                ${data.clinic_address ? `<p><strong>Location:</strong> ${data.clinic_address}</p>` : ''}
              </div>
              
              <div class="highlight">
                <h3>📋 General Instructions</h3>
                <p>• Please arrive 10 minutes early for your appointment</p>
                <p>• Bring any relevant medical documents or reports</p>
                <p>• Wear comfortable clothing that allows easy movement</p>
                <p>• Please contact us at least 24 hours in advance if you need to reschedule</p>
              </div>
              
              <div class="details">
                <h3>💳 Payment Information</h3>
                <p>Payment can be made at the time of your appointment. We accept:</p>
                <ul style="margin: 10px 0; padding-left: 25px; line-height: 1.6;">
                  <li>💰 Cash payments</li>
                  <li>💳 Card payments (Visa, Mastercard)</li>
                  <li>🏦 Bank transfer (details available on request)</li>
                </ul>
                <p>For questions about rates and services, please contact us directly.</p>
              </div>
              
              ${data.special_instructions ? `
                <div class="details">
                  <h3>📝 Special Instructions</h3>
                  <p>${data.special_instructions}</p>
                </div>
              ` : ''}
              
              <p>We look forward to helping you with your physiotherapy needs and supporting you on your journey to better health!</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>For any questions or changes, please contact us.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'admin_booking_confirmation':
      // Check if this is an admin notification vs customer confirmation
      const isAdminNotification = data.is_admin_notification;
      const customerName = isAdminNotification ? data.original_customer_name : data.customer_name;
      
      if (isAdminNotification) {
        // Special template for admin notifications
        return `
          <!DOCTYPE html>
          <html>
          <head>${commonStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background-color: #dc2626;">
                <div style="text-align: center; margin-bottom: 10px;">
                  <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                  <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
                </div>
                <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">🔔 Admin Alert: Booking Confirmed</h1>
              </div>
              <div class="content">
                <h2>Admin Notification</h2>
                <p><strong>${customerName}'s booking has been confirmed by an administrator.</strong></p>
                
                <div class="details">
                  <h3>📅 Appointment Details:</h3>
                  <p><strong>Customer:</strong> ${customerName}</p>
                  <p><strong>Service:</strong> ${data.service_name}</p>
                  <p><strong>Date:</strong> ${formatDisplayDate(data.appointment_date)}</p>
                  <p><strong>Time:</strong> ${data.appointment_time}</p>
                  <p><strong>Reference:</strong> ${data.booking_reference}</p>
                  <p><strong>Location:</strong> ${data.clinic_address || 'KH Therapy Clinic, Dublin, Ireland'}</p>
                </div>
                
                ${data.special_instructions ? `
                  <div class="details">
                    <h3>📝 Special Instructions:</h3>
                    <p>${data.special_instructions}</p>
                  </div>
                ` : ''}
                
                <div class="details" style="background-color: #fef3c7; border: 1px solid #f59e0b;">
                  <h3>⚠️ Action Required:</h3>
                  <p>• Customer confirmation email has been sent automatically</p>
                  <p>• Calendar invite has been attached to customer email</p>
                  <p>• Appointment is now confirmed in the system</p>
                  <p>• Please ensure all necessary preparations are made</p>
                </div>
                
                <p style="text-align: center; margin: 20px 0;">
                  📧 <strong>This is an automated notification from the KH Therapy booking system.</strong>
                </p>
              </div>
              <div class="footer">
                <p>KH Therapy Booking System | Automated Notification</p>
                <p>Dublin, Ireland</p>
              </div>
            </div>
          </body>
          </html>
        `;
      } else {
        // Original customer confirmation template
        return `
          <!DOCTYPE html>
          <html>
          <head>${commonStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                <div style="text-align: center; margin-bottom: 10px;">
                  <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                  <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
                </div>
                <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">✅ Booking Confirmed!</h1>
              </div>
              <div class="content">
                <h2>Hello ${customerName},</h2>
                <p>Great news! Your booking has been <strong>confirmed</strong> by our team.</p>
                
                <div class="details">
                  <h3>📅 Appointment Details:</h3>
                  <p><strong>Service:</strong> ${data.service_name}</p>
                  <p><strong>Date:</strong> ${formatDisplayDate(data.appointment_date)}</p>
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
      }

    case 'booking_captured':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">📋 Booking Received!</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Thank you for your appointment request! Your booking has been <strong>received</strong> and is currently being reviewed by our physiotherapy team.</p>
              
              <div class="details">
                <h3>📅 Appointment Details:</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                <p><strong>Location:</strong> ${data.clinic_address || 'KH Therapy Clinic, Dublin, Ireland'}</p>
              </div>
              
              ${data.special_instructions ? `
                <div class="details">
                  <h3>📝 Your Notes:</h3>
                  <p>${data.special_instructions}</p>
                </div>
              ` : ''}
              
              <div class="details" style="background-color: #d1fae5; border: 1px solid #10b981;">
                <h3>⏰ What Happens Next:</h3>
                <p>• Our team will review your appointment request</p>
                <p>• You'll receive a payment request for a 20% deposit shortly</p>
                <p>• Once payment is confirmed, your appointment will be officially confirmed</p>
                <p>• We'll send you a final confirmation with all the details</p>
              </div>
              
              <div class="details" style="background-color: #ecfdf5; border: 1px solid #059669;">
                <h3>💡 Important Notes:</h3>
                <p>• Please ensure your contact details are correct</p>
                <p>• If you need to make any changes, contact us immediately</p>
                <p>• Payment secure link will be sent to this email address</p>
                <p>• For urgent queries, call us directly</p>
              </div>
              
              <p style="text-align: center; margin: 20px 0;">
                📧 <strong>We'll be in touch soon with your payment details!</strong>
              </p>
              
              <p>Thank you for choosing KH Therapy for your physiotherapy needs.</p>
            </div>
            <div class="footer">
              <p>KH Therapy | info@khtherapy.ie | Dublin, Ireland</p>
              <p>Questions? Contact us at info@khtherapy.ie</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'contact_form':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">New Contact Form Submission</h1>
            </div>
            <div class="content">
              <h2>📧 New Contact Form Message</h2>
              <p>You have received a new message from your website contact form.</p>
              
              <div class="details">
                <h3>👤 Contact Information</h3>
                <p><strong>Name:</strong> ${data.customer_name}</p>
                <p><strong>Email:</strong> ${data.customer_email}</p>
                <p><strong>Service Interest:</strong> ${data.service_name || 'General Inquiry'}</p>
                <p><strong>Submitted:</strong> ${data.submission_date} at ${data.submission_time}</p>
              </div>
              
              <div class="details">
                <h3>💬 Message</h3>
                <p style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #059669; white-space: pre-wrap;">${data.message}</p>
              </div>
              
              <div class="highlight">
                <p><strong>⚡ Action Required</strong></p>
                <p>Please respond to this inquiry within 24 hours. You can reply directly to <strong>${data.customer_email}</strong> or call them if they provided a phone number.</p>
              </div>
              
              <div class="details">
                <h3>📞 Quick Actions</h3>
                <p>• <a href="mailto:${data.customer_email}?subject=Re: Your inquiry about ${data.service_name || 'our services'}" style="color: #059669; text-decoration: none;">📧 Reply to ${data.customer_name}</a></p>
                <p>• Review their service interest: <strong>${data.service_name || 'General Inquiry'}</strong></p>
                <p>• Consider booking them for a consultation if appropriate</p>
              </div>
            </div>
            <div class="footer">
              <p><strong>KH Therapy Admin System</strong> | Generated at ${new Date().toLocaleString()}</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from your website contact form. Please respond promptly to maintain excellent customer service.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'deposit_payment_received':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">Deposit Payment Received</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Great news! Your deposit payment has been successfully received and processed. Your appointment is now secured and confirmed!</p>
              
              <div class="details">
                <h3>📅 Booking Details</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Date:</strong> ${data.appointment_date}</p>
                <p><strong>Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                ${data.clinic_address ? `<p><strong>Location:</strong> ${data.clinic_address}</p>` : ''}
              </div>
              
              <div class="details">
                <h3>💳 Payment Summary</h3>
                <p><strong>Deposit Paid:</strong> €${data.payment_amount}</p>
                ${data.remaining_balance ? `<p><strong>Remaining Balance:</strong> €${data.remaining_balance} (payable after treatment)</p>` : ''}
                ${data.transaction_id ? `<p><strong>Transaction ID:</strong> ${data.transaction_id}</p>` : ''}
                <p><strong>Status:</strong> <span class="success-icon">✅ Deposit Confirmed</span></p>
              </div>
              
              <div class="highlight">
                <h3>🎯 What's Next?</h3>
                <p>• Your appointment is now confirmed and secured</p>
                <p>• Please arrive 10 minutes early for check-in</p>
                <p>• Bring any relevant medical documents or insurance cards</p>
                <p>• Wear comfortable clothing appropriate for your treatment</p>
                ${data.remaining_balance ? `<p>• The remaining balance of €${data.remaining_balance} will be collected after your session</p>` : ''}
                <p>• If you need to reschedule, please contact us at least 24 hours in advance</p>
              </div>
              
              ${data.special_instructions ? `
                <div class="details">
                  <h3>📝 Special Instructions</h3>
                  <p>${data.special_instructions}</p>
                </div>
              ` : ''}
              
              <div class="highlight" style="background-color: #ecfdf5; border-left: 4px solid #059669;">
                <p><strong>📧 Need to Contact Us?</strong></p>
                <p>Email: info@khtherapy.ie | Phone: +353 83 800 9404</p>
                <p>We're here to help with any questions or concerns!</p>
              </div>
              
              <p>Thank you for choosing KH Therapy. We look forward to providing you with excellent care and helping you achieve your health goals!</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>For any questions or changes, please contact us.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'booking_cancelled':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header" style="background-color: #dc2626; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">🚫 Booking Cancelled</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>We regret to inform you that your appointment has been cancelled by our team. We sincerely apologize for any inconvenience this may cause.</p>
              
              <div class="details" style="background-color: #fef2f2; border-left: 4px solid #ef4444;">
                <h3>📅 Cancelled Appointment Details</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>Original Date:</strong> ${data.appointment_date}</p>
                <p><strong>Original Time:</strong> ${data.appointment_time}</p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                <p><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">❌ CANCELLED</span></p>
              </div>
              
              ${data.cancellation_reason ? `
                <div class="details" style="background-color: #fffbeb; border-left: 4px solid #f59e0b;">
                  <h3>📝 Cancellation Reason</h3>
                  <p>${data.cancellation_reason}</p>
                </div>
              ` : ''}
              
              ${data.has_payment_request ? `
                <div class="details" style="background-color: #ecfdf5; border-left: 4px solid #10b981;">
                  <h3>💳 Payment Information</h3>
                  <p><strong>Payment Request Status:</strong> <span style="color: #10b981; font-weight: bold;">✅ CANCELLED</span></p>
                  <p>Any pending payment requests for this booking have been automatically cancelled. You will not be charged for this appointment.</p>
                  ${data.refund_info ? `<p><strong>Refund Information:</strong> ${data.refund_info}</p>` : ''}
                </div>
              ` : ''}
              
              <div class="highlight" style="background-color: #dbeafe; border-left: 4px solid #3b82f6;">
                <h3>🔄 What happens next?</h3>
                <p>• You are not required to take any action</p>
                <p>• Any pending payments have been automatically cancelled</p>
                <p>• If you had made a payment, our team will contact you about refund processing</p>
                <p>• You are welcome to book a new appointment at any time</p>
                <p>• Our team may contact you to help reschedule if appropriate</p>
              </div>
              
              <div class="highlight" style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9;">
                <h3>📞 Need Assistance?</h3>
                <p>If you have any questions about this cancellation or would like to book a new appointment, please don't hesitate to contact us:</p>
                <p><strong>Email:</strong> info@khtherapy.ie</p>
                <p><strong>Phone:</strong> +353 83 800 9404</p>
                <p>Our team is here to help and we look forward to serving you in the future.</p>
              </div>
              
              <p>We apologize again for any inconvenience and appreciate your understanding. Thank you for choosing KH Therapy.</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>For questions about this cancellation, please contact us.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case 'booking_rescheduled':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header" style="background-color: #2563eb; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">📅 Booking Rescheduled</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Your appointment has been successfully rescheduled. Please note the updated details below and save the new appointment to your calendar.</p>
              
              ${data.old_appointment_date ? `
                <div class="details" style="background-color: #fef2f2; border-left: 4px solid #ef4444;">
                  <h3>❌ Previous Appointment (Cancelled)</h3>
                  <p><strong>Service:</strong> ${data.service_name}</p>
                  <p><strong>Date:</strong> ${data.old_appointment_date}</p>
                  <p><strong>Time:</strong> ${data.old_appointment_time}</p>
                  <p><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">CANCELLED</span></p>
                </div>
              ` : ''}
              
              <div class="details" style="background-color: #ecfdf5; border-left: 4px solid #10b981;">
                <h3>✅ New Appointment Details</h3>
                <p><strong>Service:</strong> ${data.service_name}</p>
                <p><strong>New Date:</strong> <span style="color: #059669; font-weight: bold;">${data.appointment_date}</span></p>
                <p><strong>New Time:</strong> <span style="color: #059669; font-weight: bold;">${data.appointment_time}</span></p>
                <p><strong>Reference:</strong> ${data.booking_reference}</p>
                ${data.therapist_name ? `<p><strong>Therapist:</strong> ${data.therapist_name}</p>` : ''}
                <p><strong>Location:</strong> ${data.clinic_address || 'KH Therapy Clinic, Dublin, Ireland'}</p>
                <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">✅ CONFIRMED</span></p>
              </div>
              
              ${data.reschedule_reason ? `
                <div class="details" style="background-color: #fffbeb; border-left: 4px solid #f59e0b;">
                  <h3>📝 Reschedule Reason</h3>
                  <p>${data.reschedule_reason}</p>
                </div>
              ` : ''}
              
              ${data.special_instructions ? `
                <div class="details" style="background-color: #f8fafc; border-left: 4px solid #64748b;">
                  <h3>📋 Special Instructions</h3>
                  <p>${data.special_instructions}</p>
                </div>
              ` : ''}
              
              <div class="highlight" style="background-color: #dbeafe; border-left: 4px solid #3b82f6;">
                <h3>📋 Important Reminders</h3>
                <p>• Please arrive 10 minutes early for your new appointment</p>
                <p>• Bring any relevant medical documents or reports</p>
                <p>• Wear comfortable clothing suitable for physical examination</p>
                <p>• A new calendar invite has been attached to this email</p>
                <p>• If you need to make further changes, please contact us at least 24 hours in advance</p>
              </div>
              
              ${data.reschedule_note ? `
                <div class="highlight" style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9;">
                  <h3>💬 Additional Information</h3>
                  <p>${data.reschedule_note}</p>
                </div>
              ` : ''}
              
              <p style="text-align: center; margin: 20px 0;">
                📧 <strong>A new calendar invite has been attached to help you save this updated appointment to your calendar.</strong>
              </p>
              
              <div class="highlight" style="background-color: #ecfdf5; border-left: 4px solid #059669;">
                <p><strong>📧 Need to Contact Us?</strong></p>
                <p>Email: info@khtherapy.ie | Phone: +353 83 800 9404</p>
                <p>We're here to help with any questions or concerns about your rescheduled appointment!</p>
              </div>
              
              <p>Thank you for your flexibility, and we look forward to seeing you at your new appointment time!</p>
            </div>
            <div class="footer">
              <p><strong>KH Therapy</strong> | 📧 info@khtherapy.ie | 📞 +353 83 800 9404</p>
              <p>For any questions or further changes, please contact us.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">This email was sent from an automated system. Please do not reply directly to this email.</p>
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
            <div class="header" style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="text-align: center; margin-bottom: 10px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="width: 80px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px; border-radius: 8px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="width: 100px; height: auto; display: inline-block; vertical-align: middle; margin: 0 4px;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 1px 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(255,255,255,0.6);">KH Therapy</h1>
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
    const { emailType, recipientEmail, data, subject, attachments } = JSON.parse(event.body);

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
    await transporter.verify();

    // Generate email content
    const htmlContent = getEmailTemplate(emailType, data);

    // Default subject if not provided
    const emailSubject = subject || `KH Therapy - ${emailType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;

    // Email options
    const mailOptions = {
      from: {
        name: data.is_admin_notification ? 'KH Therapy System' : 'KH Therapy',
        address: process.env.SMTP_USER || 'info@khtherapy.ie'
      },
      to: recipientEmail,
      subject: emailSubject,
      html: htmlContent,
      // Add headers to improve deliverability
      headers: {
        'X-Mailer': 'KH Therapy Booking System',
        'X-Priority': data.is_admin_notification ? '1' : '3',
        'X-MSMail-Priority': data.is_admin_notification ? 'High' : 'Normal',
        'Reply-To': process.env.SMTP_USER || 'info@khtherapy.ie',
        'Message-ID': `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@khtherapy.ie>`,
        'Return-Path': process.env.SMTP_USER || 'info@khtherapy.ie',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'List-Unsubscribe': '<mailto:noreply@khtherapy.ie?subject=unsubscribe>',
        'Precedence': data.is_admin_notification ? 'special-delivery' : 'bulk'
      }
    };

    // Special handling for admin notifications
    if (data.is_admin_notification && recipientEmail === (process.env.SMTP_USER || 'info@khtherapy.ie')) {
      mailOptions.from.name = 'KH Therapy Booking System';
      mailOptions.headers['X-Admin-Notification'] = 'true';
      mailOptions.headers['X-Booking-Reference'] = data.booking_reference || 'N/A';
      mailOptions.headers['X-Same-Domain-Delivery'] = 'true';
      
      // Try using BCC as an alternative delivery method for same-domain emails
      if (process.env.ADMIN_BCC_EMAIL) {
        mailOptions.bcc = process.env.ADMIN_BCC_EMAIL;
      }
      
      // Enhanced headers for same-domain delivery instead of changing sender
      mailOptions.headers['X-Priority'] = '1'; // High priority
      mailOptions.headers['X-MSMail-Priority'] = 'High';
      mailOptions.headers['Importance'] = 'High';
      mailOptions.headers['X-Original-Sender'] = process.env.SMTP_USER || 'info@khtherapy.ie';
      mailOptions.headers['Auto-Submitted'] = 'auto-generated';
      mailOptions.headers['X-Auto-Response-Suppress'] = 'All';
      mailOptions.headers['X-Spam-Status'] = 'No';
      
      // Try to make it look less like automated email to avoid filtering
      mailOptions.from.name = `KH Therapy Admin (${new Date().toLocaleDateString()})`;
    }

    // Add calendar attachment for booking confirmations and rescheduling
    const emailTypesWithCalendar = ['admin_booking_confirmation', 'booking_rescheduled'];
    
    if (emailTypesWithCalendar.includes(emailType) && data.appointment_date && data.appointment_time) {
      console.log(`📅 Generating ICS calendar file for ${emailType}`);
      const isRescheduled = emailType === 'booking_rescheduled';
      const icsContent = generateICS(data, isRescheduled);
      
      // Only add attachment if ICS content was generated successfully
      if (icsContent && icsContent.length > 0) {
        console.log(`✅ ICS calendar file generated successfully. Size: ${icsContent.length} characters`);
        const filename = isRescheduled ? 'rescheduled_appointment.ics' : 'appointment.ics';
        
        mailOptions.attachments = [
          {
            filename: filename,
            content: icsContent,
            contentType: 'text/calendar; charset=utf-8; method=REQUEST'
          }
        ];
        console.log(`📎 ICS attachment added to email with filename: ${filename}`);
      } else {
        console.warn(`⚠️ Failed to generate ICS content for ${emailType}. ICS content:`, icsContent);
      }
    }

    // Add general attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      if (!mailOptions.attachments) {
        mailOptions.attachments = [];
      }
      
      // Add each attachment
      attachments.forEach(attachment => {
        if (attachment.filename && attachment.content) {
          try {
            // Validate base64 content for PDFs
            if (attachment.contentType === 'application/pdf') {
              // Check if content starts with PDF header when converted to buffer
              const buffer = Buffer.from(attachment.content, 'base64');
              const pdfHeader = buffer.toString('ascii', 0, 4);
              
              console.log(`PDF Attachment Processing:`);
              console.log(`- Filename: ${attachment.filename}`);
              console.log(`- Base64 length: ${attachment.content.length}`);
              console.log(`- Buffer size: ${buffer.length} bytes`);
              console.log(`- PDF header: ${pdfHeader} (should be %PDF)`);
              
              if (pdfHeader !== '%PDF') {
                console.warn(`Warning: PDF attachment may be corrupted - header is "${pdfHeader}" instead of "%PDF"`);
              }
            }
            
            mailOptions.attachments.push({
              filename: attachment.filename,
              content: Buffer.from(attachment.content, 'base64'),
              contentType: attachment.contentType || 'application/octet-stream'
            });
          } catch (error) {
            console.error(`Error processing attachment ${attachment.filename}:`, error);
            // Skip this attachment but continue with others
          }
        }
      });
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
