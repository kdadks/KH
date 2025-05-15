import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Brain, ChevronFirst as FirstAid, Heart, Shield, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionHeading from '../shared/SectionHeading';
import Container from '../shared/Container';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  href: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description, delay, href }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay }}
      viewport={{ once: true }}
      className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-t-4 border-primary-500"
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-primary-100 text-primary-600 mb-5 group-hover:bg-primary-600 group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-neutral-800">{title}</h3>
      <p className="text-neutral-600 mb-4">{description}</p>
      <Link 
        to={href} 
        className="text-primary-600 font-medium hover:text-primary-700 inline-flex items-center"
      >
        Learn More 
        <svg className="w-4 h-4 ml-1 group-hover:ml-2 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </motion.div>
  );
};

const ServicesSection: React.FC = () => {
  const services = [
    {
      icon: <Activity size={24} />,
      title: "Sports Injury Rehabilitation",
      description: "Specialized programs to help athletes and active individuals recover from injuries and return to their sport safely.",
      href: "/services#sports-injury",
    },
    {
      icon: <FirstAid size={24} />,
      title: "Manual Therapy",
      description: "Hands-on techniques to relieve pain, reduce inflammation, improve circulation and promote healing in affected areas.",
      href: "/services#manual-therapy",
    },
    {
      icon: <Brain size={24} />,
      title: "Chronic Pain Management",
      description: "Comprehensive strategies to help manage and reduce persistent pain, improving daily function and quality of life.",
      href: "/services#chronic-pain",
    },
    {
      icon: <Heart size={24} />,
      title: "Post-Surgery Rehabilitation",
      description: "Tailored programs to optimize recovery following surgical procedures, ensuring the best possible outcomes.",
      href: "/services#post-surgery",
    },
    {
      icon: <Zap size={24} />,
      title: "Neuromuscular Therapy",
      description: "Specialized treatment addressing neuromuscular dysfunction to restore optimal function and reduce pain.",
      href: "/services#neuromuscular",
    },
    {
      icon: <Shield size={24} />,
      title: "Ergonomic Assessments",
      description: "Professional evaluations of workspaces to prevent injuries and improve comfort in daily activities.",
      href: "/services#ergonomic",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-neutral-50">
      <Container>
        <SectionHeading
          title="Our Specialized Services"
          subtitle="We provide a comprehensive range of physiotherapy services to address various conditions and help you achieve optimal physical wellbeing."
          centered={true}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <ServiceCard 
              key={index}
              icon={service.icon}
              title={service.title}
              description={service.description}
              delay={index * 0.1}
              href={service.href}
            />
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Link 
            to="/services" 
            className="inline-flex items-center justify-center px-6 py-3 border border-primary-600 text-primary-600 font-medium rounded-md hover:bg-primary-50 transition-colors"
          >
            View All Services
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </Container>
    </section>
  );
};

export default ServicesSection;