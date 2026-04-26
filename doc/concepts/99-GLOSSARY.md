# 99 — Glossary

> **Purpose:** every AirAIE term, alphabetical, with one-paragraph definitions and pointers to where each is treated in depth.
> **Audience:** all. Used as a quick-reference and a vocabulary check for new joiners.

---

## A

**ActionProposal.** The structured output of an Agent — a list of proposed Tool invocations with arguments and an estimated cost/risk. The Plan generator turns an ActionProposal into a Workflow Version through the same compiler used for hand-authored Workflows. See [`01-CORE-MODEL.md`](./01-CORE-MODEL.md) §"Workflow / Workflow Version."

**Agent.** A runtime tool-picker. Given a goal, an Agent selects which Tools to invoke and with what arguments, returning an ActionProposal. Agents are subject to a per-Mode confidence floor (Explore ≥ 0.50, Study ≥ 0.75, Release ≥ 0.90). They are *invisible* to the chain — their output is always compiled to a Workflow before it executes.

**AI Assist.** The in-Card LLM helper that drafts IntentSpecs from plain text, suggests Tools, summarizes evidence, and answers questions about the Card. Visible as a drawer on the Card-page; respects Mode (more locked-down in Release).

**Airaie Tool Protocol.** See **ATP**.

**API gateway.** The Go HTTP server (`airaie-kernel/services/api-gateway`) that exposes `/v0/*` endpoints to the frontend, authenticates requests, applies CSRF + RBAC + role-route checks, and proxies to the kernel service layer.

**Artifact.** An immutable, content-hashed blob produced or consumed by a Tool. Stored in MinIO/S3 by `(artifact_id, content_hash)`. Mutations create new Artifacts; the original hash is forever. See [`01-CORE-MODEL.md`](./01-CORE-MODEL.md) §"Artifact."

**Artifact lineage.** The append-only graph of Artifact parent→child relationships. Every output Artifact records which input Artifacts it descended from. Queryable via `GET /v0/artifacts/{id}/lineage`. The audit story for Artifacts.

**ATP (Airaie Tool Protocol).** The transport-agnostic protocol that wraps every Tool. Defines the manifest schema, the port/output model, the NDJSON event envelope, and the Bayesian trust formula. Specified in [`../protocol/ATP-SPEC.md`](../protocol/ATP-SPEC.md). Authoring guide: [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md).

**Audit event.** An append-only row in `audit_events` recording a state transition (Mode change, Card creation, Gate decision, etc.). Cannot be edited or deleted by the application.

## B

**Binding.** One way to invoke an ATP Tool (Docker / CLI / HTTP / MCP). A Tool may declare multiple bindings; the runner picks one at execution time based on environment.

**Board.** The workspace for one problem. The governance boundary — every Card, IntentSpec, Gate, Record, and Artifact is scoped to exactly one Board. Has a Mode (Explore / Study / Release) and a Vertical. See [`01-CORE-MODEL.md`](./01-CORE-MODEL.md) §"Board."

**Board home.** The default page when a Board is open and no Card is selected — shows progress, readiness, recent activity, and the Cards list.

**Board Mode.** See **Mode**.

## C

**Card.** One method tried for one IntentSpec, rendered as a page (not a row). The primary unit of UI. See [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md). Has a type (`analysis | comparison | sweep | agent | gate | milestone`) that affects layout.

**CardEvidence.** Structured ledger of what a Card has demonstrated. Each row links a metric or condition (from the IntentSpec acceptance criteria) to its observed value, evaluation (passed/failed), source (Run, NodeRun, signature), and timestamp. Auto-collected from Runs and human signatures.

**Card-page.** The full-page UI for a Card, with the eight structured sections (Intent, Inputs, Method, Run, Results, Evidence, Gates, Notes) and the Activity feed. Replaces the side-sheet pattern. See [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md).

**Certified.** The highest Tool trust level. Used in production; usually externally audited. See [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md) §"Trust levels."

**ContentHash.** SHA-256 of an Artifact's bytes. Two Artifacts with the same hash are byte-identical. Used to verify input pinning and reproducibility.

**Compile (Workflow).** The act of turning a Workflow DSL (and the Tool refs within it) into an immutable Workflow Version. Pins Tool digests, validates port schemas, computes resource estimates. Step 8 of the Plan generator.

**Comparison Card.** A Card type. Renders two or more Runs side-by-side with axis-locked renderers. See [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md) §"Card-type variants."

**Community.** A Tool trust level — used by external contributors, no QA. See [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md).

**Confidence floor.** The minimum Agent confidence permitted in a given Mode (0.50 / 0.75 / 0.90 in Explore / Study / Release).

**CSRF.** Cross-site request forgery protection. AirAIE uses a double-submit cookie pattern: `airaie_csrf` (readable by the SPA) is sent back as `X-CSRF-Token` on state-changing requests. Behind `AIRAIE_CSRF_REQUIRED` for staged rollout.

## D

**DAG.** Directed Acyclic Graph. The shape of every Workflow.

**Determinism.** A Tool property declared in its manifest: `deterministic | stochastic | time-dependent`. Affects whether a `reproducibility` Gate is achievable.

**DSL (Workflow DSL).** YAML representation of a Workflow's nodes, edges, and Tool refs. Authored either by the Plan generator or by hand in the Workflow Editor. Compiled to a Workflow Version. See [`../implementation/new_design/WORKFLOW_DSL.md`](../implementation/new_design/WORKFLOW_DSL.md).

## E

**Edge envelope.** The structured payload that travels along a Workflow edge — typed inputs/outputs with content hashes. Defined in the Workflow DSL.

**Engineer.** A user role; can create/edit Cards, run Workflows, sign `peer_review` Gates. Below `maintainer`.

**Evidence.** See **CardEvidence**. Note: Evidence has exactly four kinds — `run_succeeded`, `artifact_exists`, `metric_threshold`, `role_signed`. See [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md) §"Evidence."

**ExecutionPlan.** The ten-step output of the Plan generator: Pipeline match → input validation → Workflow instantiation → Tool resolution → schema check → resource estimate → KPI estimate → compile → input pinning → return. Visible in the Card-page Method section.

**Explore.** The most permissive Board Mode. No required Gates; manual KPI entry allowed; Agent confidence ≥ 0.50; Tools at any trust level. See [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md).

## G

**Gate.** A typed pre-condition for a Card to advance. Pass/fail/wait based on Evidence + role signatures. Built-in types: `run_passes`, `metrics_meet`, `reproducibility`, `peer_review`, `qa_approval`, `custom`. See [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md) §"Gates."

**Gate Card.** A Card type that has no Run — it is a pure decision row. Used to gate a Milestone or block a downstream Card.

**Generic Artifact card.** The renderer of last resort — a download link plus metadata. Renders any Artifact whose kind has no matching renderer in the registry.

## I

**IntentSpec.** A declarative success definition: goal, intent_type, vertical, KPIs, pinned input Artifacts. The contract a Card commits to. Versioned; locking freezes a version. See [`01-CORE-MODEL.md`](./01-CORE-MODEL.md) §"IntentSpec."

**IntentType.** A registry-defined category (e.g., `cfd_analysis`, `fea_static`, `parameter_sweep`, `ml_classifier_eval`). Drives the matching Pipeline, default renderers, and Card layout. Stored in `intent_types`.

**Inputs (Card section).** The pinned Artifacts an IntentSpec references, by input port. Editable in Explore; read-only in Study/Release.

## J

**JetStream.** NATS' persistence layer. Used for Workflow job queues (`AIRAIE_JOBS` stream) and the dead-letter queue.

**JSON Schema.** Tools reference input/output schemas via `schema_ref` in their manifest. The Workflow compiler validates port-to-port compatibility statically.

## K

**Kernel.** The Go API gateway + Rust runner that together implement AirAIE's backend. Frontend is a separate React 19 app. See [`../architecture/kernel-backend.md`](../architecture/kernel-backend.md).

**KPI.** Key Performance Indicator. A measurable criterion in an IntentSpec's `acceptance` list (e.g., `lift_coefficient ∈ [1.2, 1.4]`). Each KPI is satisfied by either an emitted metric or a typed Evidence row.

## L

**Lineage.** See **Artifact lineage**.

**Locked.** An IntentSpec state — once locked, inputs and acceptance criteria cannot be edited; subsequent changes create a new version. Triggered automatically on first Run in Study/Release.

## M

**Maintainer.** A user role; can sign `qa_approval` Gates and manage Tools at `tested` trust level. Above `engineer`, below `admin`.

**Manifest.** The ATP YAML document declaring a Tool's name, version, inputs, outputs, resources, governance, and bindings. Required for registration. See [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md).

**Method (Card section).** The compiled Pipeline + Workflow Version + resolved Tools that will execute when the Card is run.

**Metric.** A typed value emitted by a Tool as an NDJSON event line. Auto-collected as `metric_threshold` Evidence and compared against IntentSpec acceptance criteria.

**Milestone Card.** A Card type with no Run — tracks the readiness of a set of dependent Cards. Used for "Wing root design study is ready for Release."

**Mode.** A Board's governance dial: `Explore` / `Study` / `Release`. Monotone non-decreasing — escalations only. See [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md).

## N

**NATS.** The messaging system used between the API gateway and the Rust runner. Workflow jobs are published on NATS subjects; the runner consumes them; result events come back the same way.

**NDJSON.** Newline-delimited JSON. The format Tools use to emit metric/log/progress events on stdout. One JSON object per line. See [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md) §"Metrics emission."

**NodeRun.** The execution of one node within a Run. Holds resolved input Artifacts, output Artifacts produced, emitted metrics, captured stdout/stderr, and resource samples.

**Notes (Card section).** The free-form Notion-like body at the bottom of a Card-page. Typed blocks: text, heading, callout, code, quote, artifact_embed, run_embed, card_link, image. Stored as JSON.

## O

**Owner.** The highest user role; full management of a Board including member changes and archival.

## P

**Pipeline.** A registry-defined template that maps an IntentType to a Workflow shape. The Plan generator instantiates a Pipeline (with the Card's pinned inputs) into a draft Workflow. Examples: `pipe_cfd_quick`, `pipe_fea_standard`.

**Plan generator.** The ten-step compiler that turns a Card's IntentSpec into a runnable Workflow Version. See **ExecutionPlan**.

**Port.** A typed input or output of a Tool. Declared in the manifest; matched at Workflow compile time.

**Preview Artifact.** A decimated companion to a large output Artifact, sized for inline rendering. Required (recommended) for outputs > 5 MB. See [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md) §"Preview emission."

## Q

**QA approval.** A Gate type required in Release mode. Satisfied by `role_signed` from a user with role ≥ `maintainer`, who is not the Card author.

## R

**RBAC.** Role-Based Access Control. AirAIE's five-tier role system: `viewer < engineer < maintainer < admin < owner`. Enforced at the route level by `RequireRoleMiddleware` against a route→role table.

**Record.** A Board-scoped persistent context note (hypothesis / requirement / protocol step / general note). Captured before compute. Cards can pin Records into their Notes section. Surfaces in Release Packets.

**Release.** The strictest Board Mode. Requires QA approval Gate, Tools ≥ `verified`, auto-only Evidence, Agent confidence ≥ 0.90. Cards passing all Gates emit a Release Packet.

**Release Packet.** The frozen, signed bundle a Release-mode Card emits when all Gates pass. Contains the locked IntentSpec, immutable Workflow Version, all Run/NodeRun records, all Artifact references, all Evidence, all Gate decisions, and a permalink. The unit of trust outside the platform.

**Renderer.** A React component that turns one Artifact into UI. Lazy-loaded per renderer. Picked by the Renderer Registry. See [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md).

**Renderer Registry.** The frontend table mapping `(intent_type, artifact_kind)` to a renderer component, with manifest-hint priority. See [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md).

**Repro / Reproducibility (Gate).** A Gate type required in Study and Release. Satisfied by two Runs with identical input hashes producing identical metric values within tolerance.

**Results (Card section).** The intent-driven layout of renderers showing what a Run produced. Layout chosen per IntentType; each slot picks an Artifact and mounts a renderer.

**Role.** See **RBAC**.

**Role-signed.** One of the four Evidence kinds. A user with a specified role attested to something. Carries user ID, role, timestamp, optional rationale.

**Run.** One execution of a Workflow Version. Composed of NodeRuns. Status is the AND of NodeRun statuses.

**Runner.** The Rust process (`airaie-kernel/runner`) that consumes Workflow job messages from NATS, invokes Tools via their bindings (typically Docker), enforces resource limits via cgroups, and emits result events back via NATS.

## S

**Schema (port).** A JSON Schema declared by `schema_ref` in a Tool manifest. Validated at compile time and at runtime.

**Smoke test.** A Tool's `--smoke-test` mode used during registration to verify the Tool emits the expected metric set. Required for Tool acceptance.

**Status (Card).** `draft | planned | running | evidence_pending | gated | passed | failed | released`. Derived from Runs, Evidence, and Gates.

**Streaming.** The capability for renderers to subscribe to live events from a Run (residuals updating as the solver iterates). See [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md) §"Streaming."

**Study.** The middle Board Mode. Adds `reproducibility` and `peer_review` Gates; pins inputs; requires Tools ≥ `tested`; Agent confidence ≥ 0.75. Manual Evidence still allowed.

**Sweep Card.** A Card type for parameter sweeps. Method runs a parameterized Workflow over a parameter grid; Results renders a Pareto chart + samples table. Evidence is per-sample.

## T

**Tested.** A Tool trust level reached automatically after ≥ 10 successful runs and trust score ≥ 0.70.

**Tool.** The atomic invocable unit. Containerized, ATP-contracted, versioned. See [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md). The user never sees a Tool's UI — only its rendered outputs.

**Tool version.** An immutable manifest at `(name, version)`. Changes create a new version; the prior remains.

**Trigger.** A Workflow node that initiates execution (manual, schedule, webhook).

**Trust level.** A Tool's monotone-set human judgment of readiness: `untested | community | tested | verified | certified`. Set the Mode minimum a Tool can be used at.

**Trust score.** A Tool's Bayesian-derived numerical confidence: `(successes + 5) / (total + 10)`. Updates per run; can fluctuate. Distinct from trust level (which only advances on human action).

## U

**Untested.** The default Tool trust level on registration. Permitted in Explore mode only.

## V

**Verified.** A Tool trust level set by AirAIE admin sign-off after manual review. Required minimum for Release mode.

**Vertical.** A high-level domain category (engineering / science / mathematics / technology / etc.). Drives default IntentTypes, default renderers, and visual theming.

**View state.** Per-renderer persisted state (camera, color scale, slice planes) attached to a Card. Locked in Release for visual reproducibility.

## W

**Waive (Gate).** An admin override that lets a Card advance with an unmet Gate. Requires rationale; emits a first-class audit row. The waiver is preserved in the Release Packet.

**Whoami.** The endpoint and probe (`GET /v0/whoami`) the frontend uses to refresh session state.

**Workflow.** A DAG of nodes (Trigger / Tool / Agent / Gate / Logic / Data) authored either by the Plan generator or by hand. Compiled to a Workflow Version.

**Workflow Editor.** The n8n-inspired DAG canvas at `/workflow-studio/:id` for hand-authoring Workflows that will become Pipelines. Not the surface for inspecting Card runs (that's the Method section of the Card-page).

**Workflow Version.** The immutable, compiled form of a Workflow. Once published, never edited. Tool digests pinned; port schemas validated. The unit of execution.

---

## Cross-references

- The chain these terms describe → [`01-CORE-MODEL.md`](./01-CORE-MODEL.md)
- Why some terms have governance overtones → [`02-GOVERNANCE-AND-MODES.md`](./02-GOVERNANCE-AND-MODES.md)
- Where Cards as pages live → [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md)
- Renderers and registry → [`04-RENDERER-REGISTRY.md`](./04-RENDERER-REGISTRY.md)
- Tool authorship → [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md)
- A worked story → [`06-USER-JOURNEY.md`](./06-USER-JOURNEY.md)
