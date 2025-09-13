import React from 'react';
import Container from '../components/shared/Container';
import SEOHead from '../components/utils/SEOHead';
import { Shield, Cookie, Database, Settings, Eye, Lock } from 'lucide-react';

const CookiePolicyPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Cookie Policy - KH Therapy"
        description="Learn about how KH Therapy uses cookies to improve your experience on our website. GDPR compliant cookie policy for our physiotherapy services."
        canonicalUrl="/cookie-policy"
      />
      <Container>
        <div className="py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                <Cookie className="w-8 h-8 text-[#71db77]" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-800 mb-4">
              Cookie Policy
            </h1>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              This policy explains how KH Therapy uses cookies and similar technologies on our website
            </p>
            <p className="text-sm text-neutral-500 mt-4">
              Last updated: {new Date().toLocaleDateString('en-IE', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* What are Cookies */}
            <section className="bg-white rounded-xl p-8 shadow-sm border border-green-100">
              <div className="flex items-center mb-6">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <Database className="w-6 h-6 text-[#71db77]" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-800">What are Cookies?</h2>
              </div>
              <div className="prose prose-lg text-neutral-700">
                <p>
                  Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit our website. 
                  They help us provide you with a better experience by remembering your preferences and analyzing how our website is used.
                </p>
                <p>
                  As a healthcare provider, we are committed to protecting your privacy while ensuring our website functions effectively 
                  to help you access our physiotherapy services.
                </p>
              </div>
            </section>

            {/* Types of Cookies */}
            <section className="bg-white rounded-xl p-8 shadow-sm border border-green-100">
              <div className="flex items-center mb-6">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <Settings className="w-6 h-6 text-[#71db77]" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-800">Types of Cookies We Use</h2>
              </div>

              <div className="space-y-6">
                {/* Essential Cookies */}
                <div className="border-l-4 border-green-500 pl-6">
                  <h3 className="text-xl font-semibold text-neutral-800 mb-2">
                    Essential Cookies (Always Active)
                  </h3>
                  <p className="text-neutral-700 mb-3">
                    These cookies are necessary for our website to function properly and cannot be disabled.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-neutral-600">
                    <li>Session management for secure login to patient portal</li>
                    <li>Booking system functionality and appointment scheduling</li>
                    <li>Payment processing security for our services</li>
                    <li>Form submission and data validation</li>
                    <li>Website security and fraud prevention</li>
                  </ul>
                </div>

                {/* Functional Cookies */}
                <div className="border-l-4 border-blue-500 pl-6">
                  <h3 className="text-xl font-semibold text-neutral-800 mb-2">
                    Functional Cookies
                  </h3>
                  <p className="text-neutral-700 mb-3">
                    These cookies enhance your experience by remembering your preferences.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-neutral-600">
                    <li>Language and location preferences</li>
                    <li>Accessibility settings (font size, contrast)</li>
                    <li>Previously selected appointment types</li>
                    <li>Form auto-fill for returning patients</li>
                  </ul>
                </div>

                {/* Analytics Cookies */}
                <div className="border-l-4 border-purple-500 pl-6">
                  <h3 className="text-xl font-semibold text-neutral-800 mb-2">
                    Analytics Cookies
                  </h3>
                  <p className="text-neutral-700 mb-3">
                    These help us understand how patients use our website to improve our services.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-neutral-600">
                    <li>Google Analytics (anonymized data)</li>
                    <li>Page views and popular content tracking</li>
                    <li>Booking funnel optimization</li>
                    <li>Website performance monitoring</li>
                  </ul>
                  <div className="bg-blue-50 p-4 rounded-lg mt-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> All analytics data is anonymized and aggregated. 
                      No personal health information is collected through these cookies.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Healthcare Specific Information */}
            <section className="bg-green-50 rounded-xl p-8 border border-green-200">
              <div className="flex items-center mb-6">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <Shield className="w-6 h-6 text-[#71db77]" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-800">Healthcare Data Protection</h2>
              </div>
              <div className="space-y-4 text-neutral-700">
                <p>
                  As a registered physiotherapy practice in Ireland, we adhere to strict healthcare data protection standards:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>GDPR Compliance:</strong> All cookie usage complies with EU General Data Protection Regulation</li>
                  <li><strong>Healthcare Privacy:</strong> We follow Irish Health Service Executive (HSE) privacy guidelines</li>
                  <li><strong>Data Minimization:</strong> We only collect cookies necessary for providing our services</li>
                  <li><strong>No Health Data in Cookies:</strong> Personal health information is never stored in cookies</li>
                  <li><strong>Secure Transmission:</strong> All cookies are transmitted over encrypted connections (HTTPS)</li>
                </ul>
              </div>
            </section>

            {/* Third-Party Services */}
            <section className="bg-white rounded-xl p-8 shadow-sm border border-green-100">
              <div className="flex items-center mb-6">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <Eye className="w-6 h-6 text-[#71db77]" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-800">Third-Party Services</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">Google Services</h3>
                  <ul className="list-disc list-inside space-y-1 text-neutral-600">
                    <li><strong>Google Analytics:</strong> Website usage analytics (anonymized)</li>
                    <li><strong>Google Maps:</strong> Location services for our clinic</li>
                    <li><strong>Google Reviews:</strong> Display of patient testimonials</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">Payment Processing</h3>
                  <ul className="list-disc list-inside space-y-1 text-neutral-600">
                    <li><strong>SumUp:</strong> Secure payment processing for appointments</li>
                    <li><strong>Stripe:</strong> Alternative payment gateway (if applicable)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">Website Infrastructure</h3>
                  <ul className="list-disc list-inside space-y-1 text-neutral-600">
                    <li><strong>Netlify:</strong> Website hosting and content delivery</li>
                    <li><strong>Supabase:</strong> Secure database for appointment management</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Managing Cookies */}
            <section className="bg-white rounded-xl p-8 shadow-sm border border-green-100">
              <div className="flex items-center mb-6">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <Lock className="w-6 h-6 text-[#71db77]" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-800">Managing Your Cookie Preferences</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-3">Browser Settings</h3>
                  <p className="text-neutral-700 mb-4">
                    You can control cookies through your browser settings. Here's how to manage cookies in popular browsers:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-neutral-800 mb-2">Chrome</h4>
                      <p className="text-sm text-neutral-600">Settings → Privacy and Security → Cookies and other site data</p>
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-neutral-800 mb-2">Firefox</h4>
                      <p className="text-sm text-neutral-600">Settings → Privacy & Security → Cookies and Site Data</p>
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-neutral-800 mb-2">Safari</h4>
                      <p className="text-sm text-neutral-600">Preferences → Privacy → Manage Website Data</p>
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-neutral-800 mb-2">Edge</h4>
                      <p className="text-sm text-neutral-600">Settings → Site permissions → Cookies and stored data</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    <strong>Important:</strong> Disabling essential cookies may affect the functionality of our booking system 
                    and patient portal. Some features may not work properly if you disable all cookies.
                  </p>
                </div>
              </div>
            </section>

            {/* Data Retention */}
            <section className="bg-white rounded-xl p-8 shadow-sm border border-green-100">
              <h2 className="text-2xl font-bold text-neutral-800 mb-6">Cookie Retention Periods</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-neutral-800 mb-2">Session Cookies</h3>
                    <p className="text-sm text-neutral-600">Deleted when you close your browser</p>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-neutral-800 mb-2">Functional Cookies</h3>
                    <p className="text-sm text-neutral-600">Stored for up to 12 months</p>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-neutral-800 mb-2">Analytics Cookies</h3>
                    <p className="text-sm text-neutral-600">Stored for up to 24 months</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Your Rights */}
            <section className="bg-green-50 rounded-xl p-8 border border-green-200">
              <h2 className="text-2xl font-bold text-neutral-800 mb-6">Your Rights Under GDPR</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-3">You have the right to:</h3>
                  <ul className="list-disc list-inside space-y-2 text-neutral-700">
                    <li>Be informed about our cookie usage</li>
                    <li>Access information about cookies we use</li>
                    <li>Withdraw consent for non-essential cookies</li>
                    <li>Request deletion of your cookie data</li>
                    <li>Object to processing for marketing purposes</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-3">How to exercise your rights:</h3>
                  <div className="space-y-3">
                    <p className="text-neutral-700">
                      <strong>Email:</strong> <a href="mailto:privacy@khtherapy.ie" className="text-[#71db77] hover:underline">privacy@khtherapy.ie</a>
                    </p>
                    <p className="text-neutral-700">
                      <strong>General Contact:</strong> <a href="mailto:info@khtherapy.ie" className="text-[#71db77] hover:underline">info@khtherapy.ie</a>
                    </p>
                    <p className="text-neutral-700">
                      <strong>Response Time:</strong> We respond within 30 days
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section className="bg-white rounded-xl p-8 shadow-sm border border-green-100">
              <h2 className="text-2xl font-bold text-neutral-800 mb-6">Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-3">KH Therapy</h3>
                  <div className="space-y-2 text-neutral-700">
                    <p>Registered Physiotherapy Practice</p>
                    <p>Dublin, Ireland</p>
                    <p>Email: <a href="mailto:info@khtherapy.ie" className="text-[#71db77] hover:underline">info@khtherapy.ie</a></p>
                    <p>Privacy: <a href="mailto:privacy@khtherapy.ie" className="text-[#71db77] hover:underline">privacy@khtherapy.ie</a></p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-3">Data Protection Officer</h3>
                  <div className="space-y-2 text-neutral-700">
                    <p>For privacy and data protection inquiries</p>
                    <p>Email: <a href="mailto:privacy@khtherapy.ie" className="text-[#71db77] hover:underline">privacy@khtherapy.ie</a></p>
                    <p>We respond to all inquiries within 30 days as required by GDPR</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Updates */}
            <section className="bg-blue-50 rounded-xl p-8 border border-blue-200">
              <h2 className="text-2xl font-bold text-neutral-800 mb-4">Policy Updates</h2>
              <div className="space-y-4 text-neutral-700">
                <p>
                  We may update this Cookie Policy from time to time to reflect changes in our practices, 
                  technology, or legal requirements. When we make significant changes, we will:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Update the "Last updated" date at the top of this policy</li>
                  <li>Notify registered patients via email if changes affect their data</li>
                  <li>Display a notice on our website about policy updates</li>
                  <li>Request fresh consent for any new cookie types</li>
                </ul>
                <p className="text-sm text-neutral-600 mt-4">
                  We encourage you to review this policy periodically to stay informed about our cookie practices.
                </p>
              </div>
            </section>

          </div>

          {/* Action Buttons */}
          <div className="text-center mt-12">
            <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex md:justify-center">
              <a 
                href="/privacy-policy"
                className="inline-flex items-center px-6 py-3 bg-white text-[#71db77] border-2 border-[#71db77] rounded-lg hover:bg-green-50 transition-colors duration-300"
              >
                View Privacy Policy
              </a>
              <a 
                href="/contact"
                className="inline-flex items-center px-6 py-3 bg-[#71db77] text-white rounded-lg hover:bg-[#5fcf68] transition-colors duration-300"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default CookiePolicyPage;