/**
 * VersionPanel test plan — placeholder.
 *
 * Testing infrastructure (vitest + @testing-library/react + jsdom) is not yet
 * installed in this frontend package (see frontend/package.json — no `test`
 * script, no `vitest` devDep, no `@testing-library/*` deps). This file is
 * intentionally empty so that `npx tsc --noEmit` stays clean and so that
 * Phase B3 has a clear marker of what to cover once a runner is in place.
 *
 * When testing is wired up, cover the following cases:
 *
 *   1. Renders 3 versions, newest first
 *      - Mock useWorkflowVersions to return [{version:1},{version:2},{version:3}]
 *        in arbitrary order, assert DOM order is v3, v2, v1.
 *
 *   2. Active version row shows the selection rail + "Active" indicator
 *      - selectedVersion=2 → row for v2 has the 4px #2196f3 left rail and
 *        the inline "Active" label is present.
 *
 *   3. Publish button only on `compiled` status
 *      - Mock versions with status draft / compiled / published.
 *      - Only the compiled row has a "Publish" button.
 *
 *   4. Click row → onSelectVersion fires with correct version number
 *      - Render with onSelectVersion=vi.fn(), click v2 row, assert mock was
 *        called with 2.
 *
 *   5. Click Publish → usePublishWorkflowVersion mutate is called and the
 *      success flash appears on success / error flash on failure.
 *
 *   6. Empty state when versions = []
 *      - Renders "No versions yet — save the editor to create v1".
 *
 *   7. Loading state while isLoading
 *      - Renders three skeleton rows.
 *
 *   8. workflowId='' — renders empty state, does not crash, hooks short-circuit
 *      (useWorkflowVersions has `enabled: !!workflowId`).
 *
 *   9. Error state surfaces error.message.
 *
 *  10. Close button only renders when onClose is provided; clicking it calls
 *      onClose exactly once.
 */

import { describe, it } from 'vitest';

describe.skip('VersionPanel', () => {
  it('test plan documented above; @testing-library/react not yet installed', () => {});
});
