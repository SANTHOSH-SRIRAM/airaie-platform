import { useRunStore } from '@store/runStore';
import type { RunDetail } from '@/types/run';
import { LoaderCircle, MoreHorizontal } from 'lucide-react';
import { cn } from '@utils/cn';

function formatDuration(duration?: number) {
  if (!duration) return '0s';
  if (duration < 60) return `${Math.round(duration)}s`;
  return `${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s`;
}

export interface RunNodeDetailPanelProps {
  runDetail?: RunDetail | undefined;
}

export default function RunNodeDetailPanel({ runDetail }: RunNodeDetailPanelProps) {
  const selectedRunNodeId = useRunStore((s) => s.selectedRunNodeId);
  const node = runDetail?.nodes.find((entry) => entry.nodeId === selectedRunNodeId);

  if (!node) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center">
        <p className="text-sm text-[#6b6b6b]">Click a node in the DAG to view details.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 pb-6 pt-5">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Node Detail</h3>
        <button type="button" className="rounded-full p-1 text-[#a5a099] transition-colors hover:bg-[#f5f3ef] hover:text-[#1a1a1a]">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <section className="border-b border-[#f0ede8] pb-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b2aea8]">
          Active Node
        </p>
        <div className="flex items-center gap-2">
          <h4 className="text-[16px] font-semibold text-[#1a1a1a]">{node.nodeName}</h4>
          <span className="rounded-full bg-[#efefef] px-2 py-0.5 text-[10px] font-medium uppercase text-[#8d8d8d]">
            {node.status}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-[#8f8a83]">
          {node.nodeType === 'tool' ? `Tool Node · ${node.nodeName.toLowerCase().replace(/\s+/g, '-')}` : node.nodeType}
        </p>
      </section>

      <section className="border-b border-[#f0ede8] py-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b2aea8]">
          Input
        </p>
        <div className="rounded-[12px] bg-[#f4f3f1] px-4 py-3">
          {Object.entries(node.inputs).map(([key, value]) => (
            <div key={key} className="mb-2 flex items-center justify-between gap-3 text-[13px] last:mb-0">
              <span className="text-[#9b978f]">{key}</span>
              <span className="truncate font-mono text-right text-[#1a1a1a]">
                {String(value)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-[#f0ede8] py-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b2aea8]">
          Output
        </p>
        <div className="rounded-[12px] bg-[#e6e5e4] px-4 py-3 text-[13px] text-[#8f8a83]">
          {node.outputs ? (
            Object.entries(node.outputs).map(([key, value]) => (
              <div key={key} className="mb-2 flex items-center justify-between gap-3 last:mb-0">
                <span>{key}</span>
                <span className="font-mono text-[#1a1a1a]">{String(value)}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2">
              <LoaderCircle size={14} className="animate-spin text-[#8f8a83]" />
              <span>Waiting for results...</span>
            </div>
          )}
        </div>
      </section>

      <section className="border-b border-[#f0ede8] py-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b2aea8]">
          Metrics
        </p>
        <div className="space-y-3 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-[#8f8a83]">Duration</span>
            <span className="text-[#2f8cff]">{formatDuration(node.duration)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8f8a83]">CPU</span>
            <span className="text-[#1a1a1a]">
              {node.metrics ? `${(node.metrics.cpuPercent / 25).toFixed(1)} / 4 cores` : '—'}
            </span>
          </div>
          <div className="h-[5px] rounded-full bg-[#ece9e3]">
            <div className="h-full rounded-full bg-[#2f8cff]" style={{ width: `${Math.min(100, node.metrics?.cpuPercent ?? 0)}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8f8a83]">Memory</span>
            <span className="text-[#1a1a1a]">
              {node.metrics ? `${(node.metrics.memoryMb / 1024).toFixed(1)} / 2.0 GB` : '—'}
            </span>
          </div>
          <div className="h-[5px] rounded-full bg-[#ece9e3]">
            <div className="h-full rounded-full bg-[#ff9800]" style={{ width: `${Math.min(100, ((node.metrics?.memoryMb ?? 0) / 2048) * 100)}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8f8a83]">Cost</span>
            <span className="text-[#1a1a1a]">${node.metrics?.costUsd.toFixed(2) ?? '0.00'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8f8a83]">Attempt</span>
            <span className="text-[#1a1a1a]">{node.metrics ? `${node.metrics.attempt} / 3` : '—'}</span>
          </div>
        </div>
      </section>

      <section className="py-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b2aea8]">
          Execution History
        </p>
        <div className="space-y-2 text-[13px]">
          {runDetail?.nodes.map((entry) => (
            <div key={entry.nodeId} className="flex items-center gap-2 text-[#8f8a83]">
              <span
                className={cn(
                  'h-[10px] w-[10px] rounded-full',
                  entry.status === 'completed'
                    ? 'bg-[#20c05c]'
                    : entry.status === 'running'
                      ? 'bg-[#2f8cff]'
                      : 'bg-[#d2cec8]'
                )}
              />
              <span className="truncate">
                {entry.nodeName} · {entry.status === 'completed'
                  ? `OK · ${formatDuration(entry.duration)}`
                  : entry.status === 'running'
                    ? `Running · ${formatDuration(entry.duration)}`
                    : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
