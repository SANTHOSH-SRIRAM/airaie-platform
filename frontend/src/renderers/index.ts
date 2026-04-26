// ---------------------------------------------------------------------------
// Renderer Registry — public API.
//
// Importing anything from this module also imports `./registry`, which has
// the side effect of populating the `registry: Renderer[]` array with all
// 5 Phase 2a entries (image, json-metrics, csv-chart, csv-table, fallback).
// Each entry's component is `lazy()`-loaded, so the actual renderer chunks
// only ship when ResultsSection mounts them.
// ---------------------------------------------------------------------------

export { registry, pickRenderer } from './registry';
export type { Renderer, RendererCtx, RendererProps, RendererId } from './types';
export { resultsLayouts, getLayoutForIntent } from './results-layouts';
export type { ResultsLayout, ResultsSlot, GridSpan, SlotHeight } from './results-layouts';
export { default as ResultsSection } from './ResultsSection';
