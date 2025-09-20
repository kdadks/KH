import React from 'react';
import { motion } from 'framer-motion';
import Container from '../shared/Container';

interface StatProps {
  value: string;
  label: string;
  delay: number;
}

const Stat: React.FC<StatProps> = ({ value, label, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="text-center"
    >
      <div className="text-4xl md:text-5xl font-bold text-white mb-2">{value}</div>
      <div className="text-primary-200 font-medium">{label}</div>
    </motion.div>
  );
};

const StatisticsSection: React.FC = () => {
  return (
    <section className="py-12 md:py-16 bg-primary-700 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#smallGrid)" />
        </svg>
      </div>
      
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <Stat value="5+" label="Years Experience" delay={0} />
          <Stat value="2,000+" label="Satisfied Patients" delay={0.1} />
        </div>
      </Container>
    </section>
  );
};

export default StatisticsSection;