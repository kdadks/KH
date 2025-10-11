import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendErrorToService(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center',
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#dc3545' }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '1.5rem', color: '#6c757d' }}>
            We apologize for the inconvenience. The page encountered an unexpected error.
          </p>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details style={{ 
              marginBottom: '1.5rem', 
              padding: '1rem', 
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              textAlign: 'left',
              maxWidth: '600px'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.875rem',
                overflow: 'auto'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              style={{ 
                padding: '10px 20px', 
                background: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Page
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
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;