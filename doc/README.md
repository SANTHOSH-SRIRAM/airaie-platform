# AirAIE Platform Documentation

```
doc/
├── concepts/        Read first. The "what" and "why" — A-to-Z platform concepts.
├── architecture/    Per-system implementation deep-dives.
├── protocol/        Tool wire protocol (ATP).
├── implementation/  Frontend/backend implementation choices.
└── archive/         Superseded docs, kept for traceability.
```

## Where to start

| If you are… | Read |
|---|---|
| New to AirAIE | [`concepts/00-OVERVIEW.md`](./concepts/00-OVERVIEW.md) |
| Designing UI | [`concepts/03-CARDS-AS-PAGES.md`](./concepts/03-CARDS-AS-PAGES.md), then [`concepts/04-RENDERER-REGISTRY.md`](./concepts/04-RENDERER-REGISTRY.md) |
| Writing a Tool | [`concepts/05-TOOL-AUTHOR-CONTRACT.md`](./concepts/05-TOOL-AUTHOR-CONTRACT.md), then [`protocol/ATP-SPEC.md`](./protocol/ATP-SPEC.md) |
| Working on the kernel | [`architecture/kernel-backend.md`](./architecture/kernel-backend.md) |
| Working on the frontend | [`implementation/new_design/`](./implementation/new_design/) |
| Looking up a term | [`concepts/99-GLOSSARY.md`](./concepts/99-GLOSSARY.md) |
| Picking up planning artifacts | [`../.planning/`](../.planning/) (PROJECT, ROADMAP, REQUIREMENTS, STATE, phases/, backlog/) |

## House rules

- **Concept changes go in `concepts/`** — every other doc cross-references concepts/, so this is the single source of truth.
- **Architecture docs don't duplicate concepts** — they reference and extend.
- **Don't add a new top-level dir without discussion.** The five above are the agreed taxonomy.
