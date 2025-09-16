import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Star, CheckCircle, ArrowRight } from 'lucide-react';
import Container from '../../components/shared/Container';
import Button from '../../components/shared/Button';
import SEOHead from '../../components/utils/SEOHead';

const SportsInjuryPage: React.FC = () => {
  const benefits = [
    'Faster recovery times through evidence-based treatment',
    'Reduced risk of re-injury with proper rehabilitation',
    'Sport-specific exercise programs tailored to your needs',
    'Performance enhancement and injury prevention strategies',
    'Comprehensive assessment and ongoing monitoring',
    'Return-to-sport clearance and confidence building'
  ];

  const conditions = [
    'ACL/PCL injuries',
    'Ankle sprains and strains',
    'Tennis/Golfer\'s elbow',
    'Shoulder impingement',
    'Hamstring and calf strains',
    'Knee ligament injuries',
    'Stress fractures',
    'Rotator cuff tears'
  ];

  return (
    <>
      <SEOHead
        title="Sports Injury Rehabilitation - KH Therapy"
        description="Professional sports injury rehabilitation services at KH Therapy. Get back to your sport safely with our specialized treatment programs and expert physiotherapy care."
        canonicalUrl="/services/sports-injury"
      />
      
      <main>
        {/* Hero Section */}
        <section className="relative py-10 md:py-10 bg-gradient-to-r from-secondary-600 to-secondary-800 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <Container>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center mb-4">
                  <Activity className="w-8 h-8 mr-3" />
                  <span className="text-secondary-200 font-medium">Specialized Service</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Sports Injury Rehabilitation
                </h1>
                <p className="text-xl text-secondary-100 mb-8 leading-relaxed">
                  Get back to peak performance with our comprehensive sports injury rehabilitation programs. 
                  Our expert physiotherapists use evidence-based treatments to help athletes recover safely and efficiently.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                    Book Consultation
                  </Button>
                  <Button to="/contact" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                    Ask Questions
                  </Button>
                </div>
                
                {/* Service Navigation */}
                <div className="mt-8 pt-8 border-t border-secondary-500/30">
                  <p className="text-secondary-200 text-sm font-medium mb-4">Explore Our Services</p>
                  <div className="flex flex-wrap gap-3">
                    <Button to="/services/manual-therapy" variant="outline" size="sm" className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20">
                      Manual Therapy
                    </Button>
                    <Button to="/services/chronic-pain" variant="outline" size="sm" className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20">
                      Chronic Pain
                    </Button>
                    <Button to="/services/wellness-assessment" variant="outline" size="sm" className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20">
                      Wellness Assessment
                    </Button>
                    <Button to="/services/neuromuscular" variant="outline" size="sm" className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20">
                      Neuromuscular
                    </Button>
                    <Button to="/services/post-surgery" variant="outline" size="sm" className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20">
                      Post-Surgery
                    </Button>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <img
                  src="/Sport Injury.jpeg"
                  alt="Sports injury rehabilitation session"
                  className="rounded-lg shadow-2xl w-full h-[400px] object-contain"
                />
                <div className="absolute -bottom-6 -left-6 bg-white text-secondary-600 p-4 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 fill-current text-yellow-400 mr-1" />
                    <span className="font-semibold">4.9/5 Rating</span>
                  </div>
                  <p className="text-sm text-gray-600">From 200+ clients</p>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* What We Treat Section */}
        <section className="py-16 md:py-24 bg-white">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">
                  Sports Injuries We Treat
                </h2>
                <p className="text-lg text-neutral-600 mb-8">
                  Our specialized team has extensive experience treating a wide range of sports-related injuries. 
                  We work with athletes of all levels, from weekend warriors to professional competitors.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {conditions.map((condition, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center"
                    >
                      <CheckCircle className="w-5 h-5 text-primary-600 mr-3 flex-shrink-0" />
                      <span className="text-neutral-700">{condition}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="relative"
              >
                <img
                  src="/Sport Injury.jpeg"
                  alt="Athletic training and rehabilitation"
                  className="rounded-lg shadow-lg w-full h-[400px] object-contain"
                />
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24 bg-neutral-50">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-4">
                Why Choose Our Sports Rehabilitation?
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Our evidence-based approach ensures you receive the most effective treatment 
                for your specific injury and sport requirements.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white p-6 rounded-lg shadow-md"
                >
                  <CheckCircle className="w-8 h-8 text-primary-600 mb-4" />
                  <p className="text-neutral-700 leading-relaxed">{benefit}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Treatment Process Section */}
        <section className="py-16 md:py-24 bg-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-4">
                Our Treatment Process
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                We follow a systematic approach to ensure optimal recovery and return to sport.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Initial Assessment",
                  description: "Comprehensive evaluation of your injury, movement patterns, and sport-specific requirements."
                },
                {
                  step: "02", 
                  title: "Treatment Plan",
                  description: "Personalized rehabilitation program designed to address your specific needs and goals."
                },
                {
                  step: "03",
                  title: "Active Recovery",
                  description: "Progressive exercises and manual therapy to restore function and build strength."
                },
                {
                  step: "04",
                  title: "Return to Sport",
                  description: "Sport-specific training and clearance to ensure safe return to your activity."
                }
              ].map((phase, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {phase.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-neutral-800">{phase.title}</h3>
                  <p className="text-neutral-600">{phase.description}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary-600 text-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Get Back in the Game?
              </h2>
              <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
                Don't let an injury keep you on the sidelines. Our sports rehabilitation experts 
                are here to help you recover and return to peak performance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                  Book Your Assessment
                </Button>
                <Button to="/services" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  View All Services
                </Button>
              </div>
              
              <div className="mt-12 flex items-center justify-center space-x-8 text-primary-200">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>60-min sessions</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Insurance accepted</span>
                </div>
                <div className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  <span>Expert therapists</span>
                </div>
              </div>
            </motion.div>
          </Container>
        </section>
      </main>
    </>
  );
};

export default SportsInjuryPage;
