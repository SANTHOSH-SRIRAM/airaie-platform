import type { RunArtifact } from '@api/runs';
import type { IntentSpec } from '@/types/intent';
import type { Renderer, RendererCtx } from './types';

// ---------------------------------------------------------------------------
// Renderer registry — frontend table mapping (intent_type, artifact_kind) to
// React components. See doc/concepts/04-RENDERER-REGISTRY.md.
//
// Entries are appended by their owning module via `registerRenderer()` calls
// at module load. Order matters: the first entry whose `match()` predicate
// returns true wins. The `fallback` entry MUST be the last entry, with
// `match: () => true`, so `pickRenderer()` always finds something.
//
// Tasks 3–7 (image, json-metrics, csv-chart, csv-table, fallback) each
// register their entry from their own module. The registry array starts
// empty here — the lookup function still works (returns null if nothing
// matches).
// ---------------------------------------------------------------------------

export const registry: Renderer[] = [];

/**
 * Append a renderer to the registry. Idempotent on `id` (re-registering an
 * existing id replaces the entry in place — useful for tests that swap a
 * renderer for a stub).
 */
export function registerRenderer(renderer: Renderer): void {
  const existing = registry.findIndex((r) => r.id === renderer.id);
  if (existing >= 0) {
    registry[existing] = renderer;
  } else {
    registry.push(renderer);
  }
}

/**
 * For tests only — empty the registry between cases. Production code should
 * never call this.
 */
export function _resetRegistry(): void {
  registry.length = 0;
}

/**
 * Pick the right renderer for `(artifact, intent)`. Lookup priority:
 *
 *   1. `artifact.metadata.renderer_hint` (when set by the producing Tool's
 *      ATP manifest) — exact match against `Renderer.id`.
 *   2. exact `(intent_type, artifact_kind)` match — the first registry entry
 *      whose `match()` returns true for the full context wins.
 *   3. kind-only match — same walk, but with `intent_type: ''` so renderers
 *      that match purely on `artifact_kind` (e.g. `image`) still win.
 *   4. fallback — registry entries with `match: () => true` (the GenericArtifactRenderer
 *      lands here in Task 7).
 *
 * Returns `null` if no entry matches AND no fallback is registered (only
 * possible during development before Task 7 lands; in production the
 * fallback entry guarantees a non-null return).
 */
export function pickRenderer(
  artifact: RunArtifact,
  intent: IntentSpec | undefined,
): Renderer | null {
  const kind = artifact.type;
  const intentType = intent?.intent_type ?? '';
  const vertical = intent?.context?.vertical_slug;

  // 1. Manifest hint — if the kernel has propagated a renderer_hint into the
  //    artifact's metadata, honor it directly. The Tool author knows their
  //    output kind better than a heuristic.
  const hint = readRendererHint(artifact);
  if (hint) {
    const byHint = registry.find((r) => r.id === hint);
    if (byHint) return byHint;
    // Hint set but no matching renderer — fall through to predicate walk
    // rather than failing; the tool author may have hinted at a future
    // renderer not yet shipped.
  }

  const fullCtx: RendererCtx = {
    artifact_kind: kind,
    intent_type: intentType,
    vertical,
  };

  // 2. Exact (intent_type, kind) match — walk the registry in order, return
  //    the first non-fallback entry whose predicate matches the full context.
  //    "Non-fallback" means the entry actually inspects intent_type or kind;
  //    we detect this by matching with intent_type cleared and seeing if the
  //    predicate still matches. If yes, the entry doesn't depend on intent_type
  //    (it's a kind-only entry); we want exact-intent entries to win first.
  for (const entry of registry) {
    if (!entry.match(fullCtx)) continue;
    const kindOnlyCtx: RendererCtx = { artifact_kind: kind, intent_type: '', vertical };
    const isKindOnly = entry.match(kindOnlyCtx);
    if (!isKindOnly) {
      // Entry's predicate cares about intent_type — this is the exact match.
      return entry;
    }
  }

  // 3. Kind-only match — walk again, return the first entry that matches with
  //    intent_type cleared. This catches `image`, `csv-table`, `json-metrics`
  //    and similar entries that don't filter on intent_type.
  for (const entry of registry) {
    if (entry.match(fullCtx)) return entry;
  }

  // 4. No match. (Fallback registers `match: () => true`, so this branch is
  //    only reachable before Task 7 lands.)
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
  // RunArtifact doesn't yet declare a metadata field; use a structural
  // narrowing read to avoid coupling to a future schema. The hint flows from
  // (Tool manifest output port).renderer_hint → kernel → artifact metadata.
  const meta = (artifact as { metadata?: Record<string, unknown> }).metadata;
  if (!meta) return null;
  const hint = meta.renderer_hint;
  return typeof hint === 'string' && hint.length > 0 ? hint : null;
}
