// CardDetailPage — thin lazy wrapper around CardPhase11Page.
//
// Phase 11 replaced the Tiptap-based CardCanvasPage with a static
// 5-stage composition reading the same React Query hooks. The page is
// kept as a separate lazy chunk so the per-card route entry in App.tsx
// stays unchanged across the swap.

import { lazy, Suspense } from 'react';
import PageSkeleton from '@components/ui/PageSkeleton';

const CardPhase11Page = lazy(() => import('./CardPhase11Page'));

export default function CardDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CardPhase11Page />
    </Suspense>
  );
}
