import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import Button from '../shared/Button';
import Container from '../shared/Container';

const CtaSection: React.FC = () => {
  return (
    <section className="py-16 md:py-24 bg-primary-600 relative overflow-hidden">
      {/* Background pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      
      <Container>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <motion.div 
            className="md:w-2/3 mb-8 md:mb-0"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Start Your Recovery Journey?
            </h2>
            <p className="text-primary-100 text-lg md:text-xl md:pr-10">
              Book your initial consultation today and take the first step toward improved mobility and a pain-free life.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Button 
              to="/booking" 
              variant="secondary" 
              size="lg" 
              icon={<Calendar size={20} />}
              className="w-full md:w-auto"
            >
              Book Your Appointment
            </Button>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};

export default CtaSection;