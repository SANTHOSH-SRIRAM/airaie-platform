import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, icon, error, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-content-secondary mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'w-full px-4 py-2 rounded-lg border border-surface-border',
              'bg-white text-content-primary placeholder-content-muted',
              'focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-transparent',
              'transition-all duration-200 text-sm',
              icon && 'pl-10',
              error && 'border-status-danger focus:ring-status-danger',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-status-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
