import { useEffect, useRef } from 'react';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { useMessages } from '@hooks/useAgentPlayground';
import ChatMessage from '@components/agents/ChatMessage';

export default function ChatInterface() {
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);
  const setMessages = useAgentPlaygroundStore((s) => s.setMessages);
  const { data: messages } = useMessages(activeSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync fetched messages into store
  useEffect(() => {
    if (messages) {
      setMessages(messages);
    }
  }, [messages, setMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeSessionId) {
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
