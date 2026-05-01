import type { ComponentType, LazyExoticComponent } from 'react';
import type { RunArtifact } from '@api/runs';
import type { IntentSpec } from '@/types/intent';

// ---------------------------------------------------------------------------
// Renderer types — the contract between the registry and individual renderer
// components. Adapted from doc/concepts/04-RENDERER-REGISTRY.md §"Registry
// shape".
//
// Naming note: the kernel calls the artifact-format field `type` (see
// `RunArtifact.type` in @api/runs); the concept doc calls it `artifact_kind`
// because the word "type" already means "card type" / "intent type" / etc.
// elsewhere. RendererCtx uses `artifact_kind` to keep the matcher language
// unambiguous; the adapter at the call site (ResultsSection) reads the
// kernel's `type` field and feeds it in as `artifact_kind`.
// ---------------------------------------------------------------------------

/**
 * Inputs the registry's `match()` predicate consults to decide whether a
 * renderer is applicable for a given (artifact, card) pair.
 */
export type RendererCtx = {
  /** Artifact format — 'csv' | 'json' | 'png' | 'frd' | 'vtu' | 'gltf' | … */
  artifact_kind: string;
  /** Card's IntentType slug — 'cfd_analysis' | 'fea_static' | 'parameter_sweep' | … */
  intent_type: string;
  /** Optional vertical hint, mostly used for science-vs-engineering disambiguation. */
  vertical?: string;
};

/**
 * Board mode the renderer is mounted under. Phase 9 Plan 09-02 §2F.2 —
 * Release-mode locks the camera to the persisted view_state and skips
 * write-back; Explore allows free interaction with debounced persistence.
 * Study sits between (interaction allowed, persistence allowed).
 *
 * `study` and `release` (lowercase) match the kernel's board-mode strings.
 * If a renderer is mounted outside any Card surface, boardMode is undefined
 * and renderers should treat it as Explore.
 */
export type BoardMode = 'explore' | 'study' | 'release';

/**
 * Props every renderer component receives. Renderers fetch their bytes from
 * `downloadUrl` (presigned MinIO URL) — the kernel does not proxy artifact
 * bytes through gateway routes.
 *
 * Phase 9 Plan 09-02 §2F:
 *   - `boardMode` lets viewers branch between Explore (free) and Release
 *     (camera-locked) presentations.
 *   - `viewState` provides initial camera + scalar range from a prior
 *     session; viewers hydrate from this on mount.
 *   - `onViewStateChange` is the persistence callback invoked from the
 *     viewer's debounced interaction-end handler. Renderers MUST suppress
 *     this when boardMode === 'release'.
 */
export type RendererProps = {
  artifact: RunArtifact;
  downloadUrl: string;
  intent?: IntentSpec;
  boardMode?: BoardMode;
  viewState?: import('@/types/run').RunViewState;
  onViewStateChange?: (viewState: import('@/types/run').RunViewState) => void;
};

/**
 * Stable id for each renderer in the registry. Used by:
 *   - the `renderer_hint` field on a Tool's ATP manifest (Phase 2d kernel work)
 *   - the `rendererId` override on a `ResultsSlot` (forces a specific renderer
 *     even when `pickRenderer()` would pick a different one).
 */
export type RendererId =
  | 'image'
  | 'json-metrics'
  | 'csv-table'
  | 'csv-chart'
  | 'pdf'
  | 'cad-3d'
  | 'vtk-polydata'
  | 'fallback';

/**
 * One entry in the registry table.
 *
 * `match` is a pure predicate: same input → same output. Multiple entries can
 * match the same context; the first match wins (registry order is significant).
 */
export type Renderer = {
  id: RendererId;
  match: (ctx: RendererCtx) => boolean;
  component: LazyExoticComponent<ComponentType<RendererProps>>;
};
