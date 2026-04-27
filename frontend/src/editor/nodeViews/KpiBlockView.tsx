import { memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Target, CheckCircle2, XCircle, Circle } from 'lucide-react';
import type { CSSProperties } from 'react';
import { formatKpiSummary, evaluateKpi, type KpiResult } from './KpiBlockView.helpers';
import type { KpiBlockNode } from '@/types/cardBlocks';

// ---------------------------------------------------------------------------
// KpiBlockView — Wave 10-03 NodeView for the `kpiBlock` Tiptap node.
//
// Per 10-RESEARCH §"The block schema": KPI's NodeView "fetches: none — props
// are the data". The attrs themselves carry metricKey + operator + threshold;
// measured value is optional and not yet wired (it requires a run-output
// metric lookup that lands when the kernel propagates run metrics into a
// queryable shape — Phase 11+). For Wave 10-03 we render the threshold
// summary + a 'pending' status chip; the pass/fail branches of evaluateKpi
// are tested but not yet reachable from the UI. This keeps the helper
// contract stable for when the measured-value path lands.
// ---------------------------------------------------------------------------

function KpiBlockViewImpl({ node }: NodeViewProps) {
  const attrs = node.attrs as KpiBlockNode['attrs'];
  const summary = formatKpiSummary(attrs);

  // No measurement source wired yet — every KPI is 'pending' for now. When
  // run-output metrics become queryable (post-Wave-10-03), pass the
  // measured value as the 3rd arg and the chip flips to pass/fail.
  const result: KpiResult = evaluateKpi(attrs.operator, attrs.threshold, undefined);

  const wrapperBase = 'my-[8px] rounded-[10px] border border-[#e8e8e8] bg-white p-[12px]';

  // Empty — metricKey not set.
  if (!summary) {
    return (
      <NodeViewWrapper
        data-block-type="kpiBlock"
        className={wrapperBase}
        contentEditable={false}
      >
        <div className="flex items-center gap-[8px] text-[12px] text-[#6b6b6b]">
          <Target size={14} className="text-[#7b1fa2]" aria-hidden="true" />
          <span className="font-semibold">KPI</span>
          <span className="text-[#acacac]">— not yet configured</span>
        </div>
        <div className="text-[11px] text-[#acacac] mt-[4px]">
          Author the IntentSpec acceptance criteria to populate this block.
        </div>
      </NodeViewWrapper>
    );
  }

  // Loaded.
  return (
    <NodeViewWrapper
      data-block-type="kpiBlock"
      className={wrapperBase}
      contentEditable={false}
    >
      <div className="flex items-center gap-[8px]">
        <Target size={14} className="text-[#7b1fa2] shrink-0" aria-hidden="true" />
        <span className="text-[12px] font-semibold text-[#1a1a1a]">KPI</span>
        <span
          className="ml-auto inline-flex items-center gap-[4px] text-[10px] uppercase tracking-wide px-[6px] py-[1px] rounded-[4px]"
          style={chipStyle(result)}
        >
          {chipIcon(result)}
          {chipLabel(result)}
        </span>
      </div>
      <div className="text-[12px] font-mono text-[#1a1a1a] mt-[6px] leading-[1.5]">
        {summary}
      </div>
    </NodeViewWrapper>
  );
}

function chipLabel(r: KpiResult): string {
  return r === 'pass' ? 'pass' : r === 'fail' ? 'fail' : 'pending';
}
function chipStyle(r: KpiResult): CSSProperties {
  if (r === 'pass') return { background: '#e8f5e9', color: '#2e7d32' };
  if (r === 'fail') return { background: '#ffebee', color: '#c62828' };
  return { background: '#f0f0ec', color: '#6b6b6b' };
}
function chipIcon(r: KpiResult) {
  if (r === 'pass') return <CheckCircle2 size={10} aria-hidden="true" />;
  if (r === 'fail') return <XCircle size={10} aria-hidden="true" />;
  return <Circle size={10} aria-hidden="true" />;
}

export const KpiBlockView = memo(KpiBlockViewImpl);
export default KpiBlockView;
