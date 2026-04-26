import { useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useGateEvidence, useGateRequirements } from '@hooks/useGates';
import {
  groupEvidenceByPassFail,
  formatEvidenceSummary,
} from '@utils/evidenceAggregation';
import type { GateEvidence } from '@api/gates';
import type { GateRequirement } from '@/types/gate';

// ---------------------------------------------------------------------------
// GateEvidenceView (D4)
//
// Compact, read-only context block scoped to a single gate. Lists each
// requirement with its evaluation status (passed / failed / pending) and the
// matching evidence rows underneath. Designed for embedding next to the
// D5 gate-action UI; does NOT mutate state.
// ---------------------------------------------------------------------------

interface Props {
  gateId: string;
  /** Compact mode reduces vertical density. */
  compact?: boolean;
}

export default function GateEvidenceView({ gateId, compact }: Props) {
  const reqQ = useGateRequirements(gateId);
  const evQ = useGateEvidence(gateId);

  const requirements = useMemo(
    () => extractList<GateRequirement>(reqQ.data, 'requirements'),
    [reqQ.data],
  );
  const evidence = evQ.data ?? [];
  const summary = useMemo(() => groupEvidenceByPassFail(evidence), [evidence]);

  const isLoading = reqQ.isLoading || evQ.isLoading;
  const error = reqQ.error ?? evQ.error;

  if (isLoading) {
    return (
      <div className="flex items-center gap-[8px] text-[12px] text-[#acacac] py-[16px]">
        <Loader2 size={14} className="animate-spin" />
        Loading gate evidence...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-[8px] py-[16px]">
        <AlertCircle size={14} className="text-[#e74c3c]" />
        <span className="text-[12px] text-[#e74c3c]">Failed to load gate evidence</span>
      </div>
    );
  }

  // Group evidence rows by metric name for matching to metric_threshold reqs.
  const evidenceByMetric = new Map<string, GateEvidence[]>();
  for (const ev of evidence) {
    const list = evidenceByMetric.get(ev.metric_name) ?? [];
    list.push(ev);
    evidenceByMetric.set(ev.metric_name, list);
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Aggregate header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
          Gate Evidence
        </span>
        <span className="text-[11px] text-[#1a1a1a]">{formatEvidenceSummary(summary)}</span>
      </div>

      {requirements.length === 0 && evidence.length === 0 && (
        <div className="text-[12px] text-[#acacac] py-[16px]">
          No requirements have been added to this gate yet.
        </div>
      )}

      {/* Requirements with their evidence */}
      <div className="flex flex-col gap-[8px]">
        {requirements.map((req) => {
          const matched = matchEvidenceForRequirement(req, evidenceByMetric);
          return (
            <RequirementRow
              key={req.id}
              requirement={req}
              evidence={matched}
              compact={compact}
            />
          );
        })}
      </div>

      {/* Orphan evidence (collected but not linked to any requirement) */}
      {evidence.length > 0 && requirements.length === 0 && (
        <OrphanEvidenceList rows={evidence} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RequirementRow({
  requirement,
  evidence,
  compact,
}: {
  requirement: GateRequirement;
  evidence: GateEvidence[];
  compact?: boolean;
}) {
  const status = deriveRequirementStatus(requirement, evidence);
  return (
    <div
      className={
        compact
          ? 'border border-[#e8e8e8] rounded-[6px] px-[10px] py-[8px]'
          : 'border border-[#e8e8e8] rounded-[8px] px-[12px] py-[10px]'
      }
    >
      <div className="flex items-start justify-between gap-[10px]">
        <div className="flex flex-col gap-[2px] min-w-0">
          <span className="text-[11px] font-medium text-[#1a1a1a] truncate">
            {requirement.description}
          </span>
          <span className="text-[9px] text-[#acacac] uppercase tracking-[0.5px]">
            {requirement.req_type}
          </span>
        </div>
        <RequirementStatusBadge status={status} />
      </div>

      {evidence.length > 0 && (
        <div className="mt-[6px] flex flex-col gap-[4px]">
          {evidence.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between gap-[8px] text-[10px] bg-[#fafafa] rounded-[4px] px-[8px] py-[4px]"
            >
              <span className="font-mono text-[#1a1a1a] truncate">
                {ev.metric_name} = {String(ev.metric_value)}
                {ev.unit ? ` ${ev.unit}` : ''}
              </span>
              {ev.threshold !== undefined && ev.threshold !== null && (
                <span className="text-[#6b6b6b]">
                  {ev.operator ?? ''} {String(ev.threshold)}
                </span>
              )}
              {ev.passed === true ? (
                <CheckCircle2 size={10} className="text-[#4caf50] shrink-0" />
              ) : ev.passed === false ? (
                <XCircle size={10} className="text-[#e74c3c] shrink-0" />
              ) : (
                <Clock size={10} className="text-[#ff9800] shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequirementStatusBadge({
  status,
}: {
  status: 'passed' | 'failed' | 'pending';
}) {
  if (status === 'passed') {
    return (
      <span className="inline-flex items-center gap-[3px] text-[#4caf50] text-[9px] font-semibold uppercase shrink-0">
        <CheckCircle2 size={10} /> Pass
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-[3px] text-[#e74c3c] text-[9px] font-semibold uppercase shrink-0">
        <XCircle size={10} /> Fail
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-[3px] text-[#ff9800] text-[9px] font-semibold uppercase shrink-0">
      <Clock size={10} /> Pending
    </span>
  );
}

function OrphanEvidenceList({ rows }: { rows: GateEvidence[] }) {
  return (
    <div className="border border-dashed border-[#e8e8e8] rounded-[8px] px-[12px] py-[10px]">
      <span className="text-[9px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
        Collected metrics
      </span>
      <div className="mt-[6px] flex flex-col gap-[4px]">
        {rows.map((ev) => (
          <div
            key={ev.id}
            className="flex items-center justify-between text-[10px] bg-[#fafafa] rounded-[4px] px-[8px] py-[4px]"
          >
            <span className="font-mono text-[#1a1a1a] truncate">
              {ev.metric_name} = {String(ev.metric_value)}
              {ev.unit ? ` ${ev.unit}` : ''}
            </span>
            {ev.passed === true ? (
              <CheckCircle2 size={10} className="text-[#4caf50] shrink-0" />
            ) : ev.passed === false ? (
              <XCircle size={10} className="text-[#e74c3c] shrink-0" />
            ) : (
              <Clock size={10} className="text-[#ff9800] shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a requirement's evaluation status:
 *   - prefer the backend `satisfied` flag when set
 *   - else infer from matched evidence (failed if any failed; passed if any passed; else pending)
 */
function deriveRequirementStatus(
  req: GateRequirement,
  evidence: GateEvidence[],
): 'passed' | 'failed' | 'pending' {
  if (req.satisfied) return 'passed';
  if (evidence.length === 0) return 'pending';
  if (evidence.some((e) => e.passed === false)) return 'failed';
  if (evidence.every((e) => e.passed === true)) return 'passed';
  return 'pending';
}

/**
 * Match evidence rows to a requirement. For `metric_threshold` requirements
 * we look at `config.metric_key`; other requirement types match by `card_id`
 * via the gate-evidence aggregation that happened upstream.
 */
function matchEvidenceForRequirement(
  req: GateRequirement,
  evidenceByMetric: Map<string, GateEvidence[]>,
): GateEvidence[] {
  const cfg = req.config ?? {};
  const metric = (cfg.metric_key ?? cfg.metric_name) as string | undefined;
  if (metric && evidenceByMetric.has(metric)) {
    return evidenceByMetric.get(metric) ?? [];
  }
  return [];
}

function extractList<T>(raw: unknown, key: string): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>)[key])) {
    return (raw as Record<string, T[]>)[key];
  }
  return [];
}
