import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="glass-card border-red-500/30 bg-red-900/20 m-6">
          <div className="text-red-400 font-bold mb-4 text-lg">⚠️ Component Error</div>
          <div className="text-red-300 text-sm mb-4">
            Something went wrong with this component. This might be due to:
          </div>
          <ul className="text-red-300 text-sm list-disc list-inside mb-6 space-y-1">
            <li>Rapid data updates causing DOM conflicts</li>
            <li>WebGL context issues</li>
            <li>Memory constraints</li>
          </ul>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            className="glass-btn glass-btn--danger"
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6">
              <summary className="text-red-400 text-sm cursor-pointer hover:text-red-300 transition-colors">
                Error Details (Dev)
              </summary>
              <pre className="text-red-300 text-xs mt-3 overflow-auto glass-card bg-red-950/30 p-4">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
} 