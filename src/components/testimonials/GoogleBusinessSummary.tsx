import React from 'react';
import { motion } from 'framer-motion';
import { Star, ExternalLink, MapPin } from 'lucide-react';

interface GoogleBusinessSummaryProps {
  businessName: string;
  overallRating: number;
  totalReviews: number;
  googleUrl: string;
}

const GoogleBusinessSummary: React.FC<GoogleBusinessSummaryProps> = ({
  overallRating,
  totalReviews,
  googleUrl
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 mb-8"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <div className="flex items-center space-x-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
              alt="Google" 
              className="w-6 h-6"
            />
            <span className="text-lg font-semibold text-neutral-800">Google Reviews</span>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
          <div className="flex items-center space-x-2 mb-2 md:mb-0">
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  fill={i < Math.floor(overallRating) ? "#F59E0B" : "none"}
                  color={i < Math.floor(overallRating) ? "#F59E0B" : "#D1D5DB"}
                />
              ))}
            </div>
            <span className="text-lg font-bold text-neutral-800">
              {overallRating.toFixed(1)}
            </span>
            <span className="text-sm text-neutral-600">
              ({totalReviews.toLocaleString()} reviews)
            </span>
          </div>
          
          <a 
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 bg-white text-[#71db77] px-4 py-2 rounded-lg hover:bg-green-50 transition-colors duration-300 text-sm font-medium"
          >
            <MapPin size={16} />
            <span>View on Google</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

export default GoogleBusinessSummary;