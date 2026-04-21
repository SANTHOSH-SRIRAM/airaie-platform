import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Square, Trash2, Check, Paperclip, ArrowUp } from 'lucide-react';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { useCloseSession, useApproveAction, useSendMessage } from '@hooks/useAgentPlayground';
import { cn } from '@utils/cn';

export default function PlaygroundActionBar() {
  // useParams returns empty here because this bar is rendered via a global
  // bottom-bar slot, not as a route child. Prefer the store value set by
  // AgentPlaygroundPage; fall back to params/default for legacy callers.
  const { agentId: paramAgentId } = useParams<{ agentId?: string }>();
  const storeAgentId = useAgentPlaygroundStore((s) => s.activeAgentId);
  const agentId = storeAgentId ?? paramAgentId ?? null;
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);
  const isAgentRunning = useAgentPlaygroundStore((s) => s.isAgentRunning);
  const isSending = useAgentPlaygroundStore((s) => s.isSending);
  const clearSession = useAgentPlaygroundStore((s) => s.clearSession);
  const setSending = useAgentPlaygroundStore((s) => s.setSending);
  const metrics = useAgentPlaygroundStore((s) => s.metrics);

  const closeSession = useCloseSession(agentId, activeSessionId);
  const approveAction = useApproveAction(agentId, activeSessionId);
  const sendMessageMutation = useSendMessage(agentId, activeSessionId);
  const setChatRunId = useAgentPlaygroundStore((s) => s.setChatRunId);

  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !activeSessionId || isSending) return;
    setSending(true);
    // Send the chat message. The backend's tool-aware LLM may decide to invoke
    // a tool and dispatch a run; if so, the response carries run_id and the
    // RunOutputsPanel subscribes to it.
    sendMessageMutation.mutate(trimmed, {
      onSuccess: (result) => {
        if (result.runId) setChatRunId(result.runId);
      },
      onSettled: () => setSending(false),
    });
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      data-testid="playground-action-bar"
      className="shrink-0 px-6 pt-3 pb-4 bg-[#faf9f6] border-t border-[#ece9e3]"
    >
      {/* Floating control pill — Stop / Clear / Approve + status */}
      <div className="mx-auto mb-3 flex max-w-3xl items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#ece9e3] bg-white px-2 py-1.5 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.06)]">
          <button
            data-testid="stop-agent-btn"
            type="button"
            disabled={!isAgentRunning || !activeSessionId}
            onClick={() => activeSessionId && closeSession.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#fecaca] bg-white px-3 py-1.5 text-[12px] font-medium text-[#e74c3c] hover:bg-[#fef2f2] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Square className="w-3 h-3" strokeWidth={2.5} />
            Stop Agent
          </button>
          <button
            data-testid="clear-session-btn"
            type="button"
            disabled={!activeSessionId}
            onClick={() => clearSession()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e7e3dd] bg-white px-3 py-1.5 text-[12px] font-medium text-[#4f4a43] hover:bg-[#faf8f5] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3 h-3" />
            Clear Session
          </button>
          <button
            data-testid="approve-all-btn"
            type="button"
            disabled={!activeSessionId}
            onClick={() => activeSessionId && approveAction.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#86efac] bg-white px-3 py-1.5 text-[12px] font-medium text-[#16a34a] hover:bg-[#f0fdf4] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-3 h-3" strokeWidth={2.5} />
            Approve All
          </button>
          <span className="ml-2 mr-2 inline-flex items-center gap-1.5 text-[12px] text-[#6f6a63]">
            {isAgentRunning ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse" />
                <span>
                  Agent active
                  {metrics && ` · Step ${metrics.iterations.current}/${metrics.iterations.max} running`}
                </span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#d0cdc8]" />
                <span className="text-[#9b978f]">Agent idle</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Send input row */}
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <div className="relative flex-1">
          <Paperclip className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b978f]" />
          <input
            data-testid="chat-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeSessionId}
            placeholder="Send context or ask a question..."
            className={cn(
              'w-full h-12 pl-10 pr-4 text-[14px] rounded-[14px] bg-white text-[#1f1f1f] placeholder:text-[#9b978f]',
              'border border-[#ece9e3] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.04)]',
              'focus:outline-none focus:border-[#d8b4fe] focus:ring-2 focus:ring-[#f3e8ff]',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          />
        </div>
        <button
          data-testid="send-message-btn"
          type="button"
          onClick={handleSend}
          disabled={!inputValue.trim() || isSending || !activeSessionId}
          className={cn(
            'w-12 h-12 inline-flex items-center justify-center rounded-full shrink-0 transition-colors',
            'bg-[#a855f7] text-white shadow-[0px_4px_12px_0px_rgba(168,85,247,0.3)]',
            'hover:bg-[#9333ea] disabled:bg-[#d0cdc8] disabled:shadow-none disabled:cursor-not-allowed',
          )}
          aria-label="Send"
        >
          <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
