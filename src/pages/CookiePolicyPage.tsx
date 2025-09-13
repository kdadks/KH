import React from 'react';
import SEOHead from '../components/utils/SEOHead';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';

const CookiePolicyPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Cookie Policy - KH Therapy"
        description="Learn about how KH Therapy uses cookies to improve your experience on our website. GDPR compliant cookie policy for our physiotherapy services."
        canonicalUrl="/cookie-policy"
      />
      <main className="py-16 bg-gray-50">
        <Container>
          <SectionHeading title="Cookie Policy" />
          <div className="mt-6 space-y-4 text-gray-600">
            <p>Last updated: {new Date().toLocaleDateString('en-IE', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            
            <h3 className="text-lg font-semibold">1. What are Cookies?</h3>
            <p>Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and analyzing how our website is used. As a healthcare provider, we are committed to protecting your privacy while ensuring our website functions effectively.</p>
            
            <h3 className="text-lg font-semibold">2. Types of Cookies We Use</h3>
            
            <h4 className="text-md font-medium mt-4 mb-2">Essential Cookies (Always Active)</h4>
            <p>These cookies are necessary for our website to function properly and cannot be disabled:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Session management for secure login to patient portal</li>
              <li>Booking system functionality and appointment scheduling</li>
              <li>Payment processing security for our services</li>
              <li>Form submission and data validation</li>
              <li>Website security and fraud prevention</li>
            </ul>
            
            <h4 className="text-md font-medium mt-4 mb-2">Functional Cookies</h4>
            <p>These cookies enhance your experience by remembering your preferences:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Language and location preferences</li>
              <li>Accessibility settings (font size, contrast)</li>
              <li>Previously selected appointment types</li>
              <li>Form auto-fill for returning patients</li>
            </ul>
            
            <h4 className="text-md font-medium mt-4 mb-2">Analytics Cookies</h4>
            <p>We use Google Analytics to understand how visitors interact with our website. These cookies help us improve our services by providing insights into:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Most popular pages and services</li>
              <li>User journey through the booking process</li>
              <li>Device and browser usage statistics</li>
              <li>Geographic location of visitors (anonymized)</li>
            </ul>
            
            <h3 className="text-lg font-semibold">3. Third-Party Services</h3>
            <p>We use the following third-party services that may set cookies:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Google Analytics:</strong> For website analytics and performance monitoring</li>
              <li><strong>SumUp:</strong> For secure payment processing of physiotherapy services</li>
              <li><strong>Supabase:</strong> For secure database management and user authentication</li>
            </ul>
            
            <h3 className="text-lg font-semibold">4. Managing Your Cookie Preferences</h3>
            <p>You can control cookies through your browser settings. Most browsers allow you to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>View and delete cookies</li>
              <li>Block cookies from specific websites</li>
              <li>Block third-party cookies</li>
              <li>Delete all cookies when you close your browser</li>
            </ul>
            <p>Please note that disabling certain cookies may limit the functionality of our website, particularly our booking system and patient portal.</p>
            
            <h3 className="text-lg font-semibold">5. Your Rights Under GDPR</h3>
            <p>As a healthcare provider operating in Ireland, we respect your rights under GDPR. You have the right to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Correct any inaccurate or incomplete data</li>
              <li>Request deletion of your data (where legally permissible)</li>
              <li>Object to or restrict certain processing activities</li>
              <li>Data portability for your booking and treatment records</li>
            </ul>
            
            <h3 className="text-lg font-semibold">6. Healthcare Data Protection</h3>
            <p>We follow strict healthcare data protection standards to ensure your medical information remains confidential and secure. All cookies related to your patient data are encrypted and stored securely in compliance with Irish healthcare regulations.</p>
            
            <h3 className="text-lg font-semibold">7. Changes to This Policy</h3>
            <p>We may update this Cookie Policy from time to time to reflect changes in our practices or for legal and regulatory reasons. We will notify you of any significant changes by posting the updated policy on our website.</p>
            
            <h3 className="text-lg font-semibold">8. Contact Us</h3>
            <p>If you have any questions about our use of cookies or this policy, please contact us at <a href="mailto:info@khtherapy.ie" className="text-primary-600 hover:underline">info@khtherapy.ie</a>.</p>
            
            <p className="text-sm text-gray-500 mt-8">
              For data protection inquiries specifically, you can also reach us at: <a href="mailto:info@khtherapy.ie" className="text-primary-600 hover:underline">info@khtherapy.ie</a>
            </p>
          </div>
        </Container>
      </main>
    </>
  );
};

export default CookiePolicyPage;