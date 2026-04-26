import type { ReactNode } from 'react';

/**
 * CardDetailLayout — body container for the per-card route `/cards/:cardId`.
 *
 * Mirrors WorkflowDetailPage's body container styling: max-width 1200px,
 * centered, gap-6 between children, px/py-6 padding. Wave 2 will add a
 * floating `CardActionBar` at the bottom (the Sensor-Manager-style stepper
 * with AI-Assist Chat); Wave 1 just renders top bar + body slot.
 */
export default function CardDetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] flex flex-col gap-6 px-6 py-6">
      {children}
    </div>
  );
}
