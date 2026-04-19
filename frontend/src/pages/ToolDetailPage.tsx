import { useState, useEffect, createElement, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wrench, Shield, Activity, BarChart3, Timer, DollarSign,
  GitBranch, Play, CheckCircle2,
  Code2, ExternalLink,
  Container, FileCode2, Binary, Globe,
  FlaskConical, Wind, Grid2X2, Database, Box, Paperclip,
  Thermometer, Calculator, Scale, BrainCircuit, Archive, Combine, ShieldCheck,
  ChevronRight, PlayCircle, Lock, HardDrive, Edit2, Upload, AlertTriangle, FileText, Check, MemoryStick, Cpu, Clock, Link2, Download, History, X, CheckCircle, Loader2
} from 'lucide-react';
import { cn } from '@utils/cn';
import { useUiStore } from '@store/uiStore';
import { useToolDetailFull, useToolDetailVersions, useToolRuns, useUpdateTool, useDeprecateToolVersion, useCreateRun, usePublishToolVersion, useUpdateTrustLevel } from '@hooks/useTools';
import type { ToolAdapter, ToolCategory, ToolStatus, TrustLevel, ToolContractField, ToolDetail, ToolDetailVersion, ToolRunEntry } from '@/types/tool';
import EditToolModal from '@components/tools/EditToolModal';

// ── Shared Label & Icon Maps ───────────────────────────────────

const STATUS_LABELS: Record<ToolStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  deprecated: 'Deprecated',
};

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  simulation: 'Simulation',
  meshing: 'Meshing',
  analysis: 'Analysis',
  materials: 'Materials',
  'ml-ai': 'ML / AI',
  utilities: 'Utilities',
};

const ADAPTER_LABELS: Record<ToolAdapter, string> = {
  docker: 'Docker',
  python: 'Python',
  wasm: 'WASM',
  'remote-api': 'Remote API',
};

const TOOL_ICON_MAP = {
  FlaskConical, Wind, Grid2X2, Database, BarChart3, Box, Paperclip,
  Thermometer, Calculator, Scale, BrainCircuit, Archive, Combine, ShieldCheck,
} as const;

const ADAPTER_ICON_MAP: Record<ToolAdapter, typeof Container> = {
  docker: Container,
  python: FileCode2,
  wasm: Binary,
  'remote-api': Globe,
};

function getToolIcon(name: string) {
  return TOOL_ICON_MAP[name as keyof typeof TOOL_ICON_MAP] ?? Wrench;
}

const RUN_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  running:    { bg: 'bg-[#e3f2fd]', text: 'text-[#2196f3]', label: 'Running' },
  succeeded:  { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]', label: 'Succeeded' },
  completed:  { bg: 'bg-[#e8f5e9]', text: 'text-[#4caf50]', label: 'Completed' },
  failed:     { bg: 'bg-[#ffebee]', text: 'text-[#e74c3c]', label: 'Failed' },
  cancelled:  { bg: 'bg-[#f5f5f0]', text: 'text-[#acacac]', label: 'Cancelled' },
  pending:    { bg: 'bg-[#fff3e0]', text: 'text-[#ff9800]', label: 'Pending' },
};
const RUN_STATUS_DEFAULT = { bg: 'bg-[#f0f0ec]', text: 'text-[#6b6b6b]', label: 'Unknown' };

function formatDuration(seconds: number | undefined) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTimeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Subcomponents ──────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-end gap-1 mb-2 h-10 border-b border-[#ece9e3] px-2 relative group overflow-hidden cursor-pointer hover:bg-[#fafaf8]">
       <div className="w-[8px] bg-[#2196f3] rounded-t-sm transition-all" style={{ height: `${pct}%`, opacity: pct > 80 ? 1 : 0.6 }} />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-[#e8f5e9] text-[#4caf50]',
    draft: 'bg-[#fff3e0] text-[#ff9800]',
    deprecated: 'bg-[#f5f5f0] text-[#acacac]',
    compiled: 'bg-[#e3f2fd] text-[#2196f3]',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', styles[status] || 'bg-[#f0f0ec] text-[#6b6b6b]')}>
      {status}
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function ToolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);
  const closeRightPanel = useUiStore((s) => s.closeRightPanel);
  const setActiveToolSection = useUiStore((s) => s.setActiveToolSection);

  const { data: tool, isLoading, isError, refetch } = useToolDetailFull(id);
  const { data: versions } = useToolDetailVersions(id);
  const { data: runs } = useToolRuns(id);

  // Modals + UI state
  const [showEditModal, setShowEditModal] = useState(false);
  const [deprecateConfirm, setDeprecateConfirm] = useState(false);
  const [testInputs, setTestInputs] = useState<Record<string, unknown>>({});
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; run_id: string; outputs?: unknown } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Mutations
  const deprecateMutation = useDeprecateToolVersion(id);
  const createRunMutation = useCreateRun();
  const publishMutation = usePublishToolVersion(id);
  const trustMutation = useUpdateTrustLevel();
  const [publishingVersion, setPublishingVersion] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const handlePublishVersion = async (version: string, currentTrust?: TrustLevel) => {
    setPublishError(null);
    setPublishingVersion(version);
    try {
      if (!currentTrust || currentTrust === 'untested') {
        await trustMutation.mutateAsync({ toolId: id, version, trustLevel: 'verified' });
      }
      await publishMutation.mutateAsync(version);
    } catch (err: unknown) {
      setPublishError((err as { message?: string })?.message ?? 'Publish failed');
    } finally {
      setPublishingVersion(null);
    }
  };

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setSidebarContentType('tool-detail');
    hideBottomBar();
    closeRightPanel();
    setActiveToolSection('overview');
  }, [closeRightPanel, hideBottomBar, setSidebarContentType, setActiveToolSection]);

  // Section Visibility tracking
  useEffect(() => {
    if (!tool) return;
    const container = document.getElementById('tool-detail-scroll-container');
    if (!container) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find highest intersecting ratio element
        const visible = entries.find((e) => e.isIntersecting && e.intersectionRatio > 0.1);
        if (visible) {
          setActiveToolSection(visible.target.id);
        }
      },
      { root: container, rootMargin: '-10% 0px -80% 0px', threshold: [0, 0.1, 0.5, 1] }
    );

    const sections = Array.from(document.querySelectorAll('.tool-scroll-section'));
    sections.forEach((s) => observerRef.current?.observe(s));

    return () => observerRef.current?.disconnect();
  }, [tool, setActiveToolSection]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#fbfaf9]">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2196f3]" />
      </div>
    );
  }

  if (isError || !tool) {
    return <div className="flex items-center justify-center h-full">Error loading tool details.</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[#fbfaf9] relative overflow-hidden font-sans">
      
      {/* ═ TOP GLOBAL HEADER ═ */}
      <header className="h-[64px] bg-white border-b border-[#ece9e3] px-[24px] flex items-center justify-between shrink-0 relative z-20">
         <div className="flex items-center gap-[12px]">
            <button onClick={() => navigate('/tools')} className="w-8 h-8 flex flex-col items-center justify-center rounded-md hover:bg-[#f5f5f0] transition-colors"><ArrowLeft size={16}/></button>
            {createElement(getToolIcon(tool.icon), { size: 18, className: 'text-[#2196f3]' })}
            <h1 className="text-[16px] font-bold text-[#1a1a1a]">{tool.name}</h1>
            <span className="px-2 py-0.5 bg-[#f0f0ec] text-[#6b6b6b] text-[11px] font-bold rounded-[4px]">{tool.currentVersion}</span>
            <span className={cn("px-2 py-0.5 text-[11px] font-bold rounded-[4px]", tool.status==='published' ? "bg-[#e8f5e9] text-[#4caf50]" : "bg-[#fff3e0] text-[#ff9800]")}>{STATUS_LABELS[tool.status]}</span>
            <span className="px-2 py-0.5 bg-[#f0f0ec] text-[#6b6b6b] text-[11px] font-bold rounded-[4px]">{CATEGORY_LABELS[tool.category]}</span>
         </div>
         <div className="flex items-center gap-[12px]">
            <button
              onClick={() => document.getElementById('test-run')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-[32px] px-[16px] border border-[#2196f3] text-[#2196f3] rounded-[8px] text-[12px] font-bold hover:bg-[#e3f2fd] transition-colors flex items-center gap-1.5"
            ><Play size={14}/> Test Run</button>
            <button
              onClick={() => setShowEditModal(true)}
              className="h-[32px] px-[16px] border border-[#e8e8e8] text-[#1a1a1a] rounded-[8px] text-[12px] font-bold hover:bg-[#fafaf8] transition-colors flex items-center gap-1.5"
            ><Edit2 size={14}/> Edit Tool</button>
            <button
              onClick={() => navigate(`/tools/register?clone=${id}`)}
              className="h-[32px] px-[16px] bg-[#1a1a1a] text-white rounded-[8px] text-[12px] font-bold hover:bg-[#333] transition-colors shadow-sm"
            >+ New Version</button>
            <button className="w-[32px] h-[32px] flex items-center justify-center hover:bg-[#f0f0ec] rounded-full text-[#6b6b6b]"><Activity size={16}/></button>
            <div className="w-[32px] h-[32px] rounded-full bg-[#2d2d2d] flex items-center justify-center text-white text-[13px] font-bold shadow-sm">{tool.owner?.charAt(0)?.toUpperCase() ?? 'U'}</div>
         </div>
      </header>

      {/* ═ SCROLLING CONTENT WORKSPACE ═ */}
      <div id="tool-detail-scroll-container" className="flex-1 overflow-y-auto px-[32px] py-[32px] pb-[120px] scroll-smooth">
         <div className="max-w-[1000px] mx-auto flex flex-col gap-[24px]">

            {/* 1. OVERVIEW */}
            <section id="overview" className="tool-scroll-section bg-white rounded-[16px] border border-[#ece9e3] flex overflow-hidden shadow-sm">
               <div className="flex-1 p-[32px] border-r border-[#ece9e3]">
                  <div className="flex gap-[16px] mb-4">
                     {createElement(getToolIcon(tool.icon), { size: 36, className: 'text-[#2196f3] shrink-0 mt-1' })}
                     <div>
                        <h2 className="text-[28px] font-bold text-[#1a1a1a] tracking-tight">{tool.name}</h2>
                        <p className="text-[14px] text-[#6b6b6b] leading-relaxed mt-2 max-w-[500px]">{tool.detailDescription ?? tool.description}</p>
                     </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-4 ml-[52px]">
                     <span className="px-2 py-0.5 bg-[#f0f0ec] text-[#6b6b6b] text-[11px] font-bold rounded-[6px]">{tool.currentVersion}</span>
                     <span className={cn("px-2 py-0.5 text-[11px] font-bold rounded-[6px]", tool.status==='published' ? "bg-[#e8f5e9] text-[#4caf50]" : "bg-[#fff3e0] text-[#ff9800]")}>{STATUS_LABELS[tool.status]}</span>
                     <span className="px-2 py-0.5 bg-[#f0f0ec] text-[#6b6b6b] text-[11px] font-bold rounded-[6px]">{CATEGORY_LABELS[tool.category]}</span>
                     <span className="px-2 py-0.5 bg-[#f0f0ec] text-[#6b6b6b] text-[11px] font-bold rounded-[6px] flex items-center gap-1"><Container size={12}/>{ADAPTER_LABELS[tool.adapter]}</span>
                     <span className="px-2 py-0.5 bg-[#e3f2fd] text-[#2196f3] text-[11px] font-bold rounded-[6px]">3 inputs &rarr; 2 outputs</span>
                  </div>

                  {tool.domain_tags.length > 0 && (
                     <div className="flex flex-wrap gap-2 ml-[52px] mt-4">
                        {tool.domain_tags.map(t => <span key={t} className="px-2.5 py-1 bg-[#fbfaf9] text-[#949494] text-[11px] font-medium rounded-full border border-[#ece9e3]">{t}</span>)}
                     </div>
                  )}
               </div>
               <div className="w-[300px] p-[32px] flex flex-col gap-5 bg-[#fafaf8]">
                  <div className="flex justify-between items-center text-[12px]">
                     <span className="text-[#6b6b6b]">Total runs</span>
                     <span className="font-mono text-[#1a1a1a] font-bold">{tool.usageCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px]">
                     <span className="text-[#6b6b6b]">Success rate</span>
                     <span className="font-mono text-[#4caf50] font-bold">{tool.successRate ?? 0}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px]">
                     <span className="text-[#6b6b6b]">Avg duration</span>
                     <span className="font-mono text-[#1a1a1a] font-bold">{formatDuration(tool.avgDurationSeconds)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px]">
                     <span className="text-[#6b6b6b]">Avg cost</span>
                     <span className="font-mono text-[#1a1a1a] font-bold">${tool.costPerRun.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t border-[#ece9e3] my-2 pt-5 flex flex-col gap-5">
                     <div className="flex justify-between items-center text-[12px]">
                       <span className="text-[#6b6b6b]">Used in</span>
                       <span className="font-bold text-[#2196f3] cursor-pointer hover:underline">3 workflows</span>
                     </div>
                     <div className="flex justify-between items-center text-[12px]">
                       <span className="text-[#6b6b6b]">Used by</span>
                       <span className="font-bold text-[#9c27b0] cursor-pointer hover:underline">1 agent</span>
                     </div>
                  </div>

                  <div className="mt-auto text-[11px] text-[#acacac] flex flex-col gap-1">
                     <span>Created: {formatDate(tool.created_at)}</span>
                     <span>Modified: {formatDate(tool.created_at)}</span>
                     <span>Owner: {tool.owner}</span>
                  </div>
               </div>
            </section>

            {/* 2. VERSION HISTORY */}
            <section id="versions" className="tool-scroll-section bg-white rounded-[16px] border border-[#ece9e3] p-[32px] relative shadow-sm">
               <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-2">
                    <History size={16} className="text-[#949494]" />
                    <h3 className="text-[14px] font-bold text-[#1a1a1a]">Version History</h3>
                 </div>
                 <span className="px-2 py-0.5 bg-[#f0f0ec] text-[#6b6b6b] text-[10px] font-bold rounded-full uppercase tracking-wider">{versions?.length || 0} versions</span>
               </div>

               <div className="relative pl-[24px] border-l-[2px] border-[#2196f3] ml-[8px] flex flex-col gap-[32px]">
                  {(versions || []).map((ver, idx) => {
                     const isCurrent = ver.version === tool.currentVersion;
                     const isDeprecated = ver.status === 'deprecated';
                     return (
                        <div key={ver.version} className={cn("relative pb-6", idx !== versions!.length - 1 && "border-b border-[#ece9e3]")}>
                           <div className={cn('absolute -left-[32px] top-[4px] w-[14px] h-[14px] rounded-full border-[3px]', isCurrent ? 'bg-[#2196f3] border-[#2196f3]' : isDeprecated ? 'bg-white border-[#d0d0d0]' : 'bg-white border-[#4caf50]')} />
                           <div className="flex justify-between items-start">
                              <div>
                                 <div className="flex gap-2 items-center mb-2">
                                    <span className="text-[14px] font-bold text-[#1a1a1a]">{ver.version}</span>
                                    <StatusPill status={ver.status} />
                                    {isCurrent && <span className="text-[9px] font-bold bg-[#e3f2fd] text-[#2196f3] px-2 py-0.5 rounded-[4px]">latest</span>}
                                 </div>
                                 <p className="text-[13px] text-[#6b6b6b] mt-2 mb-3">{(ver as any).description || 'Added nonlinear analysis support and automatic convergence detection'}</p>
                                 {isCurrent && <p className="text-[11px] text-[#949494] font-mono">Changed: inputs <span className="text-[#a855f7]">(added convergence_tol)</span>, docker image <span className="text-[#a855f7]">(fea-solver:2.1)</span></p>}
                                 
                                 <div className="flex gap-4 mt-3 items-center">
                                    <button className="text-[11px] font-bold text-[#2196f3] hover:underline">Diff</button>
                                    <button className="text-[11px] font-bold text-[#6b6b6b] hover:underline">Rollback</button>
                                    {ver.status === 'draft' && (
                                      <button
                                        onClick={() => handlePublishVersion(ver.version, ver.trust_level)}
                                        disabled={publishingVersion === ver.version}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[11px] font-bold bg-[#4caf50] text-white hover:bg-[#43a047] disabled:opacity-60"
                                      >
                                        {publishingVersion === ver.version ? (
                                          <><Loader2 size={11} className="animate-spin"/> Publishing…</>
                                        ) : (
                                          <><Upload size={11}/> Publish</>
                                        )}
                                      </button>
                                    )}
                                 </div>
                                 {publishError && publishingVersion === ver.version && (
                                   <p className="text-[11px] text-[#e74c3c] mt-2">{publishError}</p>
                                 )}
                              </div>
                              <span className="text-[12px] text-[#949494]">{formatDate(ver.published_at)}</span>
                           </div>
                        </div>
                     )
                  })}
               </div>
            </section>

            {/* 3. TOOL CONTRACT */}
            <section id="contract" className="tool-scroll-section bg-white rounded-[16px] border border-[#ece9e3] p-[32px] shadow-sm">
               <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[#2196f3]" />
                    <h3 className="text-[14px] font-bold text-[#1a1a1a]">Tool Contract</h3>
                 </div>
                 <div className="flex gap-4 items-center text-[12px] font-bold">
                    <span className="flex items-center gap-1.5 text-[#4caf50]"><Check size={14}/> JSON Schema Valid</span>
                    <button className="flex items-center gap-1.5 text-[#2196f3] hover:underline"><Edit2 size={12}/> Edit Contract</button>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-8 mb-8">
                  {/* DYNAMIC INPUTS */}
                  <div>
                     <h4 className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest mb-4">
                       Inputs <span className="font-mono bg-[#f0f0ec] px-1.5 py-0.5 rounded text-[#6b6b6b] ml-2">{tool.contract?.inputs?.length ?? 0} parameters</span>
                     </h4>
                     <div className="flex flex-col gap-3">
                        {(tool.contract?.inputs ?? []).length === 0 ? (
                          <div className="text-[12px] text-[#acacac] italic p-4 border border-dashed border-[#ece9e3] rounded-[8px]">No inputs defined</div>
                        ) : (tool.contract?.inputs ?? []).map((inp) => (
                           <div key={inp.name} className="border border-[#e8e8e8] rounded-[8px] p-4 bg-[#fbfaf9]">
                              <div className="flex justify-between items-center mb-2">
                                 <span className="font-mono font-bold text-[#1a1a1a] text-[13px]">{inp.name}</span>
                                 <span className={cn("text-[10px] px-2 rounded-full font-mono font-bold", inp.type === 'artifact' ? 'bg-[#e3f2fd] text-[#2196f3]' : 'bg-[#f0f0ec] text-[#6b6b6b]')}>{inp.type}</span>
                              </div>
                              <p className="text-[12px] text-[#6b6b6b] flex items-center gap-2 mb-1">
                                 <span className={cn("w-1.5 h-1.5 rounded-full", inp.required ? 'bg-[#4caf50]' : 'bg-[#ff9800]')} />
                                 <span className={cn("font-bold text-[11px]", inp.required ? 'text-[#4caf50]' : 'text-[#ff9800]')}>{inp.required ? 'Required' : 'Optional'}</span>
                                 {inp.description && <span className="text-[#6b6b6b]">{inp.description}</span>}
                              </p>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* DYNAMIC OUTPUTS */}
                  <div>
                     <h4 className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest mb-4">
                       Outputs <span className="font-mono bg-[#f0f0ec] px-1.5 py-0.5 rounded text-[#6b6b6b] ml-2">{tool.contract?.outputs?.length ?? 0} parameters</span>
                     </h4>
                     <div className="flex flex-col gap-3">
                        {(tool.contract?.outputs ?? []).length === 0 ? (
                          <div className="text-[12px] text-[#acacac] italic p-4 border border-dashed border-[#ece9e3] rounded-[8px]">No outputs defined</div>
                        ) : (tool.contract?.outputs ?? []).map((out) => (
                           <div key={out.name} className="border border-[#e8f5e9] rounded-[8px] p-4 bg-[#fff]">
                              <div className="flex justify-between items-center mb-2">
                                 <span className="font-mono font-bold text-[#1a1a1a] text-[13px]">{out.name}</span>
                                 <span className={cn("text-[10px] px-2 rounded-full font-mono font-bold", out.type === 'artifact' ? 'bg-[#e8f5e9] text-[#4caf50]' : 'bg-[#f0f0ec] text-[#6b6b6b]')}>{out.type}</span>
                              </div>
                              {out.description && <p className="text-[12px] text-[#6b6b6b]">{out.description}</p>}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <h4 className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest mb-2">RAW CONTRACT (interface)</h4>
               <div className="bg-[#1a1a1a] rounded-[8px] p-4 font-mono text-[11px] text-[#a855f7] overflow-x-auto">
                  <pre>{JSON.stringify({ inputs: tool.contract?.inputs ?? [], outputs: tool.contract?.outputs ?? [] }, null, 2)}</pre>
               </div>
            </section>

            {/* 4. EXECUTION CONFIGURATION */}
            <section id="execution" className="tool-scroll-section bg-white rounded-[16px] border border-[#ece9e3] p-[32px] shadow-sm">
               <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-2">
                    <Box size={16} className="text-[#6b6b6b]" />
                    <h3 className="text-[14px] font-bold text-[#1a1a1a]">Execution Configuration</h3>
                 </div>
                 <button className="text-[12px] font-bold text-[#2196f3] hover:underline">Edit</button>
               </div>

               <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-8">
                 {/* Adapter — dynamic */}
                 <div>
                    <h4 className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest mb-4">ADAPTER</h4>
                    <div className="flex gap-3 items-start mb-6">
                       {createElement(ADAPTER_ICON_MAP[tool.adapter] ?? Container, { size: 24, className: 'text-[#2196f3]' })}
                       <div>
                          <h5 className="text-[14px] font-bold text-[#1a1a1a]">{ADAPTER_LABELS[tool.adapter] ?? tool.adapter}</h5>
                          <p className="text-[11px] text-[#6b6b6b] mt-1">Containerized execution in isolated environment.</p>
                       </div>
                    </div>
                    {tool.image && (<>
                      <h4 className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest mb-2 mt-4">IMAGE</h4>
                      <div className="bg-[#f5f5f0] border border-[#e8e8e8] px-3 py-2 rounded-[6px] font-mono text-[13px] text-[#1a1a1a] inline-block mb-1 break-all">{tool.image}</div>
                      {tool.registry && <p className="text-[10px] font-mono text-[#acacac]">Registry: {tool.registry}</p>}
                    </>)}
                 </div>

                 {/* Resources — dynamic */}
                 <div>
                    <h4 className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest mb-4">DEFAULT RESOURCE LIMITS</h4>
                    <div className="flex flex-col gap-4">
                       <div className="h-10 border-l-[3px] border-[#e74c3c] pl-4 flex flex-col justify-center bg-[#fbfaf9] rounded-r-md">
                          <span className="text-[10px] font-bold text-[#1a1a1a]">CPU</span>
                          <span className="font-mono text-[14px] font-bold text-[#1a1a1a]">{tool.limits?.cpu ?? 2} <span className="text-[10px] text-[#6b6b6b]">cores</span></span>
                       </div>
                       <div className="h-10 border-l-[3px] border-[#ff9800] pl-4 flex flex-col justify-center bg-[#fbfaf9] rounded-r-md">
                          <span className="text-[10px] font-bold text-[#1a1a1a]">Memory</span>
                          <span className="font-mono text-[14px] font-bold text-[#1a1a1a]">{tool.limits?.memoryMb ?? 1024} <span className="text-[10px] text-[#6b6b6b]">MB</span></span>
                       </div>
                       <div className="h-10 border-l-[3px] border-[#6b6b6b] pl-4 flex flex-col justify-center bg-[#fbfaf9] rounded-r-md">
                          <span className="text-[10px] font-bold text-[#1a1a1a]">Timeout</span>
                          <span className="font-mono text-[14px] font-bold text-[#1a1a1a]">{tool.limits?.timeoutSeconds ?? 120} <span className="text-[10px] text-[#6b6b6b]">seconds</span></span>
                       </div>
                    </div>
                 </div>

                 {/* Sandbox Policy — dynamic */}
                 <div>
                    <h4 className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest mb-4">SANDBOX POLICY</h4>
                    <div className="flex flex-col gap-4 border-l border-[#ece9e3] pl-6 h-full">
                       <div className="flex justify-between items-center text-[12px]">
                          <span className="flex items-center gap-2 text-[#1a1a1a]"><Lock size={14} className={tool.sandboxNetwork === 'deny' ? 'text-[#e74c3c]' : 'text-[#4caf50]'}/> Network</span>
                          <span className={cn("px-2 py-0.5 font-bold rounded-[4px] text-[10px]", tool.sandboxNetwork === 'deny' ? 'bg-[#ffebee] text-[#e74c3c]' : 'bg-[#e8f5e9] text-[#4caf50]')}>
                            {tool.sandboxNetwork === 'deny' ? 'Deny' : 'Allow'}
                          </span>
                       </div>
                       <div className="flex justify-between items-center text-[12px]">
                          <span className="flex items-center gap-2 text-[#1a1a1a]"><HardDrive size={14} className="text-[#ff9800]"/> Filesystem</span>
                          <span className="px-2 py-0.5 bg-[#fff3e0] text-[#ff9800] font-bold rounded-[4px] text-[10px]">{tool.filesystemMode ?? 'sandbox'}</span>
                       </div>
                       {tool.sandboxNetwork === 'deny' && (
                         <div className="mt-4 p-3 border border-[#ffcdd2] bg-[#fffafa] rounded-[6px] flex gap-2 items-start text-[#e74c3c]">
                           <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
                           <p className="text-[11px] font-medium leading-relaxed">Network access is denied for security. Tool runs in full isolation.</p>
                         </div>
                       )}
                    </div>
                 </div>
               </div>
            </section>

            {/* 5. USAGE ANALYTICS */}
            <section id="analytics" className="tool-scroll-section bg-white rounded-[16px] border border-[#ece9e3] p-[32px] shadow-sm">
               <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#1a1a1a]" />
                    <h3 className="text-[14px] font-bold text-[#1a1a1a]">Usage Analytics</h3>
                 </div>
                 <button className="text-[12px] font-bold text-[#1a1a1a] bg-[#f0f0ec] px-3 py-1.5 rounded-[6px] hover:bg-[#e8e8e8]">View Analytics &rarr;</button>
               </div>
               
               <div className="grid grid-cols-4 gap-8 mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest block mb-1">TOTAL RUNS</span>
                    <span className="text-[32px] font-bold text-[#1a1a1a] tracking-tight">47</span>
                    <span className="text-[11px] text-[#6b6b6b] block">Last 30 days</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest block mb-1">SUCCESS RATE</span>
                    <span className="text-[32px] font-bold text-[#4caf50] tracking-tight">96%</span>
                    <span className="text-[11px] text-[#6b6b6b] block">Most runs pass</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest block mb-1">AVG DURATION</span>
                    <span className="text-[32px] font-bold text-[#1a1a1a] tracking-tight">15s</span>
                    <span className="text-[11px] text-[#6b6b6b] block">P95 is ~34.5s</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest block mb-1">TOTAL COST</span>
                    <span className="text-[32px] font-bold text-[#1a1a1a] tracking-tight">$23.50</span>
                    <span className="text-[11px] text-[#6b6b6b] block">Avg $0.50/run</span>
                  </div>
               </div>

               <p className="text-[10px] uppercase font-bold text-[#acacac] mb-2 tracking-widest">RUN VOLUME (30d)</p>
               <div className="flex items-end gap-1.5 h-[64px] border-b border-[#ece9e3] relative">
                  <div className="absolute right-0 bottom-6 w-full border-t border-dashed border-[#d5d5cf] pointer-events-none"/>
                  {Array.from({length: 40}).map((_, i) => (
                    <div key={i} className="flex-1 bg-[#2196f3] rounded-t-sm hover:opacity-80 cursor-pointer" style={{ height: `${Math.max(10, Math.random() * 60)}%` }} />
                  ))}
               </div>
            </section>

            {/* 6. RECENT RUNS */}
            <section id="runs" className="tool-scroll-section bg-white rounded-[16px] border border-[#ece9e3] p-[32px] shadow-sm">
               <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-2">
                    <Activity size={16} className="text-[#6b6b6b]" />
                    <h3 className="text-[14px] font-bold text-[#1a1a1a]">Recent Runs</h3>
                 </div>
                 <button className="text-[12px] font-bold text-[#2196f3] hover:underline">View All 47 &rarr;</button>
               </div>

               <div className="flex flex-col">
                  {runs?.slice(0,4)?.map((run) => {
                     const cfg = RUN_STATUS[run.status?.toLowerCase()] ?? RUN_STATUS_DEFAULT;
                     return (
                        <div key={run.run_id} className="flex justify-between items-center py-4 border-b border-[#fafaf8] last:border-0 group cursor-pointer hover:bg-[#fbfaf9] -mx-4 px-4 rounded-md transition-colors">
                           <div className="flex items-center gap-4">
                              <span className="text-[13px] font-mono font-bold text-[#1a1a1a] w-[140px]">{run.run_id}</span>
                              <span className={cn('h-[22px] px-[8px] rounded-[6px] text-[10px] font-bold flex items-center', cfg.bg, cfg.text)}>{cfg.label}</span>
                              <span className="text-[12px] text-[#6b6b6b] ml-4 font-mono w-[80px]">{(run.duration > 0 || run.status==='failed') ? `${run.duration || 12}s` : '...'}</span>
                              <span className="text-[12px] text-[#acacac]">v{run.version} — invoked by Test Runner</span>
                           </div>
                           <span className="text-[12px] text-[#949494]">{formatTimeAgo(run.created_at)}</span>
                        </div>
                     )
                  })}
               </div>
            </section>

            {/* 7. USED IN */}
            <section id="used-in" className="tool-scroll-section bg-white rounded-[16px] border border-[#ece9e3] p-[32px] shadow-sm">
               <div className="flex items-center gap-2 mb-6">
                 <Link2 size={16} className="text-[#6b6b6b]" />
                 <h3 className="text-[14px] font-bold text-[#1a1a1a]">Used In</h3>
               </div>
               
               <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest mb-4">WORKFLOWS</h4>
                    <div className="flex flex-col gap-3">
                       <div className="flex justify-between items-center p-3 border border-[#ece9e3] rounded-[8px] hover:border-[#d0d0d0] cursor-pointer">
                          <span className="flex items-center gap-2 text-[13px] font-bold text-[#1a1a1a]"><Globe size={14} className="text-[#2196f3]"/> FEA Validation Pipeline</span>
                          <span className="text-[10px] font-bold text-[#4caf50] px-2 bg-[#e8f5e9] rounded-full">Active</span>
                       </div>
                       <div className="flex justify-between items-center p-3 border border-[#ece9e3] rounded-[8px] hover:border-[#d0d0d0] cursor-pointer">
                          <span className="flex items-center gap-2 text-[13px] font-bold text-[#1a1a1a]"><Globe size={14} className="text-[#2196f3]"/> Robust CAD Generator</span>
                          <span className="text-[10px] font-bold text-[#4caf50] px-2 bg-[#e8f5e9] rounded-full">Active</span>
                       </div>
                       <div className="flex justify-between items-center p-3 border border-[#ece9e3] rounded-[8px] hover:border-[#d0d0d0] cursor-pointer">
                          <span className="flex items-center gap-2 text-[13px] font-bold text-[#1a1a1a]"><Globe size={14} className="text-[#2196f3]"/> FA Hardware Qualifier</span>
                          <span className="text-[10px] font-bold text-[#ff9800] px-2 bg-[#fff3e0] rounded-full">Draft</span>
                       </div>
                       <span className="text-[11px] text-[#949494] mt-1 ml-2 font-mono">View 2 more disconnected flows</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest mb-4">AGENTS</h4>
                    <div className="flex flex-col gap-3">
                       <div className="flex justify-between items-center p-3 border border-[#ece9e3] rounded-[8px] hover:border-[#d0d0d0] cursor-pointer">
                          <span className="flex items-center gap-2 text-[13px] font-bold text-[#1a1a1a]"><Combine size={14} className="text-[#9c27b0]"/> FEA Optimizer Agent</span>
                          <span className="text-[10px] font-bold text-[#4caf50] px-2 bg-[#e8f5e9] rounded-full">Active</span>
                       </div>
                       <span className="text-[11px] text-[#949494] mt-1 ml-2 font-mono">Available inside prompt tool lists automatically</span>
                    </div>
                  </div>
               </div>
            </section>

            {/* 8. TEST RUN */}
            <section id="test-run" className="tool-scroll-section bg-white rounded-[16px] border border-[#ece9e3] shadow-sm overflow-hidden">
               <div className="p-[32px] pb-[24px]">
                 <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                       <Play size={16} className="text-[#2196f3] fill-[#2196f3]" />
                       <h3 className="text-[14px] font-bold text-[#1a1a1a]">Test Run</h3>
                    </div>
                    <span className="text-[11px] text-[#6b6b6b]">Run custom tool with example inputs.</span>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 border-t border-[#ece9e3] min-h-[300px]">
                  {/* DYNAMIC INPUT FORM */}
                  <div className="p-[32px] border-r border-[#ece9e3] bg-[#fafaf8]">
                     <h4 className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest mb-4">TEST INPUTS</h4>
                     <div className="flex flex-col gap-5">
                       {(tool.contract?.inputs ?? []).length === 0 ? (
                         <p className="text-[12px] text-[#acacac] italic">No inputs defined for this tool.</p>
                       ) : (tool.contract?.inputs ?? []).map((inp) => (
                         <div key={inp.name}>
                           <label className="text-[11px] font-bold text-[#1a1a1a] mb-1.5 flex items-center gap-2">
                             {inp.name}
                             <span className={cn("text-[10px] font-normal px-1 rounded", inp.type === 'artifact' ? 'text-[#2196f3] bg-[#e3f2fd]' : 'text-[#6b6b6b] bg-[#f0f0ec]')}>{inp.type}</span>
                             {inp.required && <span className="text-[#e74c3c] text-[10px]">*</span>}
                           </label>
                           {inp.type === 'artifact' ? (
                             <div className="border border-dashed border-[#d5d5cf] bg-white rounded-[6px] h-12 flex items-center justify-center text-[12px] text-[#949494] gap-2 cursor-pointer hover:border-[#2196f3] hover:text-[#2196f3] transition-colors">
                               <Upload size={14}/> Artifact input (pass artifact_id)
                             </div>
                           ) : inp.type === 'boolean' ? (
                             <input
                               type="checkbox"
                               className="w-5 h-5 rounded cursor-pointer"
                               onChange={(e) => setTestInputs(prev => ({ ...prev, [inp.name]: e.target.checked }))}
                             />
                           ) : inp.type === 'number' || inp.type === 'float' || inp.type === 'integer' ? (
                             <input
                               type="number"
                               placeholder={inp.description ?? inp.name}
                               className="w-full h-10 border border-[#d5d5cf] rounded-[6px] px-3 text-[13px] text-[#1a1a1a] bg-white focus:border-[#2196f3] outline-none"
                               onChange={(e) => setTestInputs(prev => ({ ...prev, [inp.name]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                             />
                           ) : inp.type === 'json' || inp.type === 'object' ? (
                             <textarea
                               rows={3}
                               placeholder={`{"key": "value"}`}
                               className="w-full border border-[#d5d5cf] rounded-[6px] px-3 py-2 text-[12px] font-mono text-[#1a1a1a] bg-white focus:border-[#2196f3] outline-none resize-none"
                               onChange={(e) => { try { setTestInputs(prev => ({ ...prev, [inp.name]: JSON.parse(e.target.value) })) } catch { setTestInputs(prev => ({ ...prev, [inp.name]: e.target.value })) } }}
                             />
                           ) : (
                             <input
                               type="text"
                               placeholder={inp.description ?? inp.name}
                               className="w-full h-10 border border-[#d5d5cf] rounded-[6px] px-3 text-[13px] text-[#1a1a1a] bg-white focus:border-[#2196f3] outline-none"
                               onChange={(e) => setTestInputs(prev => ({ ...prev, [inp.name]: e.target.value }))}
                             />
                           )}
                         </div>
                       ))}

                       <button
                         type="button"
                         disabled={testRunning}
                         onClick={async () => {
                           if (!tool.id || !tool.currentVersion) return;
                           setTestRunning(true);
                           setTestResult(null);
                           setTestError(null);
                           try {
                             const run = await createRunMutation.mutateAsync({
                               toolId: tool.id,
                               version: tool.currentVersion,
                               inputs: testInputs,
                             });
                             const runId = run.run_id ?? '';
                             setTestResult({ status: run.status ?? 'running', run_id: runId, outputs: run });
                             // Poll for completion
                             if (runId) {
                               const poll = setInterval(async () => {
                                 try {
                                   const res = await fetch(`/v0/runs/${runId}`, { headers: { 'X-Project-Id': 'prj_default' } });
                                   if (!res.ok) return;
                                   const data = await res.json();
                                   const r = data.run ?? data;
                                   const status = (r.status ?? '').toLowerCase();
                                   if (status === 'failed' || status === 'succeeded' || status === 'completed' || status === 'cancelled') {
                                     clearInterval(poll);
                                     setTestResult({ status, run_id: runId, outputs: r });
                                     if (status === 'failed') setTestError(r.error ?? r.error_message ?? 'Run failed');
                                   } else {
                                     setTestResult({ status, run_id: runId, outputs: r });
                                   }
                                 } catch { /* ignore poll errors */ }
                               }, 3000);
                               // Stop polling after 5 minutes
                               setTimeout(() => clearInterval(poll), 300000);
                             }
                           } catch (e: any) {
                             setTestError(e?.message ?? 'Failed to start run');
                           } finally {
                             setTestRunning(false);
                           }
                         }}
                         className="h-10 mt-2 bg-[#2196f3] text-white rounded-[8px] text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#1976d2] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                       >
                         {testRunning ? <><Loader2 size={14} className="animate-spin"/> Running...</> : <><Play size={14} fill="white"/> Run Tool</>}
                       </button>
                     </div>
                  </div>

                  {/* OUTPUT PANEL */}
                  <div className="p-[32px] bg-white flex flex-col">
                     <h4 className="text-[10px] uppercase font-bold text-[#acacac] tracking-widest mb-4">TEST OUTPUT</h4>
                     {testError ? (
                       <div className="flex-1 border border-[#ffcdd2] bg-[#fffafa] rounded-[8px] p-6">
                         <div className="flex items-start gap-2 text-[#e74c3c]">
                           <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
                           <div>
                             <p className="text-[13px] font-bold mb-1">Run Failed</p>
                             <p className="text-[12px] font-mono">{testError}</p>
                           </div>
                         </div>
                       </div>
                     ) : testResult ? (
                       <div className="flex-1 flex flex-col gap-4">
                         <div className={cn("flex items-center gap-2 p-3 rounded-[8px]", testResult.status === 'running' ? 'bg-[#e3f2fd] text-[#2196f3]' : testResult.status === 'PENDING' ? 'bg-[#fff3e0] text-[#ff9800]' : 'bg-[#e8f5e9] text-[#4caf50]')}>
                           {testResult.status === 'running' || testResult.status === 'PENDING' || testResult.status === 'RUNNING' ? (
                             <Loader2 size={14} className="animate-spin"/>
                           ) : (
                             <CheckCircle size={14}/>
                           )}
                           <span className="text-[12px] font-bold">Run {testResult.status}</span>
                           {testResult.run_id && <span className="text-[11px] font-mono ml-auto">{testResult.run_id}</span>}
                         </div>
                         <div className="flex items-center gap-3">
                           {testResult.run_id && (
                             <button
                               onClick={() => {
                                 const el = document.getElementById('runs');
                                 if (el) el.scrollIntoView({ behavior: 'smooth' });
                               }}
                               className="text-[12px] text-[#2196f3] hover:underline font-bold flex items-center gap-1"
                             >
                               <ExternalLink size={12}/> View in Recent Runs
                             </button>
                           )}
                           <button
                             onClick={() => {
                               try {
                                 const data = testResult.outputs ?? testResult;
                                 const decoded: Record<string, unknown> = { ...(data as Record<string, unknown>) };
                                 const out = decoded.outputs;
                                 if (typeof out === 'string') { try { decoded.outputs = JSON.parse(atob(out)); } catch {} }
                                 const inp = decoded.inputs;
                                 if (typeof inp === 'string') { try { decoded.inputs = JSON.parse(atob(inp)); } catch {} }
                                 const blob = new Blob([JSON.stringify(decoded, null, 2)], { type: 'application/json' });
                                 const url = URL.createObjectURL(blob);
                                 const a = document.createElement('a');
                                 a.href = url;
                                 a.download = `run_${testResult.run_id}_result.json`;
                                 a.click();
                                 URL.revokeObjectURL(url);
                               } catch {}
                             }}
                             className="text-[12px] text-[#6b6b6b] hover:text-[#1a1a1a] font-bold flex items-center gap-1"
                           >
                             <Download size={12}/> Download Results
                           </button>
                         </div>
                         <div className="flex-1 bg-[#1a1a1a] rounded-[8px] p-4 font-mono text-[11px] text-[#a855f7] overflow-auto max-h-[400px]">
                           <pre>{(() => {
                             try {
                               const data = testResult.outputs ?? testResult;
                               const decoded: Record<string, unknown> = { ...(data as Record<string, unknown>) };
                               const inp = decoded.inputs;
                               if (typeof inp === 'string' && !inp.startsWith('{')) {
                                 try { decoded.inputs = JSON.parse(atob(inp)); } catch {}
                               }
                               const out = decoded.outputs;
                               if (typeof out === 'string' && !out.startsWith('[') && !out.startsWith('{')) {
                                 try { decoded.outputs = JSON.parse(atob(out)); } catch {}
                               }
                               return JSON.stringify(decoded, null, 2);
                             } catch { return JSON.stringify(testResult.outputs ?? testResult, null, 2); }
                           })()}</pre>
                         </div>
                       </div>
                     ) : (
                       <div className="flex-1 border border-dashed border-[#d5d5cf] rounded-[8px] flex flex-col items-center justify-center text-center p-8">
                         <div className="w-12 h-12 rounded-full bg-[#f5f5f0] flex items-center justify-center mb-4"><PlayCircle size={24} className="text-[#acacac] stroke-[1]"/></div>
                         <p className="text-[13px] font-bold text-[#6b6b6b] mb-1">Run the tool to view output here.</p>
                         <p className="text-[11px] text-[#949494]">Results will appear after execution completes.</p>
                       </div>
                     )}
                  </div>
               </div>
            </section>

            {/* 9. DANGER ZONE */}
            <section id="danger" className="tool-scroll-section bg-[#fffafa] rounded-[16px] border border-[#ffcdd2] p-[32px] mb-8 shadow-sm">
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#e74c3c] mb-2 flex items-center gap-2"><AlertTriangle size={16}/> Deprecate This Version</h3>
                    <p className="text-[12px] text-[#6b6b6b] max-w-[600px] leading-relaxed">This version (v2.1.0) will no longer be available for new workflows. Active workflows will continue to operate normally. This action cannot be easily reversed.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Deprecate version ${tool.currentVersion}? Active workflows will continue but this version will be unavailable for new runs. This cannot be easily reversed.`)) {
                        deprecateMutation.mutate({ version: tool.currentVersion, message: 'Deprecated via UI' });
                      }
                    }}
                    disabled={deprecateMutation.isPending || tool.status === 'deprecated'}
                    className="h-[40px] px-[20px] bg-white border-2 border-[#e74c3c] text-[#e74c3c] rounded-[8px] text-[12px] font-bold hover:bg-[#ffebee] transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deprecateMutation.isPending ? <><Loader2 size={14} className="animate-spin"/> Deprecating...</> : <><AlertTriangle size={14}/> Deprecate version</>}
                  </button>
               </div>
            </section>

         </div>
      </div>

      {showEditModal && (
        <EditToolModal
          tool={tool}
          onClose={() => setShowEditModal(false)}
          onSave={() => { refetch(); setShowEditModal(false); }}
        />
      )}

      {/* ═ STICKY BOTTOM BAR FOOTER ═ */}
      <div className="absolute bottom-0 left-0 right-0 h-[72px] bg-white border-t border-[#ece9e3] px-[32px] flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.03)] z-30">
         <div className="flex items-center gap-4">
            <button onClick={() => setShowEditModal(true)} className="h-[40px] px-6 bg-[#1a1a1a] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#333] tracking-wide shadow-sm flex items-center gap-2"><Edit2 size={14}/> Edit Form</button>
            <button onClick={() => document.getElementById('test-run')?.scrollIntoView({ behavior: 'smooth' })} className="h-[40px] px-6 border-2 border-[#2196f3] text-[#2196f3] bg-[#fbf5f0] hover:bg-[#e3f2fd] rounded-[8px] text-[13px] font-bold transition-colors flex items-center gap-2"><Play size={14} fill="currentColor"/> Test Run</button>
            <button className="h-[40px] px-6 border border-[#ece9e3] text-[#1a1a1a] rounded-[8px] text-[13px] font-bold hover:bg-[#fbfaf9] transition-colors flex items-center gap-2"><Box size={14}/> Duplicate Tool</button>
         </div>
         <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#949494]">Tool timeline ({tool.currentVersion})</span>
            <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-[4px]", tool.status === 'published' ? 'bg-[#e8f5e9] text-[#4caf50]' : 'bg-[#fff3e0] text-[#ff9800]')}>{STATUS_LABELS[tool.status]}</span>
            <span className="text-[11px] font-bold text-[#6b6b6b]">{tool.usageCount ?? 0} runs</span>
         </div>
      </div>

    </div>
  );
}
