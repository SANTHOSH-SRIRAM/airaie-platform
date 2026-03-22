import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  iconOnly?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-brand-primary text-white hover:bg-brand-primary-hover active:bg-blue-80',
  secondary: 'bg-gray-80 text-white hover:bg-gray-70 active:bg-gray-60',
  tertiary:  'bg-transparent text-brand-primary border border-brand-primary hover:bg-brand-primary hover:text-white active:bg-blue-80 active:text-white',
  ghost:     'bg-transparent text-brand-primary hover:bg-cds-background-hover active:bg-cds-background-active',
  danger:    'bg-brand-danger text-white hover:bg-brand-danger-hover active:bg-red-80',
  outline:   'bg-transparent text-brand-primary border border-brand-primary hover:bg-brand-primary hover:text-white active:bg-blue-80 active:text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-4 text-sm gap-2',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-4 text-sm gap-2',
  xl: 'h-16 px-4 text-base gap-2',
};

const iconOnlySizes: Record<ButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', icon, iconRight, iconOnly, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-normal',
          'transition-colors duration-150',
          'focus-visible:outline-2 focus-visible:outline-cds-focus focus-visible:outline-offset-[-2px]',
          'disabled:bg-gray-20 disabled:text-cds-text-disabled disabled:border-transparent disabled:cursor-not-allowed',
          variantStyles[variant],
          iconOnly ? iconOnlySizes[size] : sizeStyles[size],
          className
        )}
        {...props}
      >
        {icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        {children}
        {iconRight && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
