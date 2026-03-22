import { cn } from '@utils/cn';

interface ToggleProps {
  id: string;
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

export default function Toggle({
  id,
  label,
  checked,
  onChange,
  size = 'md',
  disabled = false,
  className,
}: ToggleProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 rounded-full transition-colors duration-100',
          'focus-visible:outline-2 focus-visible:outline-cds-focus focus-visible:outline-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          size === 'sm' ? 'w-8 h-4' : 'w-12 h-6',
          checked ? 'bg-brand-primary' : 'bg-gray-30'
        )}
      >
        <span
          className={cn(
            'inline-block bg-white rounded-full shadow transition-transform duration-100',
            size === 'sm' ? 'w-3 h-3 mt-0.5 ml-0.5' : 'w-[18px] h-[18px] mt-[3px] ml-[3px]',
            checked && (size === 'sm' ? 'translate-x-4' : 'translate-x-6')
          )}
        />
      </button>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'text-sm text-cds-text-primary cursor-pointer',
            disabled && 'text-cds-text-disabled cursor-not-allowed'
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
}
