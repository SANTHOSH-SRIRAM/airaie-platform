import { useMemo, useState } from 'react';
import { Search, MessageSquare, Wrench } from 'lucide-react';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { useSessionList } from '@hooks/useAgentPlayground';
import { extractMessages, extractDecisionTrace } from '@api/agentPlayground';
import type { AgentSession } from '@/types/agentPlayground';
import { cn } from '@utils/cn';

export interface SessionListProps {
  agentId?: string;
}

/** Pretty relative-time stamp ("just now", "2h ago", "Yesterday", "3 days ago"). */
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 172_800_000) return 'Yesterday';
  return `${Math.floor(ms / 86_400_000)} days ago`;
}

/** Compact metrics derived from a session's history + decision trace. */
function sessionMetrics(s: AgentSession): { messages: number; toolCalls: number } {
  const messages = extractMessages(s).length;
  const trace = extractDecisionTrace(s);
  const toolCalls = trace.filter((t) => t.stepType === 'execution').length;
  return { messages, toolCalls };
}

/** First user message becomes the visible session title; falls back to ID. */
function sessionTitle(s: AgentSession): string {
  const msgs = extractMessages(s);
  const firstUser = msgs.find((m) => m.role === 'user');
  if (firstUser?.content) {
    const t = firstUser.content.trim();
    return t.length > 40 ? t.slice(0, 40) + '…' : t;
  }
  return s.id;
}

export default function SessionList({ agentId: propAgentId }: SessionListProps) {
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);
  const setActiveSession = useAgentPlaygroundStore((s) => s.setActiveSession);
  // SidebarContentRouter mounts this without props; read agent from the store
  // (set by AgentPlaygroundPage on mount).
  const storeAgentId = useAgentPlaygroundStore((s) => s.activeAgentId);
  const agentId = propAgentId ?? storeAgentId;
  const [query, setQuery] = useState('');

  const { data: sessions = [], isLoading } = useSessionList(agentId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => sessionTitle(s).toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [sessions, query]);

  // Aggregate stats for the footer
  const stats = useMemo(() => {
    const total = sessions.length;
    const traces = sessions.flatMap(extractDecisionTrace);
    const toolCalls = traces.filter((t) => t.stepType === 'execution').length;
    const succeeded = traces.filter((t) => t.stepType === 'execution' && t.status === 'completed').length;
    const successRate = toolCalls > 0 ? Math.round((succeeded / toolCalls) * 100) : 0;
    const avgConfScores = traces
      .map((t) => (typeof t.detail === 'string' ? parseFloat(t.detail.match(/Score:\s*([\d.]+)/)?.[1] ?? 'NaN') : NaN))
      .filter((n) => !Number.isNaN(n));
    const avgConfidence = avgConfScores.length > 0
      ? avgConfScores.reduce((a, b) => a + b, 0) / avgConfScores.length
      : null;
    return { total, toolCalls, successRate, avgConfidence };
  }, [sessions]);

  return (
    <div data-testid="session-list" className="flex flex-col h-full bg-[#faf9f6]">
      {/* Header + search */}
      <div className="px-3 pt-4 pb-3 border-b border-[#ece9e3]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] font-semibold text-[#1f1f1f]">Sessions</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f0ede8] text-[#6f6a63]">
            {sessions.length}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9b978f]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions..."
            className="w-full h-8 pl-8 pr-2 text-[12px] rounded-[8px] border border-[#ece9e3] bg-white text-[#1f1f1f] placeholder:text-[#9b978f] focus:outline-none focus:border-[#d8b4fe] focus:ring-1 focus:ring-[#f3e8ff]"
          />
        </div>
      </div>

      {/* Session cards */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <p className="px-3 py-4 text-xs text-[#9b978f]">Loading sessions…</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="px-3 py-4 text-xs text-[#9b978f] text-center">
            {sessions.length === 0 ? 'No sessions yet.' : 'No matches.'}
          </p>
        )}
        {filtered.map((s) => {
          const isActive = s.id === activeSessionId;
          const m = sessionMetrics(s);
          return (
            <button
              key={s.id}
              data-testid="session-item"
              onClick={() => setActiveSession(s.id)}
              className={cn(
                'block w-full text-left px-3 py-3 border-b border-[#ece9e3] transition-colors',
                isActive
                  ? 'bg-[#f5f3ff] border-l-2 border-l-[#a855f7]'
                  : 'hover:bg-[#f5f3ef]',
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-[13px] font-semibold text-[#1f1f1f] truncate">
                  {sessionTitle(s)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#8f8a83]">
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> {m.messages}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> {m.toolCalls}
                </span>
                <span className="ml-auto">
                  {isActive ? (
                    <span className="text-[#a855f7] font-medium">● Active now</span>
                  ) : (
                    relativeTime(s.created_at)
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Agent stats footer */}
      <div className="border-t border-[#ece9e3] p-3 space-y-2">
        <p className="text-[10px] font-semibold tracking-wider text-[#9b978f] uppercase">
          Agent Stats
        </p>
        <div className="space-y-1.5 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[#8f8a83]">Total sessions</span>
            <span className="text-[#1f1f1f] font-medium">{stats.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8f8a83]">Tool calls</span>
            <span className="text-[#1f1f1f] font-medium">{stats.toolCalls}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8f8a83]">Avg confidence</span>
            <span className="text-[#1f1f1f] font-medium">
              {stats.avgConfidence != null ? stats.avgConfidence.toFixed(2) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8f8a83]">Success rate</span>
            <span className={cn(
              'inline-flex items-center rounded-[6px] px-2 py-0.5 text-[11px] font-medium',
              stats.toolCalls === 0
                ? 'bg-[#f0ede8] text-[#9b978f]'
                : stats.successRate >= 80
                  ? 'bg-[#dcfce7] text-[#16a34a]'
                  : 'bg-[#fef3c7] text-[#d97706]',
            )}>
              {stats.toolCalls > 0 ? `${stats.successRate}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
