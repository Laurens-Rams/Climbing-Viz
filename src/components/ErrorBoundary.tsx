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
        <div className="bg-red-900/20 border border-red-400 rounded-lg p-4 m-4">
          <div className="text-red-400 font-bold mb-2">⚠️ Component Error</div>
          <div className="text-red-300 text-sm mb-2">
            Something went wrong with this component. This might be due to:
          </div>
          <ul className="text-red-300 text-xs list-disc list-inside mb-3">
            <li>Rapid data updates causing DOM conflicts</li>
            <li>WebGL context issues</li>
            <li>Memory constraints</li>
          </ul>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500"
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-3">
              <summary className="text-red-400 text-xs cursor-pointer">Error Details (Dev)</summary>
              <pre className="text-red-300 text-xs mt-2 overflow-auto">
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