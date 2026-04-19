import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { useCloseSession, useApproveAction, useSendMessage } from '@hooks/useAgentPlayground';
import Button from '@components/ui/Button';
import { cn } from '@utils/cn';

export default function PlaygroundActionBar() {
  const { agentId = 'agent_fea_opt' } = useParams<{ agentId?: string }>();
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);
  const isAgentRunning = useAgentPlaygroundStore((s) => s.isAgentRunning);
  const isSending = useAgentPlaygroundStore((s) => s.isSending);
  const clearSession = useAgentPlaygroundStore((s) => s.clearSession);
  const setSending = useAgentPlaygroundStore((s) => s.setSending);
  const metrics = useAgentPlaygroundStore((s) => s.metrics);

  const closeSession = useCloseSession(agentId, activeSessionId);
  const approveAction = useApproveAction(agentId, activeSessionId);
  const sendMessageMutation = useSendMessage(agentId, activeSessionId);
  const submitUserPrompt = useAgentPlaygroundStore((s) => s.submitUserPrompt);

  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !activeSessionId || isSending) return;
    setSending(true);
    // 1) Persist the message in the session history (chat record)
    sendMessageMutation.mutate(trimmed, {
      onSettled: () => setSending(false),
    });
    // 2) Hand the text to the playground page so it can run the agent's tool
    //    with this text as input (consumed via store).
    submitUserPrompt(trimmed);
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
      className="flex items-center gap-3 h-14 px-4 border-t border-cds-border-subtle bg-cds-layer-01"
    >
      {/* Left: action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          data-testid="stop-agent-btn"
          variant="danger"
          size="sm"
          disabled={!isAgentRunning || !activeSessionId}
          onClick={() => activeSessionId && closeSession.mutate()}
        >
          Stop Agent
        </Button>
        <Button
          data-testid="clear-session-btn"
          variant="secondary"
          size="sm"
          disabled={!activeSessionId}
          onClick={() => clearSession()}
        >
          Clear Session
        </Button>
        <Button
          data-testid="approve-all-btn"
          variant="secondary"
          size="sm"
          disabled={!activeSessionId}
          onClick={() => activeSessionId && approveAction.mutate()}
        >
          Approve All
        </Button>
      </div>

      {/* Center: status */}
      <div className="flex items-center gap-2 text-xs text-cds-text-secondary mx-auto shrink-0">
        {isAgentRunning ? (
          <>
            <span className="w-2 h-2 rounded-full bg-green-50 animate-pulse" />
            <span>
              Agent active
              {metrics && ` \u00b7 Step ${metrics.iterations.current}/${metrics.iterations.max} running`}
            </span>
          </>
        ) : (
          <span className="text-cds-text-placeholder">Agent idle</span>
        )}
      </div>

      {/* Right: chat input */}
      <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
        <input
          data-testid="chat-input"
          type="text"
          className={cn(
            'flex-1 h-8 px-3 text-sm bg-cds-field-01 text-cds-text-primary rounded',
            'border border-cds-border-strong',
            'placeholder:text-cds-text-placeholder',
            'focus:outline-2 focus:outline-cds-focus focus:outline-offset-[-2px]',
          )}
          placeholder="Send a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!activeSessionId}
        />
        <Button
          data-testid="send-message-btn"
          variant="primary"
          size="sm"
          disabled={!inputValue.trim() || isSending || !activeSessionId}
          onClick={handleSend}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
