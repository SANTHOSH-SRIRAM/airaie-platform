import type { ChatMessage as ChatMessageType } from '@/types/agentPlayground';
import Avatar from '@components/ui/Avatar';
import ToolCallProposalCard from '@components/agents/ToolCallProposalCard';
import { cn } from '@utils/cn';

interface ChatMessageProps {
  message: ChatMessageType;
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { role, content, timestamp, toolCallProposal } = message;

  if (role === 'user') {
    return (
      <div data-testid="chat-message" className="flex justify-end mb-4">
        <div data-testid="chat-message-user" className="max-w-[75%]">
          <div className="bg-gray-80 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
            {content}
          </div>
          <p className="mt-1 text-right text-xs text-cds-text-secondary">
            {formatRelativeTime(timestamp)}
          </p>
        </div>
      </div>
    );
  }

  if (role === 'agent') {
    return (
      <div data-testid="chat-message" className="flex gap-2 mb-4">
        <Avatar name="AI" size="sm" className="rounded-full mt-0.5" />
        <div data-testid="chat-message-agent" className="max-w-[75%]">
          {content && (
            <div className="bg-gray-20 text-cds-text-primary rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed">
              {content}
            </div>
          )}
          {toolCallProposal && (
            <ToolCallProposalCard proposal={toolCallProposal} />
          )}
          <p className="mt-1 text-xs text-cds-text-secondary">
            {formatRelativeTime(timestamp)}
          </p>
        </div>
      </div>
    );
  }

  // system message — not in current types but handled gracefully
  return null;
}
