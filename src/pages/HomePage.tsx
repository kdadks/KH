import React, { useEffect } from 'react';
import SEOHead from '../components/utils/SEOHead';
import HeroSection from '../components/home/HeroSection';
import ServicesSection from '../components/home/ServicesSection';
import WhyChooseUsSection from '../components/home/WhyChooseUsSection';
import ImageGallery from '../components/shared/ImageGallery';
import StatisticsSection from '../components/home/StatisticsSection';
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
        title="KH THERAPY- Physiotherapy & Rehabilitation Services"
        description="Professional physiotherapy services with personalized care plans designed to help you move better, feel better, and live better."
        canonicalUrl="/"
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
      <StatisticsSection />
      {/* <TestimonialsSection /> */}
      <FaqSection />
      <CtaSection />
    </>
  );
};

export default HomePage;