import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useAgentList } from '@hooks/useAgents';
import {
  useCreateSession,
  useSendMessage,
  useSession,
} from '@hooks/useAgentPlayground';
import { extractMessages } from '@api/agentPlayground';
import type { Card } from '@/types/card';
import type { IntentSpec } from '@/types/intent';
import type { ChatMessage } from '@/types/agentPlayground';

// ---------------------------------------------------------------------------
// CardChatDrawer — Card-aware persistent chat drawer (Phase 11 §7.2).
//
// Bottom-pinned drawer (480px tall, full width). Reuses the agent
// playground session APIs:
//   - Auto-picks the first agent from useAgentList (falls back to a "no
//     agents configured" empty state when the project has none yet).
//   - Lazily createSession on first user message; sessionId is persisted
//     in localStorage keyed by cardId so reopening the drawer recovers
//     the conversation.
//   - useSession polls every 3s for new assistant messages.
//
// Card context is surfaced as a top "system" bubble so users see what
// the agent has been told without inspecting raw context. Real
// context-injection (so the agent actually USES this state for tool
// selection) is a backend prompt-template concern; the visual surface
// here makes the contract obvious.
// ---------------------------------------------------------------------------

interface CardChatDrawerProps {
  open: boolean;
  card: Card;
  intent: IntentSpec | undefined;
  onClose: () => void;
  /** Optional pre-filled message to seed the composer. When set, the
   *  composer takes this value the next time the drawer opens — letting
   *  callers (e.g. "Diagnose this failure" button) prime a structured
   *  prompt the user can edit before sending. */
  initialDraft?: string;
}

function storageKeyFor(cardId: string): string {
  return `airaie:card-chat-session:${cardId}`;
}

function readSessionId(cardId: string): string | null {
  try {
    return window.localStorage.getItem(storageKeyFor(cardId));
  } catch {
    return null;
  }
}

function writeSessionId(cardId: string, sessionId: string): void {
  try {
    window.localStorage.setItem(storageKeyFor(cardId), sessionId);
  } catch {
    // ignore — chat still works in-session, just won't persist
  }
}

function buildContextSummary(card: Card, intent: IntentSpec | undefined): string {
  const bits: string[] = [];
  bits.push(`card: ${card.id} (${card.title})`);
  bits.push(`status: ${card.status}`);
  if (intent) {
    bits.push(`intent_type: ${intent.intent_type}`);
    bits.push(`goal: ${intent.goal.slice(0, 80)}${intent.goal.length > 80 ? '…' : ''}`);
    bits.push(`KPIs: ${intent.acceptance_criteria.length}`);
    bits.push(`inputs: ${intent.inputs.length}`);
  }
  return bits.join(' · ');
}

function ContextBubble({ summary }: { summary: string }) {
  return (
    <div className="self-stretch rounded-[10px] bg-[#ff9800]/[0.08] px-[14px] py-[10px]">
      <div className="flex items-start gap-[8px]">
        <span className="font-mono text-[12px] text-[#8b5000]" aria-hidden="true">
          ✦
        </span>
        <div className="flex flex-col gap-[2px]">
          <span className="font-sans text-[10px] uppercase tracking-wide text-[#8b5000]">
            Card context loaded
          </span>
          <span className="font-mono text-[11px] text-[#554433]">{summary}</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'max-w-[640px] rounded-[10px] border border-[#1a1c19]/10 bg-white px-[14px] py-[10px] font-sans text-[13px] text-[#1a1c19]'
            : 'max-w-[640px] rounded-[10px] border-l-[3px] border-[#ff9800]/50 bg-[#f5f5f0] px-[14px] py-[10px] font-sans text-[13px] text-[#1a1c19]'
        }
      >
        <p className="whitespace-pre-wrap leading-[1.5]">{message.content}</p>
        {message.runId ? (
          <span className="mt-[4px] block font-mono text-[10px] text-[#8b5000]">
            ↻ tool run: {message.runId}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CardChatDrawerImpl({
  open,
  card,
  intent,
  onClose,
  initialDraft,
}: CardChatDrawerProps) {
  // Pick first agent. Fail gracefully if project has none.
  const { data: agents } = useAgentList();
  const agentId = useMemo(() => agents?.[0]?.id ?? null, [agents]);

  // Persisted session id — lazy-created on first send.
  const [sessionId, setSessionId] = useState<string | null>(() => readSessionId(card.id));
  const [draft, setDraft] = useState('');

  // When the drawer opens with a fresh initialDraft, seed the composer.
  // The empty-string sentinel is intentionally ignored so reopening with
  // no seed doesn't wipe an in-progress draft.
  useEffect(() => {
    if (open && initialDraft && initialDraft !== draft) {
      setDraft(initialDraft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDraft]);

  const session = useSession(agentId ?? '', sessionId);
  const createSession = useCreateSession(agentId ?? '');
  const sendMessage = useSendMessage(agentId, sessionId);

  // Auto-scroll on new messages.
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = useMemo<ChatMessage[]>(() => {
    return session.data ? extractMessages(session.data) : [];
  }, [session.data]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  // ESC closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const summary = buildContextSummary(card, intent);
  const sending = sendMessage.isPending || createSession.isPending;
  const ready = draft.trim().length > 0 && !!agentId && !sending;

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !agentId) return;
    try {
      // Lazy session create.
      let sid = sessionId;
      if (!sid) {
        const newSession = await createSession.mutateAsync();
        sid = newSession.id;
        setSessionId(sid);
        writeSessionId(card.id, sid);
      }
      // Optimistically clear draft; the server-side message + agent reply
      // will appear on the next session poll.
      setDraft('');
      // sendMessage hook closure was bound to the previous (null) sessionId.
      // Hit the API directly with the freshly-created session id.
      const { sendMessage: sendDirect } = await import('@api/agentPlayground');
      await sendDirect(agentId, sid, content);
      // Re-poll the session immediately so the user sees their message.
      session.refetch();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Card chat send failed:', err);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside
      role="dialog"
      aria-label="Card chat"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-[480px] flex-col border-t border-[#ebebe6] bg-white shadow-[0_-8px_28px_rgba(0,0,0,0.08)]"
    >
      <header className="flex items-center justify-between gap-[12px] border-b border-[#ebebe6] px-[24px] py-[14px]">
        <div className="flex items-center gap-[10px]">
          <span aria-hidden="true">💬</span>
          <h2 className="font-sans text-[15px] font-medium text-[#1a1c19]">
            Card chat — <span className="font-mono text-[#8b5000]">{card.id}</span>
          </h2>
          <span className="rounded-[4px] bg-[#ff9800]/[0.12] px-[8px] py-[3px] font-mono text-[10px] uppercase tracking-wide text-[#8b5000]">
            Card-aware · read-only tools
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[8px] p-[6px] font-mono text-[14px] text-[#554433]/60 hover:bg-[#f5f5f0]"
          aria-label="Close chat"
        >
          ✕
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-[24px] py-[16px]">
        {!agentId ? (
          <p className="py-[24px] text-center font-sans text-[13px] text-[#554433]/70">
            No agents configured for this project. Create an agent first to enable Card chat.
          </p>
        ) : (
          <div className="flex flex-col gap-[12px]">
            <ContextBubble summary={summary} />
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {messages.length === 0 ? (
              <p className="py-[12px] text-center font-sans text-[13px] text-[#554433]/55">
                Ask anything about this card · its inputs, plan, last run, evidence, or sibling cards.
              </p>
            ) : null}
            {sending ? (
              <div className="flex justify-start">
                <div className="rounded-[10px] border-l-[3px] border-[#ff9800]/50 bg-[#f5f5f0] px-[14px] py-[10px] font-sans text-[13px] text-[#554433]/70">
                  <span className="animate-pulse">thinking…</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-[8px] border-t border-[#ebebe6] px-[24px] py-[14px]">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          disabled={!agentId || sending}
          placeholder={
            agentId
              ? 'Ask about this card, its runs, evidence, or siblings… (↵ send · ⇧↵ newline)'
              : 'No agent configured.'
          }
          className="w-full resize-none rounded-[10px] border border-[#1a1c19]/10 bg-white px-[12px] py-[8px] font-sans text-[13px] text-[#1a1c19] placeholder:text-[#554433]/45 focus:border-[#ff9800]/50 focus:outline-none focus:ring-2 focus:ring-[#ff9800]/20 disabled:bg-[#f5f5f0]/50"
        />
        <div className="flex items-center justify-between">
          <span className="font-sans text-[11px] text-[#554433]/55">
            {messages.length} turn{messages.length === 1 ? '' : 's'} · history saved server-side
          </span>
          <button
            type="button"
            disabled={!ready}
            onClick={handleSend}
            className="rounded-[8px] bg-[#ff9800] px-[14px] py-[6px] font-sans text-[12px] font-medium text-white transition-colors hover:bg-[#ff9800]/90 disabled:cursor-not-allowed disabled:bg-[#ff9800]/30"
          >
            {sending ? 'Sending…' : 'Send ➤'}
          </button>
        </div>
      </footer>
    </aside>
  );
}

export const CardChatDrawer = memo(CardChatDrawerImpl);
export default CardChatDrawer;
