/**
 * Production Performance Utilities
 * Utilities to optimize performance in production environment
 */

export const isProduction = import.meta.env.PROD;

/**
 * Add timeout to promise for production environment
 */
export const withTimeout = <T>(
  promise: Promise<T>, 
  timeoutMs: number = 10000,
  errorMessage: string = 'Operation timed out'
): Promise<T> => {
  if (!isProduction) {
    return promise; // No timeout in development
  }

  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );

  return Promise.race([promise, timeoutPromise]);
};

/**
 * Log performance metrics in production
 */
export const logPerformance = (operation: string, startTime: number) => {
  if (isProduction) {
    const duration = Date.now() - startTime;
    if (duration > 2000) { // Log slow operations
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }
  }
};

/**
 * Production-optimized fetch with retry logic
 */
export const optimizedFetch = async (
  url: string, 
  options: RequestInit = {},
  retries: number = 2
): Promise<Response> => {
  const attemptFetch = async (attempt: number): Promise<Response> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        keepalive: true
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (attempt < retries && error instanceof Error && 
          (error.name === 'AbortError' || error.message.includes('network'))) {
        console.warn(`Fetch attempt ${attempt + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        return attemptFetch(attempt + 1);
      }
      throw error;
    }
  };

  return attemptFetch(0);
};
