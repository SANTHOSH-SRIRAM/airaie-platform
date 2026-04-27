---
phase: 10
plan: 10-06
title: Mode-rule per-block locks + perf pass + 3-way merge UI on save conflict
wave: 6
depends_on: [10-01, 10-02, 10-03, 10-04, 10-05]
status: sketch
estimate: 3 dev-days
---

# Plan 10-06 — SKETCH (full plan deferred until 10-02..10-05 ship)

> **Why this is a sketch.** Three of the five concerns this wave addresses (block-locking visuals, NodeView perf, conflict-merge UX) are highly contingent on what the earlier waves actually shipped. Writing a 1500-line PLAN.md before then locks decisions to assumptions; once 10-02..10-05 are in users' hands we'll know which NodeViews are slow, which Mode rules feel wrong, and how often the 409 happens in practice.

## Goal

Make the canvas feel **safe under Mode rules** and **fast at scale**. Specifically:
1. **Mode-rule per-block locks** — each typed block consults `useCardModeRules` (Phase 8 hook). When a rule says the block is locked for the current Mode (e.g. Inputs/Intent locked once first Run completes in Study Mode), the NodeView renders with a `🔒` icon, its interactive surfaces are disabled (buttons greyed; attr-edit forms read-only), and a tooltip explains *why* ("Locked: Study Mode after first Run").
2. **Perf pass** — under `~50` blocks the canvas should still feel instant on a mid-tier laptop. Concretely: NodeViews `React.memo` correctly (already established in 10-02..10-04, but audit and tighten); off-screen NodeViews lazy-mount via `IntersectionObserver` (don't run `useArtifact` / `useRunArtifacts` for blocks scrolled below the fold); editor onUpdate is debounced (already 1500ms autosave, but verify no per-keystroke React re-render of the whole tree).
3. **3-way merge UI on 409 VERSION_CONFLICT** — when the kernel returns 409 (someone else saved), the canvas currently logs to console (per 10-01-SUMMARY). Wave 10-06 shows a modal: "Your draft conflicts with another save." Three options: (a) Discard mine, reload theirs; (b) Overwrite theirs (`expected_version: theirs.body_blocks_version`); (c) Merge — tries a `dmp`-style block-level merge (block-by-block delta against shared ancestor) and surfaces non-conflicting changes auto-merged + conflicting ones inline.

## Must-haves (sketch level)

- Every typed-block NodeView reads `useCardModeRules(card.mode, blockKind, runState)` and conditionally renders a lock chrome
- `useCardModeRules` extended (or a new sibling) to return `{ locked: boolean; reason?: string }` per block kind — pure function over (mode, kind, runHistory) — testable
- A `<LockedBadge>` component (icon + tooltip) drops into each NodeView's header
- Off-screen lazy-mount: a small `<LazyNodeView>` HOC using `IntersectionObserver` that defers child mount + data hooks until the wrapping block enters the viewport (margin = 200px)
- Vitest: `useCardModeRules` per-block tests for each Mode (Explore = no locks; Study after first Run = Inputs/Intent/KPI locked; Release = manual Evidence hidden)
- Autosave still fires after debounce; conflict path logs once and surfaces the modal
- ConflictResolutionModal: 3-button surface; pure-helper `compute3WayMerge(ours, theirs, base)` with a unit-test corpus
- All gates clean (tsc default + strict, vitest, npm build)

## Open questions to settle BEFORE writing the full plan

1. **Where does `base` come from for the 3-way merge?** Frontend keeps the last-saved doc in memory (the `body_blocks` we read on initial mount). When 409 fires, we re-fetch the server's current doc. So `ours = editor.getJSON()`, `theirs = re-fetch`, `base = last-loaded`. But what if the user reloaded the page mid-edit? `base` may not be recoverable. Decide: fall back to "your changes / their changes" 2-way diff; or persist `base` in localStorage keyed by cardId.
2. **What's the actual perf budget?** Need a benchmark target. Suggest: a 50-block doc renders + scrolls at 60 FPS on a 2021 MacBook Air. Without that target the perf-pass acceptance is subjective.
3. **Is `useCardModeRules` a per-block hook or a per-canvas hook?** Per-block = N calls = wasted re-renders unless memoized; per-canvas = compute once at the page level and pass as a prop / context. Recommend per-canvas with the result threaded into `cardCanvasContext` (consistent with the 10-03 widening).
4. **Conflict modal triggers on autosave OR only on explicit save?** Today autosave fires every 1.5s — three concurrent edit tabs would spam the modal. Recommend: catch 409 silently on autosave and *coalesce* conflicts into a status pill; show the modal when the user explicitly saves OR navigates away.

## Out of scope

- Real-time CRDT collaborative editing (Yjs etc.) — explicit non-goal of Phase 10 per research doc.
- Per-user feature flags for canvas — flag is global-or-localStorage; sophisticated targeting is post-Phase 10.
- New backend work for conflict resolution — kernel's optimistic-concurrency contract is already correct (returns 409 with the current `body_blocks_version`); the new work is all UX.

## When to upgrade this sketch to a full plan

After **10-04** ships (Evidence / Gate / Embed NodeViews + palette). At that point:
- All 11 NodeViews exist and we know which are slow
- Mode rules from Phase 8 have been re-verified against canvas surface
- Conflict frequency from 10-01..10-04 dev usage gives a sense of how aggressive the merge UX needs to be

Run `/gsd:plan-phase 10-06` (or the orchestrator equivalent for sub-plans) at that point.
