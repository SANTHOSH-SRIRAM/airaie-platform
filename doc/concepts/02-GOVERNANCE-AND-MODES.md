# 02 — Governance and Modes

> **Purpose:** explain the Mode dial, the four kinds of Evidence, the Gate types, and the Trust formula. This is what makes AirAIE a platform, not a tool.
> **Audience:** product, design, engineering, security, compliance.
> **Read after:** [`01-CORE-MODEL.md`](./01-CORE-MODEL.md).

---

## Why governance matters

A claim without provenance is gossip. The same simulation result that's "interesting" on Tuesday must be "approved" before Friday's design review — and "approved" has to mean something defensible. Most experimentation tools treat governance as a layer bolted on top: a sign-off field, a comment thread, an export-to-PDF.

AirAIE inverts that. Governance is **the substrate**. Every Card is constructed under a governance Mode, every Artifact is content-hashed, every Tool version is pinned, every Evidence row has a typed source. The user does not opt into governance; they opt out of it (by staying in Explore mode). That choice is visible and intentional.

## The three Modes

A Board lives in exactly one Mode. Mode is a **dial**: it can only escalate. Going backward would invalidate evidence already collected.

### Explore — "let's try things"

The user is figuring out what to ask. Inputs may not be pinned. Tools may be at any trust level. Gates are off. Evidence is whatever the user manually claims. Agents may act with confidence ≥ 0.50.

Use Explore to play, prototype, fail fast, build intuition. Nothing here is auditable in the strong sense — and that's intentional. Forcing governance on exploratory work kills exploratory work.

### Study — "let's prove it works"

The user has something they think works and wants to confirm. Inputs are version-pinned (you cannot change `geometry_v3.step` mid-Study). Required Gates appear automatically: **Reproducibility** (re-run produces identical metrics) and **Peer Review** (another team member signs). Agents must hit confidence ≥ 0.75. Evidence may still be manual.

Study is where claims become demonstrable. Most published-quality work lives in Study mode.

### Release — "let's ship it"

The user is making a commitment external to the team. Inputs pinned, Tools must be at `verified` trust level or higher, all evidence must be **auto-collected** (no manual KPI claims), Gates expand to include **QA Approval** (a senior approver signs), agents must hit confidence ≥ 0.90, and a **Release Packet** is emitted on success — a permalink that can be cited outside the platform.

Release is the strictest mode. Deliberately so: a Release Packet is the unit of trust between AirAIE and the outside world.

## The dial: what tightens

| Dimension              | Explore         | Study                                   | Release                                 |
|------------------------|-----------------|-----------------------------------------|-----------------------------------------|
| Required Gates         | none            | `reproducibility`, `peer_review`        | `reproducibility`, `peer_review`, `qa_approval` |
| Input pinning          | optional        | required (artifact_id + content_hash)   | required                                |
| Tool trust minimum     | `untested`      | `tested`                                | `verified`                              |
| Evidence kinds allowed | manual + auto   | manual + auto                           | **auto only**                           |
| Agent confidence floor | 0.50            | 0.75                                    | 0.90                                    |
| Mode regression        | n/a             | cannot return to Explore                | cannot return to Study                  |
| Release Packet emitted | no              | no                                      | yes (on all-Gates-pass)                 |
| Card edit window       | always          | until first run                         | until IntentSpec locked                 |

The pattern is monotone: every cell tightens (or stays the same) as you read left to right. There is no axis where Release is more permissive than Study.

## Evidence — the four kinds and only the four kinds

Every CardEvidence row has an `evidence_kind`. Only these four are accepted by Gates:

### `run_succeeded`
A Run completed with status `succeeded`. Source: the Run's status field. Trivially auto-collected. The minimum bar — proves the Workflow executed.

### `artifact_exists`
A specific Artifact (by `artifact_id` + `content_hash`) was produced by a NodeRun. Source: the Artifact lineage table. Auto-collected. Used for "the report PDF was generated" or "the geometry was meshed."

### `metric_threshold`
A numeric or boolean metric, emitted by a Tool's NDJSON event stream, satisfies a comparison against the IntentSpec's acceptance criteria (e.g., `lift_coefficient ∈ [1.2, 1.4]`). Auto-collected. The substantive evidence kind for engineering claims.

### `role_signed`
A user with a specific role attested to something. Source: the Gate decision row. Carries the user ID, role, timestamp, optional rationale. The only **manual** evidence kind. Used for peer review, QA approval, waivers.

**What's not allowed.** A Gate cannot be passed by:
- A free-text "looks fine" comment.
- A screenshot.
- A KPI value typed into the UI by the user.
- A claim that "the tool printed the right thing" (must be an emitted metric, not stdout grep).

If a tool author wants their stdout claim to count as evidence, they make it a metric (NDJSON line `{"event":"metric","key":"lift_coefficient","value":1.28}`) and the platform will pick it up automatically.

## Gates — types and lifecycle

A Gate is a typed pre-condition. The type determines what Evidence satisfies it.

### Built-in Gate types

| Type             | Pass when                                                      | Mode that requires it      |
|------------------|----------------------------------------------------------------|----------------------------|
| `run_passes`     | `run_succeeded` evidence exists                                | implicit in any mode       |
| `metrics_meet`   | every IntentSpec acceptance criterion has `passed` evaluation  | implicit when KPIs declared|
| `reproducibility`| two `run_succeeded` runs with identical metric set, same input hashes | Study, Release |
| `peer_review`    | `role_signed` by a user with role ≥ `engineer`, not the Card author | Study, Release |
| `qa_approval`    | `role_signed` by a user with role ≥ `maintainer`, not the Card author | Release |
| `custom`         | user-defined predicate, must reduce to one of the four evidence kinds | optional any mode |

### Gate lifecycle

```
pending ──► passed       (evidence collected, predicate true)
       \─► failed        (evidence collected, predicate false)
        \─► waived       (admin override, rationale required, audit emitted)
```

A waived Gate is **not** the same as a passed Gate. The Card status reflects which Gates passed vs. were waived; reviewers and Release Packets see both.

## Trust — Bayesian, monotone non-decreasing

Every Tool version has a **trust score** computed from execution history:

```
trust = (successes + α) / (total + α + β),  α=5, β=5
```

This is the posterior mean of a Beta(α, β) prior with successes/failures as observations. Properties:
- A new tool starts at `5/10 = 0.50` (the prior mean) — neutral, not zero.
- A tool with 50 successes and 0 failures is at `55/60 = 0.917`.
- A tool with 50 successes and 5 failures is at `55/65 = 0.846`.
- A tool with 1 failure on 1 run is at `5/11 ≈ 0.455` — penalized but not dead.

**Monotone non-decreasing** at the **trust level** layer:
- Trust *score* updates per run (can decrease).
- Trust *level* (untested → community → tested → verified → certified) only advances. A `verified` tool that has a bad week stays `verified` until an admin demotes it explicitly with rationale.

This split exists because we want the score to reflect reality and the level to reflect human judgment. Levels are how Mode minimums are enforced.

## Trust levels — the five-tier ladder

| Level       | Meaning                                       | Promote criterion                         |
|-------------|-----------------------------------------------|--------------------------------------------|
| `untested`  | Newly registered, no claims yet               | (default on registration)                  |
| `community` | Used by external contributors, no QA          | manual flag                                |
| `tested`    | Has unit tests + ≥ 10 successful runs         | trust score ≥ 0.70 + 10 runs               |
| `verified`  | Manually QA'd by AirAIE team                  | admin signs `tool.verify` with rationale   |
| `certified` | Used in production, formally certified        | admin signs `tool.certify` with rationale  |

The Mode dial enforces minimum levels: Study requires `tested`, Release requires `verified`. A Workflow whose nodes reference a tool below the minimum **fails to compile** at Plan generation time, with a specific error pointing to the offending node.

## Roles — the five-tier ladder

| Role         | Permissions                                                |
|--------------|-------------------------------------------------------------|
| `viewer`     | Read everything in the Board, run nothing                   |
| `engineer`   | Create/edit Cards, run, sign `peer_review` Gates           |
| `maintainer` | Above + sign `qa_approval` Gates, manage Tools at `tested`  |
| `admin`      | Above + waive Gates with rationale, promote Tool trust levels, change Board Mode |
| `owner`      | Above + member management, archive Boards                   |

Role check ladder is enforced at the route level (`internal/auth/role_routes.go`). A user's effective role on an entity is the highest role they hold across the entity's project membership.

## Audit trail — what's recorded automatically

Every state transition emits an **audit event** to `audit_events`:
- Mode change (with who/when/from/to).
- Card creation, IntentSpec lock, run start, run completion.
- Gate decision (pass / fail / waive — including rationale).
- Tool trust level promotion or demotion (with rationale).
- Membership change.
- Release Packet emission.

Audit events are **append-only**. They cannot be edited. Deleting a row from `audit_events` is a database privilege the application never holds.

The audit log is the answer to *"who decided this was acceptable, based on what evidence, and when?"* — for any Card, any Run, any Release Packet.

## Anti-patterns the model rules out

What you cannot do, by design:

1. **Edit an Artifact in place.** Mutations create new Artifacts. The original hash is forever.
2. **Change a Workflow Version after it has run.** Edits create v+1; v stays as it ran.
3. **Pass a Gate without typed evidence.** No "I'll mark it passed and explain in chat."
4. **Regress a Mode.** Going Study → Explore would invalidate already-collected evidence; the system refuses.
5. **Use an `untested` tool in Release mode.** Plan generator refuses to compile.
6. **Skip the Plan generator.** Even hand-authored Workflows go through the same compiler that pins tools and validates ports.
7. **Manually claim a metric in Release mode.** Auto-only evidence; a manual KPI claim is rejected by the Gate evaluator.

Each of these would punch a hole in the audit story. Closing them keeps the story uniform.

---

## Cross-references

- The chain these modes govern → [`01-CORE-MODEL.md`](./01-CORE-MODEL.md)
- How Modes affect the Card UI → [`03-CARDS-AS-PAGES.md`](./03-CARDS-AS-PAGES.md) §"Mode-aware sections"
- How a Tool earns trust → [`05-TOOL-AUTHOR-CONTRACT.md`](./05-TOOL-AUTHOR-CONTRACT.md) §"Trust progression"
- A worked Mode-promotion session → [`06-USER-JOURNEY.md`](./06-USER-JOURNEY.md)
- Term lookups → [`99-GLOSSARY.md`](./99-GLOSSARY.md)
