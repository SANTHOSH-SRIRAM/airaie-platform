import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-secondary text-white hover:bg-brand-secondary-dark focus:ring-brand-secondary',
  secondary: 'bg-white border border-gray-300 text-content-primary hover:bg-gray-50 focus:ring-gray-300',
  ghost: 'text-content-secondary hover:bg-gray-100 focus:ring-gray-300',
  outline: 'border border-brand-secondary text-brand-secondary hover:bg-blue-50 focus:ring-brand-secondary',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', icon, iconRight, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
