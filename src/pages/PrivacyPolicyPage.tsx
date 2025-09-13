import React from 'react';
import SEOHead from '../components/utils/SEOHead';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Privacy Policy - KH Therapy"
        description="Read KH Therapy's comprehensive privacy policy regarding data collection, usage, and protection under GDPR."
        canonicalUrl="/privacy-policy"
      />
      <main className="py-16 bg-gray-50">
        <Container>
          <SectionHeading title="Privacy Policy" />
          <div className="mt-6 space-y-6 text-gray-700 leading-relaxed">
            <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">GDPR Compliance Statement</h3>
              <p className="text-blue-700">
                KH Therapy is committed to protecting your privacy and complying with the General Data Protection Regulation (GDPR). 
                This policy explains how we collect, use, store, and protect your personal data.
              </p>
            </div>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-800">Personal Data:</h4>
                  <p>We collect personal information such as your name, email address, phone number, address, date of birth, emergency contact details, and medical notes when you book appointments or register for our services.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Technical Data:</h4>
                  <p>We automatically collect certain technical information including IP address, browser type, device information, and usage patterns through cookies and similar technologies.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Health Data:</h4>
                  <p>As a healthcare provider, we may collect special categories of personal data related to your health and medical history necessary for providing physiotherapy services.</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Legal Basis for Processing</h3>
              <p>We process your personal data based on the following legal grounds:</p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li><strong>Consent:</strong> For marketing communications and optional services</li>
                <li><strong>Contract:</strong> To provide healthcare services you have requested</li>
                <li><strong>Legitimate Interest:</strong> For service improvement and security purposes</li>
                <li><strong>Legal Obligation:</strong> To comply with healthcare regulations and tax requirements</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h3>
              <p>Your information is used to:</p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Schedule and manage your appointments</li>
                <li>Provide physiotherapy and healthcare services</li>
                <li>Communicate with you about your treatment and appointments</li>
                <li>Process payments and manage invoices</li>
                <li>Improve our services and website functionality</li>
                <li>Send marketing communications (with your consent)</li>
                <li>Comply with legal and regulatory requirements</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4. Data Security & Encryption</h3>
              <div className="space-y-3">
                <p>We implement appropriate technical and organizational measures to protect your data:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Encryption:</strong> Sensitive personal data is encrypted using AES-256 encryption</li>
                  <li><strong>Password Security:</strong> All passwords are hashed using bcrypt with salt rounds</li>
                  <li><strong>Access Controls:</strong> Role-based access controls and row-level security</li>
                  <li><strong>Secure Communications:</strong> All data transmission is protected by HTTPS/TLS</li>
                  <li><strong>Regular Updates:</strong> Security patches and updates are applied regularly</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing & Third Parties</h3>
              <p>We may share your personal data with:</p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li><strong>Payment Processors:</strong> SumUp for secure payment processing</li>
                <li><strong>Email Services:</strong> EmailJS for appointment confirmations and communications</li>
                <li><strong>Healthcare Providers:</strong> Other healthcare professionals involved in your care (with consent)</li>
                <li><strong>Legal Requirements:</strong> Authorities when required by law</li>
              </ul>
              <p className="mt-2">We will never sell your personal data to third parties for marketing purposes.</p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h3>
              <div className="space-y-3">
                <p>We retain your personal data for the following periods:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Customer Data:</strong> 7 years from last activity (healthcare standard)</li>
                  <li><strong>Booking Records:</strong> 10 years for regulatory compliance</li>
                  <li><strong>Payment Data:</strong> 7 years for tax and accounting purposes</li>
                  <li><strong>Marketing Data:</strong> 3 years or until consent is withdrawn</li>
                  <li><strong>Session Logs:</strong> 1 year for security purposes</li>
                </ul>
                <p>After these periods, data is automatically anonymized or securely deleted.</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights Under GDPR</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-medium text-green-800 mb-2">You have the following rights regarding your personal data:</p>
                <ul className="list-disc list-inside space-y-2 text-green-700">
                  <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
                  <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your data</li>
                  <li><strong>Right to Data Portability:</strong> Receive your data in a structured format</li>
                  <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
                  <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
                  <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for consent-based processing</li>
                </ul>
              </div>
              <p className="mt-3">
                To exercise these rights, please contact us using the information below or use the privacy settings in your patient portal.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies and Tracking</h3>
              <p>We use cookies and similar technologies to enhance your experience on our website. Our cookies include:</p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li><strong>Essential Cookies:</strong> Required for website functionality</li>
                <li><strong>Analytics Cookies:</strong> To understand how you use our website</li>
                <li><strong>Preference Cookies:</strong> To remember your settings</li>
              </ul>
              <p className="mt-2">You can control cookies through your browser settings, but this may affect site functionality.</p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">9. Data Breach Notification</h3>
              <p>
                In the unlikely event of a data breach that poses a risk to your rights and freedoms, we will:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-2">
                <li>Notify the relevant supervisory authority within 72 hours</li>
                <li>Inform affected individuals without undue delay if high risk to their rights</li>
                <li>Take immediate steps to contain and remedy the breach</li>
                <li>Conduct a thorough investigation and implement preventive measures</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">10. International Data Transfers</h3>
              <p>
                Your personal data is primarily processed within the European Union. If we transfer data outside the EU, 
                we ensure appropriate safeguards are in place, including adequacy decisions or Standard Contractual Clauses.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Information & Complaints</h3>
              <div className="space-y-3">
                <p>For any privacy-related questions or to exercise your rights, please contact us:</p>
                <div className="bg-gray-50 border rounded-lg p-4">
                  <p><strong>Email:</strong> <a href="mailto:privacy@khtherapy.ie" className="text-primary-600 hover:underline">privacy@khtherapy.ie</a></p>
                  <p><strong>General Contact:</strong> <a href="mailto:info@khtherapy.ie" className="text-primary-600 hover:underline">info@khtherapy.ie</a></p>
                  <p><strong>Address:</strong> Dublin, Ireland</p>
                </div>
                <p>
                  If you believe we have not handled your personal data in accordance with GDPR, you have the right to 
                  lodge a complaint with the Irish Data Protection Commission (DPC) at <a href="https://www.dataprotection.ie" className="text-primary-600 hover:underline">dataprotection.ie</a>.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">12. Changes to This Policy</h3>
              <p>
                We may update this privacy policy from time to time to reflect changes in our practices or legal requirements. 
                We will notify you of any material changes by email or through our website. The "Last updated" date at the 
                top of this policy indicates when it was last revised.
              </p>
            </section>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-yellow-800 mb-2">Need Help?</h4>
              <p className="text-yellow-700">
                If you have questions about this privacy policy or need assistance exercising your rights, 
                please don't hesitate to contact us. We're committed to transparency and helping you understand 
                how your data is protected.
              </p>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
};

export default PrivacyPolicyPage;
