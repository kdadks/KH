import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { GoogleReview, googleReviewsService } from '../../services/googleReviews';
import GoogleReviewCard from './GoogleReviewCard';
import GoogleBusinessSummary from './GoogleBusinessSummary';

interface GoogleReviewsGridProps {
  maxReviews?: number;
  showPagination?: boolean;
}

const GoogleReviewsGrid: React.FC<GoogleReviewsGridProps> = ({ 
  maxReviews = 9,
  showPagination = true
}) => {
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [businessData, setBusinessData] = useState<{
    overallRating: number;
    totalReviews: number;
    googleUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());

  const reviewsPerPage = 6;
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await googleReviewsService.getProcessedReviews();
        
        if (data) {
          setReviews(data.reviews.slice(0, maxReviews));
          setBusinessData({
            overallRating: data.overallRating,
            totalReviews: data.totalReviews,
            googleUrl: data.googleUrl
          });
        } else {
          setError('Unable to load Google Reviews');
        }
      } catch (err) {
        console.error('Error fetching Google Reviews:', err);
        setError('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [maxReviews]);

  const toggleReviewText = (index: number) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getCurrentPageReviews = () => {
    if (!showPagination) return reviews;
    
    const startIndex = currentPage * reviewsPerPage;
    const endIndex = startIndex + reviewsPerPage;
    return reviews.slice(startIndex, endIndex);
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => (prev === 0 ? totalPages - 1 : prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => (prev === totalPages - 1 ? 0 : prev + 1));
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#71db77]" />
          <span className="text-neutral-600">Loading Google Reviews...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-neutral-400 mx-auto mb-6" />
        <h3 className="text-xl font-semibold text-neutral-800 mb-2">
          Unable to Load Reviews
        </h3>
        <p className="text-neutral-600 mb-4">
          We're having trouble loading our Google Reviews right now.
        </p>
        <p className="text-sm text-neutral-500">
          Please check back later or contact us directly for testimonials.
        </p>
        <div className="mt-6">
          <button 
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-[#71db77] text-white rounded-lg hover:bg-[#5fcf68] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Business Summary */}
      {businessData && (
        <GoogleBusinessSummary
          businessName="KH Therapy"
          overallRating={businessData.overallRating}
          totalReviews={businessData.totalReviews}
          googleUrl={businessData.googleUrl}
        />
      )}

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {getCurrentPageReviews().map((review, index) => {
          const globalIndex = showPagination ? (currentPage * reviewsPerPage) + index : index;
          return (
            <GoogleReviewCard
              key={`${review.author_name}-${review.time}`}
              review={review}
              index={index}
              showFullText={expandedReviews.has(globalIndex)}
              onToggleText={() => toggleReviewText(globalIndex)}
            />
          );
        })}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <motion.div 
          className="flex items-center justify-center mt-8 space-x-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button 
            onClick={handlePrevPage}
            className="p-2 rounded-full bg-green-100 text-[#71db77] hover:bg-green-200 transition-colors disabled:opacity-50"
            aria-label="Previous page"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex space-x-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i === currentPage ? 'bg-[#71db77]' : 'bg-neutral-300 hover:bg-neutral-400'
                }`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>
          
          <button 
            onClick={handleNextPage}
            className="p-2 rounded-full bg-green-100 text-[#71db77] hover:bg-green-200 transition-colors"
            aria-label="Next page"
          >
            <ChevronRight size={20} />
          </button>
        </motion.div>
      )}

      {/* Reviews count */}
      <div className="text-center mt-6">
        <p className="text-sm text-neutral-500">
          Showing {getCurrentPageReviews().length} of {reviews.length} recent positive reviews
        </p>
      </div>
    </div>
  );
};

export default GoogleReviewsGrid;