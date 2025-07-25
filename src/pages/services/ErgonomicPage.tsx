import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Clock, Star, CheckCircle, ArrowRight, Shield, Settings, Users } from 'lucide-react';
import Container from '../../components/shared/Container';
import Button from '../../components/shared/Button';
import SEOHead from '../../components/utils/SEOHead';

const ErgonomicPage: React.FC = () => {
  const assessmentAreas = [
    'Workstation setup and positioning',
    'Chair height and back support',
    'Monitor position and eye level',
    'Keyboard and mouse placement',
    'Lighting and glare assessment',
    'Posture analysis and correction',
    'Movement and break schedules',
    'Equipment recommendations'
  ];

  const workplaces = [
    'Office environments',
    'Home office setups',
    'Industrial workstations',
    'Healthcare facilities',
    'Manufacturing plants',
    'Call centers',
    'Creative studios',
    'Remote work spaces'
  ];

  const benefits = [
    'Reduced workplace injuries',
    'Decreased pain and discomfort',
    'Improved productivity and focus',
    'Better posture and alignment',
    'Enhanced employee satisfaction',
    'Lower healthcare costs'
  ];

  const commonIssues = [
    {
      issue: 'Neck and Shoulder Pain',
      causes: ['Monitor too low/high', 'Poor chair support', 'Prolonged static postures'],
      solutions: ['Adjust monitor height', 'Ergonomic chair setup', 'Regular movement breaks']
    },
    {
      issue: 'Lower Back Pain',
      causes: ['Poor chair ergonomics', 'Inadequate lumbar support', 'Prolonged sitting'],
      solutions: ['Proper chair adjustment', 'Lumbar support cushion', 'Sit-stand options']
    },
    {
      issue: 'Wrist and Hand Problems',
      causes: ['Poor keyboard/mouse position', 'Repetitive motions', 'Lack of wrist support'],
      solutions: ['Ergonomic accessories', 'Proper hand positioning', 'Regular stretching']
    }
  ];

  return (
    <>
      <SEOHead
        title="Ergonomic Assessments - KH Therapy"
        description="Professional ergonomic assessments at KH Therapy. Workplace evaluations and solutions to prevent injury and improve comfort and productivity."
        canonicalUrl="/services/ergonomic"
      />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 bg-gradient-to-r from-orange-600 to-red-600 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <Container>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center mb-4">
                  <Monitor className="w-8 h-8 mr-3" />
                  <span className="text-orange-200 font-medium">Workplace Wellness</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Ergonomic Assessments
                </h1>
                <p className="text-xl text-orange-100 mb-8 leading-relaxed">
                  Optimize your workspace for health, comfort, and productivity. Our comprehensive 
                  ergonomic evaluations identify risks and provide practical solutions for injury prevention.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                    Schedule Assessment
                  </Button>
                  <Button to="/contact" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                    Learn More
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
                  src="https://images.pexels.com/photos/4050313/pexels-photo-4050313.jpeg?auto=compress&cs=tinysrgb&w=800&h=600" 
                  alt="Ergonomic workplace assessment" 
                  className="rounded-lg shadow-2xl w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -bottom-6 -left-6 bg-white text-orange-600 p-4 rounded-lg shadow-lg">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 fill-current text-green-400 mr-1" />
                    <span className="font-semibold">Injury Prevention</span>
                  </div>
                  <p className="text-sm text-gray-600">Proactive solutions</p>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Why Ergonomics Matter Section */}
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
                  Why Ergonomics Matter
                </h2>
                <p className="text-lg text-neutral-600 mb-6">
                  Poor workplace ergonomics contribute to musculoskeletal disorders, reduced 
                  productivity, and increased healthcare costs. With many people spending 8+ hours 
                  at their workstation daily, proper ergonomics are essential for long-term health.
                </p>
                <p className="text-lg text-neutral-600 mb-8">
                  Our ergonomic assessments identify risk factors and provide evidence-based 
                  solutions that prevent injury, reduce discomfort, and enhance overall workplace 
                  well-being and performance.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    <Users className="w-6 h-6 text-orange-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-800 mb-1">Team Approach</h4>
                      <p className="text-neutral-600 text-sm">Individual and group solutions</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Settings className="w-6 h-6 text-orange-600 mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-800 mb-1">Practical Solutions</h4>
                      <p className="text-neutral-600 text-sm">Actionable recommendations</p>
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
                  src="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800&h=600" 
                  alt="Workplace ergonomics importance" 
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Common Issues Section */}
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
                Common Workplace Issues
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Identify the warning signs and understand how ergonomic improvements can 
                address these prevalent workplace health challenges.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {commonIssues.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white p-6 rounded-lg shadow-md"
                >
                  <h3 className="text-xl font-semibold text-neutral-800 mb-4">{item.issue}</h3>
                  
                  <div className="mb-4">
                    <h4 className="font-medium text-red-600 mb-2">Common Causes:</h4>
                    <ul className="text-sm text-neutral-600 space-y-1">
                      {item.causes.map((cause, causeIndex) => (
                        <li key={causeIndex} className="flex items-start">
                          <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {cause}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Solutions:</h4>
                    <ul className="text-sm text-neutral-600 space-y-1">
                      {item.solutions.map((solution, solutionIndex) => (
                        <li key={solutionIndex} className="flex items-start">
                          <CheckCircle className="w-3 h-3 text-green-500 mt-1 mr-2 flex-shrink-0" />
                          {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Workplace Types Section */}
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
                Workplace Environments We Assess
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Our ergonomic expertise extends across various work environments, from 
                traditional offices to specialized industrial settings.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {workplaces.map((workplace, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-orange-50 p-6 rounded-lg shadow-md"
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Monitor className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-neutral-800 text-center mb-2">{workplace}</h3>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Assessment Process Section */}
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
                  src="https://images.pexels.com/photos/3184454/pexels-photo-3184454.jpeg?auto=compress&cs=tinysrgb&w=800&h=600" 
                  alt="Ergonomic assessment process" 
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/4145153/pexels-photo-4145153.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
                <div className="absolute -top-6 -right-6 bg-orange-600 text-white p-4 rounded-lg shadow-lg">
                  <Settings className="w-6 h-6 mb-2" />
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
                  Our thorough ergonomic evaluations examine every aspect of your workspace 
                  to identify potential risk factors and optimization opportunities.
                </p>
                <div className="space-y-4">
                  {assessmentAreas.map((area, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center p-3 bg-orange-50 rounded-lg"
                    >
                      <CheckCircle className="w-5 h-5 text-orange-600 mr-3 flex-shrink-0" />
                      <span className="text-neutral-700">{area}</span>
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
                Benefits of Ergonomic Assessment
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Investing in ergonomic assessments provides immediate and long-term benefits 
                for both employees and organizations.
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
                  className="bg-orange-50 p-6 rounded-lg shadow-md"
                >
                  <CheckCircle className="w-8 h-8 text-orange-600 mb-4" />
                  <p className="text-neutral-700 leading-relaxed">{benefit}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Process Section */}
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
                Our Assessment Process
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                We follow a systematic approach to ensure comprehensive evaluation and 
                practical, implementable solutions for your workspace.
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Initial Consultation",
                  description: "Discuss concerns, goals, and specific workplace challenges with our ergonomic specialist."
                },
                {
                  step: "02",
                  title: "On-site Evaluation",
                  description: "Comprehensive assessment of workstation setup, postures, and work processes."
                },
                {
                  step: "03",
                  title: "Analysis & Report",
                  description: "Detailed findings with prioritized recommendations and cost-effective solutions."
                },
                {
                  step: "04",
                  title: "Implementation Support",
                  description: "Guidance on implementing changes and follow-up to ensure effectiveness."
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
                  <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {phase.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-neutral-800">{phase.title}</h3>
                  <p className="text-neutral-600">{phase.description}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Who Benefits Section */}
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
                  Who Benefits from Ergonomic Assessments?
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      group: 'Employees',
                      benefits: ['Reduced pain and discomfort', 'Improved comfort and productivity', 'Prevention of work-related injuries']
                    },
                    {
                      group: 'Employers',
                      benefits: ['Lower workers\' compensation costs', 'Reduced absenteeism', 'Improved employee satisfaction and retention']
                    },
                    {
                      group: 'HR Departments',
                      benefits: ['Proactive risk management', 'Compliance with safety regulations', 'Enhanced workplace wellness programs']
                    }
                  ].map((group, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="bg-orange-50 p-4 rounded-lg"
                    >
                      <h3 className="font-semibold text-neutral-800 mb-2">{group.group}</h3>
                      <ul className="space-y-1">
                        {group.benefits.map((benefit, benefitIndex) => (
                          <li key={benefitIndex} className="flex items-center text-sm text-neutral-600">
                            <CheckCircle className="w-4 h-4 text-orange-600 mr-2 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
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
                  src="https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=800&h=600" 
                  alt="Teams benefiting from ergonomic assessments" 
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = "https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=800&h=600";
                  }}
                />
              </motion.div>
            </div>
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-orange-600 text-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Transform Your Workplace Today
              </h2>
              <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
                Don't wait for discomfort to become injury. Invest in your team's health and 
                productivity with professional ergonomic assessments that deliver real results.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                  Schedule Assessment
                </Button>
                <Button to="/services" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  All Services
                </Button>
              </div>
              
              <div className="mt-12 flex items-center justify-center space-x-8 text-orange-200">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>Quick turnaround</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Actionable solutions</span>
                </div>
                <div className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  <span>Proven ROI</span>
                </div>
              </div>
            </motion.div>
          </Container>
        </section>
      </main>
    </>
  );
};

export default ErgonomicPage;
