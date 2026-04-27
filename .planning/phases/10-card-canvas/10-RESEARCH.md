---
phase: 10
title: Card Canvas — Notion-like block editor with typed governance blocks
research_date: 2026-04-26
foundation: Tiptap directly (no BlockNote dependency); ProseMirror underneath
---

# Research — Card Canvas

## Goal

Replace the structured-sections Card-page (Phase 8) with a **single flowing canvas** that reads like a Notion document. Users edit prose freely, drop in **typed governance blocks** (Intent / Input / KPI / Method / Run / Result / Evidence / Gate / Embed) via a slash menu or drag-drop palette, and the same governance chain (Board → IntentSpec → Card → Plan → Run → Artifact → Evidence → Gate → Release) holds underneath. Mode-aware affordances apply per-block instead of per-section. Same vision applies to Boards.

User feedback that triggered this phase: *"inside everything is card kind, i don't want and i want like page kind and inside the we can edit the text like a notebook and but we can inputs like drag and drop, inputs have kinds."*

## The architectural choice — Tiptap directly, not BlockNote

We evaluated three paths:

| Approach | Time to Wave 1 | Long-term coupling | Bug surface owned |
|---|---|---|---|
| BlockNote (bare with our UI) | ~2 weeks | BlockNote API stability (pre-1.0; v0.49) | typed blocks only |
| **Tiptap directly (no BlockNote)** | **~3-4 weeks** | **Tiptap v3.x (mature) + ProseMirror (decade-stable)** | **block layer + UI layer** |
| Pure-from-scratch | ~3-6 months + ongoing | none externally | cursor + selection + IME + paste + everything |

Decision: **Tiptap directly**. Two extra weeks across Phase 10 buys full ownership of the block schema and UI layer with no BlockNote pre-1.0 churn pressure, while still standing on ProseMirror's mature foundation for cursor/selection/transforms/IME/paste/undo. Pure-from-scratch is a trap — Notion has 50+ engineers on its editor team.

The local BlockNote repo at `/Users/santhosh/BlockNote/` becomes a **read-only reference implementation** — we mine patterns (custom-block schemas, slash menu plugins, drag handle extensions) and adapt them to our codebase, but never depend on `@blocknote/*` packages.

## What we install vs. what we don't

### Install
| Package | Purpose | Approx size (gzip) |
|---|---|---|
| `@tiptap/core` | Editor engine, schema, transforms | ~30 KB |
| `@tiptap/react` | React bindings, `<EditorContent>`, `useEditor`, `ReactNodeViewRenderer` | ~10 KB |
| `@tiptap/pm` | ProseMirror foundation (cursor, selection, history, keymap, schema validation) | ~80 KB |
| `@tiptap/starter-kit` | (optional) bundles common nodes (paragraph, heading, list, etc.) | ~30 KB — we may inline only what we need |
| `@tiptap/extension-placeholder` | Placeholder text on empty blocks | ~3 KB |
| `@tiptap/suggestion` | Slash-menu primitive (already used by `@tiptap/extension-mention`) | included with extensions |

Total ~150 KB gzip. Lazy-loadable (`React.lazy` on the canvas page).

### Don't install
- Any `@blocknote/*` package — we mine the source as reference, not as a dependency
- Mantine, shadcn UI primitives — we use our existing Tailwind components
- `react-pdf`, `react-zoom-pan-pinch`, `vtk.js`, `three.js` — those are renderer-side libs, not editor concerns

### Already shipped (we reuse)
- `recharts` — for chart blocks if we want them as inline editor blocks (Phase 10c+)
- `papaparse` — installed in Phase 9 for CSV renderers
- `@tanstack/react-query` — for typed-block data fetching
- Phase 9's renderer registry — drives `<ResultBlock />` content
- Phase 8's `useCardRunState`, `useCardModeRules`, `useGates`, `useExecutePlan`, `useGeneratePlan`

## The block schema

Each block is a Tiptap **Node** with a typed `attrs` payload + a React **NodeView**. The full schema:

### Layout / text nodes (no governance binding)

| Node | Tiptap built-in? | NodeView |
|---|---|---|
| `paragraph` | yes | inline-rendered, no NodeView |
| `heading` (1, 2, 3) | yes (StarterKit) | inline |
| `bulletList`, `orderedList`, `listItem` | yes | inline |
| `blockquote` | yes | inline |
| `codeBlock` | yes | inline |
| `horizontalRule` (divider) | yes | inline |
| `text` (text node + marks: bold, italic, code, link) | yes | inline marks |
| `callout` | custom | yes — our React component, info / warning / success variants |

### Typed governance nodes (each binds to an entity)

| Node | Cardinality | `attrs` | NodeView fetches | Mode lock applies? |
|---|---|---|---|---|
| `intentBlock` | exactly 1 per Card | `{ intentSpecId }` | `useIntentSpec` | yes (Study+) |
| `inputBlock` | 0..N | `{ artifactId, portName? }` | `useArtifact` | yes (Study+) |
| `kpiBlock` | 0..N | `{ kpiKey, operator, threshold }` | none (props are the data) | yes (Study+ once first run) |
| `methodBlock` | exactly 1 per Card | `{ planId }` | `usePlan` | yes (Study+) |
| `runBlock` | exactly 1 per Card | `{ }` (state from hooks) | `useCardRunState` | always editable (it IS the action) |
| `resultBlock` | 0..N | `{ artifactId }` | `useArtifact` + Phase 9 registry | display-only |
| `evidenceBlock` | 0..N | `{ evidenceId }` | `useCardEvidence` | display-only |
| `gateBlock` | 0..N (per required Gate) | `{ gateId }` | `useGates` + sign-off mutations | sign-off conditional on Mode + role |
| `embedCardBlock` | 0..N | `{ cardId }` | `useCard` | display-only |
| `embedRecordBlock` | 0..N | `{ recordId }` | `useRecord` (already exists) | display-only |
| `aiAssistBlock` | 0..N | `{ conversationId }` | `useAiAssist` | always editable |

### Cardinality enforcement
- **Schema-level**: Tiptap allows specifying `Node.create({ group, content, atom, ... })` constraints. We enforce single-instance via `groups` and content rules where possible.
- **Slash menu-level**: `/intent`, `/method`, `/run` items hide when their block exists. Most defenses live here.
- **Validation-level**: A pre-save validator checks the document for cardinality violations and surfaces an inline error if a paste introduces a duplicate.

## Persistence model

### Frontend: Tiptap's JSON document
```ts
const doc = editor.getJSON();
// → { type: 'doc', content: [
//     { type: 'intentBlock', attrs: { intentSpecId: 'int_xyz' } },
//     { type: 'paragraph', content: [{ type: 'text', text: 'Some context...' }] },
//     { type: 'inputBlock', attrs: { artifactId: 'art_abc' } },
//     ...
//   ]
// }
```

### Backend: new column `cards.body_blocks`
```sql
ALTER TABLE cards
  ADD COLUMN body_blocks JSONB,
  ADD COLUMN body_blocks_version INTEGER DEFAULT 1;
```

- `body_blocks` is the Tiptap JSON document (`editor.getJSON()`)
- `body_blocks_version` is for optimistic concurrency — increments on every save, frontend reads it before save and sends `If-Match`-style header
- New endpoint: `PATCH /v0/cards/:id/body` accepting `{ body_blocks, expected_version }`, returning `{ body_blocks_version }` or 409 on version mismatch

### Auto-migration (existing Cards)
When a Card with `body_blocks IS NULL` is opened in the canvas:

1. Frontend calls `generateDefaultBody(card, intent, plan, latestRun, evidence, gates)`:
   ```ts
   function generateDefaultBody(...): TiptapDoc {
     const blocks: TiptapNode[] = [];
     if (card.intent_spec_id) blocks.push(intentBlockNode(card.intent_spec_id));
     for (const input of intent.inputs) blocks.push(inputBlockNode(input.artifact_id));
     for (const kpi of intent.acceptance) blocks.push(kpiBlockNode(kpi));
     if (plan) blocks.push(methodBlockNode(plan.id));
     blocks.push(runBlockNode());
     if (latestRun?.status === 'completed') {
       for (const a of latestRun.outputs) blocks.push(resultBlockNode(a.id));
       for (const e of evidence) blocks.push(evidenceBlockNode(e.id));
     }
     for (const g of gates) blocks.push(gateBlockNode(g.id));
     return { type: 'doc', content: blocks };
   }
   ```
2. Editor mounts with the generated tree; user can immediately edit.
3. On first save, `body_blocks` populates and the migration is permanent for that Card.

If a Card has no IntentSpec yet, the generated tree is just `[runBlock]` with placeholder text inviting the user to add an Intent.

### Save trigger
- Debounced 1500ms after last keystroke (or block insertion/deletion/move)
- Explicit save on blur or navigation away
- Conflict (409) → re-fetch latest server doc, attempt 3-way merge if blocks are non-conflicting, else show "your changes conflict with another edit" modal

## Integration with Phase 8 / 9

The new canvas page sits BEHIND a feature flag for Phase 10a–10e. The structured-sections page (Phase 8) remains the default until Phase 10f.

| Surface | Phase 8 (today) | Phase 10 (canvas) |
|---|---|---|
| Route | `/cards/:id` | `/cards/:id?canvas=1` (feature-flagged); becomes default in 10f; `?canvas=0` reverts to structured |
| `<CardTopBar>` | above structured sections | above the canvas — unchanged |
| `<CardActionBar>` | floating below | floating below — unchanged |
| `useCardRunState` | drives both top bar and action bar | drives top bar, action bar, AND `runBlock`'s NodeView |
| `useCardModeRules` | applied per section | applied per typed block |
| Phase 9 renderer registry | mounted in `CardStatusPanel`'s Results section | mounted in `resultBlock`'s NodeView |
| `ThisBoardNav` / `ThisCardStatusPill` sidebar | left | unchanged |
| Right rail | not used | the **palette** (drag-source for typed blocks: artifact pool, tools, run outputs, records) |

## The palette — drag source

Right-side rail (collapsible). Sections (Phase 10c onward):

```
┌── Palette ──────────────┐
│ BOARD POOL              │  ← draggable artifacts
│  • geometry_v3.step     │
│  • inflow.csv           │
│  • prior_v2.frd         │
│                         │
│ TOOLS                   │  ← draggable tool nodes (creates methodBlock)
│  • tool_openfoam        │
│  • tool_calculix        │
│                         │
│ RUN OUTPUTS             │  ← draggable result blocks (creates resultBlock)
│  pressure_field_preview │
│  residuals.csv          │
│  metrics.json           │
│                         │
│ RECORDS                 │  ← draggable record refs (creates embedRecordBlock)
│  hypothesis_1           │
│  protocol_step_1        │
│                         │
│ TEXT BLOCKS             │  ← draggable layout blocks (text/h1/h2/list/callout/divider)
│                         │
│ AI ASSIST               │  ← creates aiAssistBlock
└─────────────────────────┘
```

Drag-drop implementation uses Tiptap's `editor.commands.insertContent(blockJson, { at: dropPos })` driven by HTML5 drag events (`dragover` to compute drop position from mouse Y → ProseMirror pos via `posAtCoords`).

## Wave breakdown — all 6 waves

| Wave | Plan | Scope | Estimate |
|---|---|---|---|
| **10a-1** | 10-01 | Editor framework + persistence + auto-migration. Install Tiptap, define block schema, build `useAirAirEditor` hook, build `<CardCanvasPage>` shell, persist via new backend endpoint + migration, feature flag wiring. **No typed-governance NodeViews yet** — those land in 10-02. The doc opens with text-only blocks; typed blocks render as placeholder cards saying "rendered in 10a-2". | 3-4 dev-days |
| **10a-2** | 10-02 | First 3 typed blocks: `intentBlock`, `inputBlock`, `resultBlock`. NodeView components, slash menu items for these three, basic palette section for artifacts. Phase 9 renderer registry plugs into `resultBlock`. | 3-4 dev-days |
| **10b** | 10-03 | Next 3 typed blocks: `kpiBlock`, `methodBlock`, `runBlock`. `runBlock` NodeView houses `useCardRunState`. Slash menu fully populated for governance. | 3-4 dev-days |
| **10c** | 10-04 | Remaining typed blocks: `evidenceBlock`, `gateBlock`, `embedCardBlock`, `embedRecordBlock`, `aiAssistBlock`. Right palette wired with drag-drop. | 4-5 dev-days |
| **10d** | 10-05 | Board canvas migration. Same canvas pattern at `/boards/:id?canvas=1`. New block kinds: `cardsGridBlock`, `cardsGraphBlock`, `gatesRollupBlock`, `evidenceRollupBlock`, `artifactPoolBlock`. Tabs (Overview/Cards/Gates/Evidence/Records/AI Assist) become insertable blocks. | 5-6 dev-days |
| **10e** | 10-06 | Mode-rule per-block locks (lock icon + tooltip). Auto-migration polish (handle edge cases: corrupted body_blocks, missing entity refs). Performance pass (NodeView memoization, lazy NodeViews for off-screen blocks via Intersection Observer). | 3 dev-days |
| **10f** | 10-07 | Remove old structured page. Remove `?legacy=1` BoardDetailPage fallback. Remove `?canvas=0` feature flag. Phase 10 ships as default. | 2 dev-days |

**Total Phase 10:** ~24-28 dev-days = ~6-7 weeks single-dev, ~4-5 weeks with parallel waves where possible.

## What we mine from `/Users/santhosh/BlockNote/`

Read-only reference. Specific files / dirs to study during each wave:

| Wave | Reference |
|---|---|
| 10-01 | `packages/core/src/api/blockManipulation/` — JSON ↔ block-tree round-trip patterns; `examples/02-backend/02-saving-loading` — persistence shape |
| 10-02 | `examples/06-custom-schema/05-alert-block-full-ux` — production-grade custom block; `packages/core/src/blocks/CustomBlocks.ts` — schema registration |
| 10-02 / 10-03 | `examples/03-ui-components/06-suggestion-menus-slash-menu-items` + `07-slash-menu-component` — slash menu UI |
| 10-04 | `examples/03-ui-components/18-drag-n-drop` — drop-handler pattern |
| 10-05 | `packages/core/src/extensions/SideMenu/` — drag handle extension (we adapt to our `⠿` rail) |
| All | `packages/react/src/editor/BlockNoteView.tsx` — the React glue layer; we write our equivalent |

We never `import` from `@blocknote/*`. We **adapt** the patterns into our own files.

## Risks

| Risk | Mitigation |
|---|---|
| **Tiptap React 19 compatibility** | Tiptap 3.x peer deps say React 18+. Confirmed @tiptap/react@3.13 in Apr 2026 supports React 19. If issues surface, lock to a known-working minor. |
| **Bundle size growth** | ~150 KB gzip is acceptable. Keep canvas route in its own `React.lazy` chunk; main bundle stays at ~106 KB gzip. Vite manualChunks: `'editor': ['@tiptap/core', '@tiptap/react', '@tiptap/pm', '@tiptap/starter-kit']`. |
| **NodeView render performance with many blocks** | NodeViews are React components; ProseMirror re-renders them on doc changes by default. Mitigation: each NodeView component is `React.memo`'d on its `attrs`. Use `useEditorState` selectors for fine-grained subscriptions. Off-screen NodeViews can lazy-mount via Intersection Observer in 10e. |
| **Persistence races (two tabs editing same card)** | Optimistic concurrency via `body_blocks_version`. 409 → 3-way merge or show conflict modal. Yjs-based collaborative editing deferred to a future phase. |
| **Migration data loss on first canvas open** | Auto-migration runs in MEMORY ONLY until first save. If user closes the tab without saving, the structured page still works (reads from typed entities). The first save is when migration becomes durable. |
| **Schema drift between frontend and backend** | Backend validates `body_blocks` against a JSON schema (block kind allowlist + attrs shape per kind). Reject saves with malformed schema. Versioning field allows future schema migrations. |
| **Tiptap API churn between minor versions** | Pin `@tiptap/*` to `^3.13.0` initially. Tiptap is more stable than BlockNote, but still pin minors. Update deliberately. |
| **The "exactly one Intent / Method / Run" rule via schema** | Tiptap's `Node.create({ group })` lets us define groups; `content` rules can require/forbid certain blocks. For "exactly one", we enforce at schema (forbid duplicate via group) AND slash-menu (hide /intent if exists) AND validator (pre-save check). Defense in depth. |
| **Existing `/cards/:id` users mid-session when feature flag flips** | Feature flag is per-user (localStorage or user setting). Flag flip doesn't invalidate the structured page. Phase 10f removes the structured page only after canvas is verified by every active user. |

## Success criteria for Phase 10 overall

- [ ] `/cards/:id?canvas=1` route renders the canvas with auto-migrated body for any existing Card
- [ ] All 10 typed governance blocks render correctly with live data from their bound entities
- [ ] Slash menu inserts text + typed blocks per Mode rules
- [ ] Right palette drags into the canvas, creating typed blocks at the drop position
- [ ] `body_blocks` persists; reload restores exact state
- [ ] Mode-rule locks visually applied (🔒 + tooltip) per block
- [ ] Board canvas mirrors Card canvas with Board-specific block kinds
- [ ] Bundle: editor chunk lazy-loaded; main bundle delta < 5 KB
- [ ] All gates pass (tsc default + strict, vitest, npm build)
- [ ] No regressions in Phase 8 / 9 surfaces (since they remain mounted)
- [ ] Phase 10f removes Phase 8 structured page; ROADMAP.md and STATE.md reflect

## Acceptance for Phase 10 starts here, not Phase 8 reset

Phase 8 + 9 remain in production until Phase 10f. They're not undone. The shift in Phase 10 is **a new presentation layer above the same data model**. Wave 10f's removal of the old surfaces is conditional on Phase 10 reaching parity.
