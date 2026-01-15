import React from 'react';
import Container from '../components/shared/Container';
// import SectionHeading from '../components/shared/SectionHeading';
import SEOHead from '../components/utils/SEOHead';
// import GoogleReviewsGrid from '../components/testimonials/GoogleReviewsGrid';

const TestimonialsPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Client Testimonials & Reviews - KH Therapy"
        description="Read authentic Google reviews and testimonials from our clients about KH Therapy's personalized physiotherapy and rehabilitation services in Dublin."
        canonicalUrl="/testimonials"
      />
      <Container>
        <div className="py-6">
          {/* Hero Section with Title, Subtitle and CTA */}
          <div className="text-center">
            <div className="bg-green-50 rounded-xl p-6">
              <h1 className="text-2xl font-bold text-neutral-800 mb-4">
                Client Testimonials & Reviews
              </h1>
              <p className="text-neutral-600 mb-6 max-w-2xl mx-auto">
                Real experiences from our valued clients who have benefited from our personalized physiotherapy services
              </p>
            
              <a 
                href="/booking" 
                className="inline-flex items-center px-6 py-3 bg-[#71db77] text-white font-semibold rounded-lg hover:bg-[#5fcf68] transition-colors duration-300"
              >
                Book Your Consultation
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <div className="mt-4">
                <a 
                  href="https://maps.app.goo.gl/HJqQEHFwp6jHmH6PA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-300"
                >
                  Read Our Google Reviews
                  <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            {/* <GoogleReviewsGrid 
              maxReviews={12}
              showPagination={true}
            /> */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <img src="/Review.jpeg" alt="Client Review 1" className="w-full h-96 object-contain rounded-lg shadow-lg bg-white" />
              <img src="/Review1.jpeg" alt="Client Review 2" className="w-full h-96 object-contain rounded-lg shadow-lg bg-white" />
              <img src="/Review2.jpeg" alt="Client Review 3" className="w-full h-96 object-contain rounded-lg shadow-lg bg-white" />
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default TestimonialsPage;