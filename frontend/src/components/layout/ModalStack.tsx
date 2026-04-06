import { useEffect } from 'react';
import { useUiStore } from '@store/uiStore';

export default function ModalStack() {
  const modals = useUiStore((s) => s.modals);
  const popModal = useUiStore((s) => s.popModal);

  // Close top modal on Escape key
  useEffect(() => {
    if (modals.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        popModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modals.length, popModal]);

  if (modals.length === 0) return null;

  return (
    <div
      data-testid="modal-stack"
      className="fixed inset-0"
      style={{ zIndex: 'var(--z-modal)' } as React.CSSProperties}
    >
      {modals.map((modal, index) => (
        <div
          key={modal.id}
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 500 + index }}
        >
          {/* Overlay — click to dismiss */}
          <div
            className="absolute inset-0 bg-surface-overlay"
            onClick={popModal}
            aria-hidden="true"
          />
          {/* Modal content placeholder — will be replaced with a registry lookup */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={modal.component}
            className="relative bg-surface rounded-lg shadow-xl max-w-lg w-full mx-4 p-6"
          >
            <p className="text-sm text-text-secondary">
              Modal: {modal.component} (id: {modal.id})
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
