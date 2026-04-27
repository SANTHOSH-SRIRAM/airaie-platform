---
phase: 260425-foi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/santhosh/airaie/airaie_platform/frontend/src/api/agents.ts
autonomous: true
requirements:
  - FOI-01
must_haves:
  truths:
    - "After publishing an agent version, the InspectorPanel reads `latestVersion.spec_json.policy` and renders the configured policy (auto_approve_threshold, require_approval_for) instead of the 'Policy not configured' fallback."
    - "AgentStudioPage reads `latestVersion.spec_json.goal`, `.tools`, `.scoring`, `.policy`, `.constraints` and reflects them in the UI (Goal textarea, selected tools, scoring weight tokens, policy rules list)."
    - "Malformed/empty/already-parsed `spec` payloads do not crash the app — the mapper returns `spec_json: undefined` and existing optional-chaining call sites fall through to their empty-state branches."
    - "`npx tsc --noEmit` from `airaie_platform/frontend/` exits 0."
    - "No call site outside `src/api/agents.ts` is modified."
  artifacts:
    - path: "/Users/santhosh/airaie/airaie_platform/frontend/src/api/agents.ts"
      provides: "WireAgentVersion type + mapWireAgentVersion mapper + decoded responses from all 4 version-returning functions"
      contains: "export function mapWireAgentVersion"
  key_links:
    - from: "src/api/agents.ts → listAgentVersions"
      to: "mapWireAgentVersion"
      via: "resp.versions.map(mapWireAgentVersion)"
      pattern: "versions.*map\\(mapWireAgentVersion\\)"
    - from: "src/api/agents.ts → getAgentVersion"
      to: "mapWireAgentVersion"
      via: "mapWireAgentVersion(resp.version)"
      pattern: "mapWireAgentVersion\\(resp\\.version\\)"
    - from: "src/api/agents.ts → createAgentVersion"
      to: "mapWireAgentVersion"
      via: "mapWireAgentVersion(POST response)"
      pattern: "mapWireAgentVersion\\("
    - from: "src/api/agents.ts → publishAgentVersion"
      to: "mapWireAgentVersion"
      via: "mapWireAgentVersion(POST response)"
      pattern: "mapWireAgentVersion\\("
---

<objective>
Decode the kernel's `AgentVersion` wire shape (`spec: base64-JSON-string`) into the frontend's in-app shape (`spec_json: AgentSpec`) at the API-client boundary so the 7 existing consumer call sites in `AgentStudioPage.tsx` and `InspectorPanel.tsx` start reading real policy/tools/scoring data instead of `undefined`.

Purpose: Frontend currently declares `spec_json: AgentSpec` on `AgentVersion`, but the kernel responds with `{spec: "<base64-encoded JSON of AgentSpec>"}`. Every `latestVersion?.spec_json?.<x>` read silently falls through to `undefined`, so after publishing v1 the Inspector shows "Policy not configured — publish an agent version first." even though the spec contains `auto_approve_threshold: 0.35`. Visible bug — confirmed live against `agent_5e2e700b-0f21-4b1f-9539-bdbd55b8de3a`.

Output: A single `mapWireAgentVersion` mapper function added to `src/api/agents.ts`, applied at the 4 version-returning API functions. ~30 lines of net change. One commit.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/Users/santhosh/airaie/airaie_platform/frontend/src/api/agents.ts
@/Users/santhosh/airaie/airaie_platform/frontend/src/api/agentPlayground.ts
@/Users/santhosh/airaie/airaie_platform/frontend/src/components/agents/InspectorPanel.tsx
@/Users/santhosh/airaie/airaie_platform/frontend/src/pages/AgentStudioPage.tsx

<verified_runtime_evidence>
Live response from `GET /v0/agents/agent_5e2e700b-0f21-4b1f-9539-bdbd55b8de3a/versions`:

```json
{
  "agent_id": "agent_5e2e700b-...",
  "count": 1,
  "versions": [{
    "id": "...",
    "agent_id": "agent_5e2e700b-...",
    "version": 1,
    "spec": "<base64-encoded JSON>",
    "status": "published",
    "created_at": "2026-04-25T...",
    "published_at": "2026-04-25T..."
  }]
}
```

Decoded `spec` contains: `llm`, `goal`, `kind`, `tools`, `policy`, `scoring`, `metadata`, `api_version`, `constraints`. Maps 1:1 to the existing `AgentSpec` interface.

REQUEST shape for `createAgentVersion` is unchanged: kernel accepts `{spec_json: AgentSpec}` on POST. Only the RESPONSE wire shape needs decoding.
</verified_runtime_evidence>

<interfaces>
Existing in-app `AgentVersion` (src/api/agents.ts:18-26) — DO NOT change field names:

```typescript
export interface AgentVersion {
  id: string;
  agent_id: string;
  version: number;
  spec_json: AgentSpec;  // change to `spec_json?: AgentSpec` so the safe-default path is type-correct
  status: 'draft' | 'validated' | 'published';
  created_at: string;
  published_at?: string;
}
```

Existing decoder pattern from `src/api/agentPlayground.ts:180-185` (reuse the shape, do NOT import — keep agents.ts self-contained):

```typescript
function decodeBase64Json<T>(value: string | T): T {
  if (typeof value === 'string') {
    try { return JSON.parse(atob(value)) as T; } catch { return [] as unknown as T; }
  }
  return value;
}
```

Existing `apiClient` (used everywhere in this file): `apiClient.get<T>(url): Promise<T>`, `apiClient.post<T>(url, body?): Promise<T>`.

The 7 consumer call sites that MUST keep working unchanged:
- `InspectorPanel.tsx:36` — `latestVersion?.spec_json?.policy ?? null`
- `AgentStudioPage.tsx:146` — `if (latestVersion?.spec_json) { ... }`
- `AgentStudioPage.tsx:147` — `const spec = latestVersion.spec_json;`
- `AgentStudioPage.tsx:194` — `latestVersion?.spec_json?.tools ?? []`
- `AgentStudioPage.tsx:212` — `latestVersion?.spec_json?.scoring?.weights`
- `AgentStudioPage.tsx:230` — `const spec = latestVersion?.spec_json;`
- `AgentStudioPage.tsx:625` — `const spec = latestVersion?.spec_json;`

All 7 already use optional chaining or `if (...)` guards, so making `spec_json` optional on the interface is safe and required for the safe-default fallback path.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add WireAgentVersion type, mapWireAgentVersion mapper, apply at 4 call sites</name>
  <files>/Users/santhosh/airaie/airaie_platform/frontend/src/api/agents.ts</files>
  <action>
Single-file change to `src/api/agents.ts`. All edits below; no other file is touched.

**Step 1 — Make `AgentVersion.spec_json` optional (line 22).**

Change:
```typescript
spec_json: AgentSpec;
```
to:
```typescript
spec_json?: AgentSpec;
```
This is type-correct for the malformed-input fallback (mapper returns `spec_json: undefined`) and matches every consumer's existing optional-chaining usage. No call site needs to change.

**Step 2 — Add the `WireAgentVersion` interface and `mapWireAgentVersion` exported function.**

Insert these immediately after the `AgentVersion` interface (around line 27, before `AgentSpec`):

```typescript
/**
 * Wire shape returned by the kernel — `spec` is a base64-encoded JSON string
 * of an AgentSpec. We decode it to `spec_json` at the API-client boundary so
 * consumers always work with the parsed `AgentSpec` object (or `undefined`
 * when decoding fails / the field is empty).
 */
export interface WireAgentVersion {
  id: string;
  agent_id: string;
  version: number;
  spec: string;
  status: 'draft' | 'validated' | 'published';
  created_at: string;
  published_at?: string;
}

/**
 * Decode a kernel-wire AgentVersion to the in-app shape.
 * Tolerates: already-object spec, empty string, non-base64 string, malformed JSON.
 * On any decode failure, returns `spec_json: undefined` so optional-chaining
 * call sites fall through to their existing empty-state branches.
 *
 * Pure function. Exported so tests / future call sites can reuse it.
 */
export function mapWireAgentVersion(wire: WireAgentVersion | AgentVersion): AgentVersion {
  // Defensive: if it's already in app shape (e.g. test fixture, double-mapped), pass through.
  if (typeof (wire as WireAgentVersion).spec !== 'string') {
    const w = wire as AgentVersion;
    return {
      id: w.id,
      agent_id: w.agent_id,
      version: w.version,
      spec_json: w.spec_json,
      status: w.status,
      created_at: w.created_at,
      published_at: w.published_at,
    };
  }

  const w = wire as WireAgentVersion;
  let spec_json: AgentSpec | undefined;
  if (w.spec && w.spec.length > 0) {
    try {
      spec_json = JSON.parse(atob(w.spec)) as AgentSpec;
    } catch {
      spec_json = undefined;
    }
  }

  return {
    id: w.id,
    agent_id: w.agent_id,
    version: w.version,
    spec_json,
    status: w.status,
    created_at: w.created_at,
    published_at: w.published_at,
  };
}
```

**Step 3 — Update the response envelope interface and the 4 wrapping functions.**

Replace `AgentVersionsResponse` (around line 97) so it reflects the wire shape:

```typescript
interface AgentVersionsResponse {
  agent_id: string;
  versions: WireAgentVersion[];
  count: number;
}
```

Replace `listAgentVersions` (around line 115):

```typescript
export function listAgentVersions(agentId: string): Promise<AgentVersion[]> {
  return apiClient.get<AgentVersionsResponse>(`/v0/agents/${agentId}/versions`)
    .then((resp) => (resp.versions ?? []).map(mapWireAgentVersion));
}
```

Replace `getAgentVersion` (around line 120):

```typescript
export function getAgentVersion(agentId: string, version: number): Promise<AgentVersion> {
  return apiClient.get<{ version: WireAgentVersion }>(`/v0/agents/${agentId}/versions/${version}`)
    .then((resp) => mapWireAgentVersion(resp.version));
}
```

Replace `createAgentVersion` (around line 136). The REQUEST stays as `{spec_json: specJson}` — only the response is mapped. Inspect the kernel route's actual response shape: per `listAgentVersions` and the verified runtime evidence, the kernel returns the version object directly (not wrapped in `{version: ...}`) for create/publish. We tolerate either shape with a small unwrap to stay safe:

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

Replace `publishAgentVersion` (around line 144) with the same envelope-tolerant pattern:

```typescript
export async function publishAgentVersion(agentId: string, version: number): Promise<AgentVersion> {
  const resp = await apiClient.post<WireAgentVersion | { version: WireAgentVersion }>(
    `/v0/agents/${agentId}/versions/${version}/publish`
  );
  const wire = (resp as { version?: WireAgentVersion }).version ?? (resp as WireAgentVersion);
  return mapWireAgentVersion(wire);
}
```

**Step 4 — Do NOT touch anything else.**

- Do NOT change `validateAgentVersion`, `runAgent`, `listAgents`, `getAgent`, `createAgent`, `deleteAgent`, `listMemories` — none of them return `AgentVersion`.
- Do NOT change `AgentSpec` or any of its sub-interfaces (`AgentToolPermission`, scoring/policy/constraints/llm).
- Do NOT modify `useAgents.ts` hooks — they call these functions and are already typed against `AgentVersion`, which is unchanged in shape (only `spec_json` became optional, which is strictly more permissive).
- Do NOT modify `InspectorPanel.tsx` or `AgentStudioPage.tsx` — all 7 call sites use `?.spec_json?.<x>` or `if (latestVersion?.spec_json)` guards which already handle `undefined`.
- Do NOT add any new imports. The mapper uses only `atob` (browser global) and `JSON.parse` (built-in). It does NOT import from `agentPlayground.ts` — keeping agents.ts self-contained per the constraint.
  </action>
  <verify>
    <automated>cd /Users/santhosh/airaie/airaie_platform/frontend && npx tsc --noEmit</automated>
  </verify>
  <done>
- `mapWireAgentVersion` is exported from `src/api/agents.ts` and is a pure function.
- `WireAgentVersion` interface declares `spec: string` matching the kernel wire shape.
- `AgentVersion.spec_json` is optional (`spec_json?: AgentSpec`).
- All 4 functions (`listAgentVersions`, `getAgentVersion`, `createAgentVersion`, `publishAgentVersion`) route their response through `mapWireAgentVersion` before returning.
- `npx tsc --noEmit` from `airaie_platform/frontend/` exits 0.
- `git diff --stat` shows ONLY `src/api/agents.ts` modified. No other file changed.
- Manual smoke (out of scope for this task's automated verify but expected after merge): visiting `/agents/{publishedAgentId}` shows real Goal text, selected Tools, scoring weight tokens, and policy rules; opening the agent's playground Inspector shows the configured policy card instead of "Policy not configured."
  </done>
</task>

</tasks>

<verification>
- `cd /Users/santhosh/airaie/airaie_platform/frontend && npx tsc --noEmit` → exit 0.
- `git -C /Users/santhosh/airaie/airaie_platform diff --stat frontend/src/api/agents.ts` → exactly one file in the diff stat (the only file in `files_modified`).
- `grep -n "export function mapWireAgentVersion" /Users/santhosh/airaie/airaie_platform/frontend/src/api/agents.ts` → exactly one match.
- `grep -c "mapWireAgentVersion" /Users/santhosh/airaie/airaie_platform/frontend/src/api/agents.ts` → at least 5 (1 declaration + 4 call sites).
- `grep -n "spec_json" /Users/santhosh/airaie/airaie_platform/frontend/src/components/agents/InspectorPanel.tsx /Users/santhosh/airaie/airaie_platform/frontend/src/pages/AgentStudioPage.tsx` → returns the same 7 lines that existed before (no consumer was changed).
</verification>

<success_criteria>
- Mapper added, applied at all 4 wire-decoding sites, no consumer touched.
- Frontend tsc clean.
- Single conventional commit `fix(260425-foi-01): decode AgentVersion spec wire field to spec_json` on the existing repo at `/Users/santhosh/airaie/airaie_platform`.
- After merge + page reload, Inspector "POLICY STATUS" card renders the published spec's policy (verifiable manually against `agent_5e2e700b-0f21-4b1f-9539-bdbd55b8de3a`).
</success_criteria>

<output>
After completion, create `/Users/santhosh/airaie/airaie_platform/.planning/quick/260425-foi-decode-kernel-agent-version-wire-shape-s/260425-foi-01-SUMMARY.md` documenting:
- The wire/in-app shape mismatch found and the mapper added
- Exact lines changed in `src/api/agents.ts` (with before/after for the 4 functions and the interface)
- Confirmation that the 7 consumer call sites in `InspectorPanel.tsx` and `AgentStudioPage.tsx` were NOT modified
- `npx tsc --noEmit` exit status
- The commit hash
</output>
