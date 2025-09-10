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
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'react-icons', 'react-big-calendar'],
          'utils-vendor': ['date-fns', 'moment', 'crypto-js', 'bcryptjs'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable', 'xlsx'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'form-vendor': ['react-hook-form'],
          'helmet-vendor': ['react-helmet-async']
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase warning limit to 1MB
  }
});
