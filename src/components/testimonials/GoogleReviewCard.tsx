import React from 'react';
import { motion } from 'framer-motion';
import { Star, ExternalLink } from 'lucide-react';
import { GoogleReview } from '../../services/googleReviews';

interface GoogleReviewCardProps {
  review: GoogleReview;
  index: number;
  showFullText?: boolean;
  onToggleText?: () => void;
}

const GoogleReviewCard: React.FC<GoogleReviewCardProps> = ({ 
  review, 
  index,
  showFullText = false,
  onToggleText 
}) => {
  const truncatedText = review.text.length > 200 
    ? review.text.substring(0, 200) + '...' 
    : review.text;

  const displayText = showFullText ? review.text : truncatedText;
  const shouldShowToggle = review.text.length > 200;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="bg-white border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {/* Google branding and rating */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
            alt="Google" 
            className="w-4 h-4"
          />
          <span className="text-sm text-green-600 font-medium">Google Review</span>
        </div>
        <div className="flex items-center space-x-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={16}
              fill={i < review.rating ? "#F59E0B" : "none"}
              color={i < review.rating ? "#F59E0B" : "#D1D5DB"}
            />
          ))}
        </div>
      </div>

      {/* Review content */}
      <blockquote className="text-neutral-700 mb-4 leading-relaxed">
        "{displayText}"
        {shouldShowToggle && onToggleText && (
          <button 
            onClick={onToggleText}
            className="text-[#71db77] hover:text-[#5fcf68] ml-2 text-sm font-medium"
          >
            {showFullText ? 'Show less' : 'Read more'}
          </button>
        )}
      </blockquote>

      {/* Reviewer info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src={review.profile_photo_url} 
            alt={review.author_name}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              // Fallback to initials if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const initials = document.createElement('div');
              initials.className = 'w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-[#71db77] font-semibold text-sm';
              initials.textContent = review.author_name.split(' ').map(n => n[0]).join('').slice(0, 2);
              target.parentNode?.insertBefore(initials, target);
            }}
          />
          <div>
            <p className="font-semibold text-neutral-800 text-sm">{review.author_name}</p>
            <p className="text-neutral-500 text-xs">{review.relative_time_description}</p>
          </div>
        </div>
        
        {review.author_url && (
          <a 
            href={review.author_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label={`View ${review.author_name}'s Google profile`}
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </motion.div>
  );
};

export default GoogleReviewCard;