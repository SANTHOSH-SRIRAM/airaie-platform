import { useEffect, useRef } from 'react';
import { useSessionMessages } from '@hooks/useAgentPlayground';
import ChatMessage from '@components/agents/ChatMessage';

interface ChatInterfaceProps {
  agentId?: string;
  sessionId?: string | null;
}

export default function ChatInterface({ agentId = 'agent_fea_opt', sessionId = null }: ChatInterfaceProps) {
  const { data: messages } = useSessionMessages(agentId, sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!sessionId) {
    return (
      <div data-testid="chat-interface" className="flex-1 flex items-center justify-center">
        <p data-testid="chat-empty-state" className="text-sm text-cds-text-secondary">
          Select a session or create a new one to start chatting.
        </p>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div data-testid="chat-interface" className="flex-1 flex items-center justify-center">
        <p data-testid="chat-empty-state" className="text-sm text-cds-text-secondary">
          Start the conversation by sending a message below.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="chat-interface" className="flex-1 flex flex-col min-h-0">
      <div data-testid="chat-messages" className="flex-1 overflow-y-auto px-6 py-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
