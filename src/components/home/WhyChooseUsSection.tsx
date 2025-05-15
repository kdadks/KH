import React from 'react';
import { motion } from 'framer-motion';
import Container from '../shared/Container';
import SectionHeading from '../shared/SectionHeading';

const WhyChooseUsSection: React.FC = () => {
  const reasons = [
    {
      title: "Experienced Specialists",
      description: "Our team consists of certified physiotherapists with years of specialized experience and continuous professional development.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: "Personalized Treatment",
      description: "We create customized treatment plans that address your specific condition, goals, and lifestyle needs for optimal results.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      title: "Evidence-Based Approach",
      description: "Our treatments are founded on scientific research and proven methodologies to ensure the most effective care possible.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      title: "Holistic Care",
      description: "We address not just your symptoms but the underlying causes, considering your overall health and wellbeing.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Image */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary-100 rounded-tl-lg z-0"></div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-secondary-100 rounded-br-lg z-0"></div>
            <img 
              src="https://images.pexels.com/photos/7579829/pexels-photo-7579829.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
              alt="Physiotherapist with patient" 
              className="rounded-lg shadow-lg relative z-10 w-full h-full object-cover"
            />
          </motion.div>
          
          {/* Right side - Content */}
          <div>
            <SectionHeading
              title="Why Choose Us"
              subtitle="Experience the difference with our patient-centered approach to physical therapy and rehabilitation."
            />
            
            <div className="space-y-6">
              {reasons.map((reason, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-4">
                    {reason.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-800 mb-2">{reason.title}</h3>
                    <p className="text-neutral-600">{reason.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default WhyChooseUsSection;