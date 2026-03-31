import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  keywords?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonicalUrl,
  ogImage = '/KHtherapy.png',
  ogType = 'website',
  keywords,
  structuredData,
}) => {
  const siteUrl = 'https://khtherapy.ie';
  const fullCanonicalUrl = canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl;

  const defaultKeywords =
    'physiotherapist Dublin, female physiotherapist Dublin, chartered physiotherapist Dublin, home visit physiotherapist Dublin, mobile physiotherapist Dublin, Pilates classes Dublin, Clinical Pilates Dublin, women\'s health physiotherapist Dublin, sports injury physiotherapist Dublin, back pain physiotherapist Dublin, postnatal physiotherapy Dublin, pelvic floor physiotherapist Dublin, home physio West Dublin, physio Clondalkin, physio Lucan, KH Therapy';

  const businessSchema = {
    '@context': 'https://schema.org',
    '@type': ['PhysicalTherapy', 'LocalBusiness'],
    name: 'KH Therapy',
    alternateName: 'KH Therapy Dublin',
    image: [`${siteUrl}/KHtherapy.png`, `${siteUrl}/Logo.png`],
    '@id': `${siteUrl}/#business`,
    url: siteUrl,
    telephone: '+353 85 123 4567',
    email: 'info@khtherapy.ie',
    description:
      'KH Therapy is a female-led chartered physiotherapy practice in Clondalkin, Dublin, offering clinic sessions, home visits, Clinical Pilates, women\'s health physiotherapy, sports injury treatment, and online consultations serving Dublin South, West Dublin, and Lucan.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Ace Enterprise Centre, Bawnogue Road',
      addressLocality: 'Clondalkin',
      addressRegion: 'Dublin',
      postalCode: 'D22',
      addressCountry: 'IE',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 53.3236,
      longitude: -6.4018,
    },
    areaServed: [
      { '@type': 'City', name: 'Dublin' },
      { '@type': 'AdministrativeArea', name: 'Clondalkin' },
      { '@type': 'AdministrativeArea', name: 'Lucan' },
      { '@type': 'AdministrativeArea', name: 'Tallaght' },
      { '@type': 'AdministrativeArea', name: 'Rathcoole' },
      { '@type': 'AdministrativeArea', name: 'Saggart' },
      { '@type': 'AdministrativeArea', name: 'Newcastle' },
      { '@type': 'AdministrativeArea', name: 'West Dublin' },
      { '@type': 'AdministrativeArea', name: 'South Dublin' },
    ],
    hasMap: 'https://maps.app.goo.gl/HJqQEHFwp6jHmH6PA',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '19:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '09:00',
        closes: '14:00',
      },
    ],
    priceRange: '€€',
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Cash, Credit Card, Health Insurance',
    medicalSpecialty: [
      'Physiotherapy',
      'Sports Medicine',
      'Women\'s Health',
      'Rehabilitation',
      'Pilates',
    ],
    sameAs: [
      'https://www.instagram.com/kh_therapy',
      'https://www.facebook.com/khtherapy',
    ],
  };

  const allStructuredData = structuredData
    ? Array.isArray(structuredData)
      ? [businessSchema, ...structuredData]
      : [businessSchema, structuredData]
    : [businessSchema];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords || defaultKeywords} />
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="author" content="KH Therapy" />

      {/* Geo / Location meta */}
      <meta name="geo.region" content="IE-D" />
      <meta name="geo.placename" content="Dublin, Ireland" />
      <meta name="geo.position" content="53.3236;-6.4018" />
      <meta name="ICBM" content="53.3236, -6.4018" />

      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="KH Therapy" />
      <meta property="og:locale" content="en_IE" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullCanonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}${ogImage}`} />

      {/* Schema.org markup */}
      {allStructuredData.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOHead;