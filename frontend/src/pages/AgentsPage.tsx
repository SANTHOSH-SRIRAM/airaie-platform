import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Search, ChevronDown, Sparkles, Wrench, MoreHorizontal, FileText
} from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';
import CreateAgentModal from '@components/agents/CreateAgentModal';

const AGENTS_DATA = [
  {
    id: 'fea-optimizer',
    name: 'FEA Optimizer Agent',
    status: 'Published',
    version: 'v2',
    description: 'Given a CAD geometry and load specifications, determine optimal mesh density parameters and run FEA simulation to verify stress requirements.',
    model: 'Claude Sonnet',
    toolsCount: 3,
    llmWeight: '0.7',
    threshold: '0.85',
    runs: 47,
    successRate: 91,
    avgCost: '$1.85/run',
    lastActive: '2m ago',
    statusBg: 'bg-[#e8f5e9]',
    statusText: 'text-[#4caf50]',
    decisions: [
      { name: 'fea-solver', score: '0.92', scoreColor: 'text-[#4caf50]', time: '2m ago', dot: 'bg-[#9b2cdd]' },
      { name: 'mesh-gen', score: '0.87', scoreColor: 'text-[#4caf50]', time: '15m ago', dot: 'bg-[#9b2cdd]' },
      { name: 'escalated', score: '0.42', scoreColor: 'text-[#e74c3c]', time: '1h ago', dot: 'bg-[#ff9800]' },
      { name: 'result-analyzer', score: '0.91', scoreColor: 'text-[#4caf50]', time: '3h ago', dot: 'bg-[#9b2cdd]' }
    ]
  },
  {
    id: 'design-advisor',
    name: 'Design Advisor Agent',
    status: 'Published',
    version: 'v1',
    description: 'Analyze design parameters and recommend optimizations for manufacturability, weight reduction, and cost efficiency.',
    model: 'GPT-4o',
    toolsCount: 5,
    llmWeight: '0.8',
    threshold: '0.75',
    runs: 23,
    successRate: 87,
    avgCost: '$2.40/run',
    lastActive: '1h ago',
    statusBg: 'bg-[#e8f5e9]',
    statusText: 'text-[#4caf50]',
    decisions: [
      { name: 'dfm-checker', score: '0.88', scoreColor: 'text-[#4caf50]', time: '1h ago', dot: 'bg-[#9b2cdd]' },
      { name: 'cost-estimator', score: '0.91', scoreColor: 'text-[#4caf50]', time: '2h ago', dot: 'bg-[#9b2cdd]' },
      { name: 'material-db', score: '0.95', scoreColor: 'text-[#4caf50]', time: '3h ago', dot: 'bg-[#9b2cdd]' },
      { name: 'tolerance-analyzer', score: '0.79', scoreColor: 'text-[#ff9800]', time: '4h ago', dot: 'bg-[#9b2cdd]' }
    ]
  },
  {
    id: 'thermal-analyst',
    name: 'Thermal Analyst Agent',
    status: 'Draft',
    version: 'v1',
    description: 'Evaluate thermal performance of electronic enclosures under various environmental conditions and suggest cooling improvements.',
    model: 'Claude Haiku',
    toolsCount: 2,
    llmWeight: '0.6',
    threshold: '0.80',
    runs: 0,
    created: 'yesterday',
    statusBg: 'bg-[#fff3e0]',
    statusText: 'text-[#ff9800]',
    decisions: []
  }
];

function AgentCard({ agent, onClick }: { agent: typeof AGENTS_DATA[0]; onClick?: () => void }) {
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
            <span className={cn('px-2 py-0.5 rounded-[6px] text-[10px] font-medium tracking-wide mt-0.5', agent.statusBg, agent.statusText)}>
              {agent.status}
            </span>
            <span className="bg-[#f0f0ec] text-[#6b6b6b] px-2 py-0.5 rounded-[6px] text-[9px] font-medium font-mono uppercase mt-0.5">
              {agent.version}
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
            {agent.description}
          </p>
        </div>

        {/* Meta Line */}
        <div className="flex items-center gap-5 mt-5">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-[#acacac] mb-1.5">Model</div>
            <div className="inline-flex items-center gap-1.5 bg-[#f9f0ff] text-[#9b2cdd] px-2 py-1 rounded-[6px] text-[10px] font-medium">
              <Sparkles size={10} strokeWidth={2.5} /> {agent.model}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-[#acacac] mb-1.5">Tools</div>
            <div className="inline-flex items-center gap-1.5 bg-[#f5f5f0] text-[#6b6b6b] px-2 py-1 rounded-[6px] text-[10px] font-medium">
              <Wrench size={10} strokeWidth={2.5} /> {agent.toolsCount} tools
            </div>
          </div>
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-[#acacac] mb-1.5">LLM Weight</div>
            <div className="inline-flex items-center text-[#9b2cdd] px-1 py-1 rounded-[6px] text-[10px] font-medium font-mono bg-transparent">
              {agent.llmWeight}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-[#acacac] mb-1.5">Threshold</div>
            <div className="inline-flex items-center text-[#ff5252] bg-[#ffebee] px-1.5 py-1 rounded-[4px] text-[10px] font-medium font-mono">
              {agent.threshold}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-5 flex items-center gap-2 text-[10px] text-[#6b6b6b] font-medium tracking-wide">
          <span className="text-[#1a1a1a]">{agent.runs} runs</span> <span className="text-[#e0e0e0] font-normal">·</span>
          {agent.successRate ? (
            <><span className="text-[#4caf50]">{agent.successRate}% success</span> <span className="text-[#e0e0e0] font-normal">·</span></>
          ) : (
             <>No data <span className="text-[#e0e0e0] font-normal">·</span></>
          )}
          <span>Avg {agent.avgCost ?? '—'}</span> <span className="text-[#e0e0e0] font-normal">·</span>
          <span>{agent.lastActive ? `Last active ${agent.lastActive}` : `Created ${agent.created}`}</span>
        </div>
      </div>

      {/* Right Decisions Panel */}
      <div className="w-[320px] shrink-0 border-l border-[#f0f0ec] p-5 flex flex-col relative">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#acacac] mb-4">Recent Decisions</h3>
        
        {agent.decisions.length > 0 ? (
          <div className="flex-1 flex flex-col">
            <div className="space-y-3.5 mb-4">
              {agent.decisions.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", d.dot)} />
                    <span className="text-[11px] font-medium text-[#1a1a1a] font-mono tracking-tight">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={cn("text-[10px] font-mono font-medium", d.scoreColor)}>{d.score}</span>
                    <span className="text-[9px] text-[#acacac] w-[35px] text-right">{d.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-2">
              <button className="text-[11px] font-medium text-[#9b2cdd] hover:underline transition-all">
                View all
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center -mt-4">
            <span className="text-[12px] text-[#acacac]">No decisions yet</span>
            <button className="text-[11px] font-medium text-[#9b2cdd] hover:underline transition-all mt-6 absolute bottom-5">
              Test in Playground
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((state) => state.setSidebarContentType);
  const hideBottomBar = useUiStore((state) => state.hideBottomBar);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
            3 agents
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
        {AGENTS_DATA.map(agent => (
          <AgentCard key={agent.id} agent={agent} onClick={() => navigate(`/agent-studio/${agent.id}`)} />
        ))}
      </div>

      {/* BOTTOM SUMMARY Area */}
      <div className="relative mt-8 mb-8 pb-12">
        {/* Stats Box */}
        <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] py-5 px-8 flex items-start justify-between">
          <div className="flex-1 max-w-[200px]">
            <div className="text-[10px] font-semibold text-[#acacac] uppercase tracking-wider mb-1">Total Decisions (7D)</div>
            <div className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-none mt-1.5">128</div>
            <div className="text-[11px] text-[#6b6b6b] mt-1.5">decisions</div>
          </div>
          
          <div className="flex-1 max-w-[200px] border-l border-[#f0f0ec] pl-8">
            <div className="text-[10px] font-semibold text-[#acacac] uppercase tracking-wider mb-1">Avg Confidence</div>
            <div className="text-[22px] font-bold text-[#4caf50] tracking-tight leading-none mt-1.5">0.86</div>
            <div className="text-[11px] text-[#6b6b6b] mt-1.5">across all agents</div>
          </div>
          
          <div className="flex-1 max-w-[200px] border-l border-[#f0f0ec] pl-8">
            <div className="text-[10px] font-semibold text-[#acacac] uppercase tracking-wider mb-1">Escalation Rate</div>
            <div className="text-[22px] font-bold text-[#ff9800] tracking-tight leading-none mt-1.5">6%</div>
            <div className="text-[11px] text-[#6b6b6b] mt-1.5">required human review</div>
          </div>
          
          <div className="flex-1 text-right border-l border-[#f0f0ec] pr-4">
            <div className="text-[10px] font-semibold text-[#acacac] uppercase tracking-wider mb-1">Total Spend (7D)</div>
            <div className="text-[22px] font-bold text-[#1a1a1a] tracking-tight leading-none mt-1.5">$142.50</div>
            <div className="text-[11px] text-[#6b6b6b] mt-1.5">compute cost</div>
          </div>
        </div>

        {/* Floating Pill - exactly aligned to overlap the bottom border somewhat, or just centered right below */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="inline-flex h-[36px] items-center gap-2.5 rounded-[18px] bg-white px-5 shadow-[0px_4px_16px_rgba(0,0,0,0.12)] text-[11px] font-medium text-[#6b6b6b] border border-[#f0f0ec]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4caf50]" />
            <span className="text-[#4caf50] tracking-wide">System Operational</span>
            <span className="text-[#d0d0d0]">·</span>
            <span className="tracking-wide">3 agents</span>
            <span className="text-[#d0d0d0]">·</span>
            <span className="tracking-wide">2 published · 1 draft</span>
            <span className="text-[#d0d0d0]">·</span>
            <span className="text-[#9b2cdd] font-semibold tracking-wide">128 decisions this week</span>
          </div>
        </div>
      </div>

      <CreateAgentModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => {
          setShowCreateModal(false);
          // Navigate to agent studio after creation
          navigate('/agent-studio');
        }}
      />
    </div>
  );
}
