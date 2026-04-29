# Phase 11 — Implementation Status & Planning

**As of:** 2026-04-29
**Lead:** AirAIE platform team
**Status:** Wave A/B/C/D substantially shipped; three discrete follow-ups planned.

> Companion doc to [`README.md`](./README.md) (scope) and [`STITCH-DESIGNS.md`](./STITCH-DESIGNS.md) (Figma/Stitch designs).
> This file is the live status — what's done, what's deferred, and what the team should pick up next.

---

## TL;DR

The Card detail page is feature-complete for `card_type='analysis'`. The Tiptap canvas was deleted; a static `CardPhase11Page` reads the same React Query hooks and composes 5 stages (Intent · Inputs · Method · Run · Read) using shared primitives. Every stage is interactive — pin inputs, generate plans, run, sign off gates, add manual evidence, inspect tools, ask the agent for help, watch runs stream live.

What's left is heavier infrastructure (vtk.js spike, sweep card type, schema-driven param form), not foundational UX.

---

## What shipped — by wave

### Architectural pivot (foundation)

The Tiptap-based `CardCanvasPage` was removed in favour of a static page composing 5 stages from data hooks directly. Net **−4 032 lines** of editor scaffolding deleted.

| Commit | Description |
|---|---|
| `634c306` | Replace Tiptap canvas with static `CardPhase11Page` |
| `ef061e2` | Delete Tiptap canvas + 11 NodeViews + extension bundle |
| `a353f7f` | Polish initial UI rough edges |
| `f9a12f8` | Commit Phase 11 stage primitives |

**Files now:**
- `frontend/src/pages/CardPhase11Page.tsx` — entry; renders the 5 stages
- `frontend/src/components/cards/primitives/` — `StagePanel`, `NumberCircle`, `StatusBadge`, `KpiRow`, `ToolChainCard`, `EvidenceRow`, `GateBadge`
- `frontend/src/components/cards/ArtifactPickerDrawer.tsx`
- `frontend/src/components/cards/CardChatDrawer.tsx`
- `frontend/src/components/cards/ToolManifestDrawer.tsx`
- `frontend/src/renderers/` — registry + 6 light renderers + `Cad3DViewer`

### Wave A — Foundation ✓ complete

| Item | Commit | Notes |
|---|---|---|
| 5-stage layout (real data, no Tiptap) | `634c306` | static composition reading hooks |
| Drag-drop input palette (click-to-pick) | `93c09c6` | right-rail `<ArtifactPickerDrawer>`, fuzzy search, kind filter |
| Run history list | `1255714` | newest-first, capped at 10, click → `/workflow-runs/<runId>` trace |

### Wave B — Method ✓ partial (interactive surface complete)

| Item | Commit | Notes |
|---|---|---|
| Switch pipeline dropdown | `c72e966` | reads `useIntentTypePipelines`, picker is the same orange-pill pattern |
| Generate Plan / Regenerate | `c72e966` | `useGeneratePlan.mutateAsync({ pipeline_id })` |
| Inspect compiled DAG link | `c72e966` | navigates to `/workflow-runs/<latestRunId>` trace |
| Tool-chip manifest preview | `babff4e` | clickable tool pills → right-rail `<ToolManifestDrawer>` showing inputs, outputs, limits, runtime stats |

### Wave C — Read ✓ partial (governance + light/3D renderers complete)

| Item | Commit | Notes |
|---|---|---|
| Gate sign-off (Approve / Reject) | `5a9866d` | inline rationale form, `useApproveGate` / `useRejectGate` |
| Manual Add Evidence form | `19171f1` | KPI-prefilled dropdown, mode-gated by `rules.canAddManualEvidence` |
| Renderer Registry wired | `ea99ae1` | `<ResultsSection>` mounted in Stage 5; PDF renderer added |
| 3D CAD viewer (STL/OBJ/GLTF/GLB) | `34db361` | three.js + R3F + drei, `render-3d` lazy chunk (~700 KB) |
| Live NodeRun progress (SSE) | `a88b3ae` | `useRunSSE`, "● Live · streaming events" pill, query invalidation per event |

### Wave D — Agent ✓ partial (chat + stage-scoped prompts complete)

| Item | Commit | Notes |
|---|---|---|
| Persistent Card-aware chat drawer | `43f59f4` | bottom-pinned 480px, `useAgentList` + lazy `useCreateSession`, `localStorage` session persistence |
| Diagnose-failure prompt | `fa37ba0` | structured prompt seeded into chat composer when latest run failed |
| Stage-scoped agent buttons (5) | `ff01cc6` | Refine Intent · Suggest Pin · Use Agent · Diagnose · Compare Siblings — all open chat with prompt seed |

---

## What's deferred — and why

Three items are deferred, each with a clear blocker that prevents shipping under `/effort medium`:

### 1. Sweep parameter branching (Wave D)

**What:** "Branch into a sweep" CTA on `analysis` cards → opens a small form (pick parameter from `plan.nodes[].parameters`, set range/values, sample count) → creates a new card with `card_type='sweep'` linked to the parent via `card_dependencies`. Sweep card renders a parametric sample table in Stage 5 instead of a single result.

**Why deferred:** Substantial new feature touching backend (`card_type='sweep'` is `🟠 minimal` per `CARD_LIFECYCLE.md §1`), three new components (BranchSweepDrawer, ParameterRangeInput, SweepSampleTable), and a new route flow. Estimated 1 full day; doesn't fit the end of a session that already shipped 16 commits.

**Acceptance criterion:** "Branch into a sweep with one click + one form" per `README.md`.

### 2. vtk.js for FRD/VTU artifacts (Wave C)

**What:** Inline scientific viz for FEA result decks (`.frd`) and CFD field outputs (`.vtu`) using vtk.js, mirroring the `Cad3DViewer` pattern but in a `render-vtk` lazy chunk.

**Why deferred:** Per project memory, *"vtk.js TypeScript support is poor — needs a dedicated spike."* The library is ~2 MB, has fragile typings, and needs careful integration testing across browsers. Not a half-day item.

**Workaround for tool authors today:** ATP author contract recommends emitting a decimated PNG slice or a GLTF companion alongside the raw VTU/FRD. Until vtk.js lands, those auto-pick up via existing `image` and `cad-3d` renderers; raw VTU/FRD falls through to `GenericArtifactRenderer` (download link).

### 3. Comparison Card type + edit-parameters form (Wave B)

**What:**
- **Comparison drawer** — split-view rendering for `card_type='comparison'` (Run A vs Run B with axis-locked viewers per `concepts/04-RENDERER-REGISTRY.md` §"Comparison").
- **Edit parameters** — schema-driven form per node so users can tweak tool parameters without re-generating the plan from scratch.

**Why deferred:**
- Comparison drawer needs `card_type='comparison'` plumbed through; today it's `🟠 minimal` per `CARD_LIFECYCLE.md §1`.
- Edit parameters needs a generic JSON-schema-driven form renderer (read `tool.contract.config_template`, render typed fields). Substantial generic-form-builder work.

Each is ~2 days minimum.

---

## Planning — what to pick up next

Three discrete bodies of work, each shippable independently:

### Plan A — Sweep parameter branching (recommended next)

**Why first:** It closes the last user-facing acceptance criterion in the Phase 11 README. The other two deferrals (vtk.js, comparison card type) need spikes / scope adjustments first; sweep branching has a clear path.

**Tasks (rough breakdown):**

1. **Backend (kernel):** verify `POST /v0/cards` accepts `card_type='sweep'` with a `sweep_config` body (`{ param_path, values: [], parent_run_id? }`). Today the schema accepts the field but no executor consumes it. Add the parametric sample expansion in `RunService.StartRun` so each sample triggers a sub-run.
2. **Frontend `<BranchSweepDrawer>`:** right-rail drawer reading the parent card's `plan.nodes[].parameters`. User picks one parameter path, enters range (start/stop/step) or explicit values, names the sweep.
3. **Frontend mutation:** `useCreateCard(boardId).mutateAsync({ card_type: 'sweep', parent_card_id, sweep_config })` then navigate to the new card.
4. **Sweep card Stage 5:** reads `sweep_runs` (one per sample), renders a sample table with KPI columns. Shared `EvidenceRow` doesn't fit — new `SweepSampleRow` primitive.
5. **Acceptance test:** "Branch a Cd-vs-α sweep from a single CFD card in < 60s, see the sample table populate as runs complete."

**Estimated:** 1.5 days frontend + 1 day backend.

### Plan B — vtk.js spike (Wave C closure)

**Why this matters:** FEA/CFD users currently drop to download links for their result decks. The full Renderer Registry promise per `concepts/04-RENDERER-REGISTRY.md` isn't met without it.

**Tasks:**

1. **Spike (1 day):** evaluate vtk.js TypeScript story; pick between the official `vtk.js` package vs the community `@kitware/vtk.js` typings; smoke-test FRD + VTU loading via `vtkXMLPolyDataReader` etc. Document the chosen path in `airaie_platform/.planning/research/`.
2. **`render-vtk` Vite chunk** — add to `vite.config.ts` `manualChunks`. Confirm lazy-loading actually works (vtk.js historically has issues with module bundling).
3. **`<FrdViewer>`** — based on the spike's findings.
4. **`<VtuViewer>`** — same.
5. **Per-intent layout updates** — `cfd_analysis` layout in `results-layouts.ts` already references `cfd-vtu` slot id; populate the registry entry.
6. **Acceptance test:** "Open an FEA card with .frd output, see the displacement field rendered inline within 3s of run completion."

**Estimated:** 2-3 days (the spike phase is what makes this open-ended).

### Plan C — Wave B closure (comparison + edit-parameters)

**Why later:** Both depend on infrastructure outside Phase 11 scope. Best done after Sweep + vtk.js, when the feature surface stops moving.

**Sub-plan C1 — Comparison Card UX:**

1. Backend: confirm `card_type='comparison'` accepts `comparison_config: { card_ids: [...] }`. Likely already accepts; verify.
2. New `<ComparisonCardPage>` (or extend `CardPhase11Page` to branch on type) — Stage 5 renders side-by-side `<SplitRenderer>` from `concepts/04-RENDERER-REGISTRY.md` §"Comparison".
3. `<SplitRenderer>` primitive — wraps two same-type renderers with `axisLocked` prop sharing camera / scale / range state.
4. Acceptance: "Compare two FEA cards with axis-locked von-Mises viewers, scrub one, the other tracks."

**Sub-plan C2 — Edit Parameters form:**

1. Generic schema-driven form generator — reads `tool.contract.config_template` (JSON Schema-ish), renders typed inputs, validates client-side.
2. Integrate into Method stage: each tool pill becomes editable in-place when card is in `Explore` mode (per `useCardModeRules.canChangePipeline`).
3. Wire to `editPlan(cardId, [{ node_id, parameters: {...} }])` mutation.
4. Acceptance: "Change OpenFOAM `endTime` from 100 to 500 without regenerating the plan; tool pill shows edited indicator."

**Estimated:** 1 day each sub-plan, after the bigger items land.

---

## Operational notes

### Verification baseline (post-Phase-11)

| Gate | Command | Current |
|---|---|---|
| Default tsc | `npx tsc --noEmit` | clean |
| Strict tsc | `npx tsc --noEmit -p tsconfig.app.json` | clean |
| Unit tests | `npx vitest run` | 315 passed · 1 skipped · 28 files |

Baseline dropped from the pre-Phase-11 407 → 315 because deleting the 11 Tiptap NodeViews removed ~92 helper-test files. No new tests were displaced.

### Bundle accounting

| Chunk | Source | Size | Lazy? |
|---|---|---|---|
| `editor` | Tiptap + ProseMirror | unchanged (still used by `BoardCanvasPage`) | yes |
| `render-csv` | papaparse | small | yes |
| `render-3d` | three + @react-three/fiber + drei | ~700 KB | yes (Cad3DViewer is `lazy()`) |
| `render-vtk` | vtk.js | not built yet | yes (planned) |
| `ui` | recharts + lucide-react | shipped | shared |

A card without 3D / charts / PDF / editor gets the smallest possible bundle.

### Known small gotchas

- **Pre-existing latent strict-typecheck issue in `ToolsPage.tsx`** surfaced after the `@react-three/*` install. Fixed in `34db361` by typing `Record<string, LucideIcon>` explicitly.
- **vtk.js typing** — flagged for the spike phase, see Plan B.
- **`tool_id` resolution** — the kernel returns plan node `tool_id` values like `openfoam.template`. `<ToolManifestDrawer>` calls `GET /v0/tools/{id}` directly with that string. If the kernel ever moves to UUIDs internally and exposes only slugs in plans, the drawer needs a slug-to-id resolver.

---

## Cross-references

- Scope: [`README.md`](./README.md)
- Designs: [`STITCH-DESIGNS.md`](./STITCH-DESIGNS.md)
- Concept: [`../../doc/concepts/07-CARD-UI-FLOW.md`](../../doc/concepts/07-CARD-UI-FLOW.md), [`../../doc/concepts/08-CARD-USER-FLOWS.md`](../../doc/concepts/08-CARD-USER-FLOWS.md)
- Implementation reference: [`../../doc/CARD_LIFECYCLE.md`](../../doc/CARD_LIFECYCLE.md)
- Renderer Registry: [`../../doc/concepts/04-RENDERER-REGISTRY.md`](../../doc/concepts/04-RENDERER-REGISTRY.md)
- Tool author contract: [`../../doc/concepts/05-TOOL-AUTHOR-CONTRACT.md`](../../doc/concepts/05-TOOL-AUTHOR-CONTRACT.md)

---

## Commit log (this milestone)

```
a88b3ae feat(card): live NodeRun progress via SSE in Stage 4 (Wave C)
34db361 feat(card): three.js Cad3DViewer for STL/OBJ/GLTF/GLB (Wave C Pass 2)
ea99ae1 feat(card): wire Renderer Registry into Stage 5 Results (Wave C Pass 1)
babff4e feat(card): tool-chip manifest preview drawer (Wave B §4.7)
ff01cc6 feat(card): stage-scoped agent buttons via chat-prompt seeding (Wave D)
fa37ba0 feat(card): diagnose-failure prompt opens chat with structured draft
43f59f4 feat(card): persistent Card-aware chat drawer (Wave D start)
19171f1 feat(card): manual Add Evidence form in Stage 5 (closes Wave C)
5a9866d feat(card): gate sign-off in Stage 5 (Wave C — Approve / Reject)
c72e966 feat(card): pipeline picker + Generate Plan + Inspect DAG (Wave B start)
1255714 feat(card): run history list + step-name polish in Stage 4
93c09c6 feat(card): drag-drop input pinning via ArtifactPickerDrawer (Stage 2)
f9a12f8 feat(card): commit Phase 11 stage primitives that CardPhase11Page imports
a353f7f fix(card): polish Phase 11 UI rough edges
ef061e2 chore(card): delete Tiptap canvas + 11 NodeViews + extension bundle
634c306 feat(card): replace Tiptap canvas with static CardPhase11Page
```
