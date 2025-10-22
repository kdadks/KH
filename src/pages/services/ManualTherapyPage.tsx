import React from 'react';
import { motion } from 'framer-motion';
import { Hand, Clock, Star, CheckCircle, ArrowRight, Heart, Target } from 'lucide-react';
import Container from '../../components/shared/Container';
import Button from '../../components/shared/Button';
import SEOHead from '../../components/utils/SEOHead';

const ManualTherapyPage: React.FC = () => {
  const techniques = [
    'Joint mobilization and manipulation',
    'Soft tissue massage and myofascial release',
    'Trigger point therapy',
    'Dry needling',
    'Tens machine stimulation',
    'Visceral manipulation',
    'Deep tissue massage'
  ];

  const benefits = [
    'Pain relief and reduced inflammation',
    'Improved joint mobility and flexibility',
    'Enhanced circulation and healing',
    'Reduced muscle tension and spasms',
    'Better posture and movement patterns',
    'Faster recovery from injuries'
  ];

  const conditions = [
    'Back and neck pain',
    'Headaches and migraines',
    'Joint stiffness',
    'Muscle strains',
    'Arthritis symptoms',
    'Post-surgical recovery',
    'Chronic pain conditions',
    'Movement disorders'
  ];

  return (
    <>
      <SEOHead
        title="Manual Therapy - KH Therapy"
        description="Expert manual therapy services at KH Therapy. Hands-on treatment techniques to relieve pain, improve mobility, and promote natural healing processes."
        canonicalUrl="/services/manual-therapy"
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
                  <Hand className="w-8 h-8 mr-3" />
                  <span className="text-secondary-200 font-medium">Hands-On Treatment</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Manual Therapy
                </h1>
                <p className="text-xl text-secondary-100 mb-8 leading-relaxed">
                  Experience the healing power of skilled hands-on techniques. Our manual therapy 
                  treatments relieve pain, restore function, and promote your body's natural healing processes.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/booking" variant="primary" size="lg" icon={<ArrowRight size={20} />}>
                    Book Treatment
                  </Button>
                  <Button to="/contact" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                    Learn More
                  </Button>
                </div>
                
                {/* Service Navigation */}
                <div className="mt-8 pt-8 border-t border-secondary-500/30">
                  <p className="text-secondary-200 text-sm font-medium mb-4">Explore Our Services</p>
                  <div className="flex flex-wrap gap-3">
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
                  src="/ManualTH.jpeg?auto=compress&cs=tinysrgb&w=800&h=600"
                  alt="Manual therapy treatment session"
                  className="rounded-lg shadow-2xl w-full h-[500px] object-contain bg-secondary-700"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "/ManualTH.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -bottom-6 -right-6 bg-white text-secondary-600 p-4 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <Heart className="w-5 h-5 fill-current text-red-400 mr-1" />
                    <span className="font-semibold">Gentle Care</span>
                  </div>
                  <p className="text-sm text-gray-600">Personalized approach</p>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Techniques Section */}
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
                  src="/ManualTH.jpeg?auto=compress&cs=tinysrgb&w=800&h=600" 
                  alt="Manual therapy techniques" 
                  className="rounded-lg shadow-lg w-full h-[500px] object-contain bg-neutral-100"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "/ManualTH.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -top-6 -left-6 bg-secondary-600 text-white p-4 rounded-lg shadow-lg">
                  <Target className="w-6 h-6 mb-2" />
                  <p className="font-semibold">Targeted Relief</p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">
                  Our Manual Therapy Techniques
                </h2>
                <p className="text-lg text-neutral-600 mb-8">
                  Our skilled physiotherapists use a variety of hands-on techniques to address 
                  your specific needs and promote optimal healing and function.
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {techniques.map((technique, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center p-3 bg-secondary-50 rounded-lg"
                    >
                      <CheckCircle className="w-5 h-5 text-secondary-600 mr-3 flex-shrink-0" />
                      <span className="text-neutral-700">{technique}</span>
                    </motion.div>
                  ))}
                </div>
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
                Conditions We Treat
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Manual therapy is effective for a wide range of musculoskeletal conditions 
                and can provide significant relief from pain and dysfunction.
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
                  className="bg-white p-6 rounded-lg shadow-md text-center"
                >
                  <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Hand className="w-6 h-6 text-secondary-600" />
                  </div>
                  <h3 className="font-semibold text-neutral-800 mb-2">{condition}</h3>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Benefits Section */}
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
                  Benefits of Manual Therapy
                </h2>
                <p className="text-lg text-neutral-600 mb-8">
                  Manual therapy offers numerous benefits beyond pain relief, promoting overall 
                  wellness and improved quality of life through natural healing processes.
                </p>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start"
                    >
                      <CheckCircle className="w-6 h-6 text-secondary-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-700 text-lg">{benefit}</span>
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
                  src="/ManualTH.jpeg?auto=compress&cs=tinysrgb&w=800&h=600" 
                  alt="Patient receiving manual therapy treatment" 
                  className="rounded-lg shadow-lg w-full h-[500px] object-contain bg-neutral-100"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "/ManualTH.jpeg?auto=compress&cs=tinysrgb&w=800&h=200";
                  }}
                />
              </motion.div>
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
                What to Expect During Treatment
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Your comfort and safety are our top priorities. Here's what you can expect 
                during your manual therapy session.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "Assessment",
                  description: "Thorough evaluation of your condition, medical history, and movement patterns to determine the best treatment approach."
                },
                {
                  step: "Treatment",
                  description: "Gentle, skilled hands-on techniques tailored to your specific needs and comfort level throughout the session."
                },
                {
                  step: "Follow-up",
                  description: "Post-treatment advice, home exercises, and scheduling of follow-up sessions to optimize your recovery."
                }
              ].map((phase, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="bg-white p-8 rounded-lg shadow-md text-center"
                >
                  <div className="w-16 h-16 bg-secondary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-6">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-neutral-800">{phase.step}</h3>
                  <p className="text-neutral-600 leading-relaxed">{phase.description}</p>
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
                Experience the Healing Touch
              </h2>
              <p className="text-xl text-secondary-100 mb-8 max-w-2xl mx-auto">
                Discover how our expert manual therapy can help you achieve lasting pain relief 
                and improved mobility through gentle, effective hands-on treatment.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button to="/booking" variant="primary" size="lg" icon={<ArrowRight size={20} />}>
                  Schedule Your Session
                </Button>
                <Button to="/services" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  Explore Other Services
                </Button>
              </div>
              
              <div className="mt-12 flex items-center justify-center space-x-8 text-secondary-200">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>45-60 min sessions</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Gentle techniques</span>
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

export default ManualTherapyPage;
