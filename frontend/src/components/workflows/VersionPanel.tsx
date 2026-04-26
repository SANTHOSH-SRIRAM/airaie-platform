import { useEffect, useState } from 'react';
import { Check, Upload, X, Loader2 } from 'lucide-react';
import { useWorkflowVersions, usePublishWorkflowVersion } from '@hooks/useWorkflow';
import type { WorkflowVersion } from '@api/workflows';
import { cn } from '@utils/cn';

export interface VersionPanelProps {
  workflowId: string;
  selectedVersion: number | null;
  onSelectVersion: (version: number) => void;
  onClose?: () => void;
  className?: string;
}

type StatusKey = WorkflowVersion['status'];

const STATUS_PILL: Record<StatusKey, { bg: string; text: string; label: string }> = {
  published: { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]', label: 'Published' },
  compiled: { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]', label: 'Compiled' },
  draft: { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]', label: 'Draft' },
};

/**
 * Tiny relative-time formatter. Returns strings like "just now", "5m ago",
 * "3h ago", "2d ago", "Mar 12". No external deps.
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const now = Date.now();
  const diffMs = now - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  // Older than a week → show short date.
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now - then > 365 * 24 * 60 * 60 * 1000 ? 'numeric' : undefined,
  });
}

function StatusPill({ status }: { status: StatusKey }) {
  const cfg = STATUS_PILL[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-medium leading-none',
        cfg.bg,
        cfg.text,
      )}
    >
      {cfg.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-[#ece9e3] px-4 py-3 last:border-b-0">
      <div className="h-6 w-10 animate-pulse rounded-full bg-[#f5f5f0]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-[#f5f5f0]" />
        <div className="h-2 w-16 animate-pulse rounded bg-[#f5f5f0]" />
      </div>
      <div className="h-5 w-14 animate-pulse rounded-full bg-[#f5f5f0]" />
    </div>
  );
}

export default function VersionPanel({
  workflowId,
  selectedVersion,
  onSelectVersion,
  onClose,
  className,
}: VersionPanelProps) {
  const enabled = !!workflowId;
  const { data, isLoading, isError, error } = useWorkflowVersions(workflowId);
  const publishMutation = usePublishWorkflowVersion(workflowId);

  // Inline success/error banner for publish action (no global toast system available).
  const [flash, setFlash] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 3000);
    return () => window.clearTimeout(t);
  }, [flash]);

  const versions: WorkflowVersion[] = (data ?? []).slice().sort((a, b) => b.version - a.version);

  const handlePublish = (version: number) => {
    publishMutation.mutate(version, {
      onSuccess: () => setFlash({ kind: 'success', message: `v${version} published.` }),
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Publish failed.';
        setFlash({ kind: 'error', message: msg });
      },
    });
  };

  return (
    <aside
      className={cn(
        'flex w-[320px] flex-col overflow-hidden rounded-[12px] border border-[#ece9e3] bg-white',
        'shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]',
        className,
      )}
      aria-label="Workflow version history"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-2 border-b border-[#ece9e3] px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-[#1a1a1a]">Versions</h2>
          {enabled && versions.length > 0 && (
            <span className="rounded-full bg-[#f5f5f0] px-2 py-[2px] text-[11px] font-medium text-[#6b6b6b]">
              {versions.length}
            </span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#949494] transition-colors hover:bg-[#f5f5f0] hover:text-[#1a1a1a]"
            aria-label="Close versions panel"
          >
            <X size={16} />
          </button>
        )}
      </header>

      {/* Inline flash */}
      {flash && (
        <div
          className={cn(
            'border-b px-4 py-2 text-[12px]',
            flash.kind === 'success'
              ? 'border-[#c8e6c9] bg-[#e8f5e9] text-[#2e7d32]'
              : 'border-[#ffcdd2] bg-[#ffebee] text-[#c62828]',
          )}
          role="status"
        >
          {flash.message}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty/no-workflow state */}
        {!enabled && (
          <div className="px-4 py-8 text-center text-[12px] text-[#949494]">
            No workflow selected.
          </div>
        )}

        {/* Loading skeleton */}
        {enabled && isLoading && (
          <div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* Error state */}
        {enabled && isError && (
          <div className="px-4 py-6 text-[12px] text-[#c62828]">
            {error instanceof Error ? error.message : 'Failed to load versions.'}
          </div>
        )}

        {/* Empty list */}
        {enabled && !isLoading && !isError && versions.length === 0 && (
          <div className="px-4 py-8 text-center text-[12px] text-[#949494]">
            No versions yet — save the editor to create v1.
          </div>
        )}

        {/* Version rows */}
        {enabled && !isLoading && !isError && versions.length > 0 && (
          <ul className="divide-y divide-[#ece9e3]">
            {versions.map((v) => {
              const isActive = selectedVersion === v.version;
              const canPublish = v.status === 'compiled';
              const isPublishingThis = publishMutation.isPending && publishMutation.variables === v.version;

              return (
                <li key={v.id} className="relative">
                  {/* Active rail */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-[4px] bg-[#2196f3]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectVersion(v.version)}
                    className={cn(
                      'group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                      isActive ? 'bg-[#f5f5f0]' : 'hover:bg-[#fbfaf9]',
                    )}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {/* Version badge */}
                    <span
                      className={cn(
                        'inline-flex h-7 min-w-[40px] items-center justify-center rounded-full px-2 text-[12px] font-mono font-medium',
                        isActive
                          ? 'bg-[#2196f3] text-white'
                          : 'bg-[#f5f5f0] text-[#1a1a1a]',
                      )}
                    >
                      v{v.version}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusPill status={v.status} />
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2196f3]">
                            <Check size={11} />
                            Active
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-[#949494]">
                        {relativeTime(v.created_at)}
                      </div>
                    </div>

                    {/* Publish action — only on compiled rows */}
                    {canPublish && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!publishMutation.isPending) handlePublish(v.version);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!publishMutation.isPending) handlePublish(v.version);
                          }
                        }}
                        aria-label={`Publish v${v.version}`}
                        aria-disabled={publishMutation.isPending}
                        className={cn(
                          'inline-flex h-7 items-center gap-1 rounded-md border border-[#ece9e3] bg-white px-2 text-[11px] font-medium text-[#2196f3]',
                          'transition-colors hover:bg-[#e3f2fd]',
                          publishMutation.isPending && 'pointer-events-none opacity-60',
                        )}
                      >
                        {isPublishingThis ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Upload size={12} />
                        )}
                        Publish
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
