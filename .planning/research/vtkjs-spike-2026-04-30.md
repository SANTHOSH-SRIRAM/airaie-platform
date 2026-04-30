# vtk.js Spike — Inline FRD + VTU Rendering (Phase 11 / Plan B)

**Date:** 2026-04-30
**Status:** spike research only; no code shipped
**Outcome:** GO with `@kitware/vtk.js` for VTU; FRD requires upstream conversion

---

## Problem

The renderer registry (Phase 9) defines `cfd-vtu` and `fea-frd` slots in
`results-layouts.ts`, but neither has a real renderer — both fall through
to `GenericArtifactRenderer` (a download link). FEA / CFD users need the
field/result deck rendered inline so they can read the run without
leaving the Card.

`results-layouts.ts:70` — comment says "Phase 2c ships the real cfd-vtu".
That's this work.

---

## Library pick — `@kitware/vtk.js` v35.11.1

Two npm packages both advertise vtk.js, but they're aliases:

| Package | Latest | Status |
|---|---|---|
| `vtk.js` | 35.11.1 | legacy alias; same code |
| `@kitware/vtk.js` | 35.11.1 | canonical, scoped under the publisher |

**Pick: `@kitware/vtk.js`.** No alternative. The Kitware-maintained ESM
build is the only viable in-browser VTK renderer. ParaView Glance and
ITK-Wasm both depend on it.

Bundled TypeScript definitions (`./index.d.ts`) — no community typings
needed. Deps include `gl-matrix`, `fflate`, `utif`, `xmlbuilder2`,
`webworker-promise`. One concerning transitive: `shelljs` (Node-only,
filesystem APIs) — vendored for build scripts; tree-shake away from the
client bundle.

### Bundle size

- Unpacked: 6.3 MB across 1000 files.
- Anecdotal gzipped slice when only loading specific readers + viewers:
  **~1.5–2 MB**. That's roughly 4× our `render-3d` (three.js) chunk.
- Vite manualChunks isolates this — only ships when a Card actually
  mounts an FRD or VTU artifact. Same pattern as `render-csv` / `render-3d`.

### Bundling risks (history)

vtk.js historically broke ESM-aware bundlers because:
1. Internal CommonJS-style `require()` calls in some modules.
2. Macros for the `vtkClass` decorator that Vite/Rollup couldn't always
   parse without help.
3. Worker scripts referenced by relative path inside the package.

35.x has cleaned much of this up; the official docs ship Vite examples
that work out of the box. **Action:** smoke-test a minimal example as
the FIRST thing in the implementation phase, before writing the
renderer. Budget half a day for bundling debug if it surfaces.

---

## VTU path — straightforward

CFD analysis cards emit `art_xxx.vtu` artifacts (already in the test
fixtures — `ResultsSection.test.tsx:76`). vtk.js ships
`@kitware/vtk.js/IO/XML/XMLPolyDataReader` and
`@kitware/vtk.js/IO/XML/XMLUnstructuredGridReader` — direct loaders for
VTK's XML serialization.

Pipeline inside `<VtuViewer>`:
1. Fetch artifact bytes via `useArtifactDownload` (existing hook).
2. Parse with `XMLUnstructuredGridReader.parseAsArrayBuffer`.
3. Mount in a `vtkRenderWindow` + `vtkOpenGLRenderWindow` inside a
   container `<div>`.
4. Wire camera reset, color-by-array dropdown (auto-detect point/cell
   data arrays), screenshot button.
5. Lazy-load entirely — `React.lazy(() => import('./VtuViewer'))`.

**Estimate:** ~1 dev-day after the Vite chunk is verified.

---

## FRD path — needs upstream conversion

CalculiX writes its native `.frd` format (text, columnar, custom). This
is **not** a VTK format. vtk.js has no `.frd` reader.

Two paths:

### Option A — server-side conversion (recommended)

Add a post-processor step inside the CalculiX ATP tool that converts
`.frd → .vtu` after the solver finishes, and exposes BOTH artifacts.
Tools like `ccx2paraview` (Python) or `cgx -bg <case> -frd2vtu` already
exist. The runner already has Python; bundling `ccx2paraview` into the
calculix image is the cheapest path.

Frontend then renders the `.vtu` companion via `<VtuViewer>` — no new
renderer needed for FRD. The `.frd` artifact stays as a downloadable
"raw result deck".

**Estimate:** ~0.5 dev-day for the runner image change + manifest update
(declare the second output port).

### Option B — pure-JS FRD parser

Write a streaming `.frd` parser in TypeScript, build a
`vtkUnstructuredGrid` in memory, render via vtk.js. Doable but the FRD
spec is non-trivial (load steps, mode shapes, multiple result blocks),
and we'd own the parser forever. Reject unless option A is blocked.

### Decision

**Option A.** Cheaper, reuses VtuViewer, server-side conversion is
where the rest of the lineage lives anyway.

---

## Vite chunk strategy

Add to `vite.config.ts` `manualChunks(id)`:

```ts
if (id.includes('node_modules/@kitware/vtk.js/')) {
  return 'render-vtk';
}
```

Pattern matches the existing `render-csv` / `render-3d` rules. vtk.js
modules have hundreds of subpaths, so the prefix match is the only
sane way.

**Verify after the first build:** `npm run build` should emit a
`render-vtk-<hash>.js` chunk that's only loaded when the Card mounts
the renderer. If the chunk shows up in the main bundle's preload graph,
we have an eager-import bug somewhere.

---

## Skeleton placeholder

Per Phase 11 success criterion 10 — "renderer registry chunks lazy-load
with sized skeleton placeholders". Reserve a 480 × 360 placeholder
(matches `cfd_analysis` layout's primary slot) with a centered spinner
+ "Loading 3D viewer (~2MB)…" caption so users understand the wait on
first mount.

---

## Implementation plan (after this spike)

| # | Task | Estimate |
|---|---|---|
| 1 | Smoke-test `@kitware/vtk.js` ESM in a Vite scratch project. Confirm 35.x bundles cleanly. If not, debug or pin to last-known-good. | 0.5 day |
| 2 | Add `render-vtk` to `vite.config.ts` `manualChunks`. Install `@kitware/vtk.js`. | 0.1 day |
| 3 | Build `<VtuViewer>` — reader, render window, color-by-array dropdown, camera-reset button. Lazy-load. | 1 day |
| 4 | Wire registry entry: `match: byKind('vtu')` → `<VtuViewer>` in `cfd_analysis` layout, and the `parameter_sweep` layout. | 0.2 day |
| 5 | CalculiX ATP image: bundle `ccx2paraview`; manifest gains a second output port `result_vtu` of type `vtu`. Update existing CalculiX example to verify. | 0.5 day |
| 6 | Tests: `VtuViewer.test.tsx` (mocks vtk.js, asserts mount + props), `results-layouts.test.ts` updates for the new `kind:'vtu'` registry entry. | 0.4 day |
| 7 | Acceptance UAT: open a CalculiX FEA card with a real `.frd` (and now `.vtu` companion), confirm displacement field renders inline within 3 s of run completion. | 0.3 day |

**Total: ~3 dev-days incl. spike risk.** Matches the original Plan B
estimate (2-3 days). The CalculiX tool change (#5) is the only kernel-
side work; everything else is frontend.

---

## Open questions for the user

1. **CalculiX image rebuild:** are you OK with bundling `ccx2paraview`
   (Python) into the calculix-beam Docker image, or do you want a
   separate `frd-to-vtu` tool registered as its own ATP step?
2. **Bundle budget:** Phase 7 says "main bundle <500 KB gzipped". The
   `render-vtk` chunk is ~2 MB but ships only when a Card mounts the
   renderer. Confirm that's an acceptable tradeoff — alternative is
   server-side rendering to PNG + `<ImageRenderer>`, which loses
   interactive camera but keeps the bundle tiny.
3. **VTP / poly data:** want me to also wire `XMLPolyDataReader` for
   surface-only artifacts, or VTU-only for now?

These don't gate kicking off the implementation, but will save back-and-
forth mid-build.
