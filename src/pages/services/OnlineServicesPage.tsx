import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, CheckCircle, ArrowRight, Calendar, Home, Plane, Star } from 'lucide-react';
import Container from '../../components/shared/Container';
import Button from '../../components/shared/Button';
import SEOHead from '../../components/utils/SEOHead';

const OnlineServicesPage: React.FC = () => {
  const benefits = [
    {
      icon: <Calendar className="w-8 h-8 text-primary-600" />,
      title: 'Convenience & Flexibility',
      description:
        'Schedule sessions that fit around your day. No travel time means it\'s easier to stay consistent and committed.',
    },
    {
      icon: <Home className="w-8 h-8 text-primary-600" />,
      title: 'Comfortable Environment',
      description:
        'Being in your own space can help you feel more relaxed, making it easier to open up and fully engage in the process.',
    },
    {
      icon: <Star className="w-8 h-8 text-primary-600" />,
      title: 'Personalised Support',
      description:
        'Every session is tailored specifically to your needs, ensuring you get the same high-quality experience as in-person work.',
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-primary-600" />,
      title: 'Consistency That Works',
      description:
        'Online sessions make it easier to stick to a routine, which is key to achieving long-term results.',
    },
  ];

  const idealFor = [
    'Have a busy or unpredictable schedule',
    'Prefer working from home',
    'Travel frequently',
    'Want flexibility without compromising on quality',
  ];

  return (
    <>
      <SEOHead
        title="Online Physiotherapy Dublin | Virtual Physio Consultations | KH Therapy"
        description="Online physiotherapy consultations and virtual Pilates sessions with KH Therapy. Access expert chartered physiotherapy from anywhere in Ireland – flexible, convenient, and effective."
        canonicalUrl="/services/online"
        keywords="online physiotherapy Dublin, virtual physiotherapy Ireland, online physio consultation Dublin, telehealth physiotherapy Ireland, online Pilates Dublin, remote physiotherapy Ireland"
      />

      <main>
        {/* Hero Section */}
        <section className="relative py-6 md:py-10 bg-gradient-to-r from-primary-600 to-primary-800 text-white overflow-hidden">
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
                  <span className="text-primary-200 font-medium">Online Services</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Work With Me From Anywhere
                </h1>
                <p className="text-xl text-primary-100 mb-8 leading-relaxed">
                  Life is busy, and finding time for yourself can be a challenge. That's why my online
                  services are designed to give you the flexibility and support you need — no matter
                  where you are.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                    Book a Session
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
                <div className="mt-8 pt-8 border-t border-primary-500/30">
                  <p className="text-primary-200 text-sm font-medium mb-4">Explore Our Services</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      to="/services/sports-injury"
                      variant="outline"
                      size="sm"
                      className="border-primary-400 text-primary-100 hover:bg-primary-500/20"
                    >
                      Sports Injury
                    </Button>
                    <Button
                      to="/services/manual-therapy"
                      variant="outline"
                      size="sm"
                      className="border-primary-400 text-primary-100 hover:bg-primary-500/20"
                    >
                      Manual Therapy
                    </Button>
                    <Button
                      to="/services/chronic-pain"
                      variant="outline"
                      size="sm"
                      className="border-primary-400 text-primary-100 hover:bg-primary-500/20"
                    >
                      Chronic Pain
                    </Button>
                    <Button
                      to="/services/wellness-assessment"
                      variant="outline"
                      size="sm"
                      className="border-primary-400 text-primary-100 hover:bg-primary-500/20"
                    >
                      Wellness Assessment
                    </Button>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative hidden lg:block"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="flex items-center mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-400 mr-2" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="ml-4 text-primary-200 text-sm">Online Session</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center bg-white/10 rounded-lg p-3">
                      <Monitor className="w-5 h-5 text-primary-200 mr-3 flex-shrink-0" />
                      <span className="text-white text-sm">Video consultation from any device</span>
                    </div>
                    <div className="flex items-center bg-white/10 rounded-lg p-3">
                      <Calendar className="w-5 h-5 text-primary-200 mr-3 flex-shrink-0" />
                      <span className="text-white text-sm">Flexible scheduling — 7 days a week</span>
                    </div>
                    <div className="flex items-center bg-white/10 rounded-lg p-3">
                      <Home className="w-5 h-5 text-primary-200 mr-3 flex-shrink-0" />
                      <span className="text-white text-sm">Work from home, office, or anywhere</span>
                    </div>
                    <div className="flex items-center bg-white/10 rounded-lg p-3">
                      <Plane className="w-5 h-5 text-primary-200 mr-3 flex-shrink-0" />
                      <span className="text-white text-sm">Support even when you're travelling</span>
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
                  With online sessions, you can access expert guidance from the comfort of your own
                  home, your office, or even while travelling. There's no commute, no added stress
                  — just focused time dedicated to you and your goals.
                </p>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Why Choose Online Sessions */}
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
                Why Choose Online Sessions?
              </h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                The same expert care, delivered in a way that works for your life.
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

        {/* Is Online Right for You? */}
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
                  Is Online Right for You?
                </h2>
                <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                  Online sessions are ideal if you:
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
                <div className="bg-primary-50 border-l-4 border-primary-600 p-4 rounded-lg">
                  <p className="text-neutral-700 leading-relaxed">
                    No matter where you're starting from, I'm here to support you with a plan that
                    works around your life.
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
                  Book your first online session today. It's simple, secure, and can be done from
                  any device with a camera and internet connection.
                </p>
                <div className="space-y-4">
                  <Button
                    to="/booking"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center"
                    icon={<ArrowRight size={20} />}
                  >
                    Book Your Session
                  </Button>
                  <Button
                    to="/contact"
                    variant="outline"
                    size="lg"
                    className="w-full justify-center"
                  >
                    Have Questions? Get in Touch
                  </Button>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* CTA Banner */}
        <section className="py-12 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold mb-4">Start Your Journey Today</h2>
              <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
                Expert support, wherever you are. Book an online session and take the first step
                towards feeling your best — on your terms.
              </p>
              <Button
                to="/booking"
                variant="secondary"
                size="lg"
                icon={<ArrowRight size={20} />}
              >
                Book Now
              </Button>
            </motion.div>
          </Container>
        </section>
      </main>
    </>
  );
};

export default OnlineServicesPage;
