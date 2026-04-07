import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Shield, Check, ChevronRight, Activity, Zap, Layers, 
  Users, Clock, Rocket, MoreHorizontal,
  Download, FileText, Globe, Cpu, Database, Server
} from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';

/* ─────────────────────────── MOCK DATA ─────────────────────────── */

const INFRASTRUCTURE = [
  { id: '1', name: 'Compute Mesh', status: 'Healthy', load: 45, region: 'us-east-1', runtime: '4d 12h', color: 'bg-emerald-500' },
  { id: '2', name: 'Airaie Runner', status: 'Healthy', load: 82, region: 'eu-central-1', runtime: '12d 4h', color: 'bg-emerald-500' }, // High load
  { id: '3', name: 'Artifact Store', status: 'Healthy', load: 12, region: 'us-west-2', runtime: '45d 1h', color: 'bg-emerald-500' },
  { id: '4', name: 'Metadata DB', status: 'Degraded', load: 94, region: 'us-east-1', runtime: '2d 18h', color: 'bg-amber-500' }, // Warning
];

const FEA_VALIDATION = [
  { id: 'v1', name: 'Stress Test Suite', status: 'Passed', rate: 100, duration: '14.2s', statusBg: 'bg-emerald-50 text-emerald-600' },
  { id: 'v2', name: 'Mesh Convergence', status: 'Passed', rate: 100, duration: '8.4s', statusBg: 'bg-emerald-50 text-emerald-600' },
  { id: 'v3', name: 'Fatigue Analysis', status: 'Passed', rate: 100, duration: '22.1s', statusBg: 'bg-emerald-50 text-emerald-600' },
  { id: 'v4', name: 'DFM Check', status: 'Warning', rate: 84, duration: '2.5s', statusBg: 'bg-amber-50 text-amber-600' },
  { id: 'v5', name: 'Thermal Load', status: 'Passed', rate: 100, duration: '18.9s', statusBg: 'bg-emerald-50 text-emerald-600' },
];

const CONTRIBUTORS = [
  { name: 'Santhosh Sriram', role: 'Author', avatar: 'S', color: 'bg-indigo-600' },
  { name: 'Sarah Chen', role: 'Reviewer', avatar: 'SC', color: 'bg-emerald-600' },
  { name: 'David Miller', role: 'Approver', avatar: 'DM', color: 'bg-rose-600' },
];

const AUDIT_TRAIL = [
  { event: 'Build #FEA-772 generated', time: '2h ago', user: 'System', type: 'system' },
  { event: 'Review started by Sarah Chen', time: '1h ago', user: 'Sarah Chen', type: 'user' },
  { event: 'Structural Validation passed', time: '45m ago', user: 'Validator-AI', type: 'bot' },
  { event: 'Release criteria met (98%)', time: '12m ago', user: 'Governance', type: 'system' },
];

/* ─────────────────────────── COMPONENTS ─────────────────────────── */

function ReadinessGauge({ score }: { score: number }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-slate-100"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-emerald-500 transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-slate-900 leading-none">{score}%</span>
        <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider mt-0.5">Ready</span>
      </div>
    </div>
  );
}

function SectionTitle({ title, icon: Icon, color = "bg-indigo-600" }: { title: string; icon: any; color?: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className={cn("w-1 h-6 rounded-full", color)} />
        <Icon size={18} className="text-slate-400" />
        <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">{title}</h2>
      </div>
      <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
        View detailed stats →
      </button>
    </div>
  );
}

/* ─────────────────────────── MAIN PAGE ─────────────────────────── */

export default function ReleasePacketPage() {
  const { id } = useParams<{ id: string }>();
  const setSidebarContentType = useUiStore((state) => state.setSidebarContentType);
  const hideBottomBar = useUiStore((state) => state.hideBottomBar);

  useEffect(() => {
    setSidebarContentType('navigation');
    hideBottomBar();
  }, [setSidebarContentType, hideBottomBar]);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 pb-32 pt-4 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ── BREADCRUMBS ── */}
      <nav className="flex items-center gap-2 text-[12px] font-medium text-slate-400">
        <Link to="/boards" className="hover:text-indigo-600 transition-colors">Boards</Link>
        <ChevronRight size={14} />
        <Link to={`/boards/${id}`} className="hover:text-indigo-600 transition-colors">Structural Validation Study</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900">Release Packet</span>
      </nav>

      {/* ── HEADER ── */}
      <section className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8 flex items-start justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-20 -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <Shield size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-[28px] font-bold text-slate-900 tracking-tight leading-tight">Release Packet</h1>
              <p className="text-slate-500 text-sm mt-1 max-w-[600px]">
                Main controls for software release, critical infrastructure health checks, AI model de-skew, and final governance approvals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-[64px]">
            <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[11px] font-bold tracking-wider uppercase">Study</span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-bold tracking-wider uppercase">Published</span>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-bold tracking-wider uppercase">Active</span>
            <div className="h-4 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-[13px]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              System Online · Healthy
            </div>
          </div>
        </div>

        <div className="flex items-start gap-8">
          <ul className="text-right space-y-2 mt-2">
            {['Release Criteria', 'Build Artifacts', 'Documentation', 'Regulatory Check', 'Final Approval'].map((item, i) => (
              <li key={item} className="flex items-center justify-end gap-2 text-[12px] font-medium text-slate-500">
                {item} {i < 4 ? <Check size={14} className="text-emerald-500" /> : <Clock size={14} className="text-slate-300" />}
              </li>
            ))}
          </ul>
          <ReadinessGauge score={98} />
        </div>
      </section>

      {/* ── INFRASTRUCTURE ── */}
      <section className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8">
        <SectionTitle title="Infrastructure Health" icon={Server} color="bg-amber-400" />
        
        <div className="flex flex-col gap-1 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
          <div className="grid grid-cols-[1fr_100px_180px_140px_100px_60px] gap-4 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Resource</span>
            <span>Status</span>
            <span>Current Load</span>
            <span>Region</span>
            <span>Runtime</span>
            <span>Action</span>
          </div>

          {INFRASTRUCTURE.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_100px_180px_140px_100px_60px] gap-4 px-6 py-4 items-center bg-white border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                  {item.name.includes('Compute') ? <Cpu size={16} /> : item.name.includes('Store') ? <Database size={16} /> : <Activity size={16} />}
                </div>
                <span className="text-[14px] font-semibold text-slate-900">{item.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", item.color)} />
                <span className="text-[12px] font-medium text-slate-600">{item.status}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", item.load > 90 ? "bg-rose-500" : item.load > 70 ? "bg-amber-500" : "bg-emerald-500")} 
                    style={{ width: `${item.load}%` }} 
                  />
                </div>
                <span className="text-[11px] font-mono font-medium text-slate-900 w-8">{item.load}%</span>
              </div>

              <div className="flex items-center gap-2">
                <Globe size={14} className="text-slate-300" />
                <span className="text-[12px] text-slate-600">{item.region}</span>
              </div>

              <span className="text-[12px] font-mono text-slate-500">{item.runtime}</span>

              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <MoreHorizontal size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── VALIDATION & QA ── */}
      <section className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8">
        <SectionTitle title="Validation & QA (FEA)" icon={Layers} color="bg-emerald-500" />
        
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_100px] gap-4 px-6 py-3 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Test Name</span>
            <span>Status</span>
            <span>Success Rate</span>
            <span>Duration</span>
            <span>Logs</span>
        </div>

        <div className="mt-2 space-y-1">
          {FEA_VALIDATION.map((test) => (
            <div key={test.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_100px] gap-4 px-6 py-4 items-center rounded-xl hover:bg-slate-50 transition-colors group">
              <span className="text-[14px] font-semibold text-slate-900">{test.name}</span>
              <div>
                <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight", test.statusBg)}>
                  {test.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-mono font-bold text-slate-900">{test.rate}%</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={cn("w-1 h-3 rounded-sm", i <= (test.rate / 20) ? "bg-emerald-400" : "bg-slate-100")} />
                  ))}
                </div>
              </div>
              <span className="text-[13px] font-mono text-slate-500">{test.duration}</span>
              <button className="text-[11px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                View Log
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── LOWER CONTENT: 2-COLUMN ── */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-8">
        {/* Left: Contributors & Logic */}
        <div className="flex flex-col gap-8">
          <section className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8">
            <SectionTitle title="Release Logic & Gates" icon={Zap} color="bg-indigo-600" />
            <div className="space-y-4">
              {[
                { label: 'Structural Safety Factor', threshold: '> 2.0', current: '2.4', weight: 'High' },
                { label: 'Mesh Convergence Error', threshold: '< 0.5%', current: '0.2%', weight: 'Medium' },
                { label: 'Regulatory Compliance (ISO)', threshold: 'Required', current: 'Met', weight: 'Critical' },
              ].map((gate) => (
                <div key={gate.label} className="bg-slate-50 rounded-2xl p-5 flex items-center justify-between border border-slate-50">
                  <div>
                    <h4 className="text-[14px] font-bold text-slate-900">{gate.label}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-slate-500 font-medium tracking-tight">Threshold: <span className="text-indigo-600">{gate.threshold}</span></span>
                      <div className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[11px] text-slate-500 font-medium tracking-tight">Priority: <span className="text-rose-500">{gate.weight}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-mono font-bold text-slate-900">{gate.current}</span>
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8">
            <SectionTitle title="Contributors" icon={Users} color="bg-indigo-500" />
            <div className="grid grid-cols-3 gap-4">
              {CONTRIBUTORS.map((user) => (
                <div key={user.name} className="flex flex-col items-center p-6 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-colors">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-4 shadow-sm", user.color)}>
                    {user.avatar}
                  </div>
                  <h4 className="text-[14px] font-bold text-slate-900 text-center">{user.name}</h4>
                  <span className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">{user.role}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Audit Trail */}
        <section className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8">
          <SectionTitle title="Audit Trail" icon={Clock} color="bg-slate-900" />
          <div className="relative pl-6 border-l-2 border-slate-100 ml-2 space-y-8">
            {AUDIT_TRAIL.map((evt, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-4 border-white bg-slate-900 shadow-sm" />
                <p className="text-[14px] font-semibold text-slate-900">{evt.event}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-400 font-medium">{evt.time}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[11px] text-slate-400 font-medium">via {evt.user}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 rounded-xl border border-slate-100 text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            View Full Report
          </button>
        </section>
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[1116px] z-50 px-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-slate-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-6 px-4">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-900">Release Packet</span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">ZIP · 14.8 MB</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-900">SBOM Report</span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">PDF · Generated</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="h-12 px-6 rounded-xl border border-slate-200 font-bold text-[13px] text-slate-600 hover:bg-slate-50 transition-colors">
              Archive Build
            </button>
            <button className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-[14px] flex items-center gap-3 shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]">
              <Rocket size={18} />
              PUSH TO PRODUCTION
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
