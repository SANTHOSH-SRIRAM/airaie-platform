import type { KpiBlockNode } from '@/types/cardBlocks';

export type KpiOperator = KpiBlockNode['attrs']['operator'];
export type KpiThreshold = KpiBlockNode['attrs']['threshold'];
export type KpiResult = 'pass' | 'fail' | 'pending';

/**
 * Pure helper — render a one-line KPI summary. Used by KpiBlockView's
 * loaded chrome.
 *
 * Examples:
 *   { metricKey: 'drag_coefficient', operator: 'less_than', threshold: 0.3 }
 *     -> 'drag_coefficient < 0.3'
 *
 *   { metricKey: 'reynolds', operator: 'between', threshold: [1e5, 5e5] }
 *     -> 'reynolds in [100000, 500000]'
 *
 *   { metricKey: '', ... } -> ''   (empty — caller renders empty state)
 */
export function formatKpiSummary(attrs: {
  metricKey: string;
  operator: KpiOperator;
  threshold: KpiThreshold;
}): string {
  if (!attrs.metricKey || attrs.metricKey.trim() === '') return '';
  switch (attrs.operator) {
    case 'less_than':
      return `${attrs.metricKey} < ${formatNumber(attrs.threshold)}`;
    case 'greater_than':
      return `${attrs.metricKey} > ${formatNumber(attrs.threshold)}`;
    case 'eq':
      return `${attrs.metricKey} = ${formatNumber(attrs.threshold)}`;
    case 'between': {
      if (Array.isArray(attrs.threshold) && attrs.threshold.length === 2) {
        const [lo, hi] = attrs.threshold;
        return `${attrs.metricKey} in [${formatNumber(lo)}, ${formatNumber(hi)}]`;
      }
      return `${attrs.metricKey} in [?]`;
    }
  }
}

function formatNumber(n: number | [number, number]): string {
  if (Array.isArray(n)) return `${n[0]}..${n[1]}`;
  return Number.isInteger(n) ? String(n) : n.toString();
}

/**
 * Pure helper — evaluate a KPI's pass/fail status given a measured value
 * (from a completed run) or undefined (no measurement available yet).
 *
 *   evaluateKpi('less_than', 0.3, 0.25) -> 'pass'
 *   evaluateKpi('less_than', 0.3, 0.4)  -> 'fail'
 *   evaluateKpi('less_than', 0.3, undefined) -> 'pending'
 *   evaluateKpi('between', [10, 20], 15) -> 'pass'
 *   evaluateKpi('between', [10, 20], 25) -> 'fail'
 *   evaluateKpi('eq', 5, 5)   -> 'pass'
 *   evaluateKpi('eq', 5, 5.1) -> 'fail'
 *
 * Tested across all 4 operators + the no-measurement case.
 */
export function evaluateKpi(
  operator: KpiOperator,
  threshold: KpiThreshold,
  measured: number | undefined,
): KpiResult {
  if (measured === undefined || !Number.isFinite(measured)) return 'pending';
  switch (operator) {
    case 'less_than':
      return typeof threshold === 'number' && measured < threshold ? 'pass' : 'fail';
    case 'greater_than':
      return typeof threshold === 'number' && measured > threshold ? 'pass' : 'fail';
    case 'eq':
      return typeof threshold === 'number' && measured === threshold ? 'pass' : 'fail';
    case 'between': {
      if (Array.isArray(threshold) && threshold.length === 2) {
        const [lo, hi] = threshold;
        return measured >= lo && measured <= hi ? 'pass' : 'fail';
      }
      return 'pending';
    }
  }
}
