# A1 Live Audit — 2026-04-27

Run against the dev DB after `bash airaie-kernel/scripts/dev-start.sh` completed.
Migration 031 confirmed applied (`cards.body_blocks JSONB`, `cards.body_blocks_version INTEGER NOT NULL DEFAULT 1`).

## Card population

| Board                 | Cards | With intent_spec |
|-----------------------|-------|------------------|
| `board_36bd5019`      | 7     | 2                |
| `board_17d9f9b7`      | 5     | 0                |
| `brd_bracket_3b5179`  | 4     | 2                |
| `board_1f420305`      | 1     | 0                |
| `board_f3d48644`      | 1     | 1                |
| `board_ecfb37b8`      | 1     | 1                |
| **Total**             | **19**| **6**            |

## Critical finding: 12 of 13 unlinked cards have **empty `intent_type`**

```sql
SELECT COUNT(*) FROM cards WHERE intent_type IS NULL OR intent_type = '';
-- 12
```

This means most "unlinked" cards are not seeded demos waiting for IntentSpec backfill — they're stale test artifacts from prior dev sessions where a card was created without a chosen intent_type. The original A1 spec assumed every demo card has an intent_type and was waiting for an IntentSpec; the actual data is messier.

## Revised A1 strategy

The original A1 plan **does NOT need to backfill all 13 unlinked cards.** Three options for execution:

### Option 1 (recommended): Backfill ONLY the 1 actionable card

The single card with `intent_type` set but `intent_spec_id` missing:

```sql
SELECT id, board_id, intent_type FROM cards
WHERE intent_spec_id IS NULL
  AND intent_type IS NOT NULL
  AND intent_type != '';
```

If the result is `card_d6ks5rn7go6jim803rgg | board_36bd5019 | sim.cfd`, write:
- ONE INSERT into `intent_specs` for that card's intent_type
- ONE UPDATE to set `cards.intent_spec_id`

The 12 truly-blank cards are LEFT ALONE — they render as "no intent" empty state in the canvas, which is the correct UX for a card that hasn't been configured yet.

### Option 2: Backfill 1 card + scope check

Same as Option 1, but BEFORE shipping, decide whether the 12 blank cards should be DELETED (cleanup) or LEFT (user may want them). They're harmless either way; recommend leaving them — deletion is destructive on dev data.

### Option 3 (NOT recommended): Backfill all 19 cards

Would require choosing an intent_type for each blank card, which is a product decision (defaults to `sim.cfd`? `validation`?). Defer until/unless the demo seed needs to be richer.

## Smoke-test targets (cards already canvas-ready)

The 6 cards that already have `intent_spec_id` set:

| card_id                      | board_id           | intent_type             | status     |
|------------------------------|--------------------|-----|-------|
| `card_d6ks5rn7go6jim803rfg`  | `board_36bd5019`   | (blank in card row, but intent_spec is `sim.fea_stress_analysis`) | draft      |
| `card_d6ks5rn7go6jim803rgg`  | `board_36bd5019`   | `sim.cfd`               | draft      |
| `card_d6kt09v7go6kb8jsoogg`  | `board_ecfb37b8`   | `sim.cfd_pressure_drop` | draft      |
| `crd_fea_3b5179`             | `brd_bracket_3b5179` | `sim.fea_stress_analysis` | **completed** |
| (1 more on `board_f3d48644` — confirm via `SELECT id FROM cards WHERE board_id = 'board_f3d48644';`) |||
| (1 more on `brd_bracket_3b5179` — confirm via the same query) |||

**Best smoke target:** `crd_fea_3b5179` on `brd_bracket_3b5179` — `status: completed`, has IntentSpec `is_fea_3b5179`, has run history. Maximum NodeView coverage.

## User / project state

- **Users:** 0 (DB is fresh — the prior `santhoshram3210@gmail.com` was wiped on restart)
- **Projects:** 1 (`prj_default | Default Project`)
- **project_members:** 0

→ Implication: smoke test cannot proceed via `/v0/auth/login` (no users). Either:
- Run A2 first (auto-attach on register) → register fresh → smoke
- Or manually: register fresh, then `INSERT INTO project_members (user_id, project_id, role) SELECT id, 'prj_default', 'viewer' FROM users WHERE email = '<your-email>';` → smoke

## Migration 031

- Table `cards` confirmed has `body_blocks JSONB` (nullable) + `body_blocks_version INTEGER NOT NULL DEFAULT 1`.
- All 19 cards have `body_blocks_version = 1` and `body_blocks IS NULL` (auto-migration not yet triggered — happens on first canvas open).
