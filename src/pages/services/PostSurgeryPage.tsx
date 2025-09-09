import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Star, CheckCircle, ArrowRight, Shield, Zap, Heart } from 'lucide-react';
import Container from '../../components/shared/Container';
import Button from '../../components/shared/Button';
import SEOHead from '../../components/utils/SEOHead';

const PostSurgeryPage: React.FC = () => {
  const surgeryTypes = [
    'Orthopedic surgery (joint replacement, fractures)',
    'Spinal surgery (fusion, discectomy)',
    'Shoulder surgery (rotator cuff, arthroscopy)',
    'Knee surgery (ACL, meniscus, replacement)',
    'Hip surgery (replacement, arthroscopy)',
    'Cardiac surgery rehabilitation',
    'Abdominal surgery recovery',
    'General surgery rehabilitation'
  ];

  const phases = [
    {
      phase: 'Phase 1',
      title: 'Immediate Post-Op',
      timeframe: '0-2 weeks',
      goals: ['Pain management', 'Wound protection', 'Early mobility', 'Prevent complications']
    },
    {
      phase: 'Phase 2',
      title: 'Early Recovery',
      timeframe: '2-6 weeks',
      goals: ['Restore range of motion', 'Reduce swelling', 'Begin strengthening', 'Improve function']
    },
    {
      phase: 'Phase 3',
      title: 'Progressive Strengthening',
      timeframe: '6-12 weeks',
      goals: ['Build strength', 'Enhance stability', 'Sport-specific training', 'Return to activities']
    }
  ];

  const benefits = [
    'Faster recovery times',
    'Reduced post-surgical complications',
    'Improved surgical outcomes',
    'Better pain management',
    'Enhanced mobility and function',
    'Confidence in movement patterns'
  ];

  return (
    <>
      <SEOHead
        title="Post-Surgery Rehabilitation - KH Therapy"
        description="Expert post-surgery rehabilitation at KH Therapy. Specialized recovery programs to help you heal faster and return to your best function after surgery."
        canonicalUrl="/services/post-surgery"
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
                  <span className="text-secondary-200 font-medium">Recovery Excellence</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Post-Surgery Rehabilitation
                </h1>
                <p className="text-xl text-secondary-100 mb-8 leading-relaxed">
                  Accelerate your recovery with our specialized post-surgical rehabilitation programs. 
                  Our expert team guides you through every phase of healing to restore optimal function.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                    Start Recovery
                  </Button>
                  <Button to="/contact" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                    Consultation
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
                  src="https://images.pexels.com/photos/7659695/pexels-photo-7659695.jpeg?auto=compress&cs=tinysrgb&w=800&h=600"
                  alt="Post-surgery rehabilitation therapy"
                  className="rounded-lg shadow-2xl w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/8376155/pexels-photo-8376155.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -bottom-6 -left-6 bg-white text-secondary-600 p-4 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 fill-current text-green-400 mr-1" />
                    <span className="font-semibold">Safe Recovery</span>
                  </div>
                  <p className="text-sm text-gray-600">Guided healing process</p>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Why Choose Us Section */}
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
                  Why Post-Surgery Rehab Matters
                </h2>
                <p className="text-lg text-neutral-600 mb-6">
                  Surgery is just the beginning of your recovery journey. Proper rehabilitation is 
                  crucial for optimal healing, preventing complications, and ensuring you return to 
                  your pre-surgery activity level or better.
                </p>
                <p className="text-lg text-neutral-600 mb-8">
                  Our specialized post-surgical programs are designed to work with your body's 
                  natural healing process, accelerating recovery while maintaining safety throughout 
                  every phase of rehabilitation.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <Heart className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-800 mb-1">Compassionate Care</h4>
                      <p className="text-neutral-600 text-sm">Supporting you every step</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Zap className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-800 mb-1">Proven Methods</h4>
                      <p className="text-neutral-600 text-sm">Evidence-based protocols</p>
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
                  src="https://images.pexels.com/photos/6111597/pexels-photo-6111597.jpeg?auto=compress&cs=tinysrgb&w=800&h=600" 
                  alt="Post-surgery recovery process" 
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/8376264/pexels-photo-8376264.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Surgery Types Section */}
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
                Surgeries We Support
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Our rehabilitation programs are tailored to support recovery from a wide range 
                of surgical procedures, each with specialized protocols.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {surgeryTypes.map((surgery, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white p-6 rounded-lg shadow-md"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-neutral-800 text-center mb-2">{surgery}</h3>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Recovery Phases Section */}
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
                Your Recovery Timeline
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                We guide you through each phase of recovery with specific goals and milestones 
                to ensure optimal healing and return to function.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {phases.map((phase, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500"
                >
                  <div className="text-green-600 font-bold text-sm mb-2">{phase.phase}</div>
                  <h3 className="text-xl font-semibold text-neutral-800 mb-2">{phase.title}</h3>
                  <div className="text-green-600 font-medium mb-4">{phase.timeframe}</div>
                  <ul className="space-y-2">
                    {phase.goals.map((goal, goalIndex) => (
                      <li key={goalIndex} className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-neutral-700 text-sm">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Treatment Approach Section */}
        <section className="py-16 md:py-24 bg-neutral-50">
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
                  src="https://images.pexels.com/photos/5473305/pexels-photo-5473305.jpeg?auto=compress&cs=tinysrgb&w=800&h=600" 
                  alt="Post-surgery rehabilitation techniques" 
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/8376268/pexels-photo-8376268.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -top-6 -right-6 bg-secondary-600 text-white p-4 rounded-lg shadow-lg">
                  <Shield className="w-6 h-6 mb-2" />
                  <p className="font-semibold">Evidence-Based</p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">
                  Our Treatment Approach
                </h2>
                <p className="text-lg text-neutral-600 mb-8">
                  We work closely with your surgical team to ensure continuity of care and 
                  follow proven rehabilitation protocols tailored to your specific procedure and recovery goals.
                </p>
                <div className="space-y-4">
                  {[
                    'Pre-operative education and preparation',
                    'Early mobilization protocols',
                    'Progressive exercise programs',
                    'Manual therapy techniques',
                    'Pain and swelling management',
                    'Functional movement training',
                    'Return-to-activity planning',
                    'Long-term maintenance strategies'
                  ].map((approach, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center p-3 bg-green-50 rounded-lg"
                    >
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                      <span className="text-neutral-700">{approach}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Benefits Section */}
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
                Benefits of Professional Rehabilitation
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Professional post-surgery rehabilitation significantly improves outcomes and 
                helps you achieve the best possible results from your surgical procedure.
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
                  className="bg-green-50 p-6 rounded-lg shadow-md"
                >
                  <CheckCircle className="w-8 h-8 text-green-600 mb-4" />
                  <p className="text-neutral-700 leading-relaxed">{benefit}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* What to Expect Section */}
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
                What to Expect
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Your rehabilitation journey is carefully planned and monitored to ensure 
                optimal recovery while respecting your body's healing process.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Initial Assessment",
                  description: "Comprehensive evaluation of your surgery, current status, and recovery goals."
                },
                {
                  step: "02",
                  title: "Customized Plan",
                  description: "Development of a phase-specific rehabilitation program tailored to your surgery."
                },
                {
                  step: "03",
                  title: "Progressive Treatment",
                  description: "Guided exercise and therapy sessions that advance as your healing progresses."
                },
                {
                  step: "04",
                  title: "Return to Function",
                  description: "Final phase focusing on returning to your desired activities and lifestyle."
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
                  <div className="w-16 h-16 bg-secondary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
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
        <section className="py-16 md:py-24 bg-secondary-600 text-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Start Your Recovery Journey Today
              </h2>
              <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
                Don't let surgery be the end of your story – let it be the beginning of your 
                strongest, most functional self. Our expert team is ready to guide your recovery.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                  Schedule Assessment
                </Button>
                <Button to="/services" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  View All Services
                </Button>
              </div>
              
              <div className="mt-12 flex items-center justify-center space-x-8 text-green-200">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>Early intervention</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Surgeon collaboration</span>
                </div>
                <div className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  <span>Proven results</span>
                </div>
              </div>
            </motion.div>
          </Container>
        </section>
      </main>
    </>
  );
};

export default PostSurgeryPage;
