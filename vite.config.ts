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
          // Core vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react', 'react-icons'],
          'calendar-vendor': ['react-big-calendar', 'moment'],
          'date-vendor': ['date-fns'],
          'crypto-vendor': ['crypto-js', 'bcryptjs'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable', 'xlsx'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'form-vendor': ['react-hook-form'],
          'helmet-vendor': ['react-helmet-async']
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
