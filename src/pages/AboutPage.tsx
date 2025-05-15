import React from 'react';
import Container from '../components/shared/Container';
import SectionHeading from '../components/shared/SectionHeading';

const AboutPage = () => {
  return (
    <main className="py-16 bg-gray-50">
      <Container>
        <SectionHeading
          title="About Us"
          subtitle="Learn more about our story and mission"
        />
        
        <div className="mt-12 grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-gray-900">Our Story</h3>
            <p className="text-gray-600 leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do 
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim 
              ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut 
              aliquip ex ea commodo consequat.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Duis aute irure dolor in reprehenderit in voluptate velit esse 
              cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat 
              cupidatat non proident, sunt in culpa qui officia deserunt mollit 
              anim id est laborum.
            </p>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-gray-900">Our Mission</h3>
            <p className="text-gray-600 leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do 
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim 
              ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut 
              aliquip ex ea commodo consequat.
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
      </Container>
    </main>
  );
};

export default AboutPage;