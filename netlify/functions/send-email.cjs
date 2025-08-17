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
      body { font-family: 'Inter', 'Roboto', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border-radius: 12px; }
      .header { background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 25px 20px; text-align: center; border-radius: 12px 12px 0 0; position: relative; }
      .logo { max-width: 120px; height: auto; margin-bottom: 10px; background: white; padding: 8px; border-radius: 8px; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
      .content { padding: 25px 20px; background-color: #ffffff; }
      .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb; }
      .button { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; text-decoration: none; border-radius: 8px; margin: 15px 0; font-weight: 600; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2); transition: all 0.3s ease; }
      .button:hover { background: linear-gradient(135deg, #047857 0%, #059669 100%); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3); }
      .details { background-color: #f0fdf4; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #10B981; }
      .details h3 { color: #047857; margin-top: 0; margin-bottom: 15px; font-size: 18px; }
      .highlight { background-color: #d1fae5; border: 1px solid #a7f3d0; color: #065f46; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .payment-instructions { background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 10px; margin: 20px 0; }
      .payment-instructions h3 { color: #047857; margin-top: 0; }
      .bank-details { background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; margin-top: 15px; }
      .success-icon { color: #059669; font-size: 20px; }
      .warning-icon { color: #f59e0b; font-size: 18px; }
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
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">Booking Confirmation</h1>
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
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">Payment Receipt</h1>
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
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">Payment Request</h1>
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
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">Invoice Notification</h1>
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
                  <h4 style="color: #047857; margin-top: 0;">🏦 Bank Transfer Details</h4>
                  <p style="margin: 8px 0;"><strong>Bank:</strong> Bank of Ireland</p>
                  <p style="margin: 8px 0;"><strong>Account Name:</strong> KH Therapy</p>
                  <p style="margin: 8px 0;"><strong>IBAN:</strong> IE00 BOFI 1234 5678 9012 34</p>
                  <p style="margin: 8px 0;"><strong>BIC:</strong> BOFIIE2D</p>
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
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">Appointment Reminder</h1>
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
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">Admin Notification</h1>
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
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">Welcome to KH Therapy</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>Welcome to KH Therapy! We're thrilled to have you join our community of patients. Our dedicated team of qualified physiotherapists is committed to helping you achieve your health and wellness goals through personalized, evidence-based treatment.</p>
              
              <div class="details">
                <h3>🏥 Your New Patient Portal</h3>
                <p>We've created a secure online account for you that provides 24/7 access to manage your healthcare journey. Your patient portal includes:</p>
                <ul style="margin: 15px 0; padding-left: 25px; line-height: 1.8;">
                  <li><strong>📅 Online Appointment Booking</strong> - Schedule, reschedule, or cancel appointments at your convenience</li>
                  <li><strong>📋 Complete Medical History</strong> - View all your appointments, treatments, and progress notes</li>
                  <li><strong>💳 Financial Management</strong> - Handle payments, view invoices, and manage billing information</li>
                  <li><strong>📄 Document Access</strong> - Download receipts, treatment summaries, and insurance forms</li>
                  <li><strong>👤 Profile Management</strong> - Update personal information, emergency contacts, and preferences</li>
                  <li><strong>📞 Direct Communication</strong> - Secure messaging with your therapy team</li>
                  <li><strong>📈 Progress Tracking</strong> - Monitor your recovery journey and treatment outcomes</li>
                </ul>
              </div>

              <div class="payment-instructions">
                <h3>🔐 First-Time Login Instructions</h3>
                <p><strong>Important:</strong> Since this is your first time accessing our patient portal, please follow these steps:</p>
                
                <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; margin: 15px 0;">
                  <h4 style="color: #047857; margin-top: 0; margin-bottom: 10px;">Step 1: Access the Portal</h4>
                  <p style="margin: 0;">Visit our website and click on "Patient Login" or use the button below to go directly to the login page.</p>
                </div>

                <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; margin: 15px 0;">
                  <h4 style="color: #047857; margin-top: 0; margin-bottom: 10px;">Step 2: Set Up Your Password</h4>
                  <p style="margin: 0;"><strong>Email:</strong> ${data.customer_email || 'Your registered email address'}</p>
                  <p style="margin: 5px 0 0 0;">Click "Forgot Password?" to create your secure password. You'll receive a password reset email with instructions.</p>
                </div>

                <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; margin: 15px 0;">
                  <h4 style="color: #047857; margin-top: 0; margin-bottom: 10px;">Step 3: Complete Your Profile</h4>
                  <p style="margin: 0;">Once logged in, please update your profile with any missing information and review your emergency contact details.</p>
                </div>

                <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; margin: 15px 0;">
                  <h4 style="color: #047857; margin-top: 0; margin-bottom: 10px;">Step 4: Explore Your Dashboard</h4>
                  <p style="margin: 0;">Familiarize yourself with the portal features and don't hesitate to contact us if you need assistance navigating the system.</p>
                </div>
              </div>
              
              ${data.login_url ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.login_url}" class="button">🔐 Access Your Patient Portal</a>
                </div>
              ` : `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://khtherapy.netlify.app" class="button">🔐 Go to Patient Login</a>
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
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello ${data.customer_name},</h2>
              <p>You requested a password reset for your KH Therapy patient account. To create a new password, please click the button below.</p>
              
              ${data.reset_url ? `
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${data.reset_url}" class="button">🔐 Reset Password</a>
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
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">Booking Confirmed - Payment Received</h1>
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
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">Booking Created - Payment Required</h1>
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
                <a href="mailto:info@khtherapy.ie?subject=Payment Retry - ${data.booking_reference}" class="button">📞 Contact Us to Retry Payment</a>
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

    case 'booking_confirmation_no_payment':
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">Booking Confirmation</h1>
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
                <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                  <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                  <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
                </div>
                <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">🔔 Admin Alert: Booking Confirmed</h1>
              </div>
              <div class="content">
                <h2>Admin Notification</h2>
                <p><strong>${customerName}'s booking has been confirmed by an administrator.</strong></p>
                
                <div class="details">
                  <h3>📅 Appointment Details:</h3>
                  <p><strong>Customer:</strong> ${customerName}</p>
                  <p><strong>Service:</strong> ${data.service_name}</p>
                  <p><strong>Date:</strong> ${data.appointment_date}</p>
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
              <div class="header">
                <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                  <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                  <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
                </div>
                <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">✅ Booking Confirmed!</h1>
              </div>
              <div class="content">
                <h2>Hello ${customerName},</h2>
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
      }

    default:
      return `
        <!DOCTYPE html>
        <html>
        <head>${commonStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;">
                <img src="https://khtherapy.netlify.app/Logo.png" alt="KH Therapy Logo" class="logo" style="max-width: 100px;" />
                <img src="https://khtherapy.netlify.app/KHtherapy.png" alt="KH Therapy" style="max-width: 120px; height: auto;" />
              </div>
              <h1 style="color: white; margin: 5px 0 0 0; font-size: 24px; font-weight: 600;">KH Therapy</h1>
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
