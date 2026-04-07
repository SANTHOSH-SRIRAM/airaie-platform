import { useMemo } from 'react';
import { Package, Download, FileText, Image, Database, File } from 'lucide-react';
import { useExecutionStore, type ArtifactEntry } from '@store/executionStore';
import { KERNEL_ENDPOINTS } from '@constants/api';
import { cn } from '@utils/cn';

interface ArtifactsTabProps {
  runId: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  mesh: Database,
  vtk: FileText,
  report: FileText,
  image: Image,
  csv: FileText,
  json: FileText,
};

const TYPE_COLORS: Record<string, string> = {
  mesh: 'bg-blue-50 text-blue-600',
  vtk: 'bg-purple-50 text-purple-600',
  report: 'bg-amber-50 text-amber-600',
  image: 'bg-emerald-50 text-emerald-600',
  csv: 'bg-teal-50 text-teal-600',
  json: 'bg-indigo-50 text-indigo-600',
};

function formatSize(bytes?: number): string {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

export default function ArtifactsTab({ runId }: ArtifactsTabProps) {
  const activeRunId = useExecutionStore((s) => s.activeRunId);
  const sseArtifacts = useExecutionStore((s) => s.artifacts);

  // Use SSE artifacts when execution store is active for this run
  const artifacts: ArtifactEntry[] = useMemo(() => {
    if (activeRunId === runId && sseArtifacts.length > 0) {
      return sseArtifacts;
    }
    return [];
  }, [activeRunId, runId, sseArtifacts]);

  const handleDownload = (artifactId: string) => {
    const url = KERNEL_ENDPOINTS.ARTIFACTS.DOWNLOAD(artifactId);
    window.open(url, '_blank');
  };

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <Package size={32} className="text-[#d4d4d4] mb-3" />
        <p className="text-sm font-medium text-[#949494] mb-1">No artifacts yet</p>
        <p className="text-xs text-[#b4b4b4]">
          Artifacts will appear here when nodes produce output files during run {runId}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-[#949494]">
          {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {artifacts.map((artifact) => {
        const Icon = TYPE_ICONS[artifact.type] ?? File;
        const colorClass = TYPE_COLORS[artifact.type] ?? 'bg-gray-50 text-gray-600';

        return (
          <div
            key={artifact.id}
            className="group flex items-center gap-3 rounded-[12px] border border-[#f0ede8] bg-white px-3 py-2.5 transition-colors hover:bg-[#f8f8f7]"
          >
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', colorClass)}>
              <Icon size={14} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[12px] font-medium text-[#1a1a1a]">
                  {artifact.name ?? artifact.id}
                </span>
                <span className="rounded-full bg-[#efefef] px-1.5 py-0.5 text-[9px] font-medium uppercase text-[#8d8d8d]">
                  {artifact.type}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#b2aea8]">
                {artifact.nodeId && <span>Node: {artifact.nodeId}</span>}
                <span>{formatSize(artifact.size)}</span>
                <span>{formatTime(artifact.createdAt)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDownload(artifact.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#949494] opacity-0 transition-all hover:bg-[#efefef] hover:text-[#1a1a1a] group-hover:opacity-100"
              title="Download artifact"
            >
              <Download size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
