import { Brain } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/agentPlayground';
import ToolCallProposalCard from '@components/agents/ToolCallProposalCard';
import InlineToolCallCard from '@components/agents/InlineToolCallCard';

interface ChatMessageProps {
  message: ChatMessageType;
  agentName?: string;
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

export default function ChatMessage({ message, agentName = 'Agent' }: ChatMessageProps) {
  const { role, content, timestamp, toolCallProposal, runId, approvalId } = message;

  if (role === 'user') {
    return (
      <div data-testid="chat-message" className="flex justify-end mb-5">
        <div data-testid="chat-message-user" className="max-w-[75%]">
          <div className="bg-[#1f1f1f] text-white rounded-[16px] rounded-br-[6px] px-5 py-3 text-[14px] leading-relaxed shadow-sm">
            {content}
          </div>
          <p className="mt-1.5 text-right text-[11px] text-[#9b978f]">
            You · {formatRelativeTime(timestamp)}
          </p>
        </div>
      </div>
    );
  }

  if (role === 'agent') {
    return (
      <div data-testid="chat-message" className="flex gap-3 mb-5">
        {/* Purple brain avatar to match the mockup */}
        <div className="mt-0.5 w-7 h-7 rounded-full bg-[#f3e8ff] flex items-center justify-center shrink-0">
          <Brain className="w-3.5 h-3.5 text-[#a855f7]" strokeWidth={2.2} />
        </div>
        <div data-testid="chat-message-agent" className="max-w-[75%] flex-1 min-w-0">
          {content && (
            <div className="bg-white border border-[#ece9e3] text-[#1f1f1f] rounded-[16px] rounded-bl-[6px] px-5 py-3 text-[14px] leading-relaxed shadow-sm">
              {content}
            </div>
          )}
          {toolCallProposal && (
            <div className="mt-3">
              <ToolCallProposalCard proposal={toolCallProposal} />
            </div>
          )}
          {runId && (
            <div className="mt-3">
              <InlineToolCallCard runId={runId} approvalId={approvalId} />
            </div>
          )}
          <p className="mt-1.5 text-[11px] text-[#9b978f]">
            {agentName} · {formatRelativeTime(timestamp)}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
