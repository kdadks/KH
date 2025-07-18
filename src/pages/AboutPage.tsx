import React from 'react';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';

const AboutPage = () => {
  return (
    <main className="py-16 bg-gray-50">
      <Container>
        <SectionHeading
          title="About Us"
          subtitle="Knowledge, Strength & Movement"
        />
        {/* Tagline */}
        <div className="mt-4 mb-12 text-center">
          <span className="inline-block text-xl font-bold text-primary-600">
            Physiotherapy for you
          </span>
        </div>
        <div className="mt-12 grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-gray-900">Our Story</h3>
            <p className="text-gray-600 leading-relaxed">
              KH Therapy aims to provide you with an excellent high standard of
              care given through physical therapy sessions. Our services will
              help you become pain free by education, knowledge and help
              strengthen the body through rehab and movement.
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-gray-900">Our Mission</h3>
            <p className="text-gray-600 leading-relaxed">
              KH Therapy aims to provide you with an excellent high standard of
              care given through physical therapy sessions. Our services will
              help you become pain free by education, knowledge and help
              strengthen the body through rehab and movement.
            </p>
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h4 className="font-semibold text-gray-900">Our Values</h4>
                <ul className="mt-4 space-y-2 text-gray-600">
                  <li>• Excellence</li>
                  <li>• Integrity</li>
                  <li>• Innovation</li>
                  <li>• Customer Focus</li>
                </ul>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h4 className="font-semibold text-gray-900">Our Goals</h4>
                <ul className="mt-4 space-y-2 text-gray-600">
                  <li>• Quality Service</li>
                  <li>• Customer Success</li>
                  <li>• Sustainability</li>
                  <li>• Growth</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
};

export default AboutPage;