export type PackageCategory =
  | 'Packages'
  | 'Individual'
  | 'Classes'
  | 'Rehab & Fitness'
  | 'Corporate Packages';

export type Package = {
  name: string;
  /** Primary display price if a single value applies */
  price?: string;
  /** Business hours rate (optional) */
  inHourPrice?: string;
  /** Outside business hours rate (optional) */
  outOfHourPrice?: string;
  features: string[];
  category: PackageCategory;
};

// Ordered list of categories for UI tabs
export const packageCategories: PackageCategory[] = [
  'Packages',
  'Individual',
  'Classes',
  'Rehab & Fitness',
  'Corporate Packages',
];

export const treatmentPackages: Package[] = [
  // Packages (with both in and out of hour rates as applicable)
  {
    name: 'Basic Wellness',
    inHourPrice: '€65',
    outOfHourPrice: '€75',
    features: [
      '50 min Consultation',
      'Personalized Exercise Plan',
      '1 Follow-up Session',
    ],
    category: 'Packages',
  },
  {
    name: 'Premium Care',
    inHourPrice: '€115',
    outOfHourPrice: '€130',
    features: [
      '50 min Consultation',
      'Personalized Diet & Exercise Plan',
      '1 Follow-up Session',
    ],
    category: 'Packages',
  },
  {
    name: 'Ultimate Health',
    inHourPrice: '€250',
    outOfHourPrice: '€280',
    features: [
      '50 min Consultation',
      'Comprehensive Health Assessment',
      '4 Follow-up Sessions',
    ],
    category: 'Packages',
  },
  // Individual (single session offerings with both rates)
  {
    name: 'Standard Physiotherapy Session',
    inHourPrice: '€65',
    outOfHourPrice: '€80',
    features: [
      'Comprehensive assessment',
      'Hands-on treatment',
      'Exercise prescription',
    ],
    category: 'Individual',
  },
  {
    name: 'Sports / Deep Tissue Massage',
    inHourPrice: '€70',
    outOfHourPrice: '€85',
    features: [
      '60 min session',
      'Relieves muscle tension',
      'Improves flexibility',
    ],
    category: 'Individual',
  },
  // Classes
  {
    name: 'Group Rehab Class',
    price: '€25 / class',
    features: [
      'Small group focused sessions',
      'Supervised exercise progressions',
      'Injury prevention focus',
    ],
    category: 'Classes',
  },
  // Rehab & Fitness
  {
    name: 'Pre & Post Surgery Rehab',
    price: '€90',
    features: [
      'Personalized rehabilitation plan',
      'Recovery monitoring',
      'Expert guidance',
    ],
    category: 'Rehab & Fitness',
  },
  {
    name: 'Return to Play / Strapping & Taping',
    price: '€50',
    features: [
      'Safe return protocols',
      'Strapping & taping techniques',
      'Injury prevention',
    ],
    category: 'Rehab & Fitness',
  },
  // Corporate Packages
  {
    name: 'Corporate Wellness / Workplace Events',
    price: 'Contact for Quote',
    features: [
      'Workplace health workshops',
      'Group exercise sessions',
      'Ergonomic assessments',
    ],
    category: 'Corporate Packages',
  },
  {
    name: 'Pitch Side Cover for Sporting Events',
    price: 'Contact for Quote',
    features: [
      'On-site physiotherapy',
      'Immediate injury management',
      'Support for teams & events',
    ],
    category: 'Corporate Packages',
  },
];
