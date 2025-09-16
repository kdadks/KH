import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Clock, Star, CheckCircle, ArrowRight, Shield, Zap, Heart } from 'lucide-react';
import Container from '../../components/shared/Container';
import Button from '../../components/shared/Button';
import SEOHead from '../../components/utils/SEOHead';

const ChronicPainPage: React.FC = () => {
  const approaches = [
    'Pain education and understanding',
    'Movement and exercise therapy',
    'Manual therapy techniques',
    'Stress management strategies',
    'Lifestyle modification guidance',
    'Wellness assessments',
    'Gradual activity progression',
    'Mind-body connection techniques'
  ];

  const conditions = [
    'Chronic back pain',
    'Fibromyalgia',
    'Arthritis',
    'Chronic headaches',
    'Neuropathic pain',
    'Complex regional pain syndrome',
    'Chronic fatigue syndrome',
    'Persistent joint pain'
  ];

  const benefits = [
    'Reduced pain intensity and frequency',
    'Improved daily function and mobility',
    'Better sleep quality and energy levels',
    'Enhanced emotional well-being',
    'Increased independence in daily activities',
    'Reduced reliance on pain medications'
  ];

  return (
    <>
      <SEOHead
        title="Chronic Pain Management - KH Therapy"
        description="Comprehensive chronic pain management at KH Therapy. Evidence-based strategies to help you manage persistent pain and improve your quality of life."
        canonicalUrl="/services/chronic-pain"
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
                  <Brain className="w-8 h-8 mr-3" />
                  <span className="text-secondary-200 font-medium">Comprehensive Care</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Chronic Pain Management
                </h1>
                <p className="text-xl text-secondary-100 mb-8 leading-relaxed">
                  Take control of your chronic pain with our comprehensive, evidence-based approach. 
                  We help you develop effective strategies to manage pain and reclaim your quality of life.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                    Start Your Journey
                  </Button>
                  <Button to="/contact" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                    Get Support
                  </Button>
                </div>
                
                {/* Service Navigation */}
                <div className="mt-8 pt-8 border-t border-secondary-500/30">
                  <p className="text-secondary-200 text-sm font-medium mb-4">Explore Our Services</p>
                  <div className="flex flex-wrap gap-3">
                    <Button to="/services/manual-therapy" variant="outline" size="sm" className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20">
                      Manual Therapy
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
                    <Button to="/services/sports-injury" variant="outline" size="sm" className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20">
                      Sports Injury
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
                  src="/Chronic.png?auto=compress&cs=tinysrgb&w=800&h=600"
                  alt="Chronic pain management therapy"
                  className="rounded-lg shadow-2xl w-full h-[500px] object-contain bg-secondary-700"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "/Chronic.png?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -bottom-6 -left-6 bg-white text-secondary-600 p-4 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 fill-current text-green-400 mr-1" />
                    <span className="font-semibold">Holistic Approach</span>
                  </div>
                  <p className="text-sm text-gray-600">Complete care plan</p>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Understanding Section */}
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
                  Understanding Chronic Pain
                </h2>
                <p className="text-lg text-neutral-600 mb-6">
                  Chronic pain is complex and affects every aspect of your life. Unlike acute pain, 
                  which serves as a warning signal, chronic pain persists beyond normal healing time 
                  and requires a specialized approach.
                </p>
                <p className="text-lg text-neutral-600 mb-8">
                  Our team understands that chronic pain is not just physical – it impacts your emotions, 
                  relationships, work, and daily activities. That's why we take a comprehensive, 
                  person-centered approach to help you manage your pain effectively.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <Heart className="w-6 h-6 text-purple-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-800 mb-1">Empathetic Care</h4>
                      <p className="text-neutral-600 text-sm">We understand your pain journey</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Zap className="w-6 h-6 text-purple-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-800 mb-1">Evidence-Based</h4>
                      <p className="text-neutral-600 text-sm">Latest research-backed methods</p>
                    </div>
                  </div>
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
                  src="/Chronic.png?auto=compress&cs=tinysrgb&w=800&h=600"
                  alt="Patient consultation for chronic pain"
                  className="rounded-lg shadow-lg w-full h-[500px] object-contain bg-neutral-100"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "/Chronic.png?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Conditions Section */}
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
                Chronic Conditions We Help Manage
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Our chronic pain management program is designed to help with a wide range of 
                persistent pain conditions that affect your daily life.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {conditions.map((condition, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white p-6 rounded-lg shadow-md"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-neutral-800 text-center mb-2">{condition}</h3>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Treatment Approach Section */}
        <section className="py-16 md:py-24 bg-white">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="relative"
              >
                <img
                  src="https://images.pexels.com/photos/6111370/pexels-photo-6111370.jpeg?auto=compress&cs=tinysrgb&w=800&h=600"
                  alt="Chronic pain treatment approach"
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/6749790/pexels-photo-6749790.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -top-6 -right-6 bg-purple-600 text-white p-4 rounded-lg shadow-lg">
                  <Shield className="w-6 h-6 mb-2" />
                  <p className="font-semibold">Safe & Effective</p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">
                  Our Comprehensive Approach
                </h2>
                <p className="text-lg text-neutral-600 mb-8">
                  We use a multidisciplinary approach that addresses all aspects of chronic pain, 
                  combining physical therapy with education, lifestyle changes, and emotional support.
                </p>
                <div className="space-y-4">
                  {approaches.map((approach, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center p-3 bg-purple-50 rounded-lg"
                    >
                      <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0" />
                      <span className="text-neutral-700">{approach}</span>
                    </motion.div>
                  ))}
                </div>
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
                Benefits of Our Pain Management Program
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Our comprehensive approach helps you develop the skills and strategies needed 
                to manage your pain and improve your overall quality of life.
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
                  <CheckCircle className="w-8 h-8 text-purple-600 mb-4" />
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
                Your Pain Management Journey
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                We work with you to develop a personalized plan that addresses your unique 
                pain experience and life goals.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Comprehensive Assessment",
                  description: "Detailed evaluation of your pain history, current symptoms, and impact on daily life."
                },
                {
                  step: "02",
                  title: "Personalized Plan",
                  description: "Development of a tailored pain management strategy based on your specific needs."
                },
                {
                  step: "03",
                  title: "Active Treatment",
                  description: "Implementation of various techniques including exercise, education, and manual therapy."
                },
                {
                  step: "04",
                  title: "Long-term Support",
                  description: "Ongoing guidance and plan adjustments to help you maintain progress over time."
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
                  <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
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
        <section className="py-16 md:py-24 bg-purple-600 text-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Take the First Step Towards Better Living
              </h2>
              <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
                You don't have to live with chronic pain. Our compassionate team is here to help 
                you develop effective strategies to manage your pain and reclaim your life.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                  Begin Your Recovery
                </Button>
                <Button to="/services" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  Explore All Services
                </Button>
              </div>
              
              <div className="mt-12 flex items-center justify-center space-x-8 text-purple-200">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>Flexible scheduling</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Personalized care</span>
                </div>
                <div className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  <span>Experienced team</span>
                </div>
              </div>
            </motion.div>
          </Container>
        </section>
      </main>
    </>
  );
};

export default ChronicPainPage;
