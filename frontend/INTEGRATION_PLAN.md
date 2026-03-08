# AirAIE Platform Integration Plan

> Unifying Board Studio, Workflow Studio, and Agent Studio under one platform at `localhost:3000`

---

## Current State

### Architecture Today

```
localhost:3000  (airaie_platform/frontend)   -- standalone React SPA
localhost:3001  (studios/apps/workflow-studio) -- standalone React SPA
localhost:3002  (studios/apps/agent-studio)    -- standalone React SPA
localhost:3003  (studios/apps/board-studio)    -- standalone React SPA
```

- **No integration** — studios open in new browser tabs via `window.open()`
- **Duplicate shells** — platform has its own Sidebar/Header, studios use `@airaie/shell` package
- **No shared state** — each app has independent Zustand stores, no cross-app communication
- **Duplicate UI libraries** — platform has local `src/components/ui/`, studios use `@airaie/ui`
- **Same backend** — all apps proxy `/v0/*` to `localhost:8080`

### Key Files

| App | Port | Entry | Layout |
|-----|------|-------|--------|
| Platform | 3000 | `airaie_platform/frontend/src/App.tsx` | Local `AppShell` |
| Board Studio | 3003 | `studios/apps/board-studio/src/App.tsx` | Mixed (own Sidebar + `@airaie/shell`) |
| Workflow Studio | 3001 | `studios/apps/workflow-studio/src/App.tsx` | `@airaie/shell` `AppShell` |
| Agent Studio | 3002 | `studios/apps/agent-studio/src/App.tsx` | `@airaie/shell` `AppShell` |

---

## Target State

```
localhost:3000  (airaie_platform/frontend)
  /dashboard                    -- Platform dashboard
  /boards                       -- Board Studio (embedded)
  /boards/:boardId              -- Board detail (fullscreen)
  /boards/:boardId/cards/:cardId -- Card detail
  /workflows                    -- Workflow Studio (embedded)
  /workflows/builder            -- Workflow builder
  /workflows/runs               -- Workflow runs
  /agents                       -- Agent Studio (embedded)
  /agents/builder               -- Agent builder
  /agents/playground            -- Agent playground
  /approvals                    -- Approvals (shared)
  /analytics                    -- Analytics
  /settings                     -- Settings
```

Single URL, single browser tab, unified sidebar navigation, shared header.

---

## Integration Strategy: Iframe Embedding with Message Bus

### Why Iframe (not Module Federation)

| Criteria | Module Federation | Iframe |
|----------|-------------------|--------|
| Setup complexity | High (Vite plugin, shared deps, version alignment) | Low (proxy + route) |
| Studios stay deployable standalone | Requires dual config | Yes, no changes needed |
| Runtime isolation | Shared memory, CSS conflicts | Full isolation |
| Incremental adoption | All-or-nothing | One studio at a time |
| Shared shell chrome | Duplicate or complex host/remote | Platform owns shell, studios go headless |
| Backend proxy | Must align | Already aligned on `/v0` |

### Architecture

```
Platform (localhost:3000)
+-----------------------------------------+
| Header (platform owns)                  |
+---------+-------------------------------+
| Sidebar | Main Content Area             |
| (plat-  |  /dashboard  -> DashboardPage |
|  form   |  /boards     -> <iframe>      |
|  owns)  |     src=localhost:3003/boards  |
|         |  /workflows  -> <iframe>      |
|         |     src=localhost:3001         |
|         |  /agents     -> <iframe>      |
|         |     src=localhost:3002         |
+---------+-------------------------------+
```

Studios render **headless** (no sidebar/header) when embedded. Platform provides the shell.

---

## Phases

### Phase 1: Studio Headless Mode

**Goal:** Studios detect when they're embedded and hide their own shell.

**Changes in `@airaie/shell` (`studios/packages/shell/`):**

1. `AppShell.tsx` — check for `?embedded=true` query param or `window.parent !== window`
2. When embedded: hide Sidebar + Header, render only content area (full width/height)
3. When standalone: render normally (backward compatible)

**Changes in Board Studio (`studios/apps/board-studio/`):**

1. Board Studio uses its own custom Sidebar (not `@airaie/shell`). Add same headless detection.
2. In `App.tsx`: when embedded, skip `ShellLayout` wrapper, render routes directly.

**Estimated scope:** ~4 files changed in `studios/`

---

### Phase 2: Platform Iframe Container

**Goal:** Platform embeds studios in iframes with proper routing sync.

**New components in `airaie_platform/frontend/`:**

1. **`src/components/studio/StudioFrame.tsx`**
   - Generic iframe container component
   - Props: `studioUrl`, `basePath`
   - Full height/width, no border, transparent background
   - Listens for `postMessage` events from studio
   - Syncs platform URL with studio internal route

2. **Update `src/App.tsx` routes:**
   ```
   /boards/*     -> <StudioFrame studioUrl="http://localhost:3003" basePath="/boards" />
   /workflows/*  -> <StudioFrame studioUrl="http://localhost:3001" basePath="/workflows" />
   /agents/*     -> <StudioFrame studioUrl="http://localhost:3002" basePath="/agents" />
   ```

3. **Update Sidebar navigation:**
   - "Active Boards" -> navigates to `/boards` (internal route, no new tab)
   - "Workflows" -> navigates to `/workflows`
   - "Agents" -> navigates to `/agents`
   - Remove `external` prop and `window.open()` calls

**Estimated scope:** 1 new component, ~3 files updated

---

### Phase 3: Message Bus (Platform <-> Studio Communication)

**Goal:** Enable cross-frame communication for navigation sync, breadcrumbs, and actions.

**Message Protocol:**

```typescript
// Platform -> Studio
interface PlatformMessage {
  type: 'NAVIGATE' | 'THEME_CHANGE' | 'USER_CONTEXT';
  payload: unknown;
}

// Studio -> Platform
interface StudioMessage {
  type: 'ROUTE_CHANGE' | 'BREADCRUMB_UPDATE' | 'TITLE_CHANGE' | 'ACTION_REQUEST';
  payload: unknown;
}
```

**New shared types in `studios/packages/shared/`:**
1. `src/types/messages.ts` — message type definitions
2. `src/utils/messageBus.ts` — `postToParent()`, `onParentMessage()` helpers

**Platform side:**
1. `StudioFrame.tsx` — listen for `ROUTE_CHANGE` from studio, update browser URL
2. `Header.tsx` — update breadcrumb based on `BREADCRUMB_UPDATE` messages
3. `Sidebar.tsx` — highlight correct item based on active studio route

**Studio side (in `@airaie/shell`):**
1. On route change, post `ROUTE_CHANGE` to parent
2. On breadcrumb update, post `BREADCRUMB_UPDATE` to parent

**Estimated scope:** ~2 new files in shared, ~4 files updated across platform + shell

---

### Phase 4: Unified Sidebar & Navigation

**Goal:** Platform sidebar becomes the single source of navigation truth.

**Update `airaie_platform/frontend/src/components/layout/Sidebar.tsx`:**

```
DASHBOARD (section)
  Dashboard            /dashboard

WORKSPACE (section)
  Active Boards        /boards
  Toolsets             /toolsets

BUILD (section)
  Parametric Logic     /parametric
  Workflows            /workflows
  Agents               /agents

PROJECT DATA (section)
  Analytics            /analytics
  Approvals            /approvals
  User Access          /access
```

**Active state detection:**
- `/boards`, `/boards/*` -> "Active Boards" highlighted
- `/workflows`, `/workflows/*` -> "Workflows" highlighted
- `/agents`, `/agents/*` -> "Agents" highlighted

**Breadcrumb updates:**
- `/dashboard` -> ABCworld / ENGINEERING
- `/boards` -> ABCworld / ENGINEERING / Board Studio
- `/boards/:id` -> ABCworld / ENGINEERING / Board Studio / {Board Name}
- `/workflows` -> ABCworld / ENGINEERING / Workflow Studio
- `/agents` -> ABCworld / ENGINEERING / Agent Studio

---

### Phase 5: Production Proxy (Nginx)

**Goal:** In production, all studios served from same origin — no CORS, no multiple ports.

**Update `nginx.conf`:**

```nginx
server {
    listen 80;

    # Platform frontend
    location / {
        root /usr/share/nginx/html/platform;
        try_files $uri $uri/ /index.html;
    }

    # Board Studio
    location /studio/boards/ {
        alias /usr/share/nginx/html/board-studio/;
        try_files $uri $uri/ /studio/boards/index.html;
    }

    # Workflow Studio
    location /studio/workflows/ {
        alias /usr/share/nginx/html/workflow-studio/;
        try_files $uri $uri/ /studio/workflows/index.html;
    }

    # Agent Studio
    location /studio/agents/ {
        alias /usr/share/nginx/html/agent-studio/;
        try_files $uri $uri/ /studio/agents/index.html;
    }

    # Backend API
    location /v0/ {
        proxy_pass http://backend:8080;
    }

    location /api/ {
        proxy_pass http://backend:8080;
    }
}
```

**Studio vite configs** — add `base` option for production:
- Board Studio: `base: '/studio/boards/'`
- Workflow Studio: `base: '/studio/workflows/'`
- Agent Studio: `base: '/studio/agents/'`

**StudioFrame.tsx** — use relative URLs in production:
- Dev: `http://localhost:3003`
- Prod: `/studio/boards/`

---

### Phase 6: Polish & Cleanup

**Goal:** Smooth transitions, loading states, error handling.

1. **Loading state** — show skeleton/spinner in StudioFrame while iframe loads
2. **Error boundary** — handle iframe load failures gracefully
3. **Deep linking** — platform URL `/boards/abc-123` correctly navigates studio to that board
4. **Back/forward** — browser history works across platform and studio navigation
5. **Remove duplicate pages** — platform's `WorkflowsPage.tsx` and `AgentsPage.tsx` become thin wrappers or removed (replaced by iframe)
6. **Consistent theme** — ensure studios inherit platform's theme tokens

---

## Implementation Order

| Phase | Effort | Depends On | Risk |
|-------|--------|------------|------|
| 1. Studio Headless Mode | Small | None | Low |
| 2. Platform Iframe Container | Small | Phase 1 | Low |
| 3. Message Bus | Medium | Phase 2 | Medium |
| 4. Unified Sidebar & Navigation | Small | Phase 3 | Low |
| 5. Production Proxy | Medium | Phase 2 | Medium |
| 6. Polish & Cleanup | Medium | Phase 3-4 | Low |

**Recommended start:** Phase 1 + 2 together (can be done in one session), then Phase 3.

---

## File Change Summary

### Studios Monorepo (`studios/`)

| File | Phase | Change |
|------|-------|--------|
| `packages/shell/src/AppShell.tsx` | 1 | Add embedded detection, hide shell |
| `packages/shell/src/Sidebar.tsx` | 1 | Hide when embedded |
| `packages/shell/src/Header.tsx` | 1 | Hide when embedded |
| `apps/board-studio/src/App.tsx` | 1 | Add embedded detection for custom layout |
| `packages/shared/src/types/messages.ts` | 3 | New — message type definitions |
| `packages/shared/src/utils/messageBus.ts` | 3 | New — postMessage helpers |
| `packages/shell/src/AppShell.tsx` | 3 | Post route changes to parent |

### Platform Frontend (`airaie_platform/frontend/`)

| File | Phase | Change |
|------|-------|--------|
| `src/components/studio/StudioFrame.tsx` | 2 | New — iframe container |
| `src/App.tsx` | 2 | Add studio iframe routes |
| `src/components/layout/Sidebar.tsx` | 4 | Update nav items (internal routes) |
| `src/components/layout/SidebarItem.tsx` | 4 | Remove external link handling for studios |
| `src/components/layout/Breadcrumb.tsx` | 4 | Dynamic breadcrumb from message bus |
| `src/constants/routes.ts` | 2 | Add board/workflow/agent studio routes |
| `vite.config.ts` | 2 | Add dev proxy for studio ports |
| `nginx.conf` | 5 | Add studio location blocks |

---

## Open Questions

1. **Board Studio "NEW DESIGN BOARD" button** — should it navigate within the iframe or open the platform route `/boards/new`?
2. **Approvals page** — Board Studio and platform both have one. Which is canonical?
3. **Authentication** — will studios need auth tokens passed from platform, or is auth handled at the backend proxy level?
4. **CAD Studio** (`airaie_cad_studio/`) — is this a separate integration or part of this plan?
5. **Mobile/responsive** — any requirements for sidebar collapse behavior when studio is embedded?
