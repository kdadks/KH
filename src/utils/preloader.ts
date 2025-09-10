// Preloader utility for critical routes
export const preloadCriticalRoutes = () => {
  // Preload most visited pages after initial load
  const criticalRoutes = [
    () => import('../pages/AboutPage'),
    () => import('../pages/ServicesPage'),
    () => import('../pages/BookingPage'),
    () => import('../pages/ContactPage'),
  ];

  // Use requestIdleCallback to preload during idle time
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      criticalRoutes.forEach(route => {
        route().catch(() => {
          // Silently fail - preloading is not critical
        });
      });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      criticalRoutes.forEach(route => {
        route().catch(() => {
          // Silently fail - preloading is not critical
        });
      });
    }, 2000);
  }
};

// Preload heavy components only when needed
export const preloadHeavyComponents = () => {
  // Only preload admin and user portal after user interaction
  const heavyRoutes = [
    () => import('../components/UserPortal'),
    () => import('../pages/AdminConsole'),
  ];

  return {
    preloadUserPortal: () => heavyRoutes[0]().catch(() => {}),
    preloadAdmin: () => heavyRoutes[1]().catch(() => {}),
  };
};