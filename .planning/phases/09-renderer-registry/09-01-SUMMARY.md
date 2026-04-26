---
phase: 09-renderer-registry
plan: 09-01
subsystem: ui
tags: [react, react-query, vite, recharts, papaparse, lazy-loading, renderer-registry, card-page]

# Dependency graph
requires:
  - phase: 08-card-as-page (Wave 1+2)
    provides: /cards/:cardId route, CardStatusPanel.Results subsection,
              useArtifactList + useRunArtifacts hooks, RunArtifact type
  - phase: 04-workflow-runs
    provides: useRunArtifacts (RunArtifact[]), useRunDetail
provides:
  - frontend/src/renderers/ — public package re-exporting registry,
    pickRenderer, getLayoutForIntent, ResultsSection, type definitions
  - 5 lazy-loaded renderer chunks: image, json-metrics, csv-chart,
    csv-table, fallback
  - render-csv Vite manualChunk grouping papaparse (~7 KB gzipped)
  - 3 per-intent layouts: cfd_analysis, fea_static, parameter_sweep
  - getArtifactDownloadUrl(id) API + useArtifactDownloadUrl hook
  - planResults() pure helper for unit-testable dispatch
affects: [renderer-registry-Phase-2b-3D-CAD, renderer-registry-Phase-2c-VTU/FRD,
          tool-author-contract-Phase-2d-renderer-hint-propagation]

# Tech tracking
tech-stack:
  added: [papaparse@^5.5.3, "@types/papaparse@^5.5.2"]
  patterns:
    - "Renderer registry as a frontend table — `(intent_type, artifact_kind)
       → React component (lazy)`. Lookup priority: manifest_hint → exact
       (intent_type, kind) match → kind-only match → always-true fallback.
       Each entry's component is `lazy(() => import(...))` so the renderer
       chunk only ships when ResultsSection mounts the component."
    - "Two-layer composition: registry picks 'for one artifact + one
       intent, which renderer'; layout config (results-layouts.ts) picks
       'for one Card, which renderers in which slots, in what arrangement'.
       Slots can override the registry's pick via slot.rendererId."
    - "Per-slot React Query keys for download URLs — `useArtifactDownloadUrl(id)`
       has staleTime 5min + gcTime 10min. Each slot fetches its own URL via
       the hook; cascade re-renders are prevented because each slot has its
       own React Query cache key (`artifactKeys.downloadUrl(id)`)."
    - "Pure-helper testing for dispatch — `planResults(runArtifacts, intent)`
       returns a `{ kind: 'empty' | 'layout' | 'auto-pick', items: [...] }`
       discriminated union. The component body is a thin dispatcher; the
       load-bearing decision (which slots, which renderers) is unit-tested
       directly. Same env=node pattern Phase 8 established for
       deriveCardRunStage / computeLifecycleStage."
    - "Heuristic-with-escape-hatch in CsvChartRenderer: auto-detect numeric
       columns, build LineChart/ScatterChart, and offer 'Open as table
       instead' toggle so the user can always escape an awkward chart shape.
       Toggle lazy-loads CsvTableRenderer for the same artifact."
    - "Manual chunks for dynamic-imported deps — papaparse is dynamic-imported
       inside CsvTableRenderer / CsvChartRenderer effects, but Vite's
       manualChunks: { 'render-csv': ['papaparse'] } guarantees the bytes
       go to a separate chunk rather than folding back into the main bundle."

key-files:
  created:
    - frontend/src/renderers/types.ts
    - frontend/src/renderers/registry.ts
    - frontend/src/renderers/registry.test.ts
    - frontend/src/renderers/ImageRenderer.tsx
    - frontend/src/renderers/JsonMetricsRenderer.tsx
    - frontend/src/renderers/CsvTableRenderer.tsx
    - frontend/src/renderers/CsvChartRenderer.tsx
    - frontend/src/renderers/GenericArtifactRenderer.tsx
    - frontend/src/renderers/results-layouts.ts
    - frontend/src/renderers/results-layouts.test.ts
    - frontend/src/renderers/ResultsSection.tsx
    - frontend/src/renderers/ResultsSection.test.tsx
    - frontend/src/renderers/index.ts
  modified:
    - frontend/src/components/cards/CardStatusPanel.tsx (replaces bullet list with <ResultsSection>)
    - frontend/src/api/artifacts.ts                     (adds getArtifactDownloadUrl)
    - frontend/src/api/runs.ts                          (adds RunArtifact.metadata field)
    - frontend/src/hooks/useArtifacts.ts                (adds useArtifactDownloadUrl)
    - frontend/vite.config.ts                           (adds render-csv manualChunk)
    - frontend/package.json                             (papaparse + @types/papaparse)
    - frontend/package-lock.json                        (3 packages added)
    - .planning/STATE.md
    - .planning/ROADMAP.md

key-decisions:
  - "RunArtifact (not ArtifactRef) is the canonical artifact type. The plan
     referenced `ArtifactRef` and `runOutputs: ArtifactRef[]`, but no such
     type existed in the codebase — `RunArtifact` from `@api/runs` is what
     `useRunArtifacts(runId)` returns and what CardStatusPanel was already
     consuming. RendererProps and ResultsSectionProps reference RunArtifact
     directly. The renderer registry's RendererCtx still uses
     `artifact_kind` (not `type`) to disambiguate from card_type / intent_type."
  - "Registry registration is inline in registry.ts (not via side-effect
     module loads). The plan's literal expectation was a single `registry:
     Renderer[]` array with all entries enumerated; the alternate
     `registerRenderer()` side-effect pattern would have collided with
     `lazy()` (the lazy-load can't trigger the registration). Inline-array
     pattern keeps the entry list grep-able and avoids the bootstrap
     ordering problem entirely. `registerRenderer()` is exported for tests."
  - "Renderer hint reads from `artifact.metadata.renderer_hint`. The kernel
     does not yet propagate this field (concepts/04 §'Server-side concerns'
     identifies it as Phase 2d kernel work). Frontend reads gracefully:
     missing metadata → null → fall through to predicate walk. Once the
     kernel ships propagation, no frontend change required."
  - "csv-chart MUST be registered BEFORE csv-table. The 4-tier lookup walks
     entries in array order; csv-chart wins for chart-friendly intent_types
     because its predicate cares about intent_type (the
     'kind-only-vs-intent-specific' second-pass detector keeps it from
     accidentally matching everything). Putting csv-table first would make
     it win for all csv since the registry stops at the first match."
  - "Slot.rendererId override beats pickRenderer. The cfd_analysis layout's
     residuals.csv slot specifies rendererId: 'csv-chart' explicitly even
     though pickRenderer would also pick csv-chart for that combination —
     defense-in-depth so the binding stays correct if pickRenderer's
     heuristic ever shifts."
  - "Phase 2c renderers (FRD/VTU) are deferred. The cfd_analysis and
     fea_static layouts include slots for kind === 'vtu' and kind === 'frd'
     so the layout shape is right when those renderers ship; until then the
     fallback renderer mounts in those slots and gives the user a download
     link. Slot fallbackText is explicit so the user understands why the
     placeholder is there."
  - "ResultsSection is split into a pure planner (`planResults`) and a
     thin JSX dispatcher. The planner returns `{ kind: 'empty' | 'layout' |
     'auto-pick', items: [...] }` with pre-resolved (slot, artifact, renderer)
     tuples. This keeps the env=node testable surface large — every
     dispatch decision is observable in the plan structure — and the JSX
     layer becomes a dumb mapper. Same pattern as Phase 8's lifecycle stage
     extraction."

requirements-completed: [REQ-01, REQ-04, NFR-04]

# Metrics
duration: ~21min
tasks-completed: 12/12
commits: 11 (Tasks 1-11) + 1 docs (Task 12)
tests-net-new: 38
tests-total: 289 (passing) + 1 (skipped)
typecheck-default: clean
typecheck-strict: clean
console-info-stubs-in-renderers: 0
renderer-chunks-in-dist: 5 (Image, JsonMetrics, CsvTable, CsvChart, GenericArtifact)
render-csv-chunk-size-kb: 19.37 (gzip 7.14)
main-bundle-delta-kb: ≈0 (no measurable change; renderers all lazy)
completed: 2026-04-26
---

# Phase 09 Plan 09-01: Renderer Registry MVP Summary

**Phase 2a Renderer Registry shipped — 5 renderers, 3 intent layouts, lazy chunks; CardStatusPanel renders inline content per intent.**

## Performance

- **Duration:** ~21 min (executor wall-clock)
- **Started:** 2026-04-26T16:17:30Z
- **Tasks:** 12/12 complete
- **Commits:** 11 atomic feat/build/chore commits + 1 docs commit
- **Files created:** 13 (5 renderer components + 3 supporting modules + 3 test files + 2 type/index files)
- **Files modified:** 8 (CardStatusPanel + artifacts API + runs type + useArtifacts hook + vite config + package files + planning docs)
- **Tests:** 289 passing (38 net-new in this plan, distributed across `registry.test.ts`, `results-layouts.test.ts`, `ResultsSection.test.tsx`)

## Accomplishments

- **The bullet-list-of-artifact-download-links is gone.** CardStatusPanel's Results subsection now mounts `<ResultsSection runArtifacts={...} intent={intent} />` which picks the right renderer per (intent_type, artifact_kind) and mounts it inline. The Evidence column on the right is unchanged.
- **5 renderers ship in 5 separate lazy chunks.** `Image` (1.5 KB), `JsonMetrics` (5.2 KB), `CsvChart` (5.6 KB), `CsvTable` (4.8 KB), `GenericArtifact` (1.9 KB). None of these bytes ship in the main bundle until a Card mounts the renderer.
- **`papaparse` is segregated into the `render-csv` Vite manualChunk** (19.4 KB raw, 7.1 KB gzipped). Both CsvTableRenderer and CsvChartRenderer dynamic-import it inside their effects; the manualChunk declaration ensures Rollup doesn't fold the bytes into the main bundle.
- **3 per-intent layouts** drive the slot composition: `cfd_analysis` (3 slots — vtu field + residuals chart + metrics card), `fea_static` (2 slots — frd deck + metrics card), `parameter_sweep` (2 slots — pareto chart + samples table). Every slot ships a `fallbackText` so empty runs render explanatory placeholders rather than bare grids.
- **All 4 gates clean.** `npx tsc --noEmit` (default + strict tsconfig.app.json) both exit 0; `npx vitest run` 289 passing (38 net-new); `npm run build` exit 0 with verified `dist/assets/render-csv-*.js` chunk presence.
- **Pure-helper test pattern continues** from Phase 8. `planResults(runArtifacts, intent)` returns a discriminated union with pre-resolved (slot, artifact, renderer) tuples; 15 tests cover every dispatch branch without needing to mount JSX. Logic is tested at the unit level; DOM render tests remain infra debt.
- **Cross-cutting hooks added without breakage.** `useArtifactDownloadUrl(id)` joins the existing artifact hooks pattern; CardStatusPanel's existing `useRunArtifacts` consumer flows directly into the new ResultsSection prop.

## Task Commits

Each task committed atomically with `--no-verify`:

| #   | Task                                                                          | Commit    | Type     |
| --- | ----------------------------------------------------------------------------- | --------- | -------- |
| 1   | npm install papaparse + @types/papaparse                                      | `0511c7e` | chore    |
| 2   | types.ts + registry.ts + registry.test.ts (10 tests)                          | `c0becba` | feat     |
| 3   | ImageRenderer + RunArtifact.metadata field + image registry entry             | `0b41372` | feat     |
| 4   | JsonMetricsRenderer (FEA/CFD schema-aware) + json-metrics registry entry      | `4c36cc1` | feat     |
| 5   | CsvTableRenderer (papaparse + sticky table) + csv-table registry entry        | `e9a70a1` | feat     |
| 6   | CsvChartRenderer (papaparse + recharts) + csv-chart entry BEFORE csv-table    | `9fb0ae2` | feat     |
| 7   | GenericArtifactRenderer fallback + always-last registry entry                 | `4392821` | feat     |
| 8   | results-layouts.ts (3 layouts) + results-layouts.test.ts (13 tests)           | `ee8953d` | feat     |
| 9   | ResultsSection + index.ts + getArtifactDownloadUrl + useArtifactDownloadUrl   | `f7a7167` | feat     |
| 10  | CardStatusPanel wires ResultsSection; planResults extracted; 15 dispatch tests | `8ae1e8b` | feat     |
| 11  | vite.config render-csv manualChunk + build verification                       | `d5beb9d` | build    |
| 12  | (this commit) SUMMARY + STATE + ROADMAP                                       | TBD       | docs     |

## Files Created (13)

**Renderer registry core (3):**
- `frontend/src/renderers/types.ts` — RendererCtx / RendererProps / RendererId / Renderer types
- `frontend/src/renderers/registry.ts` — `registry: Renderer[]`, `pickRenderer(artifact, intent)`, internal `_resetRegistry` / `registerRenderer` helpers
- `frontend/src/renderers/index.ts` — public-API re-exports

**Renderer components (5):**
- `frontend/src/renderers/ImageRenderer.tsx` — png/jpg/jpeg/svg/webp/gif `<img>` with caption + onError fallback
- `frontend/src/renderers/JsonMetricsRenderer.tsx` — JSON fetch + schema-aware key-value grid (fea/cfd-metrics-v1)
- `frontend/src/renderers/CsvTableRenderer.tsx` — papaparse + first 100 rows, sticky thead, "Download full CSV" link
- `frontend/src/renderers/CsvChartRenderer.tsx` — papaparse + recharts LineChart/ScatterChart, "Open as table instead" toggle
- `frontend/src/renderers/GenericArtifactRenderer.tsx` — always-last fallback (name + kind pill + size + hash + Download)

**Layout config (1):**
- `frontend/src/renderers/results-layouts.ts` — `resultsLayouts` record, `getLayoutForIntent`

**ResultsSection (1):**
- `frontend/src/renderers/ResultsSection.tsx` — composes registry + layout into the Card's Results surface; exports pure `planResults` helper

**Tests (3):**
- `frontend/src/renderers/registry.test.ts` (10 cases)
- `frontend/src/renderers/results-layouts.test.ts` (13 cases)
- `frontend/src/renderers/ResultsSection.test.tsx` (15 cases)

## Files Modified (8 in-scope, 2 docs)

**Wired up:**
- `frontend/src/components/cards/CardStatusPanel.tsx` — bullet-list block replaced with `<ResultsSection>` mount; unused `Download` icon import removed.

**API/hook extensions:**
- `frontend/src/api/artifacts.ts` — adds `getArtifactDownloadUrl(id)` calling `GET /v0/artifacts/{id}/download-url`
- `frontend/src/api/runs.ts` — adds optional `metadata?: Record<string, unknown>` to `RunArtifact` (carries renderer_hint when kernel ships propagation)
- `frontend/src/hooks/useArtifacts.ts` — adds `useArtifactDownloadUrl(id)` with 5-min staleTime + 10-min gcTime + per-artifact React Query key

**Build:**
- `frontend/vite.config.ts` — adds `'render-csv': ['papaparse']` to manualChunks
- `frontend/package.json` + `frontend/package-lock.json` — papaparse@^5.5.3 + @types/papaparse@^5.5.2

**Planning:**
- `.planning/STATE.md` — Phase 9 Wave 1 completion
- `.planning/ROADMAP.md` — Phase 9 entry added (Renderer Registry)

## Bundle Impact

| Chunk                                | Size (KB) | Gzip (KB) | Lazy?         |
| ------------------------------------ | --------- | --------- | ------------- |
| `index-*.js` (main)                  | 370.3     | 106.1     | —             |
| `render-csv-*.js` (papaparse)        | **19.4**  | **7.1**   | yes           |
| `ImageRenderer-*.js`                 | 1.5       | 0.8       | yes (per use) |
| `JsonMetricsRenderer-*.js`           | 5.2       | 1.9       | yes (per use) |
| `CsvTableRenderer-*.js`              | 4.8       | 2.0       | yes (per use) |
| `CsvChartRenderer-*.js`              | 5.6       | 2.3       | yes (per use) |
| `GenericArtifactRenderer-*.js`       | 1.9       | 0.9       | yes (per use) |

**Main bundle delta:** ≈0 KB. The registry module itself is tiny (~1 KB of metadata + lookup function); renderer code lives in their own chunks. recharts continues to ship in the existing `ui-*.js` chunk (400 KB, unchanged). A Card with no completed run, or a Card whose run produced only one kind of artifact, only loads the chunks it actually needs.

## Decisions Made

(See `key-decisions` in frontmatter for the full list. Highlights:)

1. **`RunArtifact` is the canonical type, not the plan's `ArtifactRef`.** The plan referenced a type that doesn't exist in the codebase. The Wave 2 hook `useRunArtifacts(runId)` returns `RunArtifact[]`; ResultsSection accepts that directly. RendererCtx still uses `artifact_kind` to disambiguate from `card_type` / `intent_type` (the kernel calls the field `type`).
2. **Inline-array registry, not module-load side-effects.** Each registry entry is enumerated in `registry.ts` with `lazy(() => import('./Foo'))`. This matches the plan's literal expectation, keeps the priority order grep-able, and avoids the chicken-and-egg problem where lazy-loading the renderer would prevent its own registration.
3. **`renderer_hint` reads gracefully.** The kernel doesn't yet propagate `metadata.renderer_hint` (concepts/04 §"Server-side concerns" Phase 2d work). Frontend handles missing metadata → falls through to the predicate walk. No coupling to the kernel schema beyond an optional field.
4. **`csv-chart` BEFORE `csv-table` in registry order is critical.** The 4-tier lookup distinguishes intent-aware from kind-only entries by re-running each predicate with intent_type cleared. csv-chart cares about intent_type, csv-table doesn't — so the lookup correctly prefers chart for chart-friendly intents and falls through to table otherwise.
5. **`slot.rendererId` overrides `pickRenderer`.** The layout knows better than the heuristic in some cases (e.g., residuals.csv → csv-chart even when csv-chart wouldn't natively win the predicate walk). The override path is wired in `planResults`.
6. **Phase 2c renderers (FRD/VTU) are deferred but their slots are pre-wired.** The cfd_analysis and fea_static layouts have slots for `kind === 'vtu'` and `kind === 'frd'`; with no Phase 2a renderer for those kinds, the always-true fallback mounts and shows the download link. Layout shape will be correct when Phase 2c lands.
7. **`planResults` extraction lets us unit-test dispatch.** Phase 8's `deriveCardRunStage` / `computeLifecycleStage` set the precedent: extract the load-bearing decision into a pure function, test that, leave the JSX layer as a thin mapper.

## Deviations from Plan

### Type-corrections (path correction band)

**1. [Rule 3 - Path correction] `ArtifactRef` → `RunArtifact`**
- **Found during:** Task 2 (during `read_first` inspection of `frontend/src/types/`)
- **Issue:** Plan said `import type { ArtifactRef } from '@/types/artifact'`. No such file or type exists in the codebase. The artifact shape that flows through ResultsSection (via `useRunArtifacts(runId)`) is `RunArtifact` declared in `frontend/src/api/runs.ts`.
- **Fix:** All renderer types reference `RunArtifact` directly. RendererProps takes `artifact: RunArtifact`. ResultsSectionProps takes `runArtifacts: RunArtifact[]` (not `runOutputs: ArtifactRef[]`).
- **Files modified:** `frontend/src/renderers/types.ts`, `frontend/src/renderers/results-layouts.ts`, `frontend/src/renderers/ResultsSection.tsx`, `frontend/src/renderers/registry.ts`, all renderer .tsx files.
- **Verification:** Both typechecks clean. CardStatusPanel already had `useRunArtifacts` returning `RunArtifact[]`; the new prop ingests it directly.

**2. [Rule 2 - Missing field] RunArtifact had no `metadata` field**
- **Found during:** Task 2 (strict tsc surfaced the missing property)
- **Issue:** `pickRenderer` reads `artifact.metadata.renderer_hint` to honor the Tool author's preference. The existing `RunArtifact` interface had no metadata field, so the read was a type error under strict tsc.
- **Fix:** Added `metadata?: Record<string, unknown>` as an optional field on `RunArtifact` in `frontend/src/api/runs.ts`. Field is undefined in current kernel responses (kernel doesn't yet propagate manifest hints — concepts/04 §"Server-side concerns" Phase 2d work); the renderer reads gracefully.
- **Files modified:** `frontend/src/api/runs.ts`
- **Verification:** Strict tsc clean; pickRenderer's hint read returns null when metadata is missing; predicate walk fires normally.

**3. [Rule 3 - Path correction] Kernel response shape `download_url` not `url`**
- **Found during:** Task 9 (cross-checking kernel handler `airaie-kernel/internal/handler/artifacts.go`)
- **Issue:** Plan said `const res = await api<{ url: string }>(...); return res.url`. Actual kernel response is `{ download_url, expires_at }` in snake_case.
- **Fix:** `getArtifactDownloadUrl` types the response as `DownloadUrlResponse { download_url: string; expires_at: string }` and returns `res.download_url`.
- **Files modified:** `frontend/src/api/artifacts.ts`
- **Verification:** Endpoint signature confirmed in kernel handler line 252-255. No backend change needed.

### Architecture decisions (no scope expansion)

**4. [Architecture] `planResults` pure helper extraction**
- **Reasoning:** vitest env=node + no @testing-library/react. The plan's three test cases (layout-mode renders 3 slots / auto-pick mode renders 2 stacked / empty renders empty) each need DOM. Without a DOM, the test cases would have to either be deleted or refactored. The pure-helper extraction keeps the test cases observable: the plan structure (which slots, which artifacts, which renderers) IS the dispatch decision, so testing the plan structure tests the dispatch.
- **Files modified:** `frontend/src/renderers/ResultsSection.tsx` (extracts `planResults`), `frontend/src/renderers/ResultsSection.test.tsx` (15 tests of the plan).
- **Documented as:** Phase 8 outstanding §"DOM-render tests are still impossible" — same blocker, same pattern.

### Total deviations

3 type-corrections (Rule 3 - Path correction band) + 1 architectural pattern reuse (planResults extraction). No Rule 4 checkpoints (no scope expansion, no kernel changes, no library swaps). No deferral of any in-scope item.

## Backend Gaps Surfaced

- **MinIO presigned URL CORS not yet verified.** Renderers fetch artifact bytes directly from MinIO via the presigned URL; if MinIO's CORS is misconfigured, the browser will block the fetch. This wasn't tested as part of this plan because the Card-as-page surface only renders during a completed run, and a real run with a real artifact wasn't part of the gate. **Action:** smoke-test with a live CalculiX run during the next dev session; if CORS errors surface, configure MinIO `CORS Configuration` for the dev origin (see `airaie-kernel/scripts/dev-start.sh` for the bucket setup).
- **Tool manifests don't yet declare `renderer_hint`.** The ATP spec (concepts/05 §"Recommended A. Renderer hints") supports it; the kernel doesn't yet propagate it into `Artifact.metadata.renderer_hint`. Frontend reads gracefully (missing → null → fall through). Once the kernel ships propagation (concepts/04 §"Server-side concerns" Phase 2d), no frontend change required — manifest hints will be honored automatically.
- **`useRunArtifacts` returns kernel response wholesale.** No data-shape mapper. If the kernel changes the response shape (e.g., adds a `data` envelope key), the renderer would break silently. The hook uses a `Array.isArray(res) ? res : res?.artifacts ?? []` adapter for envelope unwrapping but no schema validation. **Future:** add a Zod schema for RunArtifact when the testing infra task lands.

## Manual Smoke Notes

For each renderer, the artifact shape that triggers it:

| Renderer                    | Triggered by                                                                                | Visual                                          |
| --------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `ImageRenderer`             | `RunArtifact.type ∈ {png, jpg, jpeg, svg, webp, gif}`                                       | Inline `<img>` with caption (name + size)       |
| `JsonMetricsRenderer`       | `RunArtifact.type === 'json'`                                                               | Key-value card grid; FEA/CFD schemas get section headings |
| `CsvChartRenderer`          | `RunArtifact.type === 'csv'` AND `intent_type ∈ {parameter_sweep, cfd_analysis, fea_dynamic, time_series}` | LineChart (or ScatterChart for pareto.csv)      |
| `CsvTableRenderer`          | `RunArtifact.type === 'csv'` and intent isn't chart-friendly                                | Sticky-header table, first 100 rows + download link |
| `GenericArtifactRenderer`   | Anything else (frd, vtu, log, txt, …)                                                       | Card row with name + kind pill + size + hash + Download button |

For each `intent_type` layout, what the user sees on a completed run:

- **`cfd_analysis`** (3 slots, 12-col grid):
  - Slot 1 (col-span-8, expanded height): vtu field — falls through to GenericArtifactRenderer until Phase 2c VTU renderer ships; user sees a download card with "No inline preview for vtu" copy.
  - Slot 2 (col-span-4): residuals.csv — CsvChartRenderer mounts a LineChart of iter vs residual.
  - Slot 3 (col-span-4): metrics.json — JsonMetricsRenderer mounts a CFD-schema card (Aero / Mesh / Convergence).
  - Empty slots (e.g., run produced no residuals.csv): dashed-border placeholder with the slot's `fallbackText`.
- **`fea_static`** (2 slots):
  - Slot 1 (col-span-8, expanded): frd result deck — GenericArtifactRenderer fallback (Phase 2c will ship the FRD viewer).
  - Slot 2 (col-span-4): metrics.json — FEA-schema metrics card.
- **`parameter_sweep`** (2 slots, both col-span-12):
  - Slot 1: pareto.csv — ScatterChart (numeric X axis, numeric Y; cycles through journey palette colors).
  - Slot 2: samples.csv — Sticky-header table with first 100 rows.
- **Other intents** (e.g., `hello_world`, `cfd_quick`, anything not in `resultsLayouts`): auto-pick mode — each artifact stacks at col-span-12, each picks its own renderer via `pickRenderer(artifact, intent)`.

**Empty state:** `runArtifacts.length === 0` → `<p>No artifacts produced.</p>` inline. Same copy as the previous CardStatusPanel implementation.

**DevTools verification (post-merge):**
1. Open Card detail page on a completed run.
2. Network tab: see `Get /v0/artifacts/{id}/download-url` requests fire (one per slot/artifact).
3. Network tab: see chunked .js loads as renderers mount (`render-csv-*.js`, `CsvChartRenderer-*.js`, etc.). No load occurs for renderers a Card doesn't use.
4. View source `dist/index.html` build — main bundle (`index-*.js`) does NOT contain papaparse code; verify by searching minified output for `Papa.parse`.

## Outstanding / Infra Debt

- **DOM-render tests for ResultsSection** — same blocker as Phase 8 (no `@testing-library/react`, env=node). The 3 cases the plan envisioned (layout mode mounts 3 slots / auto-pick mode mounts 2 stacked / empty renders empty state) are covered by `planResults` unit tests at the structural level; once the testing infra task lands, augment with JSX render assertions verifying the actual DOM.
- **`renderer_hint` propagation on the kernel** — the path is wired (`pickRenderer` reads `artifact.metadata.renderer_hint`) but the kernel doesn't yet populate it. Frontend handles missing field gracefully; no work needed until kernel Phase 2d ships.
- **MinIO CORS verification** — see Backend Gaps. Smoke test during next live-run session.
- **Image zoom/pan** — defer to Phase 2b alongside 3D viewers (spec calls for `react-zoom-pan-pinch` ~12 KB lazy chunk).
- **PDF preview** — Phase 2b, `react-pdf` ~200 KB lazy chunk.
- **3D CAD (STL/GLTF/OBJ)** — Phase 2b, three.js + R3F + drei ~500 KB lazy chunk.
- **Scientific viz (FRD/VTU)** — Phase 2c, vtk.js ~2 MB lazy chunk; mocked in Phase 2a layouts via the fallback renderer.
- **Streaming residuals chart during a Run** — Phase 2e (needs SSE/WS subscription pattern; Phase 4 audit identified backend SSE as broken).
- **`<SplitRenderer>` for `comparison` Cards** — Phase 2e.
- **`view_state` persistence + Release-mode lock** — Phase 2f, governance-load-bearing.
- **Smarter chart picker** — current heuristic is "first column = X, rest = Y series". Awkward CSV shapes (e.g., header in column 5) produce ugly charts. The "Open as table instead" toggle is the user's escape hatch. Phase 2b can ship a smarter picker (preferred-X-column registry per intent_type).
- **Virtualized CSV tables** — `@tanstack/react-virtual` is shipped. Current renderer caps at 100 rows + download link; once a real Card has a 10K+ row CSV, virtualize.
- **`@airaie/charts` integration** — recharts is shipped directly; concepts/04 mentions an extracted `@airaie/charts` package. If/when that lands, CsvChartRenderer can swap to it without touching the registry.

## Next Plan Readiness

- **Phase 2a (this plan) closes the inline-rendering gap.** A Card user now sees the right artifact format inline, per the registry's heuristic and the per-intent layout. Eight months of "Canva-style canvas" mental model is now operational at MVP fidelity.
- **Renderer registry is the substrate for Phase 2b–2f.** Each future renderer (3D, PDF, FRD, VTU, etc.) is a new entry in `registry.ts` + a new lazy-loaded component file. Layouts can be extended by adding an `intent_type` key to `resultsLayouts`. No structural change required.
- **Backend follow-ups identified:** `renderer_hint` propagation, MinIO CORS, schema validation for RunArtifact responses. None block Phase 2b; all are on the kernel team's runway.
- **Testing infra debt accumulates.** Phase 8 + Phase 9 both punted DOM tests because env=node + no testing-library. The next post-MVP infra task should wire jsdom + @testing-library/react so future plans can write JSX render tests for the dispatch boundaries (e.g., "Suspense fallback shows skeleton" / "RendererBoundary surfaces error chrome on download URL failure").
- **Smoke verification on a live run is recommended.** This plan's gates are typecheck + vitest + build; manual verification on a real CalculiX/ngspice run is the next session's first task.

---
*Phase: 09-renderer-registry*
*Wave: 1*
*Completed: 2026-04-26*

## Self-Check: PASSED

All claims verified post-write:
- 13 created files all present at `frontend/src/renderers/`.
- 8 modified files (in-scope) all present and reflect the documented changes.
- All 11 task commit hashes present in `git log`: `0511c7e`, `c0becba`, `0b41372`, `4c36cc1`, `e9a70a1`, `9fb0ae2`, `4392821`, `ee8953d`, `f7a7167`, `8ae1e8b`, `d5beb9d`.
- All 4 gates green:
  - `npx tsc --noEmit` (default) exit 0
  - `npx tsc --noEmit -p tsconfig.app.json` (strict) exit 0
  - `npx vitest run` 289 passing + 1 skipped (38 net-new in this plan)
  - `npm run build` exit 0
- Acceptance criteria verified:
  - `frontend/dist/assets/render-csv-DHZrpM8D.js` chunk present (19.4 KB raw, 7.1 KB gzip)
  - `grep -c "console.info" frontend/src/renderers/*.tsx` returns 0 across all 7 files
  - Registry has 5 entries in priority order: image (line 41) → json-metrics (47) → csv-chart (56) → csv-table (63) → fallback (70)
  - `csv-chart` BEFORE `csv-table` in registry array (essential for chart-friendly intent_type wins)
  - `papaparse@^5.5.3` and `@types/papaparse@^5.5.2` in `frontend/package.json`
  - `CardStatusPanel.tsx` mounts `<ResultsSection>` (verified by grep); the bullet-list-of-artifact-download-links pattern is gone (verified by absence of `aria-label="Run artifacts"` and `Download size={10}` in CardStatusPanel).
