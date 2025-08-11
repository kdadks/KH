-- Insert statements for all 10 services from frontend
-- This will populate the services table with existing frontend services
-- Schema compliance verified: matches public.services table structure

-- 1. Packages Category Services
INSERT INTO public.services (name, category, in_hour_price, out_of_hour_price, features, description, is_active)
VALUES 
(
  'Basic Wellness',
  'Packages',
  '€65',
  '€75',
  ARRAY['50 min Consultation', 'Personalized Exercise Plan', '1 Follow-up Session'],
  'Our foundational wellness package includes a comprehensive 50-minute consultation with a personalized exercise plan and follow-up session to support your health journey.',
  true
),
(
  'Premium Care',
  'Packages', 
  '€115',
  '€130',
  ARRAY['50 min Consultation', 'Personalized Diet & Exercise Plan', '1 Follow-up Session'],
  'Enhanced care package featuring comprehensive consultation, personalized diet and exercise planning, plus dedicated follow-up session for optimal results.',
  true
),
(
  'Ultimate Health',
  'Packages',
  '€250', 
  '€280',
  ARRAY['50 min Consultation', 'Comprehensive Health Assessment', '4 Follow-up Sessions'],
  'Our most comprehensive package including detailed health assessment, consultation, and four follow-up sessions for complete wellness transformation.',
  true
);

-- 2. Individual Category Services  
INSERT INTO public.services (name, category, in_hour_price, out_of_hour_price, features, description, is_active)
VALUES
(
  'Standard Physiotherapy Session',
  'Individual',
  '€65',
  '€80', 
  ARRAY['Comprehensive assessment', 'Hands-on treatment', 'Exercise prescription'],
  'Individual physiotherapy session including thorough assessment, personalized hands-on treatment, and customized exercise prescription for your specific needs.',
  true
),
(
  'Sports / Deep Tissue Massage',
  'Individual',
  '€70',
  '€85',
  ARRAY['60 min session', 'Relieves muscle tension', 'Improves flexibility'],
  'Specialized 60-minute sports and deep tissue massage therapy to relieve muscle tension, improve flexibility, and enhance athletic performance.',
  true
);

-- 3. Classes Category Services
INSERT INTO public.services (name, category, price, features, description, is_active) 
VALUES
(
  'Group Rehab Class',
  'Classes',
  '€25 / class',
  ARRAY['Small group focused sessions', 'Supervised exercise progressions', 'Injury prevention focus'],
  'Small group rehabilitation classes with supervised exercise progressions and injury prevention focus, providing quality care in a supportive group setting.',
  true
);

-- 4. Rehab & Fitness Category Services
INSERT INTO public.services (name, category, price, features, description, is_active)
VALUES
(
  'Pre & Post Surgery Rehab', 
  'Rehab & Fitness',
  '€90',
  ARRAY['Personalized rehabilitation plan', 'Recovery monitoring', 'Expert guidance'],
  'Specialized pre and post-surgical rehabilitation program with personalized treatment plans, continuous recovery monitoring, and expert guidance throughout your healing journey.',
  true
),
(
  'Return to Play / Strapping & Taping',
  'Rehab & Fitness', 
  '€50',
  ARRAY['Safe return protocols', 'Strapping & taping techniques', 'Injury prevention'],
  'Comprehensive return-to-play program featuring safe return protocols, professional strapping and taping techniques, and injury prevention strategies.',
  true
);

-- 5. Corporate Packages Category Services
INSERT INTO public.services (name, category, price, features, description, is_active)
VALUES
(
  'Corporate Wellness / Workplace Events',
  'Corporate Packages',
  'Contact for Quote', 
  ARRAY['Workplace health workshops', 'Group exercise sessions', 'Ergonomic assessments'],
  'Comprehensive corporate wellness programs including workplace health workshops, group exercise sessions, and professional ergonomic assessments to enhance employee wellbeing.',
  true
),
(
  'Pitch Side Cover for Sporting Events',
  'Corporate Packages',
  'Contact for Quote',
  ARRAY['On-site physiotherapy', 'Immediate injury management', 'Support for teams & events'],
  'Professional pitch-side physiotherapy coverage for sporting events, providing immediate injury management and comprehensive support for teams and sporting events.',
  true
);

-- Verify the insertion
SELECT 
  id,
  name,
  category,
  COALESCE(price, CONCAT('In: ', in_hour_price, ' | Out: ', out_of_hour_price)) as pricing,
  array_length(features, 1) as feature_count,
  is_active,
  created_at
FROM public.services 
ORDER BY 
  CASE category
    WHEN 'Packages' THEN 1
    WHEN 'Individual' THEN 2  
    WHEN 'Classes' THEN 3
    WHEN 'Rehab & Fitness' THEN 4
    WHEN 'Corporate Packages' THEN 5
  END,
  name;
