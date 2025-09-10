import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Use root path for local development
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core vendor chunks - only essential libraries
          if (id.includes('react') && !id.includes('react-big-calendar') && !id.includes('react-icons')) {
            return 'react-core';
          }
          
          // Split large UI libraries separately for better caching
          if (id.includes('framer-motion')) {
            return 'framer-motion';
          }
          if (id.includes('react-big-calendar')) {
            return 'calendar';
          }
          if (id.includes('react-icons')) {
            return 'icons';
          }
          if (id.includes('lucide-react')) {
            return 'lucide';
          }
          
          // Utility libraries
          if (id.includes('date-fns') || id.includes('moment')) {
            return 'date-utils';
          }
          if (id.includes('crypto-js') || id.includes('bcryptjs')) {
            return 'crypto-utils';
          }
          
          // Heavy libraries that should be lazy-loaded
          if (id.includes('jspdf') || id.includes('xlsx')) {
            return 'pdf-utils';
          }
          if (id.includes('html2canvas')) {
            return 'html2canvas';
          }
          
          // Backend services
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }
          
          // Form libraries
          if (id.includes('react-hook-form')) {
            return 'forms';
          }
          
          // SEO
          if (id.includes('react-helmet-async')) {
            return 'helmet';
          }
          
          // Admin-specific code
          if (id.includes('AdminConsole') || id.includes('admin')) {
            return 'admin';
          }
          
          // Node modules that aren't specifically handled
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500, // Reduce to 500KB to catch large chunks
    // Enable source maps for better debugging
    sourcemap: false,
    // Optimize for production - use default esbuild minifier
    minify: 'esbuild'
  }
});
