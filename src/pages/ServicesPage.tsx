import React from 'react';
import SectionHeading from '../components/shared/SectionHeading';
import Container from '../components/shared/Container';

const treatmentPackages = [
  {
    name: 'Basic Wellness',
    price: '$49',
    features: [
      '30 min Consultation',
      'Personalized Diet Plan',
      '1 Follow-up Session',
    ],
  },
  {
    name: 'Premium Care',
    price: '$99',
    features: [
      '60 min Consultation',
      'Personalized Diet & Exercise Plan',
      '3 Follow-up Sessions',
      'Priority Support',
    ],
  },
  {
    name: 'Ultimate Health',
    price: '$199',
    features: [
      '90 min Consultation',
      'Comprehensive Health Assessment',
      'Unlimited Follow-ups for 1 Month',
      '24/7 Support',
      'Wellness Kit',
    ],
  },
];

const ServicesPage: React.FC = () => {
  return (
    <main className="py-16">
      <Container>
        <SectionHeading
          title="Our Services"
          subtitle="Comprehensive solutions tailored to your needs"
        />
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {treatmentPackages.map((pkg) => (
            <div key={pkg.name} className="border rounded-lg shadow p-6 flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-2">{pkg.name}</h2>
              <div className="text-2xl font-bold text-primary-600 mb-4">{pkg.price}</div>
              <ul className="mb-6 space-y-2">
                {pkg.features.map((feature) => (
                  <li key={feature} className="text-neutral-700">• {feature}</li>
                ))}
              </ul>
              <button className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition">
                Book Now
              </button>
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
};

export default ServicesPage;