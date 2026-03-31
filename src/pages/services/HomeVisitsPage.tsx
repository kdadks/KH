import React from 'react';
import { motion } from 'framer-motion';
import { Home, CheckCircle, ArrowRight, MapPin, User, Heart, Shield } from 'lucide-react';
import Container from '../../components/shared/Container';
import Button from '../../components/shared/Button';
import SEOHead from '../../components/utils/SEOHead';

const HomeVisitsPage: React.FC = () => {
  const benefits = [
    {
      icon: <MapPin className="w-8 h-8 text-primary-600" />,
      title: 'Tailored to Your Environment',
      description:
        'We work within your own space, making sessions more relevant and easier to integrate into your daily life.',
    },
    {
      icon: <User className="w-8 h-8 text-primary-600" />,
      title: 'Hands-On, In-Person Support',
      description:
        'Benefit from direct guidance, real-time feedback, and a more personal connection.',
    },
    {
      icon: <Shield className="w-8 h-8 text-primary-600" />,
      title: 'Comfort & Privacy',
      description:
        'Enjoy a relaxed, familiar setting where you can feel at ease and fully focused.',
    },
    {
      icon: <Heart className="w-8 h-8 text-primary-600" />,
      title: 'Accountability & Motivation',
      description:
        'Having someone come to you adds an extra level of commitment and helps keep you on track.',
    },
  ];

  const idealFor = [
    'Prefer in-person interaction',
    'Want a more hands-on approach',
    'Feel more comfortable at home',
    'Need help building routines in your own space',
  ];

  return (
    <>
      <SEOHead
        title="Home Visit Physiotherapist Dublin | Mobile Physio | KH Therapy"
        description="Mobile physiotherapy home visits across Dublin. KH Therapy brings expert, hands-on physiotherapy to your door – serving West Dublin, Lucan, Clondalkin, Tallaght, and surrounding areas. Ideal for elderly patients, postnatal care, and those unable to travel."
        canonicalUrl="/services/home-visits"
        keywords="home visit physiotherapist Dublin, mobile physiotherapist Dublin, home physio Dublin, at home physiotherapy Dublin, mobile physio service Dublin, physiotherapist house call Dublin, home physio West Dublin, home physio Dublin South, physio home visits Lucan Dublin, elderly physiotherapy home visits Dublin, postnatal home physio Dublin"
      />

      <main>
        {/* Hero Section */}
        <section className="relative py-6 md:py-10 bg-gradient-to-r from-secondary-600 to-secondary-800 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <Container>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center mb-4">
                  <Home className="w-8 h-8 mr-3" />
                  <span className="text-secondary-200 font-medium">Home Visits</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Personalised Support in Your Own Space
                </h1>
                <p className="text-xl text-secondary-100 mb-8 leading-relaxed">
                  There's nothing quite like receiving support in the comfort of your own home. My
                  home visit service is designed to bring a fully personalised experience directly
                  to you, making it easier to focus, stay motivated, and see real progress.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/booking?visitType=home" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                    Book a Home Visit
                  </Button>
                  <Button
                    to="/contact"
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white/10"
                  >
                    Ask a Question
                  </Button>
                </div>

                {/* Service Navigation */}
                <div className="mt-8 pt-8 border-t border-secondary-500/30">
                  <p className="text-secondary-200 text-sm font-medium mb-4">Explore Our Services</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      to="/services/sports-injury"
                      variant="outline"
                      size="sm"
                      className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20"
                    >
                      Sports Injury
                    </Button>
                    <Button
                      to="/services/manual-therapy"
                      variant="outline"
                      size="sm"
                      className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20"
                    >
                      Manual Therapy
                    </Button>
                    <Button
                      to="/services/chronic-pain"
                      variant="outline"
                      size="sm"
                      className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20"
                    >
                      Chronic Pain
                    </Button>
                    <Button
                      to="/services/online"
                      variant="outline"
                      size="sm"
                      className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20"
                    >
                      Online Sessions
                    </Button>
                    <Button
                      to="/services/wellness-assessment"
                      variant="outline"
                      size="sm"
                      className="border-secondary-400 text-secondary-100 hover:bg-secondary-500/20"
                    >
                      Wellness Assessment
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Hero right — decorative card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative hidden lg:block"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="flex items-center mb-6">
                    <Home className="w-6 h-6 text-secondary-200 mr-3" />
                    <span className="text-secondary-200 font-semibold text-lg">Your Home. Your Sessions.</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center bg-white/10 rounded-lg p-3">
                      <MapPin className="w-5 h-5 text-secondary-200 mr-3 flex-shrink-0" />
                      <span className="text-white text-sm">Sessions delivered directly to your door</span>
                    </div>
                    <div className="flex items-center bg-white/10 rounded-lg p-3">
                      <User className="w-5 h-5 text-secondary-200 mr-3 flex-shrink-0" />
                      <span className="text-white text-sm">Fully personalised, one-to-one support</span>
                    </div>
                    <div className="flex items-center bg-white/10 rounded-lg p-3">
                      <Shield className="w-5 h-5 text-secondary-200 mr-3 flex-shrink-0" />
                      <span className="text-white text-sm">Complete privacy in your own environment</span>
                    </div>
                    <div className="flex items-center bg-white/10 rounded-lg p-3">
                      <Heart className="w-5 h-5 text-secondary-200 mr-3 flex-shrink-0" />
                      <span className="text-white text-sm">Motivation and accountability built in</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* What to Expect Section */}
        <section className="py-8 md:py-14 bg-white">
          <Container>
            <div className="max-w-3xl mx-auto text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-4">
                  What to Expect
                </h2>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  Working in your own environment allows me to tailor everything specifically to
                  your lifestyle, routines, and surroundings — creating a more practical and
                  effective approach. This is all about making the process as easy and effective as
                  possible for you, right where you are.
                </p>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Why Choose Home Visits? */}
        <section className="py-8 md:py-14 bg-neutral-50">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-4">
                Why Choose Home Visits?
              </h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                The same expert, personalised care — delivered in the place where you feel most at ease.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white p-6 rounded-xl shadow-sm border border-neutral-100 flex gap-5"
                >
                  <div className="flex-shrink-0 mt-1">{benefit.icon}</div>
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-800 mb-2">{benefit.title}</h3>
                    <p className="text-neutral-600 leading-relaxed">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* Is a Home Visit Right for You? */}
        <section className="py-8 md:py-14 bg-white">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-4">
                  Is a Home Visit Right for You?
                </h2>
                <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                  Home visits are ideal if you:
                </p>
                <div className="space-y-4 mb-8">
                  {idealFor.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start"
                    >
                      <CheckCircle className="w-5 h-5 text-primary-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-700">{item}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="bg-secondary-50 border-l-4 border-secondary-600 p-4 rounded-lg">
                  <p className="text-neutral-700 leading-relaxed">
                    This is all about making the process as easy and effective as possible for you —
                    right where you are.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-neutral-50 rounded-2xl p-8 border border-neutral-100"
              >
                <h3 className="text-2xl font-bold text-neutral-800 mb-6">Ready to Get Started?</h3>
                <p className="text-neutral-600 mb-8 leading-relaxed">
                  Book your first home visit today. I'll come to you fully prepared — so all you
                  need to do is show up and take that first step.
                </p>
                <div className="space-y-4">
                  <Button
                    to="/booking?visitType=home"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center"
                    icon={<ArrowRight size={20} />}
                  >
                    Book a Home Visit
                  </Button>
                  <Button
                    to="/contact"
                    variant="outline"
                    size="lg"
                    className="w-full justify-center"
                  >
                    Contact Me First
                  </Button>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-8 md:py-12 bg-secondary-700 text-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Support That Comes to You
              </h2>
              <p className="text-xl text-secondary-100 mb-8 max-w-2xl mx-auto">
                No travel, no hassle — just expert, personalised care in the comfort of your
                own home. Let's get started today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button to="/booking?visitType=home" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                  Book Your Home Visit
                </Button>
                <Button
                  to="/contact"
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10"
                >
                  Get in Touch
                </Button>
              </div>
            </motion.div>
          </Container>
        </section>
      </main>
    </>
  );
};

export default HomeVisitsPage;
