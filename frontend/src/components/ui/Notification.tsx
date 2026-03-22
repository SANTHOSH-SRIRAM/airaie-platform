import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@utils/cn';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationProps {
  type?: NotificationType;
  title: string;
  subtitle?: string;
  onClose?: () => void;
  inline?: boolean;
  className?: string;
}

const typeConfig: Record<NotificationType, { bg: string; border: string; iconColor: string }> = {
  info:    { bg: 'bg-blue-10',      border: 'border-l-blue-70',   iconColor: 'text-blue-60' },
  success: { bg: 'bg-green-10',     border: 'border-l-green-60',  iconColor: 'text-green-50' },
  warning: { bg: 'bg-yellow-20/20', border: 'border-l-yellow-30', iconColor: 'text-yellow-30' },
  error:   { bg: 'bg-red-10',       border: 'border-l-red-60',    iconColor: 'text-red-60' },
};

const iconMap: Record<NotificationType, typeof Info> = {
  info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle,
};

export default function Notification({
  type = 'info', title, subtitle, onClose, inline = false, className,
}: NotificationProps) {
  const config = typeConfig[type];
  const Icon = iconMap[type];

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 border-l-[3px]',
        config.bg, config.border,
        inline ? 'px-4 py-2' : 'p-4',
        className
      )}
    >
      <Icon size={20} className={cn('shrink-0 mt-0.5', config.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-cds-text-primary">{title}</p>
        {subtitle && <p className="text-sm text-cds-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 p-1 text-cds-icon-secondary hover:bg-cds-background-hover transition-colors duration-100" aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
