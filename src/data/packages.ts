export type Package = {
  name: string;
  price: string;
  features: string[];
};

export const treatmentPackages: Package[] = [
  {
    name: 'Basic Wellness',
    price: '€65',
    features: [
      '50 min Consultation',
      'Personalized exercise Plan',
      '1 Follow-up Session',
    ],
  },
  {
    name: 'Premium Care',
    price: '€115',
    features: [
      '50 min Consultation',
      'Personalized Diet & Exercise Plan',
      '1 Follow-up Sessions',
    ],
  },
  {
    name: 'Ultimate Health',
    price: '€250',
    features: [
      '50 min Consultation',
      'Comprehensive Health Assessment',
      '4 Follow-up Sessions',
    ],
  },
  {
    name: 'Sports Massage / Deep Tissue Massage',
    price: '€70',
    features: [
      '60 min session',
      'Relieves muscle tension',
      'Improves flexibility',
    ],
  },
  {
    name: 'Pitch Side Cover for Sporting Events',
    price: 'Contact for Quote',
    features: [
      'On-site physiotherapy',
      'Immediate injury management',
      'Support for teams & events',
    ],
  },
  {
    name: 'Pre & Post Surgery Rehab',
    price: '€90',
    features: [
      'Personalized rehabilitation plan',
      'Recovery monitoring',
      'Expert guidance',
    ],
  },
  {
    name: 'Return to Play/Sport & Strapping & Taping',
    price: '€50',
    features: [
      'Safe return protocols',
      'Strapping & taping techniques',
      'Injury prevention',
    ],
  },
  {
    name: 'Corporate Wellness / Workplace Events',
    price: 'Contact for Quote',
    features: [
      'Workplace health workshops',
      'Group exercise sessions',
      'Ergonomic assessments',
    ],
  },
];
