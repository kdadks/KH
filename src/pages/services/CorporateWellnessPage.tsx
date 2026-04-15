import React from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  Monitor,
  CheckCircle,
  ArrowRight,
  Activity,
  Brain,
  TrendingUp,
  Smile,
  MapPin,
} from 'lucide-react';
import Container from '../../components/shared/Container';
import Button from '../../components/shared/Button';
import SEOHead from '../../components/utils/SEOHead';

const CorporateWellnessPage: React.FC = () => {
  const benefits = [
    {
      icon: <Activity className="w-8 h-8 text-primary-600" />,
      title: 'Reduce Pain & Prevent Injury',
      description:
        'Long hours at a desk, repetitive movements, and poor posture can lead to discomfort and injury. Sessions focus on improving posture, mobility, and strength to help prevent common workplace issues like back, neck, and shoulder pain.',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-primary-600" />,
      title: 'Improve Focus & Productivity',
      description:
        'Movement breaks and structured sessions help boost energy levels, reduce fatigue, and improve concentration — helping your team perform at their best.',
    },
    {
      icon: <Brain className="w-8 h-8 text-primary-600" />,
      title: 'Support Mental Wellbeing',
      description:
        'Pilates encourages mindful movement and breathing, helping to reduce stress and promote a sense of calm and balance throughout the workday.',
    },
    {
      icon: <Smile className="w-8 h-8 text-primary-600" />,
      title: 'Boost Morale & Team Engagement',
      description:
        'Offering wellness initiatives shows your team that you value their health. It can improve morale, increase engagement, and contribute to a more positive workplace culture.',
    },
  ];

  const offerings = [
    {
      icon: <MapPin className="w-8 h-8 text-primary-600" />,
      title: 'On-Site Workplace Sessions',
      description:
        "I come directly to your workplace and deliver guided Pilates or movement sessions tailored to your team's needs and space.",
    },
    {
      icon: <Monitor className="w-8 h-8 text-primary-600" />,
      title: 'Online Corporate Classes',
      description:
        'Perfect for remote or hybrid teams, these sessions provide flexibility while still delivering the same high-quality experience.',
    },
    {
      icon: <Activity className="w-8 h-8 text-primary-600" />,
      title: 'Desk-Based Movement Workshops',
      description:
        'Practical, easy-to-follow sessions focused on posture, stretching, and simple exercises employees can incorporate into their daily routine.',
    },
  ];

  const whoItsFor = [
    'Office-based teams',
    'Remote or hybrid companies',
    'Businesses looking to invest in employee wellbeing',
    'Teams experiencing high levels of stress or physical discomfort',
  ];

  const whyChooseMe = [
    'Qualified Physical Therapist with a deep understanding of injury prevention',
    'Experienced Pilates instructor (Mat & Reformer)',
    "Sessions tailored to your team, not a one-size-fits-all approach",
    'Professional, approachable, and focused on real results',
  ];

  return (
    <>
      <SEOHead
        title="Corporate Wellness & Workplace Physiotherapy Dublin | KH Therapy"
        description="Corporate wellness, workplace Pilates, and ergonomic physiotherapy sessions for Dublin businesses. KH Therapy delivers on-site, online, and desk-based health programmes to reduce pain and boost team productivity."
        canonicalUrl="/services/corporate-wellness"
        keywords="corporate wellness physiotherapy Dublin, workplace Pilates Dublin, office physiotherapy Dublin, ergonomic assessment Dublin, corporate health programme Dublin"
      />

      <main>
        {/* Hero Section */}
        <section className="relative py-6 md:py-6 bg-gradient-to-r from-secondary-600 to-secondary-800 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <Container>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center mb-4">
                  <Building2 className="w-8 h-8 mr-3" />
                  <span className="text-secondary-200 font-medium">Corporate Wellness</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Support Your Team. Strengthen Your Workplace.
                </h1>
                <p className="text-xl text-secondary-100 mb-8 leading-relaxed">
                  A healthy team is a productive team. I offer corporate Pilates and movement sessions designed
                  to help employees feel better physically and mentally leading to improved focus, reduced
                  discomfort, and a more positive work environment.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/contact" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                    Get in Touch
                  </Button>
                  <Button
                    to="/services"
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white/10"
                  >
                    All Services
                  </Button>
                </div>

                {/* Service Navigation */}
                <div className="mt-8 pt-8 border-t border-secondary-500/30">
                  <p className="text-secondary-200 text-sm font-medium mb-4">Explore Our Services</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      to="/services/pilates"
                      variant="outline"
                      size="sm"
                      className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20"
                    >
                      Pilates
                    </Button>
                    <Button
                      to="/services/sports-injury"
                      variant="outline"
                      size="sm"
                      className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20"
                    >
                      Sports Injury
                    </Button>
                    <Button
                      to="/services/online"
                      variant="outline"
                      size="sm"
                      className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20"
                    >
                      Online Services
                    </Button>
                    <Button
                      to="/services/home-visits"
                      variant="outline"
                      size="sm"
                      className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20"
                    >
                      Home Visits
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
                  src="/Corp.webp"
                  alt="Corporate wellness and workplace Pilates sessions with Kelly"
                  className="rounded-lg shadow-2xl w-full h-[400px] object-contain object-center"
                />
                {/* Stats badge */}
                <div className="absolute -bottom-4 -left-4 bg-white text-neutral-800 rounded-xl shadow-xl p-5 max-w-[200px]">
                  <Users className="w-7 h-7 text-primary-600 mb-2" />
                  <p className="font-bold text-lg leading-tight">Teams of All Sizes</p>
                  <p className="text-sm text-neutral-500 mt-1">On-site &amp; online</p>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* About / Overview Section */}
        <section className="py-8 md:py-12 bg-white">
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">
                  A Professional, Evidence-Based Approach to Workplace Wellbeing
                </h2>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  With a background as a Physical Therapist and Pilates instructor, I bring clinical expertise
                  directly to your team. These sessions are tailored to the demands of modern work — whether
                  your team is desk-based, remote, or on their feet all day.
                </p>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* How I Can Help Section */}
        <section className="py-8 md:py-12 bg-neutral-50">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-4">
                How I Can Help Your Business
              </h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Investing in employee wellbeing pays dividends across your entire organisation.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-primary-600"
                >
                  <div className="mb-4">{benefit.icon}</div>
                  <h3 className="text-xl font-bold text-neutral-800 mb-3">{benefit.title}</h3>
                  <p className="text-neutral-600 leading-relaxed">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* What I Offer Section */}
        <section className="py-8 md:py-12 bg-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-4">What I Offer</h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Flexible formats to suit your team's size, location, and schedule.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {offerings.map((offering, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-neutral-50 p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="mb-5">{offering.icon}</div>
                  <h3 className="text-xl font-bold text-neutral-800 mb-3">{offering.title}</h3>
                  <p className="text-neutral-600 leading-relaxed">{offering.description}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Who It's For + Why Choose Me */}
        <section className="py-8 md:py-12 bg-neutral-50">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Who It's For */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">Who It's For</h2>
                <div className="space-y-4">
                  {whoItsFor.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start"
                    >
                      <CheckCircle className="w-6 h-6 text-primary-600 mr-4 mt-0.5 flex-shrink-0" />
                      <p className="text-lg text-neutral-700">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Why Choose Me */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">Why Choose Me</h2>
                <div className="space-y-4">
                  {whyChooseMe.map((point, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start"
                    >
                      <CheckCircle className="w-6 h-6 text-primary-600 mr-4 mt-0.5 flex-shrink-0" />
                      <p className="text-lg text-neutral-700">{point}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-8 md:py-12 bg-primary-600 text-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <Building2 className="w-12 h-12 mx-auto mb-6 text-primary-200" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Get Started</h2>
              <p className="text-xl text-primary-100 mb-4 max-w-2xl mx-auto">
                If you're looking to support your team's health, reduce workplace discomfort, and create a more
                energised, productive environment, I'd love to work with you.
              </p>
              <p className="text-primary-200 mb-8">
                Get in touch to discuss a package that suits your business.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button to="/contact" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                  Discuss a Package
                </Button>
                <Button
                  to="/services"
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10"
                >
                  View All Services
                </Button>
              </div>
            </motion.div>
          </Container>
        </section>
      </main>
    </>
  );
};

export default CorporateWellnessPage;
