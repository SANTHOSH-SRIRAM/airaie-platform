import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
}

/**
 * EmptyState — Reusable placeholder for empty lists, empty search results, etc.
 * Centers content with an icon, title, description, and optional action button.
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-layer">
        <Icon size={32} className="text-content-secondary" strokeWidth={1.5} />
      </div>

      <h3 className="text-base font-semibold text-content-primary mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-content-secondary max-w-sm mb-0">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-hover rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
