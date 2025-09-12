// Google Places API service for fetching reviews
export interface GoogleReview {
  author_name: string;
  author_url?: string;
  language: string;
  original_language: string;
  profile_photo_url: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
  translated?: boolean;
}

export interface GooglePlaceDetails {
  name: string;
  rating: number;
  user_ratings_total: number;
  reviews: GoogleReview[];
  url: string;
  overallRating: number;
  totalReviews: number;
  businessName: string;
  googleUrl: string;
}

class GoogleReviewsService {
  private readonly functionUrl: string;

  constructor() {
    // Use Netlify function for production, direct API for development
    const isDevelopment = import.meta.env.DEV;
    this.functionUrl = isDevelopment 
      ? '/.netlify/functions/google-reviews'
      : `${import.meta.env.VITE_SITE_URL || window.location.origin}/.netlify/functions/google-reviews`;
  }

  /**
   * Fetch place details including reviews from Google Places API via Netlify function
   */
  async getPlaceReviews(): Promise<GooglePlaceDetails | null> {
    try {
      const response = await fetch(this.functionUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Netlify function error:', response.status, errorData);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch Google Reviews:', error);
      return null;
    }
  }

  /**
   * Get processed reviews with fallback data
   */
  async getProcessedReviews(): Promise<{
    reviews: GoogleReview[];
    overallRating: number;
    totalReviews: number;
    businessName: string;
    googleUrl: string;
  } | null> {
    const data = await this.getPlaceReviews();
    
    if (!data) {
      return null;
    }

    return {
      reviews: data.reviews,
      overallRating: data.overallRating,
      totalReviews: data.totalReviews,
      businessName: data.businessName,
      googleUrl: data.googleUrl
    };
  }

  /**
   * Format time since review was posted
   */
  formatTimeAgo(timestamp: number): string {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, seconds] of Object.entries(intervals)) {
      const interval = Math.floor(diff / seconds);
      if (interval >= 1) {
        return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
      }
    }
    
    return 'Just now';
  }

  /**
   * Truncate review text to specified length
   */
  truncateText(text: string, maxLength: number = 200): string {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return truncated.substring(0, lastSpace) + '...';
  }
}

export const googleReviewsService = new GoogleReviewsService();