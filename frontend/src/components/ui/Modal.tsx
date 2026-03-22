import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@utils/cn';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  danger?: boolean;
  className?: string;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-[448px]',
  md: 'max-w-[672px]',
  lg: 'max-w-[896px]',
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  danger = false,
  className,
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative w-full bg-cds-layer-02 shadow-raised animate-slide-up', sizeStyles[size], className)}
      >
        <div className={cn('flex items-center justify-between px-4 h-12', danger ? 'bg-red-60' : 'bg-cds-layer-01')}>
          <h2 className={cn('text-sm font-semibold', danger ? 'text-white' : 'text-cds-text-primary')}>{title}</h2>
          <button
            onClick={onClose}
            className={cn('p-2 transition-colors duration-100', danger ? 'text-white hover:bg-red-70' : 'text-cds-icon-secondary hover:bg-cds-background-hover')}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-4 py-6 text-sm text-cds-text-primary">{children}</div>
        {footer && <div className="flex justify-end border-t border-cds-border-subtle">{footer}</div>}
      </div>
    </div>
  );
}
