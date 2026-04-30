import { useEffect } from 'react';
import { useUiStore } from '@store/uiStore';
import Notification from './Notification';

/**
 * Top-level error notification renderer. Subscribes to uiStore's
 * globalNotification slot and renders the existing <Notification/>
 * primitive at the AppShell root, anchored above the page chrome.
 *
 * G.4.13 / G.4.17 — replaces WorkflowDetailPage's local actionError
 * useState, which was set correctly but never committed (alternate
 * fiber held the value, current never updated; see backlog G.4.17).
 * Mounting at the AppShell root sidesteps whatever was preventing
 * the local-state commit on that page.
 *
 * Auto-dismiss after 5s; user can also click ✕.
 */
export default function GlobalNotification() {
  const notif = useUiStore((s) => s.globalNotification);
  const set = useUiStore((s) => s.setGlobalNotification);

  useEffect(() => {
    if (!notif) return;
    const t = window.setTimeout(() => set(null), 5000);
    return () => window.clearTimeout(t);
  }, [notif, set]);

  if (!notif) return null;

  return (
    <div className="fixed top-[60px] left-1/2 -translate-x-1/2 z-[1000] w-full max-w-[600px] px-4">
      <Notification
        type="error"
        title={notif.title}
        subtitle={notif.subtitle}
        onClose={() => set(null)}
      />
    </div>
  );
}
