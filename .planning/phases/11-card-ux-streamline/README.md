# Phase 11 — Card UX Streamline (5-stage flow + ATP/Agent surfaces)

## Status: substantially shipped (2026-04-29)

> See [`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md) for the live status — what shipped, what's deferred (sweep branching, vtk.js, comparison/edit-parameters), and the planning for the three discrete follow-ups.

## Original scope

Phase 11 restructures the Card canvas (delivered by Phase 10) from a flat
list of typed Tiptap blocks into a five-stage flow that matches how users
actually move from "I have a question" to "I have an answer with evidence".

## Why this phase exists

Phase 10 shipped the canvas substrate — typed governance blocks, persistence,
slash menu, conflict resolution. But the page is **read-mostly**: users can't
change the auto-picked method, can't drag-drop inputs, can't see ATP tool
identity, can't engage the agent at the right moment, can't iterate after a
borderline result without three round-trips through other surfaces.

[`07-CARD-UI-FLOW.md`](../../../doc/concepts/07-CARD-UI-FLOW.md) §0 enumerates
the seven concrete frictions; this phase closes them.

## Design contracts (read first)

1. **[`concepts/07-CARD-UI-FLOW.md`](../../../doc/concepts/07-CARD-UI-FLOW.md)** — design proposal. The 8 design decisions in §7 are LOCKED for this phase; revisit them only by editing the doc first.
2. **[`concepts/08-CARD-USER-FLOWS.md`](../../../doc/concepts/08-CARD-USER-FLOWS.md)** — concrete state specification. Every state, transition, and edge case is here. This is the testable contract.

## Wave breakdown

```
Phase 11
├── 11-01  Wave A — Foundation        ~1 wk
│           Stage-card layout + drag-drop input palette + run history list
│
├── 11-02  Wave B — Method            ~1 wk
│           Switch method dropdown + comparison drawer + tool chips + manifest
│           preview drawer + edit parameters + inspect compiled DAG
│
├── 11-03  Wave C — Read              ~1.5 wks
│           Renderer Registry per-intent_type + per-NodeRun live progress +
│           Add evidence form + gate Evaluate/Sign-off
│
└── 11-04  Wave D — Agent             ~1.5 wks
            Stage-scoped agent drawers + Card-aware persistent Chat + Use
            Agent toggle + sweep parameter branching + diagnose-failure prompt
```

Each wave is independently shippable behind a feature flag
(`?phase11=A,B,C,D`). Waves compound: B reuses A's stage chrome, C reuses
B's ATP-aware components, D reuses A/B/C surfaces (the agent's
"Suggest pin" reuses the palette from A; "Use Agent instead" reuses the
method drawer from B).

## What's NOT in this phase

- New ATP tools (those land via the ATP tool author flow, separate cadence).
- Agent runtime improvements (LLM provider work, tool budget enforcement —
  see Agent runtime work in Phase 8 closure).
- Board canvas restructure — Boards already have their own flow doc (TBD);
  Phase 11 is Card-only.
- Comparison Card UX (`card_type='comparison'`) and Milestone Card UX —
  those follow once the analysis path is solid.

## Plans

| Wave | Plan file | Status |
|------|-----------|--------|
| 11-01 (A) | TBD on `/gsd:plan-phase` | not started |
| 11-02 (B) | TBD | not started |
| 11-03 (C) | TBD | not started |
| 11-04 (D) | TBD | not started |

## Acceptance — phase-level

The full criteria are listed in `ROADMAP.md` Phase 11. The phase ships when
all 17 success criteria are TRUE and the user-flow acceptance from
[`08-CARD-USER-FLOWS.md`](../../../doc/concepts/08-CARD-USER-FLOWS.md) §9
is verified in user testing:

- First-time author flow: blank Card → first successful run in < 3 min.
- Drag-drop pin a compatible artifact in < 30 sec.
- Results render in < 2 sec of run completion (lazy load + skeleton).
- Diagnose-and-recover from a failed run in < 90 sec.
- Branch into a sweep with one click + one form.

## Next step

Run `/gsd:plan-phase 11-01` to create the wave A plan.
