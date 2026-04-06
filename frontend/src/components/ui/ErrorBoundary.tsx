import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Home, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { error, showDetails } = this.state;

      return (
        <div
          data-testid="error-boundary-fallback"
          className="flex-1 flex items-center justify-center p-8"
        >
          <div className="text-center max-w-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-status-danger-bg">
              <AlertTriangle size={28} className="text-status-danger" />
            </div>

            <h2 className="text-lg font-semibold text-content-primary mb-2">
              Something went wrong
            </h2>

            <p className="text-sm text-content-secondary mb-6">
              An unexpected error occurred. You can try again or return to the dashboard.
            </p>

            {/* Error details (collapsible) */}
            {error && (
              <div className="mb-6 text-left">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-1 text-xs text-content-secondary hover:text-content-primary transition-colors"
                >
                  {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showDetails ? 'Hide details' : 'Show error details'}
                </button>

                {showDetails && (
                  <div className="mt-2 rounded-lg border border-border bg-surface-layer p-3">
                    <p className="text-xs font-medium text-status-danger mb-1">
                      {error.name}: {error.message}
                    </p>
                    {error.stack && (
                      <pre className="mt-2 text-[10px] text-content-secondary overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-mono">
                        {error.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg transition-colors"
                data-testid="error-boundary-retry"
              >
                <RotateCcw size={14} />
                Try Again
              </button>

              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-content-secondary border border-border rounded-lg hover:bg-surface-hover transition-colors"
                data-testid="error-boundary-home"
              >
                <Home size={14} />
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
