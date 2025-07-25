import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, Star, CheckCircle, ArrowRight, Shield, Brain, Heart } from 'lucide-react';
import Container from '../../components/shared/Container';
import Button from '../../components/shared/Button';
import SEOHead from '../../components/utils/SEOHead';

const NeuromuscularPage: React.FC = () => {
  const techniques = [
    'Neuromuscular facilitation',
    'Proprioceptive neuromuscular facilitation (PNF)',
    'Motor control retraining',
    'Balance and coordination training',
    'Functional movement patterns',
    'Neuroplasticity-based exercises',
    'Vestibular rehabilitation',
    'Sensory re-education'
  ];

  const conditions = [
    'Stroke recovery',
    'Multiple sclerosis',
    'Parkinson\'s disease',
    'Spinal cord injuries',
    'Traumatic brain injury',
    'Peripheral neuropathy',
    'Balance disorders',
    'Movement dysfunction'
  ];

  const benefits = [
    'Improved movement coordination',
    'Enhanced balance and stability',
    'Better motor control and precision',
    'Increased functional independence',
    'Reduced fall risk',
    'Enhanced quality of life'
  ];

  const principles = [
    {
      title: 'Neuroplasticity',
      description: 'Harnessing the brain\'s ability to reorganize and form new neural connections for improved function.',
      icon: <Brain className="w-6 h-6" />
    },
    {
      title: 'Motor Learning',
      description: 'Using repetitive, task-specific practice to retrain movement patterns and improve motor skills.',
      icon: <Zap className="w-6 h-6" />
    },
    {
      title: 'Functional Integration',
      description: 'Connecting therapeutic exercises to real-world activities and daily functional tasks.',
      icon: <Heart className="w-6 h-6" />
    }
  ];

  return (
    <>
      <SEOHead
        title="Neuromuscular Therapy - KH Therapy"
        description="Specialized neuromuscular therapy at KH Therapy. Expert treatment for neurological conditions, movement disorders, and motor control rehabilitation."
        canonicalUrl="/services/neuromuscular"
      />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 bg-gradient-to-r from-indigo-600 to-purple-700 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <Container>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center mb-4">
                  <Zap className="w-8 h-8 mr-3" />
                  <span className="text-indigo-200 font-medium">Neural Recovery</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Neuromuscular Therapy
                </h1>
                <p className="text-xl text-indigo-100 mb-8 leading-relaxed">
                  Specialized treatment for neurological conditions and movement disorders. 
                  Our expert therapists help retrain your nervous system for optimal function and movement quality.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                    Begin Recovery
                  </Button>
                  <Button to="/contact" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                    Expert Consultation
                  </Button>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <img
                  src="https://images.pexels.com/photos/7659530/pexels-photo-7659530.jpeg?auto=compress&cs=tinysrgb&w=800&h=600"
                  alt="Neuromuscular therapy treatment"
                  className="rounded-lg shadow-2xl w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/7659556/pexels-photo-7659556.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -bottom-6 -left-6 bg-white text-indigo-600 p-4 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <Brain className="w-5 h-5 fill-current text-green-400 mr-1" />
                    <span className="font-semibold">Neural Retraining</span>
                  </div>
                  <p className="text-sm text-gray-600">Advanced techniques</p>
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
                  Understanding Neuromuscular Therapy
                </h2>
                <p className="text-lg text-neutral-600 mb-6">
                  Neuromuscular therapy focuses on the intricate relationship between your nervous 
                  system and muscles. When neurological conditions or injuries affect this connection, 
                  specialized intervention is needed to restore optimal function.
                </p>
                <p className="text-lg text-neutral-600 mb-8">
                  Our approach combines cutting-edge neuroscience research with proven therapeutic 
                  techniques to help your nervous system adapt, reorganize, and regain control over 
                  movement patterns and muscle function.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <Heart className="w-6 h-6 text-indigo-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-800 mb-1">Personalized Care</h4>
                      <p className="text-neutral-600 text-sm">Tailored to your specific needs</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Shield className="w-6 h-6 text-indigo-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-800 mb-1">Expert Specialization</h4>
                      <p className="text-neutral-600 text-sm">Advanced neurological training</p>
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
                  src="https://images.pexels.com/photos/7659645/pexels-photo-7659645.jpeg?auto=compress&cs=tinysrgb&w=800&h=600" 
                  alt="Neuromuscular assessment and treatment" 
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/5473298/pexels-photo-5473298.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Principles Section */}
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
                Core Treatment Principles
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Our neuromuscular therapy is based on fundamental principles of neuroscience 
                and rehabilitation medicine to optimize your recovery potential.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {principles.map((principle, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white p-6 rounded-lg shadow-md text-center"
                >
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                    {principle.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-800 mb-3">{principle.title}</h3>
                  <p className="text-neutral-600">{principle.description}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Conditions Section */}
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
                Conditions We Treat
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Our neuromuscular therapy programs are designed to address a wide range of 
                neurological conditions and movement disorders.
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
                  className="bg-indigo-50 p-6 rounded-lg shadow-md"
                >
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-neutral-800 text-center mb-2">{condition}</h3>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Techniques Section */}
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
                  src="https://images.pexels.com/photos/7659576/pexels-photo-7659576.jpeg?auto=compress&cs=tinysrgb&w=800&h=600" 
                  alt="Neuromuscular therapy techniques" 
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/6111597/pexels-photo-6111597.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -top-6 -right-6 bg-indigo-600 text-white p-4 rounded-lg shadow-lg">
                  <Zap className="w-6 h-6 mb-2" />
                  <p className="font-semibold">Advanced Methods</p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">
                  Specialized Techniques
                </h2>
                <p className="text-lg text-neutral-600 mb-8">
                  We utilize advanced neuromuscular techniques that target the specific 
                  communication pathways between your nervous system and muscles to restore optimal function.
                </p>
                <div className="space-y-4">
                  {techniques.map((technique, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center p-3 bg-indigo-50 rounded-lg"
                    >
                      <CheckCircle className="w-5 h-5 text-indigo-600 mr-3 flex-shrink-0" />
                      <span className="text-neutral-700">{technique}</span>
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
                Benefits of Neuromuscular Therapy
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Experience improvements in movement, function, and quality of life through 
                our specialized neuromuscular rehabilitation approach.
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
                  className="bg-indigo-50 p-6 rounded-lg shadow-md"
                >
                  <CheckCircle className="w-8 h-8 text-indigo-600 mb-4" />
                  <p className="text-neutral-700 leading-relaxed">{benefit}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Treatment Process Section */}
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
                Your Treatment Journey
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Our comprehensive approach ensures that every aspect of your neuromuscular 
                function is evaluated and addressed through personalized treatment plans.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Neurological Assessment",
                  description: "Comprehensive evaluation of your nervous system function and movement patterns."
                },
                {
                  step: "02",
                  title: "Customized Protocol",
                  description: "Development of a specialized treatment plan based on your specific neurological needs."
                },
                {
                  step: "03",
                  title: "Active Retraining",
                  description: "Intensive neuromuscular re-education using advanced therapeutic techniques."
                },
                {
                  step: "04",
                  title: "Functional Integration",
                  description: "Application of improved function to daily activities and long-term maintenance."
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
                  <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {phase.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-neutral-800">{phase.title}</h3>
                  <p className="text-neutral-600">{phase.description}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* What to Expect Section */}
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
                  What to Expect
                </h2>
                <p className="text-lg text-neutral-600 mb-6">
                  Neuromuscular therapy requires patience and consistency as your nervous system 
                  learns new patterns. Progress may be gradual but can lead to significant 
                  improvements in function and quality of life.
                </p>
                <div className="space-y-4">
                  {[
                    'Initial sessions focus on assessment and education',
                    'Treatment intensity adjusted to your tolerance',
                    'Regular progress monitoring and plan adjustments',
                    'Home exercise programs for continued improvement',
                    'Family education and support when appropriate'
                  ].map((expectation, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start"
                    >
                      <CheckCircle className="w-5 h-5 text-indigo-600 mr-3 mt-1 flex-shrink-0" />
                      <span className="text-neutral-700">{expectation}</span>
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
                  src="https://images.pexels.com/photos/7659633/pexels-photo-7659633.jpeg?auto=compress&cs=tinysrgb&w=800&h=600" 
                  alt="Neuromuscular therapy expectations" 
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/5473305/pexels-photo-5473305.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
              </motion.div>
            </div>
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-indigo-600 text-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Unlock Your Movement Potential
              </h2>
              <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
                Don't let neurological challenges limit your possibilities. Our specialized 
                neuromuscular therapy can help you regain control and improve your quality of life.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                  Start Your Journey
                </Button>
                <Button to="/services" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  Explore Services
                </Button>
              </div>
              
              <div className="mt-12 flex items-center justify-center space-x-8 text-indigo-200">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>Specialized care</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Evidence-based</span>
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

export default NeuromuscularPage;
