import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  icon?: ReactNode;
  error?: string;
  warn?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, icon, error, warn, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-xs text-cds-text-secondary tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cds-icon-secondary [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'w-full h-10 px-4 bg-cds-field-01 text-sm text-cds-text-primary',
              'placeholder:text-cds-text-placeholder',
              'border-0 border-b border-cds-border-strong',
              'focus:outline-2 focus:outline-cds-focus focus:outline-offset-[-2px]',
              'transition-colors duration-75',
              icon && 'pl-10',
              error && 'border-b-2 border-cds-support-error outline outline-2 outline-cds-support-error outline-offset-[-2px]',
              warn && 'border-b-2 border-cds-support-warning',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${id}-error`} className="text-xs text-cds-text-error" role="alert">
            {error}
          </p>
        )}
        {warn && !error && (
          <p className="text-xs text-cds-support-warning">{warn}</p>
        )}
        {helperText && !error && !warn && (
          <p id={`${id}-helper`} className="text-xs text-cds-text-helper">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
