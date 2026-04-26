import { test as base, type Page } from '@playwright/test';

/**
 * Mock kernel fixture — installs route handlers for every `/v0/*` endpoint
 * the smoke flow traverses, returning canned responses that match the shapes
 * produced by `frontend/src/api/*.ts` mappers.
 *
 * If a real backend is desired, set `E2E_BASE_URL` and rewrite the smoke
 * `beforeEach` to skip `mockKernel`.
 */

// Build a JWT-shaped string with an `exp` payload far in the future so
// `AuthContext.isTokenExpired` accepts it (b64-decoded JSON middle segment).
function makeFakeJwt(): string {
  // Use standard base64 (not base64url) — AuthContext decodes the middle
  // segment with browser `atob`, which doesn't accept URL-safe chars.
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({ sub: 'demo-user', exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString('base64');
  return `${header}.${payload}.sig`;
}

interface MockState {
  workflows: Array<{
    id: string;
    project_id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
  }>;
  nextWorkflowSeq: number;
}

export async function installKernelMocks(page: Page): Promise<MockState> {
  const state: MockState = {
    workflows: [
      {
        id: 'wf_seed_001',
        project_id: 'proj_default',
        name: 'Seeded FEA Workflow',
        description: 'Seeded for E2E smoke test',
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T10:00:00Z',
      },
    ],
    nextWorkflowSeq: 2,
  };

  // Playwright evaluates routes in REVERSE registration order (most-recent
  // first). Register the catch-all FIRST so specific handlers below override
  // it.
  await page.route('**/v0/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // POST /v0/auth/login → access/refresh tokens
  await page.route('**/v0/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: makeFakeJwt(),
        refresh_token: makeFakeJwt(),
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    });
  });

  // GET /v0/auth/whoami → user profile
  await page.route('**/v0/auth/whoami', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user_id: 'usr_demo',
        email: 'demo@example.com',
        name: 'Demo User',
        role: 'admin',
      }),
    });
  });

  // POST /v0/auth/logout / refresh — best-effort no-op.
  await page.route('**/v0/auth/logout', async (route) =>
    route.fulfill({ status: 204, body: '' })
  );
  await page.route('**/v0/auth/refresh', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: makeFakeJwt(),
        refresh_token: makeFakeJwt(),
      }),
    })
  );

  // GET/POST /v0/workflows
  await page.route('**/v0/workflows', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ workflows: state.workflows }),
      });
      return;
    }
    if (method === 'POST') {
      const body = JSON.parse((route.request().postData() ?? '{}') as string);
      const id = `wf_e2e_${state.nextWorkflowSeq++}`;
      const now = new Date().toISOString();
      const wf = {
        id,
        project_id: 'proj_default',
        name: body.name ?? 'Untitled',
        description: body.description ?? '',
        created_at: now,
        updated_at: now,
      };
      state.workflows = [wf, ...state.workflows];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id, workflow: wf }),
      });
      return;
    }
    await route.continue();
  });

  // GET /v0/workflows/:id (detail envelope)
  await page.route(/.*\/v0\/workflows\/[^/]+$/, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const url = new URL(route.request().url());
    const id = url.pathname.split('/').pop()!;
    const wf =
      state.workflows.find((w) => w.id === id) ?? {
        id,
        project_id: 'proj_default',
        name: 'Unknown Workflow',
        description: '',
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T10:00:00Z',
      };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workflow: wf, versions: [] }),
    });
  });

  // GET /v0/workflows/:id/versions
  await page.route(/.*\/v0\/workflows\/[^/]+\/versions$/, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ versions: [] }),
    });
  });

  // GET /v0/workflows/:id/triggers
  await page.route(/.*\/v0\/workflows\/[^/]+\/triggers$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ triggers: [] }),
    });
  });

  // Dashboard composes from these list endpoints.
  await page.route(/.*\/v0\/agents(\?.*)?$/, async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ agents: [] }),
    })
  );

  await page.route(/.*\/v0\/runs(\?.*)?$/, async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ runs: [] }),
    })
  );

  await page.route(/.*\/v0\/boards(\?.*)?$/, async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ boards: [] }),
    })
  );

  await page.route(/.*\/v0\/health$/, async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', uptime_seconds: 1234 }),
    })
  );

  await page.route(/.*\/v0\/tools(\?.*)?$/, async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tools: [] }),
    })
  );

  await page.route(/.*\/v0\/gates(\?.*)?$/, async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ gates: [] }),
    })
  );

  await page.route(/.*\/v0\/pipelines(\?.*)?$/, async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ pipelines: [] }),
    })
  );

  return state;
}

interface KernelMockFixture {
  mockKernel: MockState;
}

export const test = base.extend<KernelMockFixture>({
  mockKernel: async ({ page }, use) => {
    const state = await installKernelMocks(page);
    await use(state);
  },
});

export { expect } from '@playwright/test';
