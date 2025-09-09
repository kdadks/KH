import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Clock, Star, CheckCircle, ArrowRight, Shield, Target, Users } from 'lucide-react';
import Container from '../../components/shared/Container';
import Button from '../../components/shared/Button';
import SEOHead from '../../components/utils/SEOHead';

const WellnessAssessmentPage: React.FC = () => {
  const assessmentAreas = [
    'Physical health evaluation',
    'Mental and emotional wellness',
    'Spiritual well-being assessment',
    'Social connections analysis',
    'Work-life balance review',
    'Stress management evaluation',
    'Nutrition and lifestyle habits',
    'Sleep quality assessment'
  ];

  const benefits = [
    'Comprehensive health awareness',
    'Personalized wellness goals',
    'Disease prevention strategies',
    'Improved quality of life',
    'Enhanced emotional well-being',
    'Better stress management',
    'Longevity and healthy aging',
    'Lifestyle optimization'
  ];

  const wellnessAreas = [
    {
      area: 'Physical Health',
      description: 'Body composition, fitness level, and nutritional needs assessment',
      icon: <Heart className="w-6 h-6" />
    },
    {
      area: 'Mental Wellness',
      description: 'Emotional balance, stress management, and cognitive function',
      icon: <Target className="w-6 h-6" />
    },
    {
      area: 'Social Connections',
      description: 'Relationship quality, social support, and community engagement',
      icon: <Users className="w-6 h-6" />
    },
    {
      area: 'Spiritual Growth',
      description: 'Life purpose, values alignment, and personal meaning',
      icon: <Star className="w-6 h-6" />
    }
  ];

  return (
    <>
      <SEOHead
        title="Wellness Assessment - KH Therapy"
        description="Comprehensive wellness assessment at KH Therapy. Holistic evaluation of physical, mental, emotional, and spiritual well-being to guide healthy lifestyle changes."
        canonicalUrl="/services/wellness-assessment"
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
                  <Heart className="w-8 h-8 mr-3" />
                  <span className="text-secondary-200 font-medium">Holistic Wellness</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Wellness Assessment
                </h1>
                <p className="text-xl text-secondary-100 mb-8 leading-relaxed">
                  Discover your complete wellness profile with our comprehensive assessment.
                  Using evidence-based tools like the Wellness Evaluation of Lifestyle (WEL) Inventory,
                  we evaluate all aspects of your well-being to guide meaningful lifestyle improvements.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                    Start Assessment
                  </Button>
                  <Button to="/contact" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                    Learn More
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
                  src="https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800&h=600"
                  alt="Wellness assessment consultation"
                  className="rounded-lg shadow-2xl w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -bottom-6 -left-6 bg-white text-secondary-600 p-4 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 fill-current text-green-400 mr-1" />
                    <span className="font-semibold">Comprehensive Evaluation</span>
                  </div>
                  <p className="text-sm text-gray-600">Holistic approach</p>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* What is Wellness Assessment Section */}
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
                  What is a Wellness Assessment?
                </h2>
                <p className="text-lg text-neutral-600 mb-6">
                  A wellness evaluation is a comprehensive assessment designed to measure and improve
                  an individual's overall health and well-being. Using tools like the Wellness Evaluation
                  of Lifestyle (WEL) Inventory based on the Wheel of Wellness model, these evaluations
                  assess multiple life tasks and forces.
                </p>
                <p className="text-lg text-neutral-600 mb-8">
                  Our assessments provide detailed scores and composite scores to identify areas of
                  strength and weakness, guiding you toward meaningful lifestyle changes for better
                  quality of life, longevity, and healthy habits.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <Users className="w-6 h-6 text-secondary-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-800 mb-1">Holistic Approach</h4>
                      <p className="text-neutral-600 text-sm">Body, mind, and spirit evaluation</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Target className="w-6 h-6 text-secondary-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-800 mb-1">Personalized Results</h4>
                      <p className="text-neutral-600 text-sm">Tailored recommendations</p>
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
                  src="https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800&h=600"
                  alt="Wellness assessment process"
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Wellness Components Section */}
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
                Key Wellness Components
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Our comprehensive assessment evaluates multiple interconnected aspects of wellness,
                providing a complete picture of your health and well-being.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {wellnessAreas.map((component, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white p-6 rounded-lg shadow-md text-center"
                >
                  <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="text-secondary-600">
                      {component.icon}
                    </div>
                  </div>
                  <h3 className="font-semibold text-neutral-800 mb-2">{component.area}</h3>
                  <p className="text-neutral-600 text-sm">{component.description}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Assessment Areas Section */}
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
                  src="https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800&h=600"
                  alt="Wellness assessment areas"
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -top-6 -right-6 bg-secondary-600 text-white p-4 rounded-lg shadow-lg">
                  <Target className="w-6 h-6 mb-2" />
                  <p className="font-semibold">Detailed Analysis</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">
                  Comprehensive Assessment Areas
                </h2>
                <p className="text-lg text-neutral-600 mb-8">
                  Our thorough wellness evaluation examines every aspect of your lifestyle
                  to identify potential areas for improvement and optimization.
                </p>
                <div className="space-y-4">
                  {assessmentAreas.map((area, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center p-3 bg-secondary-50 rounded-lg"
                    >
                      <CheckCircle className="w-5 h-5 text-secondary-600 mr-3 flex-shrink-0" />
                      <span className="text-neutral-700">{area}</span>
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
                Benefits of Wellness Assessment
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Investing in a comprehensive wellness assessment provides immediate and long-term
                benefits for your health and quality of life.
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
                  <CheckCircle className="w-8 h-8 text-secondary-600 mb-4" />
                  <p className="text-neutral-700 leading-relaxed">{benefit}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Assessment Process Section */}
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
                Our Assessment Process
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                We follow a systematic approach to ensure comprehensive evaluation and
                practical, implementable recommendations for your wellness journey.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Initial Consultation",
                  description: "Discuss your health goals, concerns, and current lifestyle with our wellness specialist."
                },
                {
                  step: "02",
                  title: "Comprehensive Evaluation",
                  description: "Complete the Wellness Evaluation of Lifestyle (WEL) Inventory and physical assessments."
                },
                {
                  step: "03",
                  title: "Analysis & Report",
                  description: "Detailed findings with prioritized recommendations and personalized wellness plan."
                },
                {
                  step: "04",
                  title: "Ongoing Support",
                  description: "Coaching and follow-up to implement changes and track your wellness progress."
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

        {/* Wheel of Wellness Section */}
        <section className="py-16 md:py-24 bg-neutral-50">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">
                  The Wheel of Wellness Model
                </h2>
                <p className="text-lg text-neutral-600 mb-6">
                  Our assessments are grounded in the Wheel of Wellness model, a comprehensive
                  framework that recognizes the interconnectedness of various life aspects.
                  This holistic approach ensures we address all dimensions of your well-being.
                </p>
                <p className="text-lg text-neutral-600 mb-8">
                  By evaluating each spoke of the wellness wheel, we can identify imbalances
                  and create targeted interventions that promote overall health and vitality.
                </p>

                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-neutral-800 mb-2">Life Tasks</h4>
                    <p className="text-neutral-600 text-sm">Spirituality, self-direction, work, leisure, friendship, love</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-neutral-800 mb-2">Life Forces</h4>
                    <p className="text-neutral-600 text-sm">Physical health, coping mechanisms, and environmental factors</p>
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
                  src="https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800&h=600"
                  alt="Wheel of Wellness model illustration"
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
              </motion.div>
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
                Start Your Wellness Journey Today
              </h2>
              <p className="text-xl text-secondary-100 mb-8 max-w-2xl mx-auto">
                Take the first step toward optimal health and well-being. Our comprehensive
                wellness assessment will provide the insights and guidance you need for
                lasting lifestyle improvements.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button to="/booking" variant="primary" size="lg" icon={<ArrowRight size={20} />}>
                  Begin Assessment
                </Button>
                <Button to="/services" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  All Services
                </Button>
              </div>

              <div className="mt-12 flex items-center justify-center space-x-8 text-secondary-200">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>45-60 min assessment</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Personalized plan</span>
                </div>
                <div className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  <span>Evidence-based approach</span>
                </div>
              </div>
            </motion.div>
          </Container>
        </section>
      </main>
    </>
  );
};

export default WellnessAssessmentPage;
