import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/layout/Layout';
import { ToastProvider } from './components/shared/toastContext';
import { UserAuthProvider } from './contexts/UserAuthContext';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const TestimonialsPage = lazy(() => import('./pages/TestimonialsPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AdminConsole = lazy(() => import('./pages/AdminConsole'));
const SportsInjuryPage = lazy(() => import('./pages/services/SportsInjuryPage'));
const ManualTherapyPage = lazy(() => import('./pages/services/ManualTherapyPage'));
const ChronicPainPage = lazy(() => import('./pages/services/ChronicPainPage'));
const PostSurgeryPage = lazy(() => import('./pages/services/PostSurgeryPage'));
const NeuromuscularPage = lazy(() => import('./pages/services/NeuromuscularPage'));
const WellnessAssessmentPage = lazy(() => import('./pages/services/WellnessAssessmentPage'));
const UserPortal = lazy(() => import('./components/UserPortal'));
const ResetPassword = lazy(() => import('./components/user/ResetPassword'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PaymentCancelledPage = lazy(() => import('./pages/PaymentCancelledPage'));
const SumUpCheckoutPage = lazy(() => import('./pages/SumUpCheckoutPage'));

function App() {
  return (
    <ToastProvider>
      <UserAuthProvider>
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
      </UserAuthProvider>
    </ToastProvider>
  );
}

export default App;