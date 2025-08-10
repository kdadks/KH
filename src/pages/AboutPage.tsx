import SEOHead from '../components/utils/SEOHead';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';
import PlaceholderImage from '../components/shared/PlaceholderImage';

const AboutPage = () => {
  return (
    <>
      <SEOHead
        title="About Us - KH Therapy"
        description="Learn about KH Therapy’s mission, values, and the story behind our personalized physiotherapy services in Clondalkin, Dublin."
        canonicalUrl="/about"
      />
      <main className="py-16 bg-gray-50">
        <Container>
          <SectionHeading
            title="About Us"
            subtitle="Knowledge, Strength & Movement"
          />
          {/* Tagline */}
          <div className="mt-4 mb-12 text-center">
            <span className="inline-block text-xl font-bold text-primary-600">
              Physiotherapy for you
            </span>
          </div>
          <div className="mt-12 grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-gray-900">Our Story</h3>
              <p className="text-gray-600 leading-relaxed">
                KH Therapy aims to provide you with an excellent high standard of
                care given through physical therapy sessions. Our services will
                help you become pain free by education, knowledge and help
                strengthen the body through rehab and movement.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-gray-900">Our Mission</h3>
              <p className="text-gray-600 leading-relaxed">
                KH Therapy aims to provide you with an excellent high standard of
                care given through physical therapy sessions. Our services will
                help you become pain free by education, knowledge and help
                strengthen the body through rehab and movement.
              </p>
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900">Our Values</h4>
                  <ul className="mt-4 space-y-2 text-gray-600">
                    <li>• Excellence</li>
                    <li>• Integrity</li>
                    <li>• Innovation</li>
                    <li>• Customer Focus</li>
                  </ul>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900">Our Goals</h4>
                  <ul className="mt-4 space-y-2 text-gray-600">
                    <li>• Quality Service</li>
                    <li>• Customer Success</li>
                    <li>• Sustainability</li>
                    <li>• Growth</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Meet Physio Kelly Section (Improved) */}
          <div className="mt-20 flex flex-col items-center">
            <h2 className="text-3xl font-extrabold text-primary-600 mb-8 text-center tracking-tight">
              Meet Physio Kelly
            </h2>
            <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              {/* Profile Images Gallery */}
              <div className="flex flex-col items-center gap-4">
                <PlaceholderImage
                  src="https://images.pexels.com/photos/7176322/pexels-photo-7176322.jpeg?auto=compress&cs=tinysrgb&w=192&h=192"
                  alt="Physio Kelly portrait"
                  className="w-48 h-48 object-cover rounded-full border-4 border-primary-600 shadow-lg"
                  fallbackText="Kelly Portrait"
                />
                <div className="flex gap-2">
                  <PlaceholderImage
                    src="https://images.pexels.com/photos/5473958/pexels-photo-5473958.jpeg?auto=compress&cs=tinysrgb&w=64&h=64"
                    alt="Physio Kelly working"
                    className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 shadow"
                    fallbackText="Work"
                  />
                  <PlaceholderImage
                    src="https://images.pexels.com/photos/4506237/pexels-photo-4506237.jpeg?auto=compress&cs=tinysrgb&w=64&h=64"
                    alt="Physio Kelly clinic"
                    className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 shadow"
                    fallbackText="Clinic"
                  />
                </div>
              </div>
              {/* Bio and Details */}
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-gray-900">Kelly Hodings</h3>
                <p className="text-gray-700 leading-relaxed">
                  As your dedicated physiotherapist, I guide you through every step of your recovery journey. Graduating in 2016 from IPTAS with a BSc in Physiotherapy, I continuously enhance my expertise through over 50 CPD hours annually. This commitment ensures I stay at the forefront of evidence-based practice.
                </p>
                <div className="bg-primary-50 border-l-4 border-primary-600 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary-700 mb-2">Qualifications & Training</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>BSc Physiotherapy, IPTAS (2016)</li>
                    <li>Certified in Manual Therapy Techniques</li>
                    <li>Advanced Rehabilitation & Movement Specialist</li>
                    <li>50+ Annual CPD Hours in Latest Research</li>
                  </ul>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  My approach is tailored to each individual—there is no one-size-fits-all solution. By blending your personal goals with my expertise, I craft sessions that educate, empower, and rehabilitate. Whether you come to our clinic in Clondalkin or opt for a home visit, expect a professional, patient-centred experience.
                </p>
                <div className="bg-primary-50 border-l-4 border-primary-600 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary-700 mb-2">Clinic & Home Visits</h4>
                  <p className="text-gray-700 text-sm">
                    Ace Enterprise Centre, Bawnogue Road, Clondalkin, Dublin 22<br />
                    <span className="italic">Open since 2020</span>, free parking & late security access<br />
                    Home visits available (rates vary by location)
                  </p>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                  <a href="/contact" className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl shadow transition text-center">
                    Contact Kelly
                  </a>
                  <a href="/contact" className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-primary-600 font-semibold px-6 py-3 rounded-xl shadow transition text-center">
                    View Location
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
};

export default AboutPage;