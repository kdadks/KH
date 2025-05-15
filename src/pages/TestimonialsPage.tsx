import React from 'react';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';

const TestimonialsPage: React.FC = () => {
  return (
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
  );
};

export default TestimonialsPage;