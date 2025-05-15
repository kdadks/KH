import React from 'react';
import SEOHead from '../components/utils/SEOHead';
import HeroSection from '../components/home/HeroSection';
import ServicesSection from '../components/home/ServicesSection';
import WhyChooseUsSection from '../components/home/WhyChooseUsSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import StatisticsSection from '../components/home/StatisticsSection';
import FaqSection from '../components/home/FaqSection';
import CtaSection from '../components/home/CtaSection';

const HomePage: React.FC = () => {
  return (
    <>
      <SEOHead
        title="KH THERAPY- Professional Physiotherapy & Rehabilitation Services"
        description="Professional physiotherapy services with personalized care plans designed to help you move better, feel better, and live better."
        canonicalUrl="/"
      />
      <HeroSection />
      <ServicesSection />
      <WhyChooseUsSection />
      <StatisticsSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
    </>
  );
};

export default HomePage;