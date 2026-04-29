import { lazy } from 'react';
import type { RunArtifact } from '@api/runs';
import type { IntentSpec } from '@/types/intent';
import type { Renderer, RendererCtx } from './types';

// ---------------------------------------------------------------------------
// Renderer registry — frontend table mapping (intent_type, artifact_kind) to
// React components. See doc/concepts/04-RENDERER-REGISTRY.md.
//
// Order in the array matters. The first entry whose `match()` predicate
// returns true for the (artifact_kind, intent_type) pair wins. The `fallback`
// entry MUST be last with `match: () => true`, so `pickRenderer()` always
// finds something.
//
// Phase 2a final priority order (after Tasks 3–7 land):
//   1. image          — png/jpg/jpeg/svg/webp/gif
//   2. json-metrics   — kind === 'json'
//   3. csv-chart      — kind === 'csv' AND chart-friendly intent_type
//   4. csv-table      — kind === 'csv' (kind-only fallback for csv)
//   5. fallback       — always-true (GenericArtifactRenderer)
//
// Each component is loaded via `lazy()` so the chunk only ships when a Card
// actually mounts that renderer. Vite's manualChunks (vite.config.ts) groups
// papaparse into its own chunk; recharts already ships in the `ui` chunk.
//
// Tasks 3–7 each append one entry below. The IIFE-built array means Tasks
// can land their entries individually without colliding on the export shape.
// ---------------------------------------------------------------------------

const IMAGE_KINDS = new Set(['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif']);
const CAD_3D_KINDS = new Set(['stl', 'obj', 'gltf', 'glb']);
const CHART_FRIENDLY_INTENTS = new Set([
  'parameter_sweep',
  'cfd_analysis',
  'fea_dynamic',
  'time_series',
]);

export const registry: Renderer[] = [
  // Task 3 — image renderer (no library)
  {
    id: 'image',
    match: (c) => IMAGE_KINDS.has(c.artifact_kind.toLowerCase()),
    component: lazy(() => import('./ImageRenderer')),
  },
  // Task 4 — JSON metrics renderer (fetch + key-value grid)
  {
    id: 'json-metrics',
    match: (c) => c.artifact_kind.toLowerCase() === 'json',
    component: lazy(() => import('./JsonMetricsRenderer')),
  },
  // Task 6 — CSV-as-chart for chart-friendly intent_types. Position is
  // critical: this MUST come before csv-table so the lookup picks the chart
  // when intent_type is one of the chart-friendly set; csv-table catches
  // every other csv.
  {
    id: 'csv-chart',
    match: (c) =>
      c.artifact_kind.toLowerCase() === 'csv' && CHART_FRIENDLY_INTENTS.has(c.intent_type),
    component: lazy(() => import('./CsvChartRenderer')),
  },
  // Task 5 — CSV-as-table (kind-only fallback for csv).
  {
    id: 'csv-table',
    match: (c) => c.artifact_kind.toLowerCase() === 'csv',
    component: lazy(() => import('./CsvTableRenderer')),
  },
  // Phase 11 Wave C Pass 1 — PDF inline preview via browser's native viewer.
  // Iframe-based (no react-pdf yet) so it stays cheap; tool authors can hint
  // an alternative renderer for richer interactions when needed.
  {
    id: 'pdf',
    match: (c) => c.artifact_kind.toLowerCase() === 'pdf',
    component: lazy(() => import('./PdfRenderer')),
  },
  // Phase 11 Wave C Pass 2 — three.js-based 3D viewer for STL / OBJ / GLTF /
  // GLB. ~700 KB chunk (three core + R3F + drei selective) lives in the
  // `render-3d` Vite chunk; only ships when a Card mounts a 3D artifact.
  {
    id: 'cad-3d',
    match: (c) => CAD_3D_KINDS.has(c.artifact_kind.toLowerCase()),
    component: lazy(() => import('./Cad3DViewer')),
  },
  // Task 7 — always-last fallback (download link + metadata). MUST be last
  // and `match: () => true` so the lookup never returns null.
  {
    id: 'fallback',
    match: () => true,
    component: lazy(() => import('./GenericArtifactRenderer')),
  },
];

/**
 * Pick the right renderer for `(artifact, intent)`. Lookup priority:
 *
 *   1. `artifact.metadata.renderer_hint` (when set by the producing Tool's
 *      ATP manifest) — exact match against `Renderer.id`.
 *   2. exact `(intent_type, artifact_kind)` match — the first registry entry
 *      whose `match()` returns true for the full context AND fails for the
 *      kind-only context (i.e. the predicate cares about intent_type).
 *   3. kind-only match — same walk again, returning the first entry that
 *      matches with intent_type cleared.
 *   4. fallback — registry entries with `match: () => true` (GenericArtifactRenderer
 *      for Phase 2a).
 *
 * Returns the always-last `fallback` entry when nothing else matches; never
 * null in production once the fallback registers (Task 7). Returns null in
 * tests after `_resetRegistry()`.
 */
export function pickRenderer(
  artifact: RunArtifact,
  intent: IntentSpec | undefined,
): Renderer | null {
  const kind = artifact.type;
  const intentType = intent?.intent_type ?? '';
  const vertical = intent?.context?.vertical_slug;

  // 1. Manifest hint
  const hint = readRendererHint(artifact);
  if (hint) {
    const byHint = registry.find((r) => r.id === hint);
    if (byHint) return byHint;
  }

  const fullCtx: RendererCtx = {
    artifact_kind: kind,
    intent_type: intentType,
    vertical,
  };

  // 2. Exact (intent_type, kind) match — entry's predicate must change its
  //    answer when intent_type is cleared (i.e. it cares about the intent).
  for (const entry of registry) {
    if (!entry.match(fullCtx)) continue;
    const kindOnlyCtx: RendererCtx = { artifact_kind: kind, intent_type: '', vertical };
    if (!entry.match(kindOnlyCtx)) {
      return entry;
    }
  }

  // 3. Kind-only / always-true match — first entry whose predicate matches.
  for (const entry of registry) {
    if (entry.match(fullCtx)) return entry;
  }

  // 4. Theoretically unreachable in production (fallback is always-true), but
  //    `_resetRegistry` in tests can leave the array empty.
  return null;
}

/**
 * Read the `renderer_hint` from an artifact's metadata. The Tool author's
 * ATP manifest output port can carry a `renderer_hint: <id>` value; the
 * kernel propagates it into `Artifact.metadata.renderer_hint` (Phase 2d work).
 *
 * Returns the hint string if present and non-empty, else null. Hints are not
 * type-validated against `RendererId` here — `pickRenderer` lookup will fall
 * through if the hint references an unregistered id.
 */
function readRendererHint(artifact: RunArtifact): string | null {
  const meta = artifact.metadata;
  if (!meta) return null;
  const hint = meta.renderer_hint;
  return typeof hint === 'string' && hint.length > 0 ? hint : null;
}

// ---------------------------------------------------------------------------
// Test-only helpers — let `registry.test.ts` reset and patch the array.
// Production code should never call these.
// ---------------------------------------------------------------------------

export function _resetRegistry(): void {
  registry.length = 0;
}

export function registerRenderer(renderer: Renderer): void {
  const existing = registry.findIndex((r) => r.id === renderer.id);
  if (existing >= 0) {
    registry[existing] = renderer;
  } else {
    registry.push(renderer);
  }
}
