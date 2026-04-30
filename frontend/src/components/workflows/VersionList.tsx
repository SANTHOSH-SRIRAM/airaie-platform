import { useState } from 'react';
import { ChevronDown, Upload, Eye, Loader2 } from 'lucide-react';
import { useWorkflowVersions, usePublishWorkflowVersion } from '@hooks/useWorkflow';
import type { WorkflowVersion } from '@api/workflows';
import { cn } from '@utils/cn';

interface VersionListProps {
  workflowId: string;
  currentVersion?: string;
  onLoadVersion?: (version: WorkflowVersion) => void;
}

const STATUS_STYLES: Record<WorkflowVersion['status'], { bg: string; text: string; label: string }> = {
  draft:     { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Draft' },
  compiled:  { bg: 'bg-blue-50',  text: 'text-blue-700',  label: 'Compiled' },
  published: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Published' },
};

export default function VersionList({ workflowId, currentVersion, onLoadVersion }: VersionListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: versions, isLoading } = useWorkflowVersions(workflowId);
  const publishMutation = usePublishWorkflowVersion(workflowId);

  const handlePublish = (version: number) => {
    publishMutation.mutate(version);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-[10px] py-[4px] text-[11px] font-medium leading-none transition-colors',
          isOpen
            ? 'bg-[#242424] text-white'
            : 'bg-[#efefef] text-[#8d8d8d] hover:bg-[#e0e0e0]',
        )}
      >
        {currentVersion ?? 'v3 draft'}
        <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-[340px] rounded-[14px] border border-[#ece9e3] bg-white shadow-lg">
          <div className="border-b border-[#ece9e3] px-4 py-3">
            <h3 className="text-[13px] font-semibold text-[#1a1a1a]">Version History</h3>
            <p className="mt-0.5 text-[11px] text-[#8d8d8d]">
              {versions?.length ?? 0} versions
            </p>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-[#8d8d8d]" />
              </div>
            )}

            {versions?.map((v) => {
              const style = STATUS_STYLES[v.status];
              const isCurrent = currentVersion === `v${v.version}`;

              return (
                <div
                  key={v.id}
                  className={cn(
                    'group flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors',
                    isCurrent ? 'bg-[#f8f8f7]' : 'hover:bg-[#f8f8f7]',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[#1a1a1a]">
                        v{v.version}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', style.bg, style.text)}>
                        {style.label}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-[#242424] px-2 py-0.5 text-[10px] font-medium text-white">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 block text-[11px] text-[#8d8d8d]">
                      {formatDate(v.created_at)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!isCurrent && (
                      <button
                        onClick={() => onLoadVersion?.(v)}
                        className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-[#8d8d8d] transition-colors hover:bg-[#efefef] hover:text-[#1a1a1a]"
                        title="Load this version"
                      >
                        <Eye size={13} />
                        Load
                      </button>
                    )}
                    {v.status === 'compiled' && (
                      <button
                        onClick={() => handlePublish(v.version)}
                        disabled={publishMutation.isPending}
                        className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                        title="Publish this version"
                      >
                        <Upload size={13} />
                        Publish
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {!isLoading && (!versions || versions.length === 0) && (
              <p className="py-8 text-center text-[12px] text-[#8d8d8d]">No versions yet</p>
            )}
          </div>
        </div>
      )}

      {/* Close backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
