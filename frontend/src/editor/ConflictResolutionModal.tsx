import { AlertTriangle, RefreshCw, Save, GitMerge } from 'lucide-react';

// ---------------------------------------------------------------------------
// ConflictResolutionModal — Phase 10 / Plan 10-06.
//
// Shown when the canvas's autosave PATCH returns 409 VERSION_CONFLICT
// (someone — usually another tab — saved the same Card/Board between
// the user's read and their save). Three resolutions:
//
//   - **Discard mine** → refetch the server doc and replace the local
//     editor state. The user loses their unsaved keystrokes; they get
//     the latest server doc.
//   - **Overwrite theirs** → force-save with the server's current_version
//     as expected_version. The other tab's changes are dropped.
//   - **Merge (auto)** → naive append-merge: refetch the server doc, then
//     append any blocks the local doc has that the server doesn't. Works
//     for the common case where the two tabs added different blocks at
//     the end. Real 3-way merge with structural overlap detection ships
//     in a later wave; this is a "good enough" first pass.
//
// The modal is intentionally framework-light — plain JSX, no portals
// (rendered next to the editor). Wire it from the page's onError handler.
// ---------------------------------------------------------------------------

export type ConflictResolution = 'discard' | 'overwrite' | 'merge';

interface ConflictResolutionModalProps {
  /** Server's current_version returned in the 409 body. */
  currentVersion: number;
  /** Callback invoked with the user's choice. The page implements each branch. */
  onResolve: (choice: ConflictResolution) => void;
  /** Cancel = leave the modal open until the user picks. */
  onDismiss: () => void;
}

export function ConflictResolutionModal({
  currentVersion,
  onResolve,
  onDismiss,
}: ConflictResolutionModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onDismiss}
    >
      <div
        className="bg-white rounded-[12px] shadow-2xl max-w-[520px] w-full mx-[16px] p-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-[10px] mb-[12px]">
          <AlertTriangle size={20} className="text-[#ef6c00]" aria-hidden="true" />
          <h2
            id="conflict-modal-title"
            className="text-[16px] font-semibold text-[#1a1a1a]"
          >
            Your changes conflict with another save
          </h2>
        </div>
        <p className="text-[13px] text-[#6b6b6b] leading-[1.55] mb-[20px]">
          Someone (likely another tab) saved this canvas after you opened it.
          The server is now at version <strong>{currentVersion}</strong>. Pick
          how to resolve:
        </p>

        <div className="flex flex-col gap-[8px]">
          <button
            type="button"
            onClick={() => onResolve('discard')}
            className="flex items-start gap-[10px] text-left rounded-[8px] border border-[#e8e8e8] px-[12px] py-[10px] hover:bg-[#fafaf7] cursor-pointer"
          >
            <RefreshCw size={16} className="text-[#1976d2] mt-[2px]" aria-hidden="true" />
            <div>
              <div className="text-[13px] font-semibold text-[#1a1a1a]">Discard my changes</div>
              <div className="text-[11px] text-[#6b6b6b]">
                Reload the server's current doc. Your unsaved edits since the
                last successful save are lost.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onResolve('overwrite')}
            className="flex items-start gap-[10px] text-left rounded-[8px] border border-[#e8e8e8] px-[12px] py-[10px] hover:bg-[#fafaf7] cursor-pointer"
          >
            <Save size={16} className="text-[#c62828] mt-[2px]" aria-hidden="true" />
            <div>
              <div className="text-[13px] font-semibold text-[#1a1a1a]">Overwrite their changes</div>
              <div className="text-[11px] text-[#6b6b6b]">
                Force-save your local doc, replacing whatever the other tab saved.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onResolve('merge')}
            className="flex items-start gap-[10px] text-left rounded-[8px] border border-[#e8e8e8] px-[12px] py-[10px] hover:bg-[#fafaf7] cursor-pointer"
          >
            <GitMerge size={16} className="text-[#2e7d32] mt-[2px]" aria-hidden="true" />
            <div>
              <div className="text-[13px] font-semibold text-[#1a1a1a]">Merge (auto)</div>
              <div className="text-[11px] text-[#6b6b6b]">
                Refetch the server doc, append any of your blocks that aren't
                in it. Best for the common case where you and the other tab
                added different things.
              </div>
            </div>
          </button>
        </div>

        <div className="mt-[16px] flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="text-[12px] text-[#6b6b6b] hover:text-[#1a1a1a] underline"
          >
            Decide later
          </button>
        </div>
      </div>
    </div>
  );
}
