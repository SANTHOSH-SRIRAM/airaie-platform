import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wrench, Loader2, CheckCircle, XCircle, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';
import { fetchRunWithNodes, decodeNodeOutputs } from '@api/runs';
import { apiClient } from '@api/client';

interface InlineToolCallCardProps {
  runId: string;
  /** When the dispatched run requires manual approval, this is the
   *  approval-request id from POST /v0/agents/{id}/sessions/{sid}/messages.
   *  Drives the Approve/Reject buttons; absent = no approval needed. */
  approvalId?: string;
}

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'SKIPPED']);

interface ProposalAction {
  tool_ref?: string;
  inputs?: Record<string, unknown>;
  justification?: string;
  scoring?: { final_score?: number; cost_estimate?: number };
}

interface ProposalShape {
  actions?: ProposalAction[];
  estimated_cost?: number;
}

/** Decode a base64-encoded JSON outputs blob from the run record. */
function decodeRunOutputs(b64?: string): { plan?: unknown; proposal?: ProposalShape } | null {
  if (!b64) return null;
  try {
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

export default function InlineToolCallCard({ runId, approvalId }: InlineToolCallCardProps) {
  const qc = useQueryClient();
  const [decision, setDecision] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['run-detail', runId],
    queryFn: () => fetchRunWithNodes(runId),
    enabled: !!runId,
    refetchInterval: (q) => {
      const status = q.state.data?.run?.status;
      return status && TERMINAL.has(status) ? false : 2000;
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => apiClient.post(`/v0/approvals/${approvalId}/approve`, { comment: 'approved via playground' }),
    onSuccess: () => {
      setDecision('approved');
      setDecisionError(null);
      qc.invalidateQueries({ queryKey: ['run-detail', runId] });
    },
    onError: (err: unknown) => setDecisionError((err as { message?: string })?.message ?? 'Approve failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiClient.post(`/v0/approvals/${approvalId}/reject`, { reason: 'rejected via playground' }),
    onSuccess: () => {
      setDecision('rejected');
      setDecisionError(null);
      qc.invalidateQueries({ queryKey: ['run-detail', runId] });
    },
    onError: (err: unknown) => setDecisionError((err as { message?: string })?.message ?? 'Reject failed'),
  });

  const proposalAction = useMemo<ProposalAction | null>(() => {
    if (!data?.run) return null;
    // run.outputs is a base64-encoded JSON blob with { plan, proposal }
    const blob = decodeRunOutputs((data.run as unknown as { outputs?: string }).outputs);
    return blob?.proposal?.actions?.[0] ?? null;
  }, [data]);

  const alternatives = useMemo<ProposalAction[]>(() => {
    if (!data?.run) return [];
    const blob = decodeRunOutputs((data.run as unknown as { outputs?: string }).outputs);
    return (blob?.proposal?.actions ?? []).slice(1, 4);
  }, [data]);

  const node = data?.node_runs?.[0];
  const ports = decodeNodeOutputs(node?.outputs);
  const isTerminal = node?.status ? TERMINAL.has(node.status) : false;
  const isSuccess = node?.status === 'SUCCEEDED';

  if (isLoading) {
    return (
      <div className="rounded-[14px] border border-[#e9d5ff] bg-[#faf5ff] p-3 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#a855f7]" />
        <span className="text-[13px] text-[#6f6a63]">Loading tool call…</span>
      </div>
    );
  }
  if (error || !data) {
    return null;
  }

  const score = proposalAction?.scoring?.final_score ?? 0;
  const cost = proposalAction?.scoring?.cost_estimate ?? 0;
  const toolRef = proposalAction?.tool_ref ?? node?.tool_ref ?? 'unknown';
  const reasoning = proposalAction?.justification ?? '';
  const inputs = proposalAction?.inputs ?? {};

  return (
    <div
      data-testid="inline-tool-call-card"
      className="rounded-[14px] border border-[#e9d5ff] bg-[#faf5ff] shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#ede9fe]">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-[#a855f7]" />
          <span className="text-[13px] font-semibold text-[#6b21a8]">Tool Call Proposal</span>
        </div>
        <span className="inline-flex items-center rounded-[6px] bg-[#dcfce7] px-2 py-0.5 text-[11px] font-semibold text-[#16a34a]">
          {score > 0 ? score.toFixed(2) : '—'}
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* SELECTED TOOL */}
        <Section label="Selected Tool">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
            <span className="font-mono text-[12px] text-[#1f1f1f]">{toolRef}</span>
            <StatusPill status={node?.status} isTerminal={isTerminal} isSuccess={isSuccess} />
          </div>
        </Section>

        {/* REASONING */}
        {reasoning && (
          <Section label="Reasoning">
            <p className="text-[13px] text-[#4f4a43] leading-relaxed">{reasoning}</p>
          </Section>
        )}

        {/* INPUTS */}
        {Object.keys(inputs).length > 0 && (
          <Section label="Inputs">
            <div className="rounded-[8px] bg-white border border-[#ede9fe] px-3 py-2 space-y-1 font-mono text-[12px]">
              {Object.entries(inputs).map(([k, v]) => (
                <div key={k}>
                  <span className="text-[#9b978f]">{k}:</span>{' '}
                  <span className="text-[#1f1f1f]">{formatVal(v)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ESTIMATED COST + DURATION */}
        <Section label="Estimated Cost">
          <div className="flex items-center gap-3 text-[13px] text-[#1f1f1f]">
            <span className="font-medium">${cost.toFixed(4)}</span>
            {node?.duration_ms != null && (
              <span className="inline-flex items-center gap-1 text-[#6f6a63]">
                <Clock className="w-3 h-3" /> {node.duration_ms}ms
              </span>
            )}
          </div>
        </Section>

        {/* ALTERNATIVES */}
        {alternatives.length > 0 && (
          <Section label="Alternatives">
            <ul className="space-y-1">
              {alternatives.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d0cdc8] mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[#4f4a43]">{a.tool_ref}</span>
                    {a.scoring?.final_score != null && (
                      <span className="ml-2 text-[#9b978f]">score: {a.scoring.final_score.toFixed(2)}</span>
                    )}
                    {a.justification && (
                      <span className="ml-2 text-[#9b978f]">— {a.justification.slice(0, 80)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* APPROVE / REJECT (only when an approvalId is attached and the
            user hasn't already decided) */}
        {approvalId && decision === 'pending' && (
          <Section label="Approval Required">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="inline-tool-approve-btn"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#16a34a] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:bg-[#15803d] disabled:opacity-50"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ThumbsUp className="w-3 h-3" />
                )}
                {approveMutation.isPending ? 'Approving…' : 'Approve'}
              </button>
              <button
                type="button"
                data-testid="inline-tool-reject-btn"
                onClick={() => rejectMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#ece9e3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#4f4a43] hover:bg-[#faf9f6] disabled:opacity-50"
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ThumbsDown className="w-3 h-3" />
                )}
                {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
            {decisionError && (
              <p className="mt-2 text-[11px] text-red-500">{decisionError}</p>
            )}
          </Section>
        )}

        {approvalId && decision === 'approved' && (
          <div
            data-testid="inline-tool-approved-banner"
            className="rounded-[8px] bg-[#dcfce7] px-3 py-2 text-[12px] text-[#15803d] flex items-center gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Approved by you — run resumed.
          </div>
        )}

        {approvalId && decision === 'rejected' && (
          <div
            data-testid="inline-tool-rejected-banner"
            className="rounded-[8px] bg-[#fee2e2] px-3 py-2 text-[12px] text-[#991b1b] flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" /> Rejected — run will be marked failed.
          </div>
        )}

        {/* OUTPUTS (after run completes) */}
        {ports.length > 0 && (
          <Section label="Outputs">
            <div className="rounded-[8px] bg-white border border-[#ede9fe] px-3 py-2 space-y-1 font-mono text-[12px]">
              {ports.map((p) => (
                <div key={p.name}>
                  <span className="text-[#9b978f]">{p.name}:</span>{' '}
                  <span className="text-[#1f1f1f]">{formatVal(p.value)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wider text-[#9b978f] uppercase mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function StatusPill({ status, isTerminal, isSuccess }: { status?: string; isTerminal: boolean; isSuccess: boolean }) {
  if (!status) return null;
  if (!isTerminal) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#fef3c7] px-2 py-0.5 text-[10px] font-semibold text-[#d97706]">
        <Loader2 className="w-2.5 h-2.5 animate-spin" /> {status}
      </span>
    );
  }
  if (isSuccess) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#dcfce7] px-2 py-0.5 text-[10px] font-semibold text-[#16a34a]">
        <CheckCircle className="w-2.5 h-2.5" /> {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#fee2e2] px-2 py-0.5 text-[10px] font-semibold text-[#dc2626]">
      <XCircle className="w-2.5 h-2.5" /> {status}
    </span>
  );
}

function formatVal(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

