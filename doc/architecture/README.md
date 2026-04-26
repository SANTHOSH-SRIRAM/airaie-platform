# Architecture

Per-system implementation deep-dives. **Read [`../concepts/`](../concepts/) first** for the *what* and *why*; this directory is the *how*.

| File | Covers |
|---|---|
| [`board-system.md`](./board-system.md) | Boards as governance scope: data model, Mode lifecycle, member RBAC, Records pool |
| [`workflow-system.md`](./workflow-system.md) | Workflow DSL → compile → run; node types; control flow; error handling |
| [`agent-system.md`](./agent-system.md) | Agent runtime; tool selection; ActionProposal compile; memory; policies |
| [`tool-system.md`](./tool-system.md) | Tool layered architecture: registry, manifest, versioning, trust, deployment |
| [`tool-flow.md`](./tool-flow.md) | Tool flow narrative end-to-end: registration → dispatch → runner → post-process |
| [`kernel-backend.md`](./kernel-backend.md) | Kernel reference: every endpoint, model, service, store, state machine |

## Caveat

These docs were authored 2026-04-06 to 2026-04-08 — before the [`../concepts/`](../concepts/) docs landed (2026-04-26). The conceptual portions of each doc may overlap or be superseded by the concepts/ set; each doc has a "**Conceptually re-anchored**" header pointing to the canonical concept docs.

Architecture / data flow / code-level content remains current. Refresh-in-place is a separate effort, not done in batch — it's left to whoever next touches a given system to update its doc as part of the work.

## What's not here

- The *concept* of each system → [`../concepts/`](../concepts/)
- The Tool wire protocol → [`../protocol/ATP-SPEC.md`](../protocol/ATP-SPEC.md)
- Frontend implementation choices → [`../implementation/new_design/`](../implementation/new_design/)
- Phase-level execution plans → [`../../.planning/phases/`](../../.planning/phases/)
