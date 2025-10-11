import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/layout/Layout';
import { ToastProvider } from './components/shared/toastContext';
import { UserAuthProvider } from './contexts/UserAuthContext';
import ErrorBoundary from './components/ErrorBoundary';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

// Create a robust lazy loader with error handling and retry mechanism
const createLazyComponent = (importFunc: () => Promise<{ default: React.ComponentType<any> }>, componentName: string) => {
  return lazy(() => 
    importFunc().catch((error) => {
      console.error(`Dynamic import failed for ${componentName}:`, error);
      
      // Try to recover by forcing a page reload if this happens on critical pages
      if (['HomePage', 'PaymentSuccessPage', 'PaymentCancelledPage'].includes(componentName)) {
        console.log(`Critical component ${componentName} failed to load, attempting recovery...`);
        
        // Give it a moment then try to redirect to home
        setTimeout(() => {
          if (window.location.pathname !== '/') {
            console.log('Redirecting to home due to critical component import failure');
            window.location.href = '/';
          } else {
            // If we're already on home and it's failing, force reload
            window.location.reload();
          }
        }, 1000);
      }
      
      // Return a fallback component
      return {
        default: () => (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center',
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Loading Error</h1>
            <p style={{ marginBottom: '1.5rem' }}>
              There was an issue loading this page. This sometimes happens after updates.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.reload()} 
                style={{ 
                  padding: '10px 20px', 
                  background: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Refresh Page
              </button>
              <a 
                href="/"
                style={{ 
                  padding: '10px 20px', 
                  background: '#28a745', 
                  color: 'white', 
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}
              >
                Go to Home
              </a>
            </div>
          </div>
        )
      };
    })
  );
};

// Lazy load pages with error handling
const HomePage = createLazyComponent(() => import('./pages/HomePage'), 'HomePage');
const AboutPage = createLazyComponent(() => import('./pages/AboutPage'), 'AboutPage');
const ServicesPage = createLazyComponent(() => import('./pages/ServicesPage'), 'ServicesPage');
const TestimonialsPage = createLazyComponent(() => import('./pages/TestimonialsPage'), 'TestimonialsPage');
const BookingPage = createLazyComponent(() => import('./pages/BookingPage'), 'BookingPage');
const ContactPage = createLazyComponent(() => import('./pages/ContactPage'), 'ContactPage');
const PrivacyPolicyPage = createLazyComponent(() => import('./pages/PrivacyPolicyPage'), 'PrivacyPolicyPage');
const TermsOfServicePage = createLazyComponent(() => import('./pages/TermsOfServicePage'), 'TermsOfServicePage');
const CookiePolicyPage = createLazyComponent(() => import('./pages/CookiePolicyPage'), 'CookiePolicyPage');
const NotFoundPage = createLazyComponent(() => import('./pages/NotFoundPage'), 'NotFoundPage');
const AdminConsole = createLazyComponent(() => import('./pages/AdminConsole'), 'AdminConsole');
const SportsInjuryPage = createLazyComponent(() => import('./pages/services/SportsInjuryPage'), 'SportsInjuryPage');
const ManualTherapyPage = createLazyComponent(() => import('./pages/services/ManualTherapyPage'), 'ManualTherapyPage');
const ChronicPainPage = createLazyComponent(() => import('./pages/services/ChronicPainPage'), 'ChronicPainPage');
const PostSurgeryPage = createLazyComponent(() => import('./pages/services/PostSurgeryPage'), 'PostSurgeryPage');
const NeuromuscularPage = createLazyComponent(() => import('./pages/services/NeuromuscularPage'), 'NeuromuscularPage');
const WellnessAssessmentPage = createLazyComponent(() => import('./pages/services/WellnessAssessmentPage'), 'WellnessAssessmentPage');
const UserPortal = createLazyComponent(() => import('./components/UserPortal'), 'UserPortal');
const ResetPassword = createLazyComponent(() => import('./components/user/ResetPassword'), 'ResetPassword');
const PaymentPage = createLazyComponent(() => import('./pages/PaymentPage'), 'PaymentPage');
const PaymentSuccessPage = createLazyComponent(() => import('./pages/PaymentSuccessPage'), 'PaymentSuccessPage');
const PaymentCancelledPage = createLazyComponent(() => import('./pages/PaymentCancelledPage'), 'PaymentCancelledPage');
const SumUpCheckoutPage = createLazyComponent(() => import('./pages/SumUpCheckoutPage'), 'SumUpCheckoutPage');

function App() {
  return (
    <ToastProvider>
      <UserAuthProvider>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="services/sports-injury" element={<SportsInjuryPage />} />
              <Route path="services/manual-therapy" element={<ManualTherapyPage />} />
              <Route path="services/chronic-pain" element={<ChronicPainPage />} />
              <Route path="services/post-surgery" element={<PostSurgeryPage />} />
              <Route path="services/neuromuscular" element={<NeuromuscularPage />} />
              <Route path="services/wellness-assessment" element={<WellnessAssessmentPage />} />
              <Route path="testimonials" element={<TestimonialsPage />} />
              <Route path="booking" element={<BookingPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="my-account" element={<UserPortal />} />
              <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="terms-of-service" element={<TermsOfServicePage />} />
              <Route path="cookie-policy" element={<CookiePolicyPage />} />
              <Route path="admin/*" element={<AdminConsole />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            {/* Reset password route outside the main layout */}
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Payment page route outside the main layout */}
            <Route path="/payment" element={<PaymentPage />} />
            {/* Payment result pages */}
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
            {/* SumUp checkout page */}
            <Route path="/sumup-checkout" element={<SumUpCheckoutPage />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </UserAuthProvider>
    </ToastProvider>
  );
}

export default App;