import { test, expect } from './fixtures/network';

/**
 * Headline smoke: login -> dashboard -> workflows list -> create -> editor -> back.
 *
 * This v1 runs against canned mocks (see `e2e/fixtures/network.ts`) so the
 * suite is self-contained and CI-stable. To run against a real backend,
 * point `E2E_BASE_URL` at it and skip the `mockKernel` fixture.
 */
test.describe('Smoke: workflow CRUD happy path', () => {
  test('user can log in, see workflows, create a new workflow, view it', async ({
    page,
    mockKernel,
  }) => {
    expect(mockKernel.workflows.length).toBeGreaterThan(0);

    // 1. Login
    await page.goto('/login');
    await page.fill('[data-testid=login-email]', 'demo@example.com');
    await page.fill('[data-testid=login-password]', 'demo-password');
    await page.click('[data-testid=login-submit]');

    // 2. Dashboard renders
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('[data-testid=dashboard-page]')).toBeVisible();

    // 3. Navigate to workflows via sidebar
    await page.click('[data-testid=sidebar-workflows]');
    await expect(page).toHaveURL(/\/workflows$/);

    // Seeded workflow from mock state should be visible.
    await expect(page.locator('text=Seeded FEA Workflow')).toBeVisible();

    // 4. Open the create modal and submit.
    await page.click('[data-testid=new-workflow-button]');
    await page.fill('[data-testid=create-workflow-name]', 'E2E Smoke Workflow');
    await page.click('[data-testid=create-workflow-submit]');

    // 5. We end up on the workflow editor (path may carry the new id).
    await expect(page).toHaveURL(/\/workflow-studio(\/.+)?$/);

    // 6. Navigate back to the list, confirm the new workflow is listed.
    await page.click('[data-testid=sidebar-workflows]');
    await expect(page).toHaveURL(/\/workflows$/);
    await expect(page.locator('text=E2E Smoke Workflow').first()).toBeVisible();
  });

  // Placeholder for the more ambitious flow (board + card + run a pipeline).
  // Blocked on stable backend orchestration in CI; revisit once Phase F backend
  // pieces are landable. See COMPLETION_PLAN §7.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip('user can create a board, card, and run a pipeline', async () => {
    // intentionally empty
  });
});
