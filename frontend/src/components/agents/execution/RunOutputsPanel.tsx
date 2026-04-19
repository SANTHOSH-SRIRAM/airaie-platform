import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { fetchRunWithNodes, decodeNodeOutputs, type RawNodeRun } from '@api/runs';

interface RunOutputsPanelProps {
  runId: string;
}

const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'SKIPPED']);

export default function RunOutputsPanel({ runId }: RunOutputsPanelProps) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['run-detail', runId],
    queryFn: () => fetchRunWithNodes(runId),
    enabled: !!runId,
    refetchInterval: (q) => {
      const status = q.state.data?.run?.status;
      return status && TERMINAL_STATUSES.has(status) ? false : 2000;
    },
  });

  if (isLoading) {
    return (
      <div data-testid="run-outputs-panel" className="border border-card-border rounded-lg bg-card-bg p-4 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-cds-text-secondary" />
        <span className="text-sm text-cds-text-secondary">Loading run details…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="run-outputs-panel" className="border border-red-50/40 rounded-lg bg-red-20/40 p-4 text-sm text-red-80">
        Failed to load run: {(error as { message?: string })?.message ?? 'unknown error'}
      </div>
    );
  }

  if (!data) return null;

  const nodes = data.node_runs ?? [];

  return (
    <div data-testid="run-outputs-panel" className="border border-card-border rounded-lg bg-card-bg shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-border-inner">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-cds-text-primary">Tool Outputs</span>
          <RunStatusBadge status={data.run.status} />
        </div>
        <span className="font-mono text-[10px] text-cds-text-placeholder">{runId}</span>
      </div>

      {/* Node list */}
      <div className="p-3 space-y-3">
        {nodes.length === 0 && (
          <p className="text-xs text-cds-text-secondary">No tool nodes executed yet.</p>
        )}
        {nodes.map((node) => (
          <NodeOutputCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const styles =
    status === 'SUCCEEDED' ? 'bg-green-20 text-green-80' :
    status === 'FAILED' || status === 'CANCELED' ? 'bg-red-20 text-red-80' :
    'bg-yellow-20 text-yellow-80';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase ${styles}`}>
      {status}
    </span>
  );
}

function NodeOutputCard({ node }: { node: RawNodeRun }) {
  const ports = decodeNodeOutputs(node.outputs);
  const isTerminal = TERMINAL_STATUSES.has(node.status);
  const isSuccess = node.status === 'SUCCEEDED';

  return (
    <div
      data-testid="node-output-card"
      className="border border-cds-border-subtle rounded bg-cds-layer-01 p-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {!isTerminal ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cds-text-secondary shrink-0" />
          ) : isSuccess ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-50 shrink-0" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-red-50 shrink-0" />
          )}
          <span className="text-xs font-mono text-cds-text-primary truncate">
            {node.tool_ref}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-cds-text-placeholder shrink-0">
          {node.duration_ms != null && (
            <>
              <Clock className="w-3 h-3" />
              {node.duration_ms}ms
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {node.error_message && (
        <p className="text-xs text-red-60 bg-red-20/40 rounded px-2 py-1.5 mb-2 font-mono break-all">
          {node.error_message}
        </p>
      )}

      {/* Outputs */}
      {ports.length > 0 ? (
        <dl className="space-y-1.5">
          {ports.map((p) => (
            <div key={p.name} className="grid grid-cols-[110px_1fr] gap-2 items-start text-xs">
              <dt className="text-cds-text-secondary truncate font-mono">{p.name}</dt>
              <dd className="text-cds-text-primary font-mono break-all">
                {formatValue(p.value)}
                {p.artifact_id && (
                  <span className="text-[10px] text-cds-text-placeholder ml-2">
                    artifact: {p.artifact_id}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : isTerminal ? (
        <p className="text-[11px] text-cds-text-placeholder italic">
          No outputs returned.
        </p>
      ) : (
        <p className="text-[11px] text-cds-text-placeholder italic">
          Waiting for results…
        </p>
      )}

      {node.exit_code != null && (
        <p className="text-[10px] text-cds-text-placeholder mt-2 font-mono">
          exit_code: {node.exit_code}
        </p>
      )}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
