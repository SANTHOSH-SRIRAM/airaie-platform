# 04 — Renderer Registry

> **Purpose:** define how Run outputs become useful UI inside a Card. The mechanism that lets the user "click a tool and see what they want" instead of staring at raw artifacts.
> **Audience:** frontend engineering, tool authors.
> **Read after:** [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md).

---

## The problem

A Tool produces Artifacts. Artifacts are bytes. Bytes are not insight.

Without an in-platform rendering layer, the user does what they did before AirAIE: download the file, open it in the tool's native UI (or a separate post-processor), interpret it there, screenshot, paste into a doc. The platform's value collapses into "centralized run launcher" and the "don't bounce between tools" promise breaks.

The Renderer Registry exists to **render Artifacts inline, in the Card's Results section, in a way appropriate to the Card's intent** — without the user ever leaving AirAIE.

## How it works

The registry is a **frontend table** mapping `(intent_type, artifact_kind)` → React component (lazy-loaded). When a Card's Results section mounts, for each output Artifact:

1. Look up the Tool author's `renderer_hint` from the ATP manifest. If set, use that renderer.
2. Else, walk the registry and pick the first entry whose `match()` predicate returns true for `(intent_type, artifact_kind)`.
3. Else, fall through to `GenericArtifactCard` (download link + metadata).

The registry is **frontend-owned** and **lazy-loaded** — each renderer ships in its own chunk so a Card without 3D doesn't pay for three.js, and a Card without scientific viz doesn't pay for vtk.js.

## Registry shape

```ts
type RendererCtx = {
  artifact_kind: string;     // e.g. 'frd', 'vtu', 'csv', 'gltf', 'json', 'pdf'
  intent_type: string;       // e.g. 'cfd_analysis', 'fea_static', 'parameter_sweep'
  vertical: string;          // e.g. 'engineering', 'science', 'mathematics'
};

type RendererProps = {
  artifact: ArtifactRef;     // metadata: id, name, kind, hash, size
  downloadUrl: string;       // presigned MinIO URL (browser ↔ MinIO direct)
  intent: IntentSpec;        // for context-aware rendering
  viewState?: object;        // persisted camera / slice / scale (Release determinism)
  onViewStateChange?: (s: object) => void;
};

type RendererEntry = {
  id: string;
  match: (ctx: RendererCtx) => boolean;
  component: React.LazyExoticComponent<React.ComponentType<RendererProps>>;
  preview_size_max?: number; // bytes; renderers may demand server-side decimation
};

const registry: RendererEntry[] = [
  // --- 3D geometry (CAD) -------------------------------------------------
  { id: 'cad-3d',
    match: c => ['stl', 'gltf', 'glb', 'obj'].includes(c.artifact_kind),
    component: lazy(() => import('@/renderers/cad/Cad3DViewer')),
    preview_size_max: 500_000_000 },

  // --- Scientific viz (FEA / CFD fields) --------------------------------
  { id: 'fea-frd',
    match: c => c.artifact_kind === 'frd',
    component: lazy(() => import('@/renderers/fea/FrdViewer')) },
  { id: 'cfd-vtu',
    match: c => c.artifact_kind === 'vtu' && c.intent_type.startsWith('cfd_'),
    component: lazy(() => import('@/renderers/cfd/VtuViewer')) },
  { id: 'fea-vtu',
    match: c => c.artifact_kind === 'vtu' && c.intent_type.startsWith('fea_'),
    component: lazy(() => import('@/renderers/fea/VtuViewer')) },

  // --- Charts (intent-specific over raw CSV) ----------------------------
  { id: 'csv-pareto',
    match: c => c.artifact_kind === 'csv' && c.intent_type === 'parameter_sweep',
    component: lazy(() => import('@/renderers/data/ParetoChart')) },
  { id: 'csv-residuals',
    match: c => c.artifact_kind === 'csv' && /residual/.test(c.intent_type),
    component: lazy(() => import('@/renderers/data/ResidualsChart')) },
  { id: 'csv-chart-default',
    match: c => c.artifact_kind === 'csv',
    component: lazy(() => import('@/renderers/data/CsvChart')) },

  // --- Tables -----------------------------------------------------------
  { id: 'csv-table',
    match: c => c.artifact_kind === 'csv',
    component: lazy(() => import('@/renderers/data/CsvTable')) },

  // --- Structured metrics ----------------------------------------------
  { id: 'json-metrics',
    match: c => c.artifact_kind === 'json',
    component: lazy(() => import('@/renderers/data/MetricsCard')) },

  // --- Documents -------------------------------------------------------
  { id: 'image',
    match: c => ['png', 'jpg', 'jpeg', 'svg'].includes(c.artifact_kind),
    component: lazy(() => import('@/renderers/image/ImageViewer')) },
  { id: 'pdf',
    match: c => c.artifact_kind === 'pdf',
    component: lazy(() => import('@/renderers/pdf/PdfViewer')) },

  // --- Always-last fallback --------------------------------------------
  { id: 'fallback',
    match: () => true,
    component: lazy(() => import('@/renderers/GenericArtifactCard')) },
];
```

### Lookup priority

```
1. artifact.renderer_hint        — Tool author's preference, set in the ATP manifest output port
2. exact (intent_type, kind)     — registry entry matching both
3. (intent_type-prefix, kind)    — registry entry matching kind + intent prefix (e.g. 'cfd_*')
4. (kind only)                   — registry entry matching kind alone
5. fallback                      — GenericArtifactCard (download + metadata)
```

The lookup never returns null; the fallback always matches.

## Section layout — how renderers compose

The Results section isn't a vertical list of renderers. It's a **layout** chosen per IntentType. The layout assigns renderers to slots:

```ts
type ResultsLayout = {
  // 12-column grid; each slot picks one Artifact + chooses a renderer.
  slots: ResultsSlot[];
};

type ResultsSlot = {
  span: 1 | 2 | 3 | 4 | 6 | 8 | 12;     // grid columns
  height?: 'auto' | 'compact' | 'expanded';
  match: (a: ArtifactRef) => boolean;    // which artifact fills this slot
  renderer_id?: string;                  // override (else picked by registry)
  fallback_text?: string;                // shown if no artifact matches
};

const resultsLayouts: Record<string, ResultsLayout> = {
  cfd_analysis: {
    slots: [
      { span: 8, height: 'expanded', match: a => a.kind === 'vtu', renderer_id: 'cfd-vtu' },
      { span: 4, match: a => a.name === 'residuals.csv', renderer_id: 'csv-residuals' },
      { span: 4, match: a => a.name === 'metrics.json', renderer_id: 'json-metrics' },
    ],
  },
  fea_static: {
    slots: [
      { span: 8, height: 'expanded', match: a => a.kind === 'frd' },
      { span: 4, match: a => a.name === 'metrics.json' },
    ],
  },
  parameter_sweep: {
    slots: [
      { span: 12, height: 'expanded', match: a => a.name === 'pareto.csv', renderer_id: 'csv-pareto' },
      { span: 12, match: a => a.name === 'samples.csv', renderer_id: 'csv-table' },
    ],
  },
  // ... fallback: stack each output Artifact with pickRenderer() at span:12
};
```

**Two layers of choice:**
1. **Renderer registry** = "for one Artifact + one intent, which renderer."
2. **Section layout** = "for one Card, which renderers in which slots, in what arrangement."

Both are **frontend tables** initially. As the platform matures, both become server-driven (an `intent_types` table column for `results_layout`, a manifest field for `renderer_hint`). Until then, hardcoded is fine — fewer than 20 IntentTypes today.

## Library choices

These were settled in an earlier project (the abandoned card-detail redesign) and remain correct. They are recorded in `CLAUDE.md` and reproduced here for traceability.

| Renderer category | Library                                           | Bundle    | Lazy?       |
|-------------------|---------------------------------------------------|-----------|-------------|
| 3D geometry       | `three.js` + `@react-three/fiber` + `@react-three/drei` | ~500 KB | yes (chunk: `render-3d`) |
| CAD STEP/IGES     | server-side conversion → GLTF                      | n/a       | n/a         |
| Scientific viz    | `vtk.js`                                          | ~2 MB     | yes (chunk: `render-vtk`) |
| Charts            | `recharts` (already shared as `@airaie/charts`)   | shipped   | already chunked |
| Tables (large)    | `@tanstack/react-virtual`                         | shipped   | already shipped |
| CSV parsing       | `papaparse` (streaming)                           | ~7 KB     | yes (per renderer) |
| PDF               | `react-pdf`                                       | ~200 KB   | yes (chunk: `render-pdf`) |
| Image zoom/pan    | `react-zoom-pan-pinch`                            | ~12 KB    | yes (per renderer) |
| DAG               | `@xyflow/react` (already shipped)                 | shipped   | already shipped |
| Diff              | `diff` (text/data comparison in `comparison` Cards)| ~20 KB   | yes (per renderer) |

### Vite manualChunks recommendation

```js
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'render-3d':    ['three', '@react-three/fiber', '@react-three/drei'],
        'render-vtk':   ['vtk.js'],
        'render-pdf':   ['react-pdf'],
        // recharts and @tanstack/react-virtual are already chunked;
        // papaparse, diff, react-zoom-pan-pinch are small enough to inline per renderer
      },
    },
  },
}
```

A Card that doesn't include 3D doesn't ship 3D bytes. A Card with 3D pays once per session (the chunk is cached).

## Data flow — bytes to pixels

```
Tool runs ──► Artifact (bytes in MinIO, content-hashed)
              │
              │  Frontend asks kernel:
              │     GET /v0/artifacts/{id}/download-url
              │  → presigned MinIO URL (5-min expiry)
              ▼
   Card.Results section
              │
              │  pickRenderer(artifact_kind, intent_type, manifest.renderer_hint)
              ▼
   Lazy-loaded renderer component  ◄── streams bytes from MinIO directly
              │                          (browser ↔ MinIO, kernel does not proxy)
              ▼
   <Cad3DViewer> | <FrdViewer> | <ParetoChart> | <MetricsCard> | …
```

Two important properties:
1. **Bytes stream browser ↔ MinIO directly** via the presigned URL. Kernel doesn't proxy; bandwidth and latency are fine.
2. **Each renderer is a lazy chunk.** The first Card that triggers a chunk pays the load; subsequent Cards reuse the cache.

## View state — for Release-mode determinism

A 3D viewer with default camera shows a different image every time you load it (depending on viewport size). For Release-mode reproducibility, two reviewers must see **identical** views.

The renderer accepts `viewState` and emits `onViewStateChange`. The Card persists view state per slot:

```json
// Card.results_view_state JSONB
{
  "slot_0_cad-3d":   { "camera": { "pos": [50,50,50], "target": [0,0,0] }, "background": "#fff" },
  "slot_1_csv-residuals": { "x_log": false, "y_log": true, "y_range": [1e-6, 1] }
}
```

In Release mode, `onViewStateChange` is **read-only** — the viewer is locked to the persisted state. Anyone with the Release Packet permalink sees the same camera, same color scale, same axis range as the QA approver did.

## Streaming — live updates during a Run

A long-running solver should update its residuals chart in real time. The runner emits NDJSON events on its NATS subject; the kernel relays selected event types via WebSocket to subscribers; renderers subscribe to a topic per Run.

```ts
// Inside ResidualsChart renderer
useEffect(() => {
  const ws = subscribeRunStream(runId, ['metric', 'progress']);
  ws.on('metric', evt => append({ iter: evt.iter, residual: evt.value }));
  return () => ws.close();
}, [runId]);
```

Streaming is opt-in per renderer. The base case is "load Artifact at end of Run, render once." Streaming renderers add a subscription on top.

## Comparison — split-view rendering

A `comparison` Card needs side-by-side: Run A vs Run B. The registry exposes a wrapper:

```tsx
<SplitRenderer
  left={{ renderer: 'fea-frd', artifact: artA, viewState: vs }}
  right={{ renderer: 'fea-frd', artifact: artB, viewState: vs }}
  axisLocked
/>
```

`axisLocked` shares the camera (and color scale, and axis ranges) between the two children — pan one, the other pans. Required for visual comparison to mean anything.

## Server-side concerns

The registry is frontend-only. But it implies kernel work:

### CAD format conversion (STEP/IGES → GLTF)

Browsers can't parse STEP. Two approaches:
- **Tool-side (preferred).** A CAD tool's manifest declares two output ports: `geometry.step` (the canonical) and `geometry.gltf` (the renderable). The Card binds the GLTF for render, the STEP for downstream tools that need it.
- **Service-side.** A kernel sidecar (or a separate `geometry_conversion` Tool that runs automatically post-CAD-runs) converts STEP→GLTF and stores as a derived Artifact with lineage.

Recommendation: **tool-side first.** It's cheaper to require GLTF emission from CAD tools (~10 lines of OpenCASCADE) than to maintain a conversion service. Service-side becomes worthwhile when you have non-emitting tools you can't modify.

### Large-field decimation

A 2GB CFD VTU is too big to download. Tools that produce field outputs MUST also emit a decimated preview:

```yaml
# ATP manifest
outputs:
  - name: pressure_field
    kind: vtu
    description: "Full-resolution pressure field"
  - name: pressure_field_preview
    kind: vtu
    description: "Decimated preview (≤ 5 MB) for inline rendering"
    derived_from: pressure_field
    max_size_bytes: 5_000_000
```

The renderer loads `_preview` by default; "Load full" is a button for users who really need it (or for download-and-export workflows). See [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md) §"Format pacts."

### Artifact metadata

Renderers benefit from richer Artifact metadata than just (id, kind, hash, size). At minimum:
- `mime` (detected by kernel on upload).
- `dimensions` (width × height for images, vertex/element counts for meshes).
- `derived_from` (for previews, decimations, conversions).
- `renderer_hint` (carried from the producing Tool's manifest).

Add as kernel work alongside Phase 2 of the rollout.

## Phased rollout

| Phase | Renderers | Cost |
|-------|-----------|------|
| **2a** | image, PDF, JSON metrics, CSV-as-table, CSV-as-chart-default, fallback | ~1 week (frontend only) |
| **2b** | CAD: STL/GLTF/OBJ via `three.js` + R3F + drei | ~1 week, lazy chunk |
| **2c** | Scientific viz: FRD/VTU via `vtk.js` | ~2 weeks, lazy chunk (vtk.js is fiddly) |
| **2d** | Server-side STEP→GLTF (tool-side first; sidecar later if needed) | ~1 sprint |
| **2e** | Streaming runner→renderer; split-view `<SplitRenderer>` | ~1 sprint |
| **2f** | `view_state` persistence; Release-mode lock | small, but governance-load-bearing |

`@airaie/charts` and `@tanstack/react-virtual` are already shipped, so Phase 2a is mostly wiring.

---

## Cross-references

- The Card surface that hosts these renderers → [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md)
- What Tools must emit for renderers to work → [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md)
- Why Release-mode locks `view_state` → [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md)
- Term lookups → [`99-GLOSSARY.md`](./99-GLOSSARY.md)
