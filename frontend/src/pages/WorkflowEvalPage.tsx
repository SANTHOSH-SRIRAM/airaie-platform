import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileJson, X, Edit2, Check, ExternalLink, Download,
  Maximize2, Filter, ChevronDown, Play, RotateCcw, FileText, Info,
  MoreHorizontal, Activity, ArrowUpRight, CheckCircle2, Settings
} from 'lucide-react';
import { cn } from '@utils/cn';

// -----------------------------------------------------------------------------
// UI Atoms
// -----------------------------------------------------------------------------

function CheckboxRow({ label, checked = false }: { label: string, checked?: boolean }) {
  return (
    <div className="flex justify-between items-start py-1.5 group cursor-pointer">
      <div className="flex gap-2.5 items-start">
        <div className={cn(
          "w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 mt-[2px] transition-colors",
          checked ? "bg-[#2d2d2d] border-[#2d2d2d]" : "bg-white border-[#d5d5cf] group-hover:border-[#949494]"
        )}>
          {checked && <Check size={12} className="text-white" strokeWidth={3} />}
        </div>
        <span className={cn("text-[13px] font-medium leading-tight", checked ? "text-[#1a1a1a]" : "text-[#949494]")}>
          {label}
        </span>
      </div>
      <Info size={12} className="text-[#d5d5cf] group-hover:text-[#949494] transition-colors mt-[3px]" />
    </div>
  );
}

function MetricInput({ label, val }: { label: string, val: string }) {
  return (
    <div className="flex justify-between items-center py-2 text-[13px]">
      <span className="text-[#6b6b6b] font-medium">{label}</span>
      <span className="text-[#1a1a1a] font-mono select-all">{val}</span>
    </div>
  );
}

function StatCard({ title, main, val1, val2Str, val2Col, dots }: any) {
  return (
    <div className="flex flex-col gap-2 relative">
      <h4 className="text-[10px] font-bold tracking-[0.08em] text-[#949494] uppercase">{title}</h4>
      <div className="flex items-end gap-2">
        <span className={cn("text-[32px] font-bold leading-none tracking-tight", val2Col ? val2Col : "text-[#1a1a1a]")}>{main}</span>
      </div>
      <div className="text-[11px] font-bold flex items-center gap-1.5 mt-1">
        {val2Col && <ArrowUpRight size={12} className={val2Col} strokeWidth={3} />}
        <span className={val2Col ? val2Col : "text-[#6b6b6b]"}>{val1}</span>
      </div>
      {val2Str && <div className="text-[11px] font-bold text-[#4caf50] mt-0.5">{val2Str}</div>}
      {dots && (
        <div className="flex gap-1.5 mt-1.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i < 5 ? "bg-[#4caf50]" : "bg-[#e74c3c]")} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ label, pct, val, color }: any) {
  return (
    <div className="flex flex-col gap-1.5 mb-3">
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-[#6b6b6b] font-medium">{label}</span>
        <span className="font-mono text-[#1a1a1a]">{val}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[#f0f0ec] overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Eval Data
// -----------------------------------------------------------------------------

const T_DATA = [
  { id: 'TC-001', input: 'mesh_a.stl', exp: '< 200 MPa', act: '187 MPa', pass: true, cost: '$1.50', dur: '32s' },
  { id: 'TC-002', input: 'mesh_b.stl', exp: '< 150 MPa', act: '142 MPa', pass: true, cost: '$1.80', dur: '38s' },
  { id: 'TC-003', input: 'mesh_c.stl', exp: '< 300 MPa', act: '312 MPa', pass: false, cost: '$2.10', dur: '45s', failText: 'Expected max stress < 300 MPa, but actual was 312 MPa (4% over limit)', failRoot: 'Mesh too coarse near thin-wall stress concentrators (element size 5mm, recommended < 2mm)', sha: 'e5f6g7h8...' },
  { id: 'TC-004', input: 'mesh_d.stl', exp: '< 250 MPa', act: '198 MPa', pass: true, cost: '$1.40', dur: '28s' },
  { id: 'TC-005', input: 'mesh_e.stl', exp: '< 200 MPa', act: '176 MPa', pass: true, cost: '$1.60', dur: '31s' },
  { id: 'TC-006', input: 'mesh_f.stl', exp: '< 280 MPa', act: '225 MPa', pass: true, cost: '$1.50', dur: '30s' },
];

export default function WorkflowEvalPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full bg-[#fbfaf9] flex flex-col font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="h-[64px] bg-white border-b border-[#ece9e3] flex flex-row items-center justify-between px-6 shrink-0 relative z-20">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-[6px] hover:bg-[#f5f5f0] flex items-center justify-center text-[#1a1a1a] transition-colors"><ArrowLeft size={18} /></button>
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-bold text-[#1a1a1a]">FEA Validation Pipeline</h1>
            <span className="px-2 py-0.5 bg-[#e8f5e9] text-[#4caf50] text-[11px] font-bold rounded-full">v3 published</span>
          </div>
        </div>

        <div className="flex items-center h-full flex-1 justify-center gap-8">
          <button className="text-[13px] font-medium text-[#949494] hover:text-[#1a1a1a] h-full transition-colors">Editor</button>
          <button className="text-[13px] font-medium text-[#949494] hover:text-[#1a1a1a] h-full transition-colors">Runs</button>
          <button className="text-[13px] font-bold text-[#1a1a1a] h-full relative">
            Eval
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a1a1a] rounded-t-full"></div>
          </button>
        </div>

        <div className="flex items-center flex-1 justify-end">
          <div className="w-[32px] h-[32px] rounded-full bg-[#2d2d2d] flex items-center justify-center text-[13px] font-bold text-white shadow-sm ring-2 ring-white">S</div>
        </div>
      </header>

      {/* FLOATING RIGHT TOOLBAR */}
      <div className="absolute right-4 top-[80px] w-10 bg-white border border-[#ece9e3] rounded-[8px] shadow-sm flex flex-col py-1 z-30">
        <button className="h-10 w-full flex items-center justify-center text-[#949494] hover:text-[#1a1a1a] hover:bg-[#f5f5f0] rounded-none"><FileJson size={16}/></button>
        <button className="h-10 w-full flex items-center justify-center text-[#949494] hover:text-[#1a1a1a] hover:bg-[#f5f5f0] rounded-none"><Download size={16}/></button>
        <button className="h-10 w-full flex items-center justify-center text-[#949494] hover:text-[#1a1a1a] hover:bg-[#f5f5f0] rounded-none border-b border-[#ece9e3]"><ExternalLink size={16}/></button>
        <button className="h-10 w-full flex items-center justify-center text-[#949494] hover:text-[#1a1a1a] hover:bg-[#f5f5f0] rounded-none"><Activity size={16}/></button>
        <button className="h-10 w-full flex items-center justify-center text-[#949494] hover:text-[#1a1a1a] hover:bg-[#f5f5f0] rounded-none"><Settings size={16}/></button>
      </div>

      {/* MAIN BODY: 3 COLS */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4 h-full pr-16 max-w-[1440px] mx-auto w-full">
        
        {/* LEFT COL: Config */}
        <div className="w-[280px] bg-[#fafaf8] border border-[#ece9e3] rounded-[12px] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-[#ece9e3]">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-[14px] font-bold text-[#1a1a1a]">Test Suite</h2>
              <FileJson size={14} className="text-[#a855f7]" />
            </div>
            <p className="text-[10px] font-bold text-[#acacac] tracking-wider mb-4">TEST DATASET</p>
            
            <div className="border border-dashed border-[#d5d5cf] rounded-[8px] p-4 flex flex-col items-center justify-center bg-white mb-2">
              <Upload size={16} className="text-[#acacac] mb-2" />
              <p className="text-[12px] font-medium text-[#6b6b6b]">Drop CSV or JSON</p>
              <p className="text-[12px] font-medium text-[#a855f7] cursor-pointer hover:underline">or browse</p>
            </div>

            <div className="bg-[#f3e8ff] border border-[#d8b4fe] rounded-[6px] px-3 py-2 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileJson size={14} className="text-[#9333ea] shrink-0" />
                <span className="text-[12px] font-bold text-[#1a1a1a] truncate">stress_test_cases....</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold text-[#4caf50] px-1.5 py-0.5 bg-[#dcfce7] rounded-sm">6 cases</span>
                <X size={14} className="text-[#949494] cursor-pointer hover:text-[#1a1a1a]" />
              </div>
            </div>
            
            <button className="flex items-center gap-1.5 text-[11px] font-bold text-[#a855f7] hover:underline">
              <Edit2 size={12} /> Edit Dataset
            </button>
          </div>

          <div className="p-4 border-b border-[#ece9e3]">
            <p className="text-[10px] font-bold text-[#acacac] tracking-wider mb-3">WORKFLOW METRICS</p>
            <div className="flex flex-col gap-1">
              <CheckboxRow label="Output value matches expected" checked={true} />
              <CheckboxRow label="Artifact produced successfully" checked={true} />
              <CheckboxRow label="Execution cost under budget" checked={true} />
              <CheckboxRow label="Duration under threshold" checked={false} />
            </div>
          </div>

          <div className="p-4 border-b border-[#ece9e3]">
            <div className="flex items-center gap-1.5 mb-3">
              <p className="text-[10px] font-bold text-[#acacac] tracking-wider">AGENT METRICS</p>
              <Info size={12} className="text-[#a855f7]" />
            </div>
            <div className="flex flex-col gap-1">
              <CheckboxRow label="Correct tool selected" checked={true} />
              <CheckboxRow label="Confidence score > 0.80" checked={true} />
              <CheckboxRow label="Completed in < 3 iterations" checked={false} />
              <CheckboxRow label="No escalation required" checked={false} />
            </div>
          </div>

          <div className="p-4">
            <p className="text-[10px] font-bold text-[#acacac] tracking-wider mb-2">THRESHOLDS</p>
            <div className="flex flex-col">
              <MetricInput label="Max stress (MPa)" val="250" />
              <MetricInput label="Min safety factor" val="1.2" />
              <MetricInput label="Max cost per run ($)" val="5.00" />
              <MetricInput label="Max duration (s)" val="120" />
            </div>
          </div>

          <div className="mt-auto border-t border-[#ece9e3] p-3 text-[11px] font-medium text-[#acacac] flex items-center justify-between bg-white relative rounded-b-[12px]">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4caf50]" />
              <span>Last run: 87% score</span>
            </div>
            <span>2h ago</span>
          </div>
        </div>

        {/* CENTER COL: Evaluation Results */}
        <div className="flex-1 flex flex-col min-w-[500px] h-full overflow-hidden bg-white border border-[#ece9e3] shadow-sm rounded-[12px] relative">
          
          <div className="p-6 border-b border-[#ece9e3] flex justify-between">
             <StatCard title="Overall Score" main="87%" val1="+5% from last run" val2Col="text-[#4caf50]" />
             <div className="w-px h-16 bg-[#ece9e3] mt-2"></div>
             <StatCard title="Pass Rate" main="5/6" val1="test cases passed" dots />
             <div className="w-px h-16 bg-[#ece9e3] mt-2"></div>
             <StatCard title="Avg Cost" main="$1.65" val1="per test case" val2Str="✓ Budget: $5.00" />
             <div className="w-px h-16 bg-[#ece9e3] mt-2"></div>
             <StatCard title="Avg Duration" main="34s" val1="per test case" val2Str="✓ Threshold: 120s" />
          </div>

          <div className="flex justify-between items-center px-6 py-4 border-b border-[#ece9e3] bg-[#fbfaf9] sticky top-0 z-10">
            <h3 className="text-[14px] font-bold text-[#1a1a1a]">Test Results — Run #eval_001</h3>
            <div className="flex gap-4 text-[#6b6b6b]">
              <button className="hover:text-[#1a1a1a]"><Download size={15} /></button>
              <button className="hover:text-[#1a1a1a]"><Maximize2 size={15} /></button>
              <button className="hover:text-[#1a1a1a]"><Filter size={15} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[#ece9e3] text-[9px] font-bold text-[#acacac] uppercase tracking-wider bg-[#fafaf8]">
                  <th className="py-2.5 px-6 font-medium">Test Case</th>
                  <th className="py-2.5 px-3 font-medium">Input</th>
                  <th className="py-2.5 px-3 font-medium">Expected</th>
                  <th className="py-2.5 px-3 font-medium">Actual</th>
                  <th className="py-2.5 px-3 font-medium text-center">Pass</th>
                  <th className="py-2.5 px-3 font-medium text-right">Cost</th>
                  <th className="py-2.5 pl-3 pr-6 font-medium text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece9e3]">
                {T_DATA.map((row) => (
                  <tr key={row.id} className={cn("group hover:bg-[#fbfaf9] transition-colors relative", !row.pass && "bg-[#fffafa] hover:bg-[#fffafa]")}>
                    {!row.pass && <td colSpan={7} className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#e74c3c]" />}
                    {/* Main Row Data */}
                    <td className="py-4 px-6 flex items-center gap-3">
                      {row.pass ? <CheckCircle2 size={14} className="text-[#4caf50]" /> : <X size={14} className="text-white bg-[#e74c3c] rounded-full p-[2px]" strokeWidth={3} />}
                      <span className={cn("font-bold font-mono", row.pass ? "text-[#1a1a1a]" : "text-[#e74c3c]")}>{row.id}</span>
                    </td>
                    <td className="py-4 px-3 text-[#949494] font-mono">{row.input} <span className="opacity-50">· ..</span></td>
                    <td className="py-4 px-3 text-[#949494] font-mono">{row.exp}</td>
                    <td className={cn("py-4 px-3 font-bold font-mono", row.pass ? "text-[#4caf50]" : "text-[#e74c3c]")}>{row.act}</td>
                    <td className="py-4 px-3 text-center">
                      {row.pass ? <Check size={14} className="text-[#4caf50] mx-auto" /> : <X size={14} className="text-[#e74c3c] mx-auto" />}
                    </td>
                    <td className="py-4 px-3 text-[#6b6b6b] font-mono text-right">{row.cost}</td>
                    <td className="py-4 pl-3 pr-6 text-[#949494] font-mono text-right flex items-center justify-end gap-2">
                       {row.dur} {!row.pass && <ChevronDown size={14} />}
                    </td>
                    
                    {/* Expansion details if failed (hacked into the layout for demonstration) */}
                    {!row.pass && (
                       <td colSpan={7} className="absolute top-[52px] left-8 right-0 p-4 border-t border-dashed border-[#ffcdd2] bg-transparent pb-6 content-none pointer-events-none" style={{ display: 'none'}}></td>
                    )}
                  </tr>
                ))}
                
                {/* Manual fail expansion row injection to keep valid HTML table nesting */}
                <tr className="bg-[#fffafa] border-t-0 relative w-full group">
                  <td colSpan={7} className="p-0 border-b border-[#ece9e3] relative">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#e74c3c]"></div>
                    <div className="pl-14 pr-6 py-4 -mt-2">
                      <p className="text-[10px] font-bold text-[#acacac] tracking-widest uppercase mb-2">Failure Analysis</p>
                      <p className="text-[13px] text-[#e74c3c] font-medium mb-1.5">Expected max stress {`<`} 300 MPa, but actual was 312 MPa (4% over limit)</p>
                      <p className="text-[12px] text-[#6b6b6b] leading-relaxed mb-3">Root cause: Mesh too coarse near thin-wall stress concentrators (element size 5mm, recommended {`<`} 2mm)</p>
                      <div className="flex gap-4">
                         <button className="flex items-center gap-1.5 text-[11px] font-bold text-[#1a1a1a] hover:underline mb-1"><ArrowUpRight size={12} /> View Run</button>
                         <button className="flex items-center gap-1.5 text-[11px] font-bold text-[#1a1a1a] hover:underline mb-1"><FileText size={12} /> View Artifact</button>
                      </div>
                      <p className="text-[11px] text-[#949494] font-mono mt-1">Artifact: stress_map_tc003.vtk · SHA: e5f6g7h8...</p>
                    </div>
                  </td>
                </tr>
                {/* Remaining active rows appended purely for visual stacking correctly */}
                <tr className="group hover:bg-[#fbfaf9] transition-colors border-b border-[#ece9e3]">
                  <td className="py-4 px-6 flex items-center gap-3"><CheckCircle2 size={14} className="text-[#4caf50]" /><span className={"font-bold font-mono text-[#1a1a1a]"}>TC-004</span></td>
                  <td className="py-4 px-3 text-[#949494] font-mono">mesh_d.stl <span className="opacity-50">· ..</span></td>
                  <td className="py-4 px-3 text-[#949494] font-mono">{`<`} 250 MPa</td>
                  <td className="py-4 px-3 font-bold font-mono text-[#4caf50]">198 MPa</td>
                  <td className="py-4 px-3"><Check size={14} className="text-[#4caf50] mx-auto" /></td>
                  <td className="py-4 px-3 text-[#6b6b6b] font-mono text-right">$1.40</td>
                  <td className="py-4 pl-3 pr-6 text-[#949494] font-mono text-right">28s</td>
                </tr>
                <tr className="group hover:bg-[#fbfaf9] transition-colors border-b border-[#ece9e3]">
                  <td className="py-4 px-6 flex items-center gap-3"><CheckCircle2 size={14} className="text-[#4caf50]" /><span className={"font-bold font-mono text-[#1a1a1a]"}>TC-005</span></td>
                  <td className="py-4 px-3 text-[#949494] font-mono">mesh_e.stl <span className="opacity-50">· ..</span></td>
                  <td className="py-4 px-3 text-[#949494] font-mono">{`<`} 200 MPa</td>
                  <td className="py-4 px-3 font-bold font-mono text-[#4caf50]">176 MPa</td>
                  <td className="py-4 px-3"><Check size={14} className="text-[#4caf50] mx-auto" /></td>
                  <td className="py-4 px-3 text-[#6b6b6b] font-mono text-right">$1.60</td>
                  <td className="py-4 pl-3 pr-6 text-[#949494] font-mono text-right">31s</td>
                </tr>
                <tr className="group hover:bg-[#fbfaf9] transition-colors">
                  <td className="py-4 px-6 flex items-center gap-3"><CheckCircle2 size={14} className="text-[#4caf50]" /><span className={"font-bold font-mono text-[#1a1a1a]"}>TC-006</span></td>
                  <td className="py-4 px-3 text-[#949494] font-mono">mesh_f.stl <span className="opacity-50">· ..</span></td>
                  <td className="py-4 px-3 text-[#949494] font-mono">{`<`} 280 MPa</td>
                  <td className="py-4 px-3 font-bold font-mono text-[#4caf50]">225 MPa</td>
                  <td className="py-4 px-3"><Check size={14} className="text-[#4caf50] mx-auto" /></td>
                  <td className="py-4 px-3 text-[#6b6b6b] font-mono text-right">$1.50</td>
                  <td className="py-4 pl-3 pr-6 text-[#949494] font-mono text-right">30s</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#ece9e3] bg-[#fafaf8] flex items-center justify-between mt-auto">
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-6 py-2 bg-[#1a1a1a] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#2d2d2d] transition-colors shadow-sm">
                <Play size={14} className="fill-white" /> Run All Tests
              </button>
              <button className="flex items-center gap-2 px-6 py-2 border-2 border-[#e74c3c] text-[#e74c3c] rounded-[8px] text-[13px] font-bold hover:bg-[#ffebee] transition-colors bg-white">
                <RotateCcw size={14} /> Run Failed Only
              </button>
              <button className="flex items-center gap-2 px-6 py-2 border-2 border-[#1a1a1a] text-[#1a1a1a] rounded-[8px] text-[13px] font-bold hover:bg-[#f5f5f0] transition-colors bg-white">
                <Download size={14} /> Export Report
              </button>
            </div>
            <span className="text-[12px] font-medium text-[#6b6b6b]">6 test cases · 5 passed · 1 failed</span>
          </div>

        </div>

        {/* RIGHT COL: Run Summary */}
        <div className="w-[280px] shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-[#ece9e3] mb-4">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-[14px] font-bold text-[#1a1a1a]">Run Summary</h2>
                <MoreHorizontal size={16} className="text-[#acacac]" />
             </div>

             <div className="flex flex-col gap-1 mb-3">
               <span className="text-[10px] font-bold text-[#acacac] tracking-wider uppercase">TEST RUN</span>
               <span className="font-mono font-bold text-[15px] text-[#1a1a1a]">Run #eval_001</span>
             </div>

             <span className="inline-flex px-2 py-0.5 bg-[#f3e8ff] text-[#9333ea] rounded-full text-[11px] font-bold tracking-wide">
               <Activity size={10} className="mr-1 inline -translate-y-[1px]" /> Evaluation
             </span>
             <p className="text-[12px] text-[#949494] mt-2">Completed 2 hours ago</p>
          </div>

          <div className="px-4 mb-8">
            <h3 className="text-[10px] font-bold text-[#acacac] uppercase tracking-wider mb-4">SCORE BREAKDOWN</h3>
            <div className="flex items-end gap-1 mb-6 justify-center">
              <span className="text-[36px] font-bold leading-none text-[#1a1a1a]">87</span>
              <span className="text-[16px] font-bold text-[#6b6b6b] mb-1">%</span>
            </div>
            <ProgressBar label="Output accuracy" val="83%" pct={83} color="bg-[#4caf50]" />
            <ProgressBar label="Artifact check" val="100%" pct={100} color="bg-[#4caf50]" />
            <ProgressBar label="Cost compliance" val="100%" pct={100} color="bg-[#4caf50]" />
            <ProgressBar label="Tool selection" val="67%" pct={67} color="bg-[#ff9800]" />
          </div>

          <div className="px-4 mb-8">
            <h3 className="text-[10px] font-bold text-[#acacac] uppercase tracking-wider mb-2">COMPARISON</h3>
            <div className="h-[50px] bg-[#ece9e3] rounded-[6px] mb-2 px-2 pb-1 pt-3 flex items-end justify-between relative overflow-hidden">
               {/* Extremely rudimentary mockup chart via SVG/DOM elements */}
               <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="absolute bottom-0 left-0 right-0 w-full h-[80%] text-[#9333ea]">
                  <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points="0,20 20,15 40,25 60,10 80,5 100,8" />
                  <circle cx="80" cy="5" r="2.5" fill="#9333ea" />
               </svg>
               <span className="absolute top-1 right-2 text-[8px] font-mono text-[#a855f7]">Target</span>
               <span className="text-[7px] text-[#949494] font-mono z-10 w-full flex justify-between absolute bottom-1 left-2 pr-4"><span>eval_005</span><span>eval_004</span><span>eval_003</span><span>eval_002</span><span>_001</span></span>
            </div>
            <p className="text-[11px] font-medium text-[#4caf50]">Trend: improving (+19% over 5 runs)</p>
          </div>

          <div className="px-4 mb-8">
            <div className="flex items-center gap-1.5 mb-3">
              <h3 className="text-[10px] font-bold text-[#acacac] uppercase tracking-wider">AGENT PERFORMANCE</h3>
              <Info size={12} className="text-[#a855f7]" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[12px]">
                 <span className="text-[#6b6b6b] w-[140px]">Correct tool selections</span>
                 <div className="flex flex-col text-right font-mono text-[#ff9800]">
                   <span>4/6 ·</span>
                   <span>67%</span>
                 </div>
              </div>
              <MetricInput label="Avg confidence" val="0.84" />
              <div className="flex justify-between items-center py-1 text-[13px]">
                <span className="text-[#6b6b6b] font-medium">Escalations</span>
                <span className="text-[#ff9800] font-mono">1</span>
              </div>
              <MetricInput label="Avg iterations" val="2.1" />
            </div>
          </div>

          <div className="px-4 pb-4">
            <h3 className="text-[10px] font-bold text-[#acacac] uppercase tracking-wider mb-2">RESOURCE USAGE</h3>
            <div className="flex flex-col">
               <MetricInput label="Total cost" val="$9.90" />
               <MetricInput label="Total duration" val="3m 24s" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
