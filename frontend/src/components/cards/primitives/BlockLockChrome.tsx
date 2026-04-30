import { memo, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// BlockLockChrome — small overlay wrapper that adds a 🔒 chip + tooltip when
// a NodeView (Card or Board canvas) is in a locked mode (Study / Release).
//
// Phase 10 polish (#16). Wraps the actual NodeView body so callers can opt in
// per-block. Does NOT hide / disable the children — the lock is purely
// informational; the upstream Tiptap extension is what actually prevents
// edits via `editable: false` or contentEditable rules.
// ---------------------------------------------------------------------------

interface BlockLockChromeProps {
  locked: boolean;
  reason?: string | null;
  children: ReactNode;
}

function BlockLockChromeImpl({ locked, reason, children }: BlockLockChromeProps) {
  if (!locked) return <>{children}</>;
  return (
    <div className="relative">
      <div
        className="pointer-events-auto absolute right-[8px] top-[8px] z-10 inline-flex items-center gap-[4px] rounded-[5px] bg-[#1a1c19]/85 px-[8px] py-[3px] font-mono text-[10px] uppercase text-white shadow-sm"
        title={reason ?? 'Locked'}
        aria-label={reason ?? 'Locked'}
      >
        <span aria-hidden="true">🔒</span>
        locked
      </div>
      {children}
    </div>
  );
}

export const BlockLockChrome = memo(BlockLockChromeImpl);
export default BlockLockChrome;
