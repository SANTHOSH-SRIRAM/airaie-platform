# AirAIE — Concept Documents

The A-to-Z source of truth for **what AirAIE is**, **why it exists**, and **how it composes**.

Read in order if you're new. Skim back to whichever piece you need otherwise.

| File | Read time | What it covers |
|---|---|---|
| [`00-OVERVIEW.md`](./00-OVERVIEW.md) | 5 min | Elevator pitch · target user · the chain in one diagram · what makes us different |
| [`01-CORE-MODEL.md`](./01-CORE-MODEL.md) | 15 min | Every primary noun (Board, IntentSpec, Card, Plan, Workflow, Run, Tool, Artifact, Evidence, Gate, Release Packet) and how they compose |
| [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md) | 12 min | The Explore / Study / Release dial · the four Evidence kinds · Gate types · Trust formula · roles · audit trail |
| [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md) | 15 min | The user-facing surface: Card-page anatomy, intent-driven sections, Mode-aware affordances, Card-type variants |
| [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md) | 12 min | How Run outputs become useful UI: registry, lookup priority, library choices, lazy-loading, layouts, streaming |
| [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md) | 12 min | What every Tool author must commit to: ATP manifest, metrics emission, format pacts, trust progression |
| [`06-USER-JOURNEY.md`](./06-USER-JOURNEY.md) | 15 min | Asha's week — Explore → Study → Release with every concept appearing in context |
| [`99-GLOSSARY.md`](./99-GLOSSARY.md) | reference | Every term, alphabetical, with one-paragraph definitions |

## Where this fits in the broader doc tree

```
doc/
├── concepts/      ← you are here. The "what" and "why." Stable across implementations.
├── architecture/  ← per-system deep-dives (Board, Card, Workflow, Agent, Tool). The "how."
├── protocol/      ← ATP — the contract with Tool authors.
├── implementation/← frontend/backend implementation choices (n8n editor, DSL, etc.). Most volatile.
└── archive/       ← superseded docs.
```

## Maintenance rules

- **Don't add to `concepts/` lightly.** A new concept doc should describe a new conceptual primitive, not a new feature. Features go in `implementation/` or in a phase plan under `.planning/`.
- **Cross-reference, don't duplicate.** If two docs cover the same idea, refactor.
- **Keep the chain on one page.** `01-CORE-MODEL.md` is the load-bearing diagram. Edits to it ripple to every other doc; coordinate.
- **The glossary is the index.** New term → glossary entry → link from the doc that introduces it.
