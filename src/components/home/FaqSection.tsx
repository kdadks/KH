import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
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
      question: "Where is KH Therapy located in Dublin?",
      answer: "KH Therapy is based in Clondalkin, Dublin 22. We provide clinic sessions on-site and home visit physiotherapy services across West Dublin, South Dublin, Lucan, Tallaght, Rathcoole, Saggart, and surrounding areas."
    },
    {
      question: "Do you offer home visit physiotherapy in Dublin?",
      answer: "Yes. KH Therapy offers mobile physiotherapy home visits across Dublin, including West Dublin, Lucan, Clondalkin, Tallaght, and Dublin South. Our physiotherapist comes to you, making it ideal for elderly patients, postnatal recovery, or anyone unable to travel to the clinic."
    },
    {
      question: "Is KH Therapy a female physiotherapist practice?",
      answer: "Yes. KH Therapy is led by a female chartered physiotherapist. Many clients – particularly women seeking women's health physiotherapy, postnatal care, pelvic floor treatment, or pregnancy physiotherapy – prefer to see a female therapist, and we're proud to provide that option in Dublin."
    },
    {
      question: "What Pilates classes do you offer in Dublin?",
      answer: "KH Therapy offers Clinical Pilates, Mat Pilates, Reformer Pilates, and private one-to-one Pilates sessions in Dublin. Classes are suitable for beginners, those recovering from injury (Rehab Pilates), people with back pain, and postnatal clients. Online Pilates sessions are also available."
    },
    {
      question: "Do I need a doctor's referral to book an appointment?",
      answer: "No, you don't need a doctor's referral to book with us. We accept direct bookings from patients. If you're claiming through health insurance (VHI, Laya, Irish Life Health, etc.), check with your provider whether a GP referral is required for reimbursement."
    },
    {
      question: "What should I expect during my first physiotherapy visit?",
      answer: "Your first visit includes a comprehensive assessment of your condition, medical history review, physical examination, and goal-setting discussion. We will then develop a personalised treatment plan and may begin initial treatment on the same day."
    },
    {
      question: "Do you treat women's health conditions?",
      answer: "Yes. As a specialist women's health physiotherapist in Dublin, KH Therapy treats pelvic floor dysfunction, postnatal recovery, pregnancy-related pain (back pain, SPD/PGP), ante-natal physiotherapy, and general women's health concerns."
    },
    {
      question: "Is physiotherapy covered by health insurance in Ireland?",
      answer: "Most Irish private health insurers (VHI, Laya Healthcare, Irish Life Health) provide partial cover for physiotherapy. We recommend confirming your specific plan details with your insurer. We can provide receipts and relevant documentation to support your claim."
    },
    {
      question: "Do you treat back pain?",
      answer: "Yes, back pain is one of the most common conditions we treat. KH Therapy's physiotherapists use manual therapy, exercise rehabilitation, and Clinical Pilates to address acute and chronic back pain. Home visits are also available for patients who find it difficult to travel."
    },
    {
      question: "How do I book a physiotherapy appointment in Dublin?",
      answer: "You can book online via our booking page at khtherapy.ie/booking, or contact us by phone or email. We offer clinic appointments in Clondalkin, Dublin 22, as well as home visits across West Dublin and surrounding areas."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <section className="py-12 md:py-16 bg-neutral-50">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <Container size="md">
        <SectionHeading
          title="Frequently Asked Questions"
          subtitle="Common questions about our physiotherapy, Pilates, and home visit services in Dublin."
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
            <a href="tel:+353838009404" className="text-primary-600 font-medium hover:underline">
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