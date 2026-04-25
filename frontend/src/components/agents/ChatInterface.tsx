import { useEffect, useRef } from 'react';
import { useSessionMessages } from '@hooks/useAgentPlayground';
import ChatMessage from '@components/agents/ChatMessage';

interface ChatInterfaceProps {
  agentId?: string;
  sessionId?: string | null;
  agentName?: string;
}

export default function ChatInterface({ agentId, sessionId = null, agentName = 'Agent' }: ChatInterfaceProps) {
  const { data: messages } = useSessionMessages(agentId, sessionId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll only the messages container (NOT the whole page) when new
  // messages arrive. Using scrollIntoView() on a sentinel <div> bubbles the
  // scroll up to the nearest scrollable ancestor, which can be the window if
  // the layout's overflow chain is broken — that pushed the entire page off
  // screen. Scrolling the container directly keeps the page anchored.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (!sessionId) {
    return (
      <div data-testid="chat-interface" className="flex-1 flex items-center justify-center bg-[#faf9f6]">
        <p data-testid="chat-empty-state" className="text-sm text-[#9b978f]">
          Select a session or create a new one to start chatting.
        </p>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div data-testid="chat-interface" className="flex-1 flex items-center justify-center bg-[#faf9f6]">
        <p data-testid="chat-empty-state" className="text-sm text-[#9b978f]">
          Start the conversation by sending a message below.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="chat-interface" className="flex-1 flex flex-col min-h-0 bg-[#faf9f6]">
      <div
        ref={scrollContainerRef}
        data-testid="chat-messages"
        className="flex-1 overflow-y-auto px-8 py-6"
      >
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} agentName={agentName} />
        ))}
      </div>
    </div>
  );
}
