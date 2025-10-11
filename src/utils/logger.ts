/**
 * Production-Safe Logging Utility
 * Automatically reduces logging in production environments
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

class ProductionSafeLogger {
  private environment: string;
  private isProduction: boolean;
  private isDevelopment: boolean;

  constructor() {
    // Detect environment
    this.environment = this.detectEnvironment();
    this.isProduction = this.environment === 'production';
    this.isDevelopment = this.environment === 'development';
  }

  private detectEnvironment(): string {
    // Check multiple environment indicators
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'khtherapy.ie' || hostname.endsWith('.khtherapy.ie')) {
        return 'production';
      }
      if (hostname.includes('uat') || hostname.includes('staging')) {
        return 'uat';
      }
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
      }
    }
    
    // Fallback to NODE_ENV or default
    return import.meta.env.NODE_ENV === 'production' ? 'production' : 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction) {
      // In production, only log errors and critical issues
      return level === 'error' || level === 'critical';
    }
    // In development/UAT, log everything
    return true;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const prefix = this.getLogPrefix(level);
    
    if (data && typeof data === 'object') {
      return `${prefix} ${message}`;
    }
    return `${prefix} ${message}`;
  }

  private getLogPrefix(level: LogLevel): string {
    const prefixes = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    return prefixes[level] || 'ℹ️';
  }

  // Public logging methods
  debug(message: string, data?: unknown) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data), data || '');
    }
  }

  info(message: string, data?: unknown) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data), data || '');
    }
  }

  warn(message: string, data?: unknown) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data), data || '');
    }
  }

  error(message: string, data?: unknown) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data), data || '');
    }
  }

  critical(message: string, data?: unknown) {
    if (this.shouldLog('critical')) {
      console.error(this.formatMessage('critical', message, data), data || '');
    }
  }

  // Environment-specific logging
  devOnly(callback: () => void) {
    if (this.isDevelopment) {
      callback();
    }
  }

  prodSafe(message: string, data?: unknown) {
    // Only logs in production if it's an error, otherwise silent
    if (this.isProduction) {
      // Silent in production unless it's critical
      return;
    }
    console.log(message, data || '');
  }

  // Get current environment
  getEnvironment(): string {
    return this.environment;
  }

  isProductionEnvironment(): boolean {
    return this.isProduction;
  }
}

// Create singleton instance
const logger = new ProductionSafeLogger();

export default logger;

// Export individual methods for convenience
export const { debug, info, warn, error, critical, devOnly, prodSafe } = logger;

// Environment check utilities
export const isProduction = () => logger.isProductionEnvironment();
export const getEnvironment = () => logger.getEnvironment();