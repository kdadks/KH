import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import TestimonialsPage from './pages/TestimonialsPage';
import BookingPage from './pages/BookingPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import NotFoundPage from './pages/NotFoundPage';
import AdminConsole from './pages/AdminConsole';
import SportsInjuryPage from './pages/services/SportsInjuryPage';
import ManualTherapyPage from './pages/services/ManualTherapyPage';
import ChronicPainPage from './pages/services/ChronicPainPage';
import PostSurgeryPage from './pages/services/PostSurgeryPage';
import NeuromuscularPage from './pages/services/NeuromuscularPage';
import ErgonomicPage from './pages/services/ErgonomicPage';
import UserPortal from './components/UserPortal';
import ResetPassword from './components/user/ResetPassword';
import PaymentPage from './pages/PaymentPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelledPage from './pages/PaymentCancelledPage';
import SumUpCheckoutPage from './pages/SumUpCheckoutPage';
import { ToastProvider } from './components/shared/toastContext';
import { UserAuthProvider } from './contexts/UserAuthContext';

function App() {
  return (
    <ToastProvider>
      <UserAuthProvider>
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
            <Route path="services/ergonomic" element={<ErgonomicPage />} />
            <Route path="testimonials" element={<TestimonialsPage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="my-account" element={<UserPortal />} />
            <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="terms-of-service" element={<TermsOfServicePage />} />
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
      </UserAuthProvider>
    </ToastProvider>
  );
}

export default App;