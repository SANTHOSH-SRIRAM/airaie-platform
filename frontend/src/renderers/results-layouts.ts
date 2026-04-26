import type { RunArtifact } from '@api/runs';
import type { RendererId } from './types';

// ---------------------------------------------------------------------------
// Per-intent-type Results layouts. See doc/concepts/04-RENDERER-REGISTRY.md
// §"Section layout — how renderers compose".
//
// Two layers of choice:
//   1. Renderer registry (registry.ts) — for one artifact + one intent,
//      which renderer mounts.
//   2. Section layout (this file) — for one Card (one intent), which
//      renderers in which slots, in what arrangement.
//
// Layouts are matched by `intent_type` slug. If no layout exists, the
// Results section falls back to "stack each artifact with pickRenderer()
// at col-span-12".
//
// 12-column grid model. `span` is the number of columns the slot occupies.
// Adjacent slots wrap into rows; the section uses `gap-4` (16px) gutters.
//
// Phase 2a ships 3 layouts (cfd_analysis, fea_static, parameter_sweep).
// Other intent_types fall through to auto-pick mode. The CFD layout
// references `kind === 'vtu'` even though the VTU renderer ships in Phase 2c
// — the slot still mounts, and the GenericArtifactRenderer fallback gives
// the user a download link until the real viewer arrives.
// ---------------------------------------------------------------------------

/** Allowed grid spans (12-column system). */
export type GridSpan = 1 | 2 | 3 | 4 | 6 | 8 | 12;

/** Optional vertical sizing hint for renderers that respect it. */
export type SlotHeight = 'auto' | 'compact' | 'expanded';

export type ResultsSlot = {
  span: GridSpan;
  height?: SlotHeight;
  /** Picks which artifact (if any) fills this slot. */
  match: (a: RunArtifact) => boolean;
  /**
   * Optional override — if set, force this renderer; else fall through to
   * `pickRenderer(artifact, intent)`. Useful when the layout knows better
   * than the heuristic (e.g. residuals.csv → csv-chart even if
   * pickRenderer would pick csv-table for a non-chart-friendly intent).
   */
  rendererId?: RendererId;
  /** Shown when no artifact matches `match()`. */
  fallbackText?: string;
};

export type ResultsLayout = {
  slots: ResultsSlot[];
};

// ---------------------------------------------------------------------------
// Predicate helpers — keep `match` callbacks readable and reusable across
// layouts. `byKind` is case-insensitive to match the kernel's actual
// emission (lowercase) without locking us out if something changes.
// ---------------------------------------------------------------------------

const byKind = (kind: string) => (a: RunArtifact) => a.type?.toLowerCase() === kind.toLowerCase();
const byName = (name: string) => (a: RunArtifact) => a.name === name;

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

export const resultsLayouts: Record<string, ResultsLayout> = {
  cfd_analysis: {
    slots: [
      // Field viewer (top-left, wide). Phase 2c ships the real cfd-vtu
      // renderer; until then fallback gives a download link.
      {
        span: 8,
        height: 'expanded',
        match: byKind('vtu'),
        fallbackText: 'No field artifact (vtu) emitted by this run',
      },
      // Convergence chart (top-right) — residuals.csv with explicit
      // csv-chart override (intent_type cfd_analysis already routes csv to
      // csv-chart, but the override makes the binding explicit).
      {
        span: 4,
        match: byName('residuals.csv'),
        rendererId: 'csv-chart',
        fallbackText: 'No residuals.csv emitted',
      },
      // Metrics card (under the chart).
      {
        span: 4,
        match: byName('metrics.json'),
        rendererId: 'json-metrics',
        fallbackText: 'No metrics.json emitted',
      },
    ],
  },

  fea_static: {
    slots: [
      // Result deck viewer (top-left, wide). Phase 2c ships fea-frd; until
      // then fallback gives a download link.
      {
        span: 8,
        height: 'expanded',
        match: byKind('frd'),
        fallbackText: 'No result deck (frd) emitted by this run',
      },
      // Metrics card (top-right).
      {
        span: 4,
        match: byName('metrics.json'),
        rendererId: 'json-metrics',
        fallbackText: 'No metrics.json emitted',
      },
    ],
  },

  parameter_sweep: {
    slots: [
      // Pareto chart on top — full width so the trade-off curve is readable.
      {
        span: 12,
        height: 'expanded',
        match: byName('pareto.csv'),
        rendererId: 'csv-chart',
        fallbackText: 'No pareto.csv emitted',
      },
      // Samples table below.
      {
        span: 12,
        match: byName('samples.csv'),
        rendererId: 'csv-table',
        fallbackText: 'No samples.csv emitted',
      },
    ],
  },
};

/**
 * Look up a layout by intent_type. Returns null when no layout matches —
 * the caller (ResultsSection) then falls through to auto-pick stacking.
 */
export function getLayoutForIntent(intentType: string | undefined): ResultsLayout | null {
  if (!intentType) return null;
  return resultsLayouts[intentType] ?? null;
}
