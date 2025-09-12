# 🌟 Google Reviews Integration - Quick Setup

Your testimonials page has been updated to display real Google Reviews! Here's how to get it working:

## 🚀 Quick Setup (2 minutes)

### Option 1: Automated Setup (Recommended)
```bash
npm run setup-google-reviews
```
This interactive script will guide you through the entire setup process.

### Option 2: Manual Setup

1. **Get Google Places API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Places API
   - Create an API key

2. **Find Your Place ID:**
   - Use [Google Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)
   - Search for "KH Therapy"

3. **Configure Environment:**
   ```bash
   # Add to .env file:
   GOOGLE_PLACES_API_KEY=your_api_key_here
   GOOGLE_PLACE_ID=your_place_id_here
   VITE_SITE_URL=https://khtherapy.netlify.app
   ```

4. **For Netlify Deployment:**
   Add the same variables in Netlify's environment settings (without VITE_ prefix for the API key).

## ✅ What You Get

- **Real Google Reviews** displayed professionally
- **Star ratings** with authentic reviewer photos
- **Responsive design** that works on all devices
- **Professional styling** that matches your brand
- **Automatic updates** as new reviews are posted
- **Secure API calls** via Netlify functions

## 🎯 Features

- ⭐ Only shows 4+ star reviews
- 📱 Mobile-responsive pagination
- 🔄 Automatic refresh and caching
- 🎨 Professional Google branding
- 💼 Business summary with overall rating
- 🔗 Direct link to Google My Business

## 🔒 Security

- API keys are secured via Netlify functions
- No client-side API key exposure
- Automatic rate limiting and caching
- CORS protection enabled

## 🧪 Testing

After setup, visit:
- **Local:** http://localhost:5173/testimonials
- **Live:** https://khtherapy.netlify.app/testimonials

## 📞 Need Help?

Check the detailed setup guide: `docs/GOOGLE_REVIEWS_SETUP.md`

Your testimonials page will now show authentic Google Reviews, building more trust with potential clients!