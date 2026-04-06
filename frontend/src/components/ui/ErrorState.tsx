import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({ message = 'Failed to load data', onRetry, className }: ErrorStateProps) {
  return (
    <div data-testid="error-state" className={`flex flex-col items-center justify-center py-8 ${className ?? ''}`}>
      <AlertTriangle size={24} className="text-cds-text-secondary mb-2" />
      <p className="text-sm text-cds-text-secondary mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          data-testid="error-state-retry"
          className="px-3 py-1.5 text-xs font-medium text-cds-text-primary border border-cds-border-strong rounded-sm hover:bg-surface-hover transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
