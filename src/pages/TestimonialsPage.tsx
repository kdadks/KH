import React from 'react';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';
import SEOHead from '../components/utils/SEOHead';
import GoogleReviewsGrid from '../components/testimonials/GoogleReviewsGrid';

const TestimonialsPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Client Testimonials & Reviews - KH Therapy"
        description="Read authentic Google reviews and testimonials from our clients about KH Therapy's personalized physiotherapy and rehabilitation services in Dublin."
        canonicalUrl="/testimonials"
      />
      <Container>
        <div className="py-16">
          <SectionHeading
            title="Client Testimonials & Reviews"
            subtitle="Real experiences from our valued clients who have benefited from our personalized physiotherapy services"
            centered={true}
          />
          
          <div className="mt-12">
            <GoogleReviewsGrid 
              maxReviews={12}
              showPagination={true}
            />
          </div>
          
          {/* Call to action */}
          <div className="mt-16 text-center">
            <div className="bg-green-50 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-neutral-800 mb-4">
                Experience Personalized Care
              </h3>
              <p className="text-neutral-600 mb-6 max-w-2xl mx-auto">
                Join our satisfied clients and start your journey to better health. 
                Book your consultation today and experience the difference personalized physiotherapy can make.
              </p>
              <a 
                href="/booking" 
                className="inline-flex items-center px-8 py-3 bg-[#71db77] text-white font-semibold rounded-lg hover:bg-[#5fcf68] transition-colors duration-300"
              >
                Book Your Consultation
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default TestimonialsPage;