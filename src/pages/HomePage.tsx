import React, { useEffect } from 'react';
import SEOHead from '../components/utils/SEOHead';
import HeroSection from '../components/home/HeroSection';
import ServicesSection from '../components/home/ServicesSection';
import WhyChooseUsSection from '../components/home/WhyChooseUsSection';
import ImageGallery from '../components/shared/ImageGallery';
// import TestimonialsSection from '../components/home/TestimonialsSection';
import FaqSection from '../components/home/FaqSection';
import CtaSection from '../components/home/CtaSection';
import { preloadCriticalRoutes } from '../utils/preloader';

const HomePage: React.FC = () => {
  const kellyImages = [
    '/Kelly pic1.jpeg',
    '/Kelly Pic2.jpeg',
    '/Kelly Pic3.jpeg',
    '/Kelly Pic4.jpeg',
    '/Kelly Pic5.jpeg',
    '/Kelly Pic6.jpeg',
    '/Kelly Pic7.jpeg',
    '/Kelly Pic8.jpeg',
    '/Kelly Pic9.jpeg'
  ];

  // Preload critical routes after component mounts
  useEffect(() => {
    preloadCriticalRoutes();
  }, []);

  return (
    <>
      <SEOHead
        title="KH Therapy | Female Physiotherapist Dublin | Home Visits & Clinical Pilates"
        description="KH Therapy – female chartered physiotherapist in Clondalkin, Dublin. Clinic & home visits, Clinical Pilates, women's health, sports injury, postnatal & pelvic floor physio. Serving West Dublin, Lucan & Dublin South."
        canonicalUrl="/"
        keywords="physiotherapist Dublin, female physiotherapist Dublin, chartered physiotherapist Dublin, home visit physiotherapist Dublin, Pilates classes Dublin, Clinical Pilates Dublin, women's health physiotherapist Dublin, sports injury physiotherapist Dublin, back pain physiotherapist Dublin, postnatal physiotherapy Dublin, pelvic floor physiotherapist Dublin, physio Clondalkin, physio Lucan, KH Therapy"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'KH Therapy',
          url: 'https://khtherapy.ie',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://khtherapy.ie/services?search={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      <HeroSection />
      <ServicesSection />
      <WhyChooseUsSection />
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <ImageGallery
            title="Meet Physio Kelly"
            images={kellyImages}
            className="max-w-6xl mx-auto"
          />
        </div>
      </section>
      {/* <TestimonialsSection /> */}
      <FaqSection />
      <CtaSection />
    </>
  );
};

export default HomePage;