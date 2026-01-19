import { useState, useEffect, useCallback, useRef } from 'react';

interface SessionTimeoutConfig {
  idleTimeout: number; // Time in milliseconds before warning
  warningTimeout: number; // Time in milliseconds for warning countdown
  onTimeout: () => void; // Callback when session expires
  enabled: boolean; // Enable/disable timeout
}

interface UseSessionTimeoutReturn {
  showWarning: boolean;
  remainingTime: number;
  extendSession: () => void;
  resetTimer: () => void;
}

/**
 * Hook for session timeout with idle detection
 * Tracks user activity and shows warning before auto-logout
 * 
 * @param config - Session timeout configuration
 * @returns Session timeout state and controls
 */
export const useSessionTimeout = (config: SessionTimeoutConfig): UseSessionTimeoutReturn => {
  const {
    idleTimeout = 15 * 60 * 1000, // Default: 15 minutes
    warningTimeout = 60 * 1000, // Default: 60 seconds warning
    onTimeout,
    enabled = true
  } = config;

  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(warningTimeout / 1000);
  
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (warningCountdownRef.current) {
      clearInterval(warningCountdownRef.current);
      warningCountdownRef.current = null;
    }
  }, []);

  // Reset the session timer
  const resetTimer = useCallback(() => {
    if (!enabled) return;

    clearAllTimers();
    setShowWarning(false);
    setRemainingTime(warningTimeout / 1000);
    lastActivityRef.current = Date.now();

    // Set idle timeout
    idleTimerRef.current = setTimeout(() => {
      // Show warning
      setShowWarning(true);
      setRemainingTime(warningTimeout / 1000);

      // Start warning countdown
      warningCountdownRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearAllTimers();
            onTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Set final timeout
      warningTimerRef.current = setTimeout(() => {
        clearAllTimers();
        onTimeout();
      }, warningTimeout);
    }, idleTimeout);
  }, [enabled, idleTimeout, warningTimeout, onTimeout, clearAllTimers]);

  // Extend session (dismiss warning and reset)
  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Activity events to track
  const activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
  ];

  // Handle user activity
  const handleActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Throttle activity tracking to avoid excessive resets (max once per second)
    if (timeSinceLastActivity < 1000) return;
    
    lastActivityRef.current = now;
    
    // Only reset if not showing warning
    // If warning is showing, user must explicitly click "Stay Logged In"
    if (!showWarning) {
      resetTimer();
    }
  }, [showWarning, resetTimer]);

  // Setup and cleanup event listeners
  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      return;
    }

    // Initial timer setup
    resetTimer();

    // Add activity event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      clearAllTimers();
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetTimer, handleActivity, clearAllTimers]);

  return {
    showWarning,
    remainingTime,
    extendSession,
    resetTimer,
  };
};
