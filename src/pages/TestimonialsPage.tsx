import React from 'react';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';
import SEOHead from '../components/utils/SEOHead';

const TestimonialsPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Testimonials - KH Therapy"
        description="Read what our clients say about KH Therapy’s personalized physiotherapy and rehabilitation services in Dublin."
        canonicalUrl="/testimonials"
      />
      <Container>
        <div className="py-16">
          <SectionHeading
            title="Client Testimonials"
            subtitle="What Our Clients Say About Us"
          />
          <div className="mt-12">
            {/* Testimonials content will be added when needed */}
            <p className="text-center text-gray-600">
              Testimonials content coming soon.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
};

export default TestimonialsPage;