import SEOHead from '../components/utils/SEOHead';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';
import ImageGallery from '../components/shared/ImageGallery';
import { FaInstagram, FaLinkedinIn, FaFacebookF } from 'react-icons/fa';

const AboutPage = () => {
  const kellyImages = [
    '/Kelly pic1.jpeg',
    '/Kelly Pic2.jpeg',
    '/Kelly Pic3.jpeg',
    '/Kelly Pic4.jpeg',
    '/Kelly Pic5.jpeg',
    '/Kelly Pic6.jpeg',
    '/Kelly Pic7.jpeg',
    '/Kelly Pic8.jpeg',
    '/Kelly Pic9.jpeg'
  ];
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900">Our Values</h4>
                  <ul className="mt-4 space-y-2 text-gray-600 text-sm sm:text-base">
                    <li>• Excellence</li>
                    <li>• Integrity</li>
                    <li>• Innovation</li>
                    <li>• Customer Focus</li>
                  </ul>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900">Our Goals</h4>
                  <ul className="mt-4 space-y-2 text-gray-600 text-sm sm:text-base">
                    <li>• Quality Service</li>
                    <li>• Customer Success</li>
                    <li>• Sustainability</li>
                    <li>• Growth</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Meet Physio Kelly Section with Gallery and Bio Side by Side */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Physio Kelly</h2>
            </div>
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Image Gallery */}
              <div>
                <ImageGallery
                  images={kellyImages}
                  className=""
                />
              </div>
              
              {/* Bio Details */}
              <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-3xl shadow-2xl">
                <div className="space-y-6">
                  <h3 className="text-2xl font-semibold text-gray-900 text-center">Kelly Hodgins</h3>
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                    As your dedicated physiotherapist, I guide you through every step of your recovery journey. Graduating in 2016 from IPTAS with a BSc in Physiotherapy, I continuously enhance my expertise through over 50 CPD hours annually. This commitment ensures I stay at the forefront of evidence-based practice.
                  </p>
                  <div className="bg-primary-50 border-l-4 border-primary-600 p-3 sm:p-4 rounded-lg">
                    <h4 className="font-semibold text-primary-700 mb-2 text-sm sm:text-base">Qualifications & Training</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1 text-xs sm:text-sm">
                      <li>BSc Physiotherapy, IPTAS (2016)</li>
                      <li>Certified in Manual Therapy Techniques</li>
                      <li>Advanced Rehabilitation & Movement Specialist</li>
                      <li>30+ Annual CPD Hours in Latest Research</li>
                      <li>CORU registered IAPT Member</li>
                    </ul>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                    My approach is tailored to each individual—there is no one-size-fits-all solution. By blending your personal goals with my expertise, I craft sessions that educate, empower, and rehabilitate. Whether you come to our clinic in Clondalkin or opt for a home visit, expect a professional, patient-centred experience.
                  </p>
                  <div className="bg-primary-50 border-l-4 border-primary-600 p-3 sm:p-4 rounded-lg">
                    <h4 className="font-semibold text-primary-700 mb-2 text-sm sm:text-base">Clinic & Home Visits</h4>
                    <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                      Neilstown Village Court, neilstown rd, Clondalkin D22E8P2.<br />
                      <span className="italic">Open since 2020</span>, free parking & late security access<br />
                      Home visits available (rates vary by location)
                    </p>
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <a href="/contact" className="w-full sm:w-auto bg-[#71db77] hover:bg-[#5fcf68] text-white font-semibold px-6 py-3 rounded-xl shadow transition text-center">
                      Contact Kelly
                    </a>
                    <a href="https://maps.app.goo.gl/jYLqnAr2u7nWf5NS6" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-primary-600 font-semibold px-6 py-3 rounded-xl shadow transition text-center">
                      View Location
                    </a>
                  </div>
                  
                  {/* Social Media Links */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Connect with Kelly</h4>
                    <div className="flex space-x-4">
                      <a 
                        href="https://www.instagram.com/kh.therapy/" 
                        className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 group shadow-lg"
                        aria-label="Follow on Instagram"
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <FaInstagram className="w-6 h-6 text-white" />
                      </a>
                      <a 
                        href="https://www.linkedin.com/in/kelly-hodgins-547b05211/" 
                        className="flex items-center justify-center w-12 h-12 bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors group shadow-lg"
                        aria-label="Connect on LinkedIn"
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <FaLinkedinIn className="w-6 h-6 text-white" />
                      </a>
                      <a 
                        href="https://www.facebook.com/share/19bD1ZcoJd/" 
                        className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors group shadow-lg"
                        aria-label="Follow on Facebook"
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <FaFacebookF className="w-6 h-6 text-white" />
                      </a>
                    </div>
                  </div>
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