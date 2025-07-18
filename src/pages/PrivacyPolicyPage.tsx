import React from 'react';
import SEOHead from '../components/utils/SEOHead';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Privacy Policy - KH Therapy"
        description="Read KH Therapy's privacy policy regarding data collection, usage, and protection."
        canonicalUrl="/privacy-policy"
      />
      <main className="py-16 bg-gray-50">
        <Container>
          <SectionHeading title="Privacy Policy" />
          <div className="mt-6 space-y-4 text-gray-600">
            <p>Last updated: 18 July 2025</p>
            <h3 className="text-lg font-semibold">Information We Collect</h3>
            <p>We may collect personal information such as your name, email address, phone number, and any other details you provide when booking appointments or contacting us.</p>
            <h3 className="text-lg font-semibold">How We Use Your Information</h3>
            <p>Your information is used to schedule and manage appointments, communicate with you, and improve our services. We will not sell or share your personal data with third parties except as necessary to provide our services or comply with legal obligations.</p>
            <h3 className="text-lg font-semibold">Cookies and Tracking</h3>
            <p>We use cookies and similar technologies to enhance your experience on our website. You can disable cookies in your browser settings, but this may affect site functionality.</p>
            <h3 className="text-lg font-semibold">Data Security</h3>
            <p>We implement appropriate technical and organizational measures to protect your data from unauthorized access, disclosure, or alteration.</p>
            <h3 className="text-lg font-semibold">Your Rights</h3>
            <p>You have the right to access, correct, or delete your personal data. To exercise these rights, please contact us using the information below.</p>
            <h3 className="text-lg font-semibold">Contact Us</h3>
            <p>If you have any questions about this privacy policy, please email us at <a href="mailto:khtherapy@hotmail.com" className="text-primary-600 hover:underline">khtherapy@hotmail.com</a>.</p>
          </div>
        </Container>
      </main>
    </>
  );
};

export default PrivacyPolicyPage;
