import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import SectionHeading from '../shared/SectionHeading';
import Container from '../shared/Container';

interface TestimonialProps {
  quote: string;
  name: string;
  role: string;
  rating: number;
  image: string;
}

const testimonials: TestimonialProps[] = [
  {
    quote: "After my sports injury, I thought I'd never play again. The team at PhysioLife designed a recovery program that not only healed my injury but made me stronger than before.",
    name: "Michael O'Connor",
    role: "Professional Athlete",
    rating: 5,
    image: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    quote: "The chronic back pain I suffered for years is finally manageable thanks to the specialized treatment plan. I've gotten my life back and couldn't be more grateful.",
    name: "Sarah Johnson",
    role: "Office Manager",
    rating: 5,
    image: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    quote: "Post-surgery, I was anxious about recovery, but the rehabilitation program was perfectly tailored to my needs. The progress I've made has exceeded all expectations.",
    name: "David Murphy",
    role: "Teacher",
    rating: 5,
    image: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    quote: "The wellness assessment provided incredible insights into my overall health. The comprehensive evaluation helped me identify areas for improvement and create a personalized wellness plan that transformed my daily habits and energy levels.",
    name: "Emma Thompson",
    role: "Graphic Designer",
    rating: 4,
    image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
];

const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <section className="py-16 md:py-24 bg-white">
      <Container>
        <SectionHeading
          title="Patient Success Stories"
          subtitle="Hear from our patients about their experiences and recovery journeys with PhysioLife."
          centered={true}
        />
        
        {/* Desktop Testimonials */}
        <div className="hidden md:block">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-neutral-50 p-6 rounded-lg shadow-md"
              >
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      fill={i < testimonial.rating ? "#F59E0B" : "none"}
                      color={i < testimonial.rating ? "#F59E0B" : "#D1D5DB"}
                    />
                  ))}
                </div>
                
                <blockquote className="text-neutral-700 mb-6 italic">
                  "{testimonial.quote}"
                </blockquote>
                
                <div className="flex items-center">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <p className="font-semibold text-neutral-800">{testimonial.name}</p>
                    <p className="text-neutral-500 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Mobile Testimonial Carousel */}
        <div className="md:hidden relative">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index}
                  className="w-full flex-shrink-0 px-4 py-8"
                >
                  <div className="bg-neutral-50 p-6 rounded-lg shadow-md">
                    <div className="flex items-center mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          fill={i < testimonial.rating ? "#F59E0B" : "none"}
                          color={i < testimonial.rating ? "#F59E0B" : "#D1D5DB"}
                        />
                      ))}
                    </div>
                    
                    <blockquote className="text-neutral-700 mb-6 italic text-sm">
                      "{testimonial.quote}"
                    </blockquote>
                    
                    <div className="flex items-center">
                      <img 
                        src={testimonial.image} 
                        alt={testimonial.name}
                        className="w-10 h-10 rounded-full object-cover mr-3"
                      />
                      <div>
                        <p className="font-semibold text-neutral-800 text-sm">{testimonial.name}</p>
                        <p className="text-neutral-500 text-xs">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Carousel Controls */}
          <div className="flex justify-center mt-6 space-x-2">
            <button 
              onClick={handlePrev}
              className="p-2 rounded-full bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex space-x-1 items-center">
              {testimonials.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentIndex ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                ></div>
              ))}
            </div>
            <button 
              onClick={handleNext}
              className="p-2 rounded-full bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        
        <div className="text-center mt-10">
          <a 
            href="/testimonials" 
            className="text-primary-600 font-medium hover:text-primary-700 inline-flex items-center"
          >
            Read more patient stories
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </Container>
    </section>
  );
};

export default TestimonialsSection;