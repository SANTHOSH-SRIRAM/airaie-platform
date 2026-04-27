---
phase: 260425-foi
plan: 01
subsystem: frontend/api/agents
tags: [bugfix, api-mapper, wire-shape, agents, inspector]
requires: []
provides:
  - mapWireAgentVersion mapper at API-client boundary
  - WireAgentVersion exported type
  - decoded AgentVersion responses from listAgentVersions, getAgentVersion, createAgentVersion, publishAgentVersion
affects:
  - frontend/src/api/agents.ts
  - frontend/src/components/agents/InspectorPanel.tsx (consumer; not modified, now sees real data)
  - frontend/src/pages/AgentStudioPage.tsx (consumer; not modified, now sees real data)
tech-stack:
  added: []
  patterns:
    - base64-JSON wire decoding at API-client boundary (mirrors existing decodeBase64Json pattern in agentPlayground.ts)
    - envelope-tolerant POST response unwrap ({version: T} | T)
key-files:
  created: []
  modified:
    - /Users/santhosh/airaie/airaie_platform/frontend/src/api/agents.ts
decisions:
  - Made AgentVersion.spec_json optional (spec_json?: AgentSpec) so the safe-default path on decode failure is type-correct. All 7 consumer call sites already use optional chaining or truthy guards, so this is strictly more permissive and required no consumer changes.
  - Kept agents.ts self-contained per plan constraint — did not import decodeBase64Json from agentPlayground.ts. Inlined a 35-line mapWireAgentVersion that handles all four edge cases (already-object, empty string, non-base64, malformed JSON).
  - Envelope-tolerant unwrap on create/publish ({version: WireAgentVersion} | WireAgentVersion) hedges against the kernel returning either shape; both are routed through the same mapper.
metrics:
  duration: ~6 min
  completed: 2026-04-25
  tasks: 1
  files_modified: 1
---

# Phase 260425-foi Plan 01: Decode AgentVersion Spec Wire Field Summary

Frontend API client now decodes the kernel's `spec: base64-JSON-string` payload into the in-app `spec_json: AgentSpec` shape at the boundary, so InspectorPanel and AgentStudioPage start rendering real published-version policy/tools/scoring instead of falling through to "Policy not configured" empty states. One file changed, 76 insertions, 7 deletions, one commit (`f148568`).

## What Was Found

Live `GET /v0/agents/agent_5e2e700b-.../versions` against the running gateway returns:

```json
{
  "agent_id": "agent_5e2e700b-...",
  "count": 1,
  "versions": [{
    "id": "...", "agent_id": "...", "version": 1,
    "spec": "<base64-encoded JSON of full AgentSpec>",
    "status": "published", "created_at": "...", "published_at": "..."
  }]
}
```

Frontend declared `spec_json: AgentSpec` on `AgentVersion`, so every consumer read like `latestVersion?.spec_json?.policy` silently returned `undefined`. After publishing v1 with `auto_approve_threshold: 0.35`, the InspectorPanel still rendered "Policy not configured — publish an agent version first."

## What Was Fixed

Added a single `mapWireAgentVersion` mapper to `src/api/agents.ts` and applied it at all four version-returning API functions. No consumer code touched.

### Exact Changes in `frontend/src/api/agents.ts`

**1. `AgentVersion.spec_json` made optional (line 22)**

Before:
```typescript
spec_json: AgentSpec;
```
After:
```typescript
spec_json?: AgentSpec;
```

**2. New `WireAgentVersion` interface and `mapWireAgentVersion` function inserted after `AgentVersion` (lines 28–86)**

- `WireAgentVersion` mirrors the kernel wire shape with `spec: string`.
- `mapWireAgentVersion` is exported, pure, and tolerates four input variants:
  1. Already-in-app shape (`spec` is not a string) → pass-through.
  2. Empty string → returns `spec_json: undefined`.
  3. Non-base64 / malformed JSON → catches, returns `spec_json: undefined`.
  4. Valid base64-JSON → returns parsed `AgentSpec`.

**3. `AgentVersionsResponse` envelope updated (line 159)**

Before: `versions: AgentVersion[]`
After:  `versions: WireAgentVersion[]`

**4. `listAgentVersions` (lines 175–178)**

Before:
```typescript
return apiClient.get<AgentVersionsResponse>(`/v0/agents/${agentId}/versions`)
  .then((resp) => resp.versions ?? []);
```
After:
```typescript
return apiClient.get<AgentVersionsResponse>(`/v0/agents/${agentId}/versions`)
  .then((resp) => (resp.versions ?? []).map(mapWireAgentVersion));
```

**5. `getAgentVersion` (lines 180–183)**

Before:
```typescript
return apiClient.get<{ version: AgentVersion }>(`/v0/agents/${agentId}/versions/${version}`)
  .then((resp) => resp.version);
```
After:
```typescript
return apiClient.get<{ version: WireAgentVersion }>(`/v0/agents/${agentId}/versions/${version}`)
  .then((resp) => mapWireAgentVersion(resp.version));
```

**6. `createAgentVersion` (lines 196–203)**

Before:
```typescript
export async function createAgentVersion(agentId: string, specJson: AgentSpec): Promise<AgentVersion> {
  return apiClient.post(`/v0/agents/${agentId}/versions`, { spec_json: specJson });
}
```
After:
```typescript
export async function createAgentVersion(agentId: string, specJson: AgentSpec): Promise<AgentVersion> {
  const resp = await apiClient.post<WireAgentVersion | { version: WireAgentVersion }>(
    `/v0/agents/${agentId}/versions`,
    { spec_json: specJson }
  );
  const wire = (resp as { version?: WireAgentVersion }).version ?? (resp as WireAgentVersion);
  return mapWireAgentVersion(wire);
}
```

Request body unchanged — kernel still accepts `{spec_json: AgentSpec}`. Only the response is decoded.

**7. `publishAgentVersion` (lines 209–215)**

Before:
```typescript
export async function publishAgentVersion(agentId: string, version: number): Promise<AgentVersion> {
  return apiClient.post(`/v0/agents/${agentId}/versions/${version}/publish`);
}
```
After:
```typescript
export async function publishAgentVersion(agentId: string, version: number): Promise<AgentVersion> {
  const resp = await apiClient.post<WireAgentVersion | { version: WireAgentVersion }>(
    `/v0/agents/${agentId}/versions/${version}/publish`
  );
  const wire = (resp as { version?: WireAgentVersion }).version ?? (resp as WireAgentVersion);
  return mapWireAgentVersion(wire);
}
```

## Consumer Call Sites — NOT Modified

All 7 read sites still use optional chaining or truthy guards and were left untouched:

| File | Line | Code |
|------|------|------|
| `src/components/agents/InspectorPanel.tsx` | 36 | `const specPolicy = latestVersion?.spec_json?.policy ?? null;` |
| `src/pages/AgentStudioPage.tsx` | 146 | `if (latestVersion?.spec_json) {` |
| `src/pages/AgentStudioPage.tsx` | 147 | `const spec = latestVersion.spec_json;` |
| `src/pages/AgentStudioPage.tsx` | 194 | `const specTools: AgentToolPermission[] = latestVersion?.spec_json?.tools ?? [];` |
| `src/pages/AgentStudioPage.tsx` | 212 | `const w = latestVersion?.spec_json?.scoring?.weights;` |
| `src/pages/AgentStudioPage.tsx` | 230 | `const spec = latestVersion?.spec_json;` |
| `src/pages/AgentStudioPage.tsx` | 625 | `const spec = latestVersion?.spec_json;` |

Verified by `grep -n "spec_json" src/components/agents/InspectorPanel.tsx src/pages/AgentStudioPage.tsx` returning the same 7 lines that existed before the change.

## Verification

| Check | Result |
|-------|--------|
| `cd /Users/santhosh/airaie/airaie_platform/frontend && npx tsc --noEmit` | **EXIT 0** |
| `grep -c "mapWireAgentVersion" src/api/agents.ts` | **5** (1 declaration + 4 call sites — meets the ≥5 target) |
| `grep -n "export function mapWireAgentVersion" src/api/agents.ts` | exactly 1 match (line 52) |
| `git diff --stat HEAD~1 HEAD` | `frontend/src/api/agents.ts | 83 ++++++++` (only one file in the commit) |
| Consumer-call-site grep parity | 7 hits, identical to baseline |

## Deviations from Plan

None. Plan executed exactly as written. The only documentation deviation: the user's `<constraints>` block specified the summary path as `260425-foi-SUMMARY.md` (no plan suffix), while the plan's `<output>` block specified `260425-foi-01-SUMMARY.md`. Followed the user-level constraint per precedence — this file is named `260425-foi-SUMMARY.md`.

## Out-of-Scope Pre-Existing State (Not Touched)

Working tree had 22 pre-existing modified files (unrelated to this task) and 4 untracked files. Per `<constraints>`, only `frontend/src/api/agents.ts` was staged. The pre-existing dirty state remains as it was at task start.

## Commit

```
f148568 fix(260425-foi-01): decode AgentVersion spec wire field to spec_json
        1 file changed, 76 insertions(+), 7 deletions(-)
```

## Manual Smoke (post-merge, expected behaviour)

Visit `/agents/agent_5e2e700b-0f21-4b1f-9539-bdbd55b8de3a` with the gateway running:
- Goal textarea now reflects the published spec's `goal` field.
- Tools section lists the configured tool permissions.
- Scoring weights render as tokens.
- Inspector "POLICY STATUS" card shows `auto_approve_threshold: 0.35` and the configured `require_approval_for` rules instead of the empty-state copy.

## Self-Check: PASSED

- `frontend/src/api/agents.ts` exists and contains `mapWireAgentVersion` + `WireAgentVersion` (verified via grep).
- Commit `f148568` exists in `git log` (verified via `git show --stat f148568`).
- `tsc --noEmit` exit 0 (captured live).
- 7 consumer call sites unchanged (verified via grep parity).
- Single-file commit confirmed (`git diff --stat` shows only `frontend/src/api/agents.ts`).
