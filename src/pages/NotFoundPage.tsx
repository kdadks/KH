import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/shared/Button';
import SEOHead from '../components/utils/SEOHead';

const NotFoundPage: React.FC = () => {
  return (
    <>
      <SEOHead 
        title="Page Not Found | PhysioLife"
        description="The page you are looking for does not exist. Return to the homepage."
      />
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-md">
          <h1 className="text-6xl font-bold text-primary-500 mb-6">404</h1>
          <h2 className="text-2xl font-semibold text-neutral-800 mb-4">Page Not Found</h2>
          <p className="text-neutral-600 mb-8">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <Button to="/" variant="primary" size="lg" icon={<Home size={20} />}>
            Return to Homepage
          </Button>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;