# E2E Testing (Playwright)

End-to-end smoke for the AirAIE platform frontend. Phase F item.

## Run locally

```bash
npm install
npx playwright install chromium    # one-time browser fetch
npm run test:e2e                   # headless smoke (auto-launches Vite dev server)
npm run test:e2e:ui                # interactive UI mode
npm run test:e2e:debug             # step debugger
```

The Vite dev server is launched automatically by Playwright (`webServer` block
in `playwright.config.ts`). Set `E2E_NO_SERVER=1` to skip auto-launch.

## Layout

```
e2e/
  fixtures/
    network.ts        # Playwright fixture installing /v0/* route mocks
  smoke.spec.ts       # Headline smoke: login → dashboard → workflow CRUD
```

## Mocking strategy

The v1 smoke uses **mocked /v0/\* responses** so it runs deterministically
without a live kernel. See `e2e/fixtures/network.ts` for the canned responses;
each shape mirrors the real backend envelopes consumed by `src/api/*.ts`.

To extend mocks, add a `page.route(...)` handler in `installKernelMocks` that
returns the shape your page expects. Routes covered today:

- `POST /v0/auth/login`, `GET /v0/auth/whoami`, `POST /v0/auth/logout|refresh`
- `GET /v0/workflows` (list), `POST /v0/workflows` (create)
- `GET /v0/workflows/:id`, `GET /v0/workflows/:id/versions|triggers`
- Dashboard list endpoints: `/v0/agents`, `/v0/runs`, `/v0/boards`,
  `/v0/tools`, `/v0/gates`, `/v0/pipelines`, `/v0/health`
- Catch-all `**/v0/**` returns `{}` so unmocked endpoints don't break the run

## Live-backend variant

```bash
E2E_BASE_URL=http://localhost:3000 E2E_NO_SERVER=1 npm run test:e2e
```

Requires a running kernel at `http://localhost:8080` and a real demo user
(`demo@example.com`). Today the smoke `beforeEach` installs mocks
unconditionally; toggle that fixture or guard with an env flag to use live
data.

## Selectors

Smoke selectors use `data-testid`. New IDs added for the smoke:

- `login-email`, `login-password`, `login-submit`
- `dashboard-page`
- `sidebar-workflows`
- `new-workflow-button`
- `create-workflow-name`, `create-workflow-submit`

Existing `data-testid` convention was already in use across UI components
(`page-skeleton`, `error-state`, `tool-card-grid`, etc.).

## CI

Not wired yet — follow-up. The smoke completes in <60s locally and is
intended to gate CI in a subsequent PR.
