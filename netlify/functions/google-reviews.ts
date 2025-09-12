// Netlify serverless function to fetch Google Places reviews
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface GoogleReview {
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

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    const PLACE_ID = process.env.GOOGLE_PLACE_ID;

    if (!API_KEY || !PLACE_ID) {
      console.error('Missing Google Places API configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Google Places API not configured',
          details: 'Missing API key or Place ID'
        }),
      };
    }

    const fields = [
      'name',
      'rating',
      'user_ratings_total',
      'reviews',
      'url'
    ].join(',');

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=${fields}&key=${API_KEY}`;
    
    console.log('Fetching Google Places data...');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Google Places API error',
          status: data.status,
          message: data.error_message 
        }),
      };
    }

    if (!data.result) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Place not found' }),
      };
    }

    // Process and filter reviews
    const processedReviews = (data.result.reviews || [])
      .filter((review: any) => review.rating >= 4) // Only show 4+ star reviews
      .sort((a: any, b: any) => b.time - a.time) // Sort by newest first
      .slice(0, 12); // Limit to 12 most recent positive reviews

    const result = {
      reviews: processedReviews,
      overallRating: data.result.rating,
      totalReviews: data.result.user_ratings_total,
      businessName: data.result.name,
      googleUrl: data.result.url,
      lastUpdated: new Date().toISOString()
    };

    console.log(`Successfully fetched ${processedReviews.length} reviews`);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error('Error fetching Google Reviews:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch reviews',
        details: errorMessage 
      }),
    };
  }
};

export { handler };