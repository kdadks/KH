import React from 'react';
import SEOHead from '../components/utils/SEOHead';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';

const TermsOfServicePage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Terms of Service - KH Therapy"
        description="Read the terms of service for using KH Therapy website and services."
        canonicalUrl="/terms-of-service"
      />
      <main className="py-16 bg-gray-50">
        <Container>
          <SectionHeading title="Terms of Service" />
          <div className="mt-6 space-y-4 text-gray-600">
            <p>Last updated: 18 July 2025</p>
            <h3 className="text-lg font-semibold">1. Acceptance of Terms</h3>
            <p>By accessing and using the KH Therapy website and services, you agree to be bound by these Terms of Service and our Privacy Policy.</p>
            <h3 className="text-lg font-semibold">2. Use of Services</h3>
            <p>You agree to use our services only for lawful purposes and in accordance with these terms. You may not use the site in any way that could damage, disable, or impair our services.</p>
            <h3 className="text-lg font-semibold">3. Intellectual Property</h3>
            <p>All content, logos, and trademarks on this site are the property of KH Therapy or its licensors and are protected by applicable intellectual property laws.</p>
            <h3 className="text-lg font-semibold">4. Limitation of Liability</h3>
            <p>KH Therapy will not be liable for any indirect, incidental, or consequential damages arising out of your use of our services.</p>
            <h3 className="text-lg font-semibold">5. Termination</h3>
            <p>We reserve the right to suspend or terminate your access to the site at our sole discretion, without notice, for conduct that we believe violates these terms.</p>
            <h3 className="text-lg font-semibold">6. Changes to Terms</h3>
            <p>We may modify these Terms of Service at any time. Continued use of the site after changes constitutes acceptance of the updated terms.</p>
            <h3 className="text-lg font-semibold">7. Contact Us</h3>
            <p>If you have any questions about these terms, please email us at <a href="mailto:khtherapy@hotmail.com" className="text-primary-600 hover:underline">khtherapy@hotmail.com</a>.</p>
          </div>
        </Container>
      </main>
    </>
  );
};

export default TermsOfServicePage;
