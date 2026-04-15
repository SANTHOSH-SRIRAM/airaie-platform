import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Search, ChevronDown, Sparkles, MoreHorizontal, FileText
} from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';
import CreateAgentModal from '@components/agents/CreateAgentModal';
import { useAgentList, useCreateAgent, agentCrudKeys } from '@hooks/useAgents';
import { useQueryClient } from '@tanstack/react-query';
import type { AgentListItem } from '@api/agents';

function AgentCard({ agent, onClick }: { agent: AgentListItem; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] overflow-hidden relative min-h-[160px] cursor-pointer hover:shadow-[0px_3px_16px_0px_rgba(0,0,0,0.12)] transition-shadow"
    >
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#9b2cdd]" />

      <div className="flex-1 p-5 pl-7 pr-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain size={20} strokeWidth={2.5} className="text-[#9b2cdd] mr-1 drop-shadow" />
            <h2 className="text-[15px] font-semibold text-[#1a1a1a] tracking-tight">{agent.name}</h2>
            <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-medium tracking-wide mt-0.5 bg-[#e8f5e9] text-[#4caf50]">
              Active
            </span>
          </div>
          <button className="text-[#acacac] hover:text-[#6b6b6b] transition-colors rounded">
            <MoreHorizontal size={16} />
          </button>
        </div>

        {/* Description */}
        <div className="mt-3.5 flex items-start gap-2 max-w-[85%]">
          <FileText size={14} strokeWidth={2} className="text-[#acacac] shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#6b6b6b] leading-relaxed">
            {agent.description || 'No description provided.'}
          </p>
        </div>

        {/* Meta Line */}
        <div className="flex items-center gap-5 mt-5">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-[#acacac] mb-1.5">Owner</div>
            <div className="inline-flex items-center gap-1.5 bg-[#f9f0ff] text-[#9b2cdd] px-2 py-1 rounded-[6px] text-[10px] font-medium">
              {agent.owner || '—'}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-[#acacac] mb-1.5">Created</div>
            <div className="inline-flex items-center gap-1.5 bg-[#f5f5f0] text-[#6b6b6b] px-2 py-1 rounded-[6px] text-[10px] font-medium">
              {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Right Decisions Panel */}
      <div className="w-[280px] shrink-0 border-l border-[#f0f0ec] p-5 flex flex-col relative">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#acacac] mb-4">Recent Decisions</h3>
        <div className="flex-1 flex flex-col items-center justify-center -mt-4">
          <span className="text-[12px] text-[#acacac]">No decisions yet</span>
          <button className="text-[11px] font-medium text-[#9b2cdd] hover:underline transition-all mt-6 absolute bottom-5">
            Test in Playground
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((state) => state.setSidebarContentType);
  const hideBottomBar = useUiStore((state) => state.hideBottomBar);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: agents = [], isLoading, error } = useAgentList();
  const createAgent = useCreateAgent();
  const queryClient = useQueryClient();

  useEffect(() => {
    setSidebarContentType('navigation');
    hideBottomBar();
  }, [hideBottomBar, setSidebarContentType]);

  return (
    <div className="mx-auto w-full max-w-[1116px] px-4 pb-12 pt-0 flex flex-col gap-5">
      {/* HEADER */}
      <section className="flex items-center justify-between min-h-[72px] bg-white rounded-[12px] px-6 py-4 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3">
          <Brain size={22} strokeWidth={2.5} className="text-[#9b2cdd]" />
          <h1 className="text-[20px] font-bold tracking-tight text-[#1a1a1a]">Agents</h1>
          <span className="bg-[#f0f0ec] text-[#6b6b6b] px-2.5 py-0.5 rounded-[8px] text-[11px] font-medium mt-0.5">
            {agents.length} agent{agents.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center h-[34px] bg-[#f5f5f0] rounded-[8px] px-3 w-[220px] transition-colors focus-within:bg-[#f0f0ec]">
            <Search size={14} className="text-[#acacac]" />
            <input type="text" placeholder="Search agents..." className="bg-transparent border-none text-[12px] ml-2 w-full focus:outline-none placeholder:text-[#949494]" />
          </div>

          <div className="relative w-[110px]">
            <button className="flex items-center justify-between w-full h-[34px] bg-[#f5f5f0] hover:bg-[#f0f0ec] transition-colors rounded-[8px] px-3 text-[12px] text-[#6b6b6b]">
              All Status <ChevronDown size={14} className="text-[#acacac]"/>
            </button>
          </div>

          <div className="relative w-[120px]">
            <button className="flex items-center justify-between w-full h-[34px] bg-[#f5f5f0] hover:bg-[#f0f0ec] transition-colors rounded-[8px] px-3 text-[12px] text-[#6b6b6b]">
              Most Active <ChevronDown size={14} className="text-[#acacac]"/>
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="h-[34px] px-4 bg-[#9b2cdd] hover:bg-[#8a24c7] text-white rounded-[8px] text-[12px] font-semibold flex items-center gap-2 ml-1 transition-colors shadow-sm"
          >
            <Sparkles size={14} strokeWidth={2.5} /> New Agent
          </button>
        </div>
      </section>

      {/* CARDS LIST */}
      <div className="flex flex-col gap-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-[#6b6b6b]">Loading agents...</span>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-[#e74c3c]">Failed to load agents. Is the backend running on localhost:8080?</span>
          </div>
        )}
        {!isLoading && !error && agents.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-[#6b6b6b]">No agents yet. Create one to get started.</span>
          </div>
        )}
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} onClick={() => navigate(`/agent-studio/${agent.id}`)} />
        ))}
      </div>

      <CreateAgentModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (data) => {
          try {
            const newAgent = await createAgent.mutateAsync({
              name: data.name,
              description: data.goal,
            });
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: agentCrudKeys.list() });
            navigate(`/agent-studio/${newAgent.id}`);
          } catch {
            // CreateAgentModal should show its own error; do not close on failure
          }
        }}
      />
    </div>
  );
}
