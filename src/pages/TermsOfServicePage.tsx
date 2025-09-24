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
          <div className="mt-6 space-y-6 text-gray-600">
            <p>Last updated: 24 September 2025</p>

            <h3 className="text-lg font-semibold">1. Booking Consent</h3>
            <p>
              By Accessing KHtherapy website or booking and attending a physiotherapy session at KH Therapy, you agree to the following terms and conditions & privacy policy. These terms apply to all sessions provided by our
              licensed physiotherapists.
            </p>

            <h3 className="text-lg font-semibold">2. Appointments and Cancellations</h3>
            <p>
              <span className="font-semibold">Booking:</span> Appointments must be scheduled in advance via our website, by phone, or in person.
            </p>
            <div className="space-y-3">
              <div>
                <p className="font-semibold">Cancellation Policy:</p>
                <p>
                  We kindly ask that you provide at least 24 hours’ notice if you need to cancel or reschedule your appointment. Cancellations or changes made with less than 24
                  hours’ notice will result in the full session fee being charged. This policy helps us manage our schedule efficiently and offer appointments to other clients who
                  may be waiting. We appreciate your understanding and continued support.
                </p>
              </div>
              <div>
                <p className="font-semibold">Rescheduling Policy:</p>
                <p>
                  If you need to reschedule your appointment, please do so at least 24 hours in advance. Rescheduling requests made less than 24 hours before your appointment will
                  be treated as a late cancellation and may be subject to the full session fee. To reschedule, please contact us by phone or as early as possible, and we will do
                  our best to accommodate your preferred time.
                </p>
              </div>
              <p>
                <span className="font-semibold">Late Arrivals:</span> If you arrive late, your session may be shortened accordingly, and full session fees still apply.
              </p>
            </div>

            <h3 className="text-lg font-semibold">3. Payment</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>All fees are payable at the time of service unless other arrangements have been made in advance.</li>
              <li>Accepted payment methods: credit and debit cards only.</li>
              <li>If you are using health insurance, it is your responsibility to confirm coverage and obtain any necessary referrals.</li>
            </ul>

            <h3 className="text-lg font-semibold">4. Consent to Treatment</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>By attending your session, you consent to physiotherapy treatment provided by our qualified professionals.</li>
              <li>Your physiotherapist will explain the nature and purpose of the proposed treatment. You may ask questions and withdraw consent at any time.</li>
            </ul>

            <h3 className="text-lg font-semibold">5. Privacy and Confidentiality</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>We comply with the General Data Protection Regulation (GDPR) to ensure your personal and medical information is secure.</li>
              <li>Your information will only be shared with your consent or as required by law.</li>
            </ul>

            <h3 className="text-lg font-semibold">6. Health and Safety</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>Please inform your physiotherapist of any changes in your medical condition.</li>
              <li>You agree to follow all safety guidelines and instructions during sessions.</li>
              <li>KH Therapy reserves the right to refuse treatment if it is deemed unsafe to proceed.</li>
            </ul>

            <h3 className="text-lg font-semibold">7. Limitation of Liability</h3>
            <ul className="list-disc space-y-2 pl-6">
              <li>While all care is taken to provide effective treatment, outcomes cannot be guaranteed.</li>
              <li>KH Therapy and its staff shall not be liable for any loss, damage, or injury incurred during or following a session, except where required by law.</li>
            </ul>

            <h3 className="text-lg font-semibold">8. Complaints</h3>
            <p>
              If you are dissatisfied with your care, please contact us at{' '}
              <a href="mailto:info@khtherapy.ie" className="text-primary-600 hover:underline">
                info@khtherapy.ie
              </a>
              . We take complaints seriously and aim to resolve them promptly.
            </p>
          </div>
        </Container>
      </main>
    </>
  );
};

export default TermsOfServicePage;
