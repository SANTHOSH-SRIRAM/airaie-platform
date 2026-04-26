# Protocol

The wire-level contract between AirAIE and Tool authors.

| File | Covers |
|---|---|
| [`ATP-SPEC.md`](./ATP-SPEC.md) | **Airaie Tool Protocol v0.2** — manifest schema, port types, transports (Docker / CLI / HTTP / MCP), NDJSON event envelope, Bayesian trust formula |

## Versioning

The current spec is **v0.2**. v0.1 is preserved at [`../archive/legacy/ATP-SPEC-v0.1.md`](../archive/legacy/ATP-SPEC-v0.1.md) for historical reference.

Spec changes follow:
- **Patch** (v0.2.x): clarifications, no semantic change. No author action required.
- **Minor** (v0.x): new optional fields, backwards-compatible. Authors can opt in.
- **Major** (vX): breaking changes. New top-level spec file (`ATP-SPEC-v1.md`). Old spec stays valid for grandfathered tools until a deprecation window closes.

## Where this fits

- The *concept* of what a Tool is and what authors must commit to → [`../concepts/05-TOOL-AUTHOR-CONTRACT.md`](../concepts/05-TOOL-AUTHOR-CONTRACT.md) (read this first if authoring)
- Implementation of the protocol in the kernel runner → [`../architecture/tool-system.md`](../architecture/tool-system.md), [`../architecture/tool-flow.md`](../architecture/tool-flow.md)
