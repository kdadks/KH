// Database event listener hook for real-time updates
// This will automatically refresh admin components when data changes

import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

interface UseAutoRefreshOptions {
  table: string;
  onDataChange: () => void;
  enabled?: boolean;
  throttleMs?: number; // Throttle refresh calls
}

export const useAutoRefresh = ({ 
  table, 
  onDataChange, 
  enabled = true, 
  throttleMs = 2000 // Default 2 second throttle
}: UseAutoRefreshOptions) => {
  
  const lastRefreshRef = useRef<number>(0);
  const throttledOnDataChange = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current > throttleMs) {
      console.log(`🔄 Auto-refresh triggered for ${table} (throttled)`);
      lastRefreshRef.current = now;
      onDataChange();
    } else {
      console.log(`⏸️ Auto-refresh throttled for ${table}`);
    }
  }, [onDataChange, table, throttleMs]);
  
  const handleDataChange = useCallback((payload: any) => {
    // Only refresh on actual data changes, not just any database event
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
      throttledOnDataChange();
    }
  }, [throttledOnDataChange]);

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: table
        },
        handleDataChange
      )
      .subscribe();

    console.log(`📡 Auto-refresh enabled for ${table}`);

    // Cleanup subscription
    return () => {
      console.log(`📡 Auto-refresh disabled for ${table}`);
      subscription.unsubscribe();
    };
  }, [table, handleDataChange, enabled]);

  // Manual refresh function
  const manualRefresh = useCallback(() => {
    console.log(`🔄 Manual refresh triggered for ${table}`);
    onDataChange();
  }, [onDataChange, table]);

  return { manualRefresh };
};

// Performance optimization hook for reducing unnecessary re-renders
export const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
