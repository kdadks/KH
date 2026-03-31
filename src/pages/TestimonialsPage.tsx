import React from 'react';
import Container from '../components/shared/Container';
// import SectionHeading from '../components/shared/SectionHeading';
import SEOHead from '../components/utils/SEOHead';
// import GoogleReviewsGrid from '../components/testimonials/GoogleReviewsGrid';

const TestimonialsPage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Client Reviews | KH Therapy Dublin Physiotherapist & Pilates"
        description="See what clients say about KH Therapy's physiotherapy and Pilates services in Dublin. Authentic Google reviews from patients treated for back pain, sports injuries, postnatal recovery, pelvic floor issues, and more."
        canonicalUrl="/testimonials"
        keywords="KH Therapy reviews, physiotherapist Dublin reviews, Pilates Dublin reviews, female physiotherapist Dublin reviews, home visit physio Dublin reviews"
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
          
          <div className="mt-6 overflow-hidden">
            <style>{`
              @keyframes marquee-rtl {
                0%   { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .marquee-rtl {
                display: flex;
                width: max-content;
                animation: marquee-rtl 18s linear infinite;
              }
              .marquee-rtl:hover {
                animation-play-state: paused;
              }
            `}</style>
            <div className="marquee-rtl">
              {['/Review.jpeg', '/Review1.jpeg', '/Review2.jpeg', '/Review.jpeg', '/Review1.jpeg', '/Review2.jpeg'].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Client Review ${(i % 3) + 1}`}
                  className="h-80 w-auto object-contain rounded-lg shadow-lg bg-white mx-4 flex-shrink-0"
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </>
  );
};

export default TestimonialsPage;