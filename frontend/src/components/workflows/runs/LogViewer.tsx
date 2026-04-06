import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Copy, Download, RotateCcw, Square } from 'lucide-react';
import { useRunStore } from '@store/runStore';
import { useExecutionStore } from '@store/executionStore';
import { useCancelRun, useRetryRun, useRunLogs } from '@hooks/useRuns';
import type { RunDetail, RunLogLine } from '@/types/run';
import LogLine from './LogLine';
import ArtifactsTab from './ArtifactsTab';
import CostTab from './CostTab';
import TimelineTab from './TimelineTab';
import { cn } from '@utils/cn';

const TABS = [
  { id: 'logs' as const, label: 'Logs' },
  { id: 'artifacts' as const, label: 'Artifacts' },
  { id: 'cost' as const, label: 'Cost' },
  { id: 'timeline' as const, label: 'Timeline' },
];

function formatLogLine(log: RunLogLine): string {
  return `${log.timestamp} [${log.nodeName}] [${log.level.toUpperCase()}] ${log.message}`;
}

interface LogViewerProps {
  runId: string | null;
  runDetail: RunDetail | undefined;
}

export default function LogViewer({ runId, runDetail }: LogViewerProps) {
  const logAutoScroll = useRunStore((s) => s.logAutoScroll);
  const setLogAutoScroll = useRunStore((s) => s.setLogAutoScroll);
  const activeLogTab = useRunStore((s) => s.activeLogTab);
  const setActiveLogTab = useRunStore((s) => s.setActiveLogTab);

  // SSE-sourced logs from executionStore
  const activeRunId = useExecutionStore((s) => s.activeRunId);
  const sseLogs = useExecutionStore((s) => s.logs);
  const sseConnected = useExecutionStore((s) => s.sseConnected);

  // Polling-based logs (fallback when no SSE connection)
  const { data: polledLogs } = useRunLogs(runId);

  // Prefer SSE logs when execution store is active for this run
  const isSSEActive = activeRunId === runId && (sseConnected || sseLogs.length > 0);
  const logs: RunLogLine[] = useMemo(() => {
    if (isSSEActive) {
      // Map executionStore LogEntry to RunLogLine format
      return sseLogs.map((entry) => ({
        timestamp: entry.timestamp,
        nodeId: entry.nodeId ?? '',
        nodeName: entry.nodeName ?? entry.nodeId ?? '',
        level: entry.level,
        message: entry.message,
      }));
    }
    return polledLogs ?? [];
  }, [isSSEActive, sseLogs, polledLogs]);

  const cancelMutation = useCancelRun();
  const retryMutation = useRetryRun();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logAutoScroll && scrollRef.current && logs.length > 0) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [logs, logAutoScroll]);

  const handleCopy = useCallback(() => {
    if (logs.length === 0) return;
    navigator.clipboard.writeText(logs.map(formatLogLine).join('\n'));
  }, [logs]);

  const handleDownload = useCallback(() => {
    if (logs.length === 0 || !runId) return;
    const blob = new Blob([logs.map(formatLogLine).join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `run_${runId}_logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs, runId]);

  if (!runId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6b6b6b]">
        Select a run to view logs
      </div>
    );
  }

  const isRunning = runDetail?.status === 'running';
  const isTerminal = runDetail?.status === 'succeeded' || runDetail?.status === 'failed' || runDetail?.status === 'cancelled';

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[#f0ede8] px-5 pt-3">
        <div className="flex shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveLogTab(tab.id)}
              className={cn(
                'relative h-9 px-4 text-[12px] font-medium transition-colors',
                activeLogTab === tab.id
                  ? 'text-[#1a1a1a]'
                  : 'text-[#949494] hover:text-[#1a1a1a]'
              )}
            >
              {tab.label}
              {activeLogTab === tab.id && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-sm bg-[#1a1a1a]" />
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLogAutoScroll(!logAutoScroll)}
          className="mb-2 inline-flex items-center gap-2 text-[12px] text-[#8f8a83]"
        >
          <span>Auto-scroll</span>
          <span className={cn(
            'relative inline-flex h-[20px] w-[36px] rounded-full transition-colors',
            logAutoScroll ? 'bg-[#23c552]' : 'bg-[#d9d5ce]'
          )}>
            <span
              className={cn(
                'absolute top-[2px] h-4 w-4 rounded-full bg-white transition-transform',
                logAutoScroll ? 'translate-x-[18px]' : 'translate-x-[2px]'
              )}
            />
          </span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-4">
        {activeLogTab === 'logs' && (
          <div className="flex h-full flex-col">
            <div className="relative flex-1 overflow-hidden rounded-[12px] bg-[#050505]">
              <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-3">
                {logs.map((log, index) => (
                  <LogLine key={index} log={log} index={index} />
                ))}
              </div>

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 border-t border-[#161616] bg-[#050505]/95 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#c7c1b8]">{logs.length} lines</span>
                  {isSSEActive && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                      Live
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-full border border-[#ece9e3] bg-white px-3 py-1.5 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.12)]">
                  <button
                    type="button"
                    disabled={!isRunning || cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(runId)}
                    className="inline-flex h-[36px] items-center gap-2 rounded-[10px] border border-[#ff4f4f] px-4 text-[12px] font-medium text-[#ff4f4f] disabled:opacity-50"
                  >
                    <Square size={12} />
                    Cancel Run
                  </button>
                  <button
                    type="button"
                    disabled={!isTerminal || retryMutation.isPending}
                    onClick={() => retryMutation.mutate(runId)}
                    className="inline-flex h-[36px] items-center gap-2 rounded-[10px] border border-[#bdb7b0] px-4 text-[12px] font-medium text-[#6b6b6b] disabled:opacity-50"
                  >
                    <RotateCcw size={12} />
                    Retry
                  </button>
                  <div className="inline-flex items-center gap-2 px-2 text-[12px] text-[#8f8a83]">
                    <span className={`h-[6px] w-[6px] rounded-full ${isSSEActive ? 'bg-green-500' : 'bg-[#2f8cff]'}`} />
                    <span>{isRunning ? 'Running' : runDetail?.status ?? 'Idle'} · {runDetail?.nodesCompleted ?? 0}/{runDetail?.nodesTotal ?? 0} nodes</span>
                    <span className="font-mono text-[11px] text-[#b2aea8]">{runId}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[12px] text-[#c7c1b8]">
                  <button type="button" onClick={handleCopy} className="inline-flex items-center gap-1.5 hover:text-white">
                    <Copy size={12} />
                    Copy
                  </button>
                  <button type="button" onClick={handleDownload} className="inline-flex items-center gap-1.5 hover:text-white">
                    <Download size={12} />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeLogTab === 'artifacts' && (
          <div className="h-full overflow-y-auto rounded-[12px] bg-[#fbfaf9] p-4">
            <ArtifactsTab runId={runId} />
          </div>
        )}

        {activeLogTab === 'cost' && (
          <div className="h-full overflow-y-auto rounded-[12px] bg-[#fbfaf9] p-4">
            <CostTab runDetail={runDetail} />
          </div>
        )}

        {activeLogTab === 'timeline' && (
          <div className="h-full overflow-y-auto rounded-[12px] bg-[#fbfaf9] p-4">
            <TimelineTab runDetail={runDetail} />
          </div>
        )}
      </div>
    </div>
  );
}
