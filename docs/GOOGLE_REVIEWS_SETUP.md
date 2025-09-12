# Google Reviews Integration Setup Guide

This guide explains how to set up Google Reviews integration for the KH Therapy testimonials page.

## Prerequisites

1. Google Cloud Console account
2. Google Places API enabled
3. Your business listed on Google My Business

## Step-by-Step Setup

### 1. Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Places API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Places API"
   - Click "Enable"

4. Create API credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

### 2. Find Your Google Place ID

#### Method 1: Using Place ID Finder
1. Go to [Google Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)
2. Search for "KH Therapy" or your business address
3. Copy the Place ID

#### Method 2: Using Google Maps
1. Find your business on Google Maps
2. Copy the URL
3. The Place ID is in the URL after `place/` and before the next `/`

### 3. Configure Environment Variables

Create or update your `.env` file in the project root:

```bash
# Google Places API Configuration
VITE_GOOGLE_PLACES_API_KEY=your_api_key_here
VITE_GOOGLE_PLACE_ID=your_place_id_here
```

**Important Security Notes:**
- The API key will be visible in client-side code
- Consider implementing API key restrictions in Google Cloud Console:
  - HTTP referrers restriction (limit to your domain)
  - API restriction (limit to Places API only)

### 4. API Key Security Best Practices

#### Restrict API Key Usage:
1. In Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click on your API key
3. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add your domains:
     - `https://khtherapy.netlify.app/*`
     - `https://khtherapy.ie/*`
     - `http://localhost:*` (for development)

4. Under "API restrictions":
   - Select "Restrict key"
   - Select "Places API"

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_GOOGLE_PLACES_API_KEY` | Your Google Places API key | Yes | `AIzaSyBvOkBo...` |
| `VITE_GOOGLE_PLACE_ID` | Your business Place ID | Yes | `ChIJN1t_tDeuEmsRUsoyG83frY4` |

## Testing the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/testimonials` page
3. Check browser console for any API errors
4. Verify reviews are loading correctly

## Troubleshooting

### Common Issues:

#### 1. "API key not valid" error
- Check if Places API is enabled
- Verify API key is correct
- Check API key restrictions

#### 2. "Place not found" error
- Verify Place ID is correct
- Ensure your business is listed on Google My Business

#### 3. Reviews not showing
- Check if your business has Google reviews
- Verify the reviews are public and not filtered

#### 4. CORS errors
- This is normal for direct API calls from browser
- Consider implementing a backend proxy if needed

## Fallback Behavior

The system automatically falls back to static testimonials when:
- API key is missing or invalid
- No internet connection
- Google Places API is down
- No reviews are found

## Cost Considerations

- Google Places API charges per request
- Current pricing: ~$0.017 per request
- Consider implementing caching to reduce API calls
- Monitor usage in Google Cloud Console

## Production Deployment

1. Set environment variables in your hosting platform:
   - **Netlify**: Site settings > Environment variables
   - **Vercel**: Project settings > Environment variables

2. Update API key restrictions to include production domain

3. Monitor API usage and set up billing alerts

## Support

For Google API issues:
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Google Cloud Support](https://cloud.google.com/support)

For implementation issues:
- Check browser console for errors
- Review component code in `src/components/testimonials/`
- Test with sample Place ID first