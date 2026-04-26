import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, Copy, Check } from 'lucide-react';
import Badge from '@components/ui/Badge';
import {
  type AuditEvent,
  decodeAuditPayload,
  eventTypeColor,
} from '@api/audit';

interface AuditEventDrawerProps {
  event: AuditEvent | null;
  onClose: () => void;
}

/**
 * Slide-in drawer (right, 480px) showing the full audit event payload.
 *
 * A11y: role="dialog", Escape closes, focus moves to the close button on open,
 * background scroll is locked while open. Backdrop click also closes.
 */
export default function AuditEventDrawer({ event, onClose }: AuditEventDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!event) return;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [event, onClose]);

  if (!event) return null;

  const payload = decodeAuditPayload(event.payload);
  const payloadJSON = payload ? JSON.stringify(payload, null, 2) : null;

  async function copyJSON() {
    if (!payloadJSON) return;
    try {
      await navigator.clipboard.writeText(payloadJSON);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in some browsers/contexts; fail silently.
    }
  }

  return (
    <div className="fixed inset-0 z-[9000]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Audit event details"
        className="absolute top-0 right-0 h-full w-[480px] max-w-full bg-white border-l border-[#ece9e3] shadow-xl flex flex-col"
      >
        <header className="flex items-center justify-between px-4 h-12 border-b border-[#ece9e3]">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant={eventTypeColor(event.event_type)}>{event.event_type}</Badge>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="p-2 text-[#6b6b6b] hover:bg-[#f5f3ef] rounded"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 text-[12px] text-[#3a3a3a]">
          <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 mb-4">
            <Field label="Event ID" value={<code className="font-mono text-[12px] break-all">{event.id}</code>} />
            <Field label="Created" value={new Date(event.created_at).toLocaleString()} />
            <Field label="Actor" value={<code className="font-mono text-[12px]">{event.actor || '—'}</code>} />
            <Field label="Project" value={<code className="font-mono text-[12px]">{event.project_id}</code>} />
            {event.run_id && <Field label="Run" value={<code className="font-mono text-[12px] break-all">{event.run_id}</code>} />}
            {event.node_id && <Field label="Node" value={<code className="font-mono text-[12px] break-all">{event.node_id}</code>} />}
            {event.board_id && <Field label="Board" value={<code className="font-mono text-[12px] break-all">{event.board_id}</code>} />}
            {event.gate_id && <Field label="Gate" value={<code className="font-mono text-[12px] break-all">{event.gate_id}</code>} />}
          </dl>

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[12px] font-semibold text-[#1a1a1a] uppercase tracking-wide">Payload</h3>
            {payloadJSON && (
              <button
                onClick={copyJSON}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-[#6b6b6b] hover:bg-[#f5f3ef] rounded"
                aria-label="Copy payload as JSON"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy as JSON'}
              </button>
            )}
          </div>

          {payloadJSON ? (
            <pre className="bg-[#fafaf8] border border-[#ece9e3] rounded p-3 text-[12px] font-mono text-[#1a1a1a] whitespace-pre-wrap break-words overflow-x-auto">
              <HighlightedJSON json={payloadJSON} />
            </pre>
          ) : (
            <div className="text-[12px] text-[#9b978f] italic">No payload</div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-[#9b978f] uppercase text-[10px] tracking-wide pt-0.5">{label}</dt>
      <dd className="text-[#1a1a1a] min-w-0">{value}</dd>
    </>
  );
}

/**
 * Tiny inline JSON syntax highlighter (no external dep). Highlights:
 *  - keys (purple), strings (green), numbers (blue), booleans/null (orange).
 * Pre-formatted JSON (already indented) goes in; React nodes come out.
 */
function HighlightedJSON({ json }: { json: string }) {
  // Single-pass regex tokenizer. Order matters: strings (and keys) first to
  // avoid matching numbers/keywords that live inside string values.
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(json)) !== null) {
    if (m.index > last) parts.push(json.slice(last, m.index));
    if (m[1]) {
      // String literal — if followed by ":", treat as a key.
      if (m[2]) {
        parts.push(<span key={i++} className="text-purple-700">{m[1]}</span>);
        parts.push(<span key={i++}>{m[2]}</span>);
      } else {
        parts.push(<span key={i++} className="text-emerald-700">{m[1]}</span>);
      }
    } else if (m[3]) {
      parts.push(<span key={i++} className="text-amber-700">{m[3]}</span>);
    } else if (m[4]) {
      parts.push(<span key={i++} className="text-blue-700">{m[4]}</span>);
    }
    last = re.lastIndex;
  }
  if (last < json.length) parts.push(json.slice(last));
  return <>{parts}</>;
}
