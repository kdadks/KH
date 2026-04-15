import React from 'react';
import { motion } from 'framer-motion';
import { Layers, CheckCircle, ArrowRight, Monitor, RotateCcw } from 'lucide-react';
import Container from '../../components/shared/Container';
import Button from '../../components/shared/Button';
import SEOHead from '../../components/utils/SEOHead';

const PilatesPage: React.FC = () => {
  const whyChooseMe = [
    'A combination of clinical knowledge and Pilates expertise',
    'A focus on safe, effective movement for every body',
    'Support for injury prevention and rehabilitation',
    'Classes that are welcoming, inclusive, and tailored to different levels',
  ];

  const journey = [
    {
      date: 'September 2023',
      title: 'Mat Pilates',
      description:
        'I began teaching Mat Pilates and have since worked with a wide range of clients, helping them build strong foundations, improve posture, and reconnect with their bodies through controlled, mindful movement.',
    },
    {
      date: 'June 2025',
      title: 'Reformer Pilates',
      description:
        'I expanded into Reformer Pilates, allowing me to offer even more variety and progression. The reformer adds resistance and support, making it suitable for both beginners and those looking to challenge themselves further.',
    },
  ];

  const offerings = [
    {
      icon: <RotateCcw className="w-8 h-8 text-primary-600" />,
      title: 'Mat Pilates Classes',
      description:
        'Accessible, effective classes designed to build core strength, flexibility, and control. Suitable for all levels, with options to progress or modify as needed.',
    },
    {
      icon: <Layers className="w-8 h-8 text-primary-600" />,
      title: 'Reformer Pilates',
      description:
        'A more dynamic and supported form of Pilates using specialised equipment to enhance strength, alignment, and movement quality.',
    },
    {
      icon: <Monitor className="w-8 h-8 text-primary-600" />,
      title: 'Online Sessions',
      description:
        'Train with me from anywhere, with personalised guidance and structured sessions that fit around your schedule.',
    },
  ];

  return (
    <>
      <SEOHead
        title="Clinical Pilates & Pilates Classes Dublin | KH Therapy"
        description="Clinical Pilates and Pilates classes in Dublin with a chartered physiotherapist & qualified Pilates instructor. Mat Pilates, Reformer Pilates, Rehab Pilates, and private sessions. Pilates for back pain, beginners, and injury recovery. Clondalkin & online."
        canonicalUrl="/services/pilates"
        keywords="Clinical Pilates Dublin, Pilates classes Dublin, Pilates instructor Dublin, Rehab Pilates Dublin, Pilates for back pain Dublin, private Pilates sessions Dublin, Pilates for beginners Dublin, Reformer Pilates Dublin, mat Pilates Dublin, online Pilates Dublin, Pilates Dublin city, physiotherapist Pilates Dublin"
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
                  <Layers className="w-8 h-8 mr-3" />
                  <span className="text-secondary-200 font-medium">Pilates &amp; Movement</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Pilates with a Physiotherapy Perspective
                </h1>
                <p className="text-xl text-secondary-100 mb-8 leading-relaxed">
                  I'm a qualified Physical Therapist and Pilates instructor, passionate about helping people move
                  better, feel stronger, and build confidence in their bodies.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                    Book a Class
                  </Button>
                  <Button to="/contact" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                    Get in Touch
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
                      Online Services
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
                  src="/pilates1.webp"
                  alt="Kelly — Qualified Physical Therapist and Pilates instructor"
                  className="rounded-lg shadow-2xl w-full h-[400px] object-cover object-top"
                />
              </motion.div>
            </div>
          </Container>
        </section>

        {/* About Section */}
        <section className="py-8 md:py-12 bg-white">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">
                  A Thoughtful Approach to Movement
                </h2>
                <div className="space-y-4 text-lg text-neutral-600 leading-relaxed">
                  <p>
                    My background in physical therapy shapes everything I do. I take a thoughtful, evidence-based
                    approach to movement — focusing not just on exercise, but on understanding how your body works,
                    where you might be holding tension, and how to support long-term strength and mobility.
                  </p>
                  <p>
                    Whether you're dealing with pain, recovering from injury, or simply looking to improve your
                    overall wellbeing, my goal is to guide you in a way that feels safe, effective, and sustainable.
                  </p>
                  <p>
                    I believe Pilates should be approachable and empowering — not intimidating. Whether you're just
                    starting out or looking to deepen your practice, I'm here to support you every step of the way.
                  </p>
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
                  src="/pilates2.webp"
                  alt="Pilates session with Kelly"
                  className="rounded-lg shadow-lg w-full h-[400px] object-cover object-top"
                />
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Journey / Timeline Section */}
        <section className="py-8 md:py-12 bg-neutral-50">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-4">My Pilates Journey</h2>
              <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
                Mat work is at the core of Pilates — where we develop strength, stability, and body awareness
                that carries into everyday life.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {journey.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  viewport={{ once: true }}
                  className="bg-white p-8 rounded-xl shadow-md border-l-4 border-primary-600"
                >
                  <span className="inline-block text-sm font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full mb-4">
                    {item.date}
                  </span>
                  <h3 className="text-xl font-bold text-neutral-800 mb-3">{item.title}</h3>
                  <p className="text-neutral-600 leading-relaxed">{item.description}</p>
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
                Flexible options to suit your schedule, goals, and experience level.
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

        {/* Why Work With Me Section */}
        <section className="py-8 md:py-12 bg-neutral-50">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 mb-6">
                  Why Work With Me?
                </h2>
                <div className="space-y-4">
                  {whyChooseMe.map((point, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
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

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="grid grid-cols-2 gap-4"
              >
                <img
                  src="/pilates3.webp"
                  alt="Pilates class in session"
                  className="rounded-xl shadow-md w-full h-[220px] object-cover object-top"
                />
                <img
                  src="/pilates4.webp"
                  alt="Reformer Pilates with Kelly"
                  className="rounded-xl shadow-md w-full h-[220px] object-cover object-top"
                />
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
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Try a Class or Session</h2>
              <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
                If you've been thinking about starting Pilates or getting back into movement, this is your sign
                to give it a go. My mat classes and online sessions are a great place to start — designed to
                help you feel stronger, more mobile, and more in tune with your body.
              </p>
              <p className="text-primary-200 mb-8">
                Get in touch to book a class or learn more. I'd love to work with you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button to="/booking" variant="secondary" size="lg" icon={<ArrowRight size={20} />}>
                  Book a Class
                </Button>
                <Button to="/contact" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
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

export default PilatesPage;
