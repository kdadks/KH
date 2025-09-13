import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Container from '../shared/Container';
import SectionHeading from '../shared/SectionHeading';

interface FaqItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
  delay: number;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer, isOpen, onClick, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="border-b border-neutral-200 py-4"
    >
      <button
        className="flex justify-between items-center w-full text-left focus:outline-none"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-medium text-neutral-800">{question}</h3>
        <span className="text-primary-500 ml-4">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>
      <div
        className={`mt-2 text-neutral-600 overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <p className="pb-2">{answer}</p>
      </div>
    </motion.div>
  );
};

const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "What should I expect during my first visit?",
      answer: "Your first visit will include a comprehensive assessment of your condition, medical history review, physical examination, and discussion of your goals. We'll then develop a personalized treatment plan and may begin initial treatment the same day."
    },
    {
      question: "How long will my recovery take?",
      answer: "Recovery time varies depending on your specific condition, its severity, your overall health, and how consistently you follow your treatment plan. During your initial assessment, we'll provide an estimated timeline for your particular situation."
    },
    {
      question: "Do I need a doctor's referral to book an appointment?",
      answer: "No, you don't need a doctor's referral to book an appointment with us. We accept direct bookings from patients. However, if you're claiming through insurance, check if they require a referral for coverage."
    },
    {
      question: "Is physiotherapy covered by insurance?",
      answer: "Many insurance plans cover physiotherapy services. We recommend checking with your insurance provider about your specific coverage details. We can provide documentation needed for your claims."
    },
    {
      question: "What should I wear to my physiotherapy sessions?",
      answer: "Wear comfortable, loose-fitting clothes that allow for easy movement and access to the area being treated. For lower body issues, shorts or loose pants are recommended. For upper body concerns, consider a t-shirt or tank top."
    },
    {
      question: "Will the treatments be painful?",
      answer: "Our goal is to minimize pain while maximizing recovery. Some techniques may cause temporary discomfort, but we work within your comfort level. Always communicate with your therapist about your pain tolerance during treatment."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 md:py-24 bg-neutral-50">
      <Container size="md">
        <SectionHeading
          title="Frequently Asked Questions"
          subtitle="Find answers to common questions about our physiotherapy services and treatment approaches."
          centered={true}
        />
        
        <div className="mt-8">
          {faqs.map((faq, index) => (
            <FaqItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => toggleFaq(index)}
              delay={index * 0.1}
            />
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-neutral-600">
            Still have questions? Contact us directly at{' '}
            <a href="tel:+353123456789" className="text-primary-600 font-medium hover:underline">
              (083) 8009404
            </a>{' '}
            or{' '}
            <a href="mailto:info@khtherapy.ie" className="text-primary-600 font-medium hover:underline">
              info@khtherapy.ie
            </a>
          </p>
        </div>
      </Container>
    </section>
  );
};

export default FaqSection;