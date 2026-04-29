import { useNavigate } from 'react-router-dom';
import {
  Wrench, FlaskConical, Wind, Grid2X2, Database, BarChart3, Box,
  Paperclip, Thermometer, Calculator, Scale, BrainCircuit, Archive,
  Combine, ShieldCheck, Plus,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { useToolList } from '@hooks/useTools';
import type { Tool, ToolStatus, ToolAdapter } from '@/types/tool';

const TOOL_ICONS: Record<string, LucideIcon> = {
  FlaskConical, Wind, Grid2X2, Database, BarChart3, Box, Paperclip,
  Thermometer, Calculator, Scale, BrainCircuit, Archive, Combine,
  ShieldCheck, Wrench,
};

const ADAPTER_LABELS: Record<ToolAdapter, string> = {
  docker: 'Docker', python: 'Python', wasm: 'WASM', 'remote-api': 'Remote API',
};

const STATUS_STYLES: Record<ToolStatus, string> = {
  published: 'bg-[#e8f5e9] text-[#4caf50]',
  draft:     'bg-[#fff3e0] text-[#ff9800]',
  deprecated:'bg-[#f5f5f0] text-[#acacac]',
};

function ToolIcon({ name }: { name: string }) {
  const Icon = TOOL_ICONS[name] ?? Wrench;
  return <Icon size={20} className="text-[#2196f3]" />;
}

function ToolCard({ tool, onClick }: { tool: Tool; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-[#ece9e3] rounded-[16px] p-6 cursor-pointer hover:border-[#2196f3] hover:shadow-md transition-all duration-150 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-[10px] bg-[#e3f2fd] flex items-center justify-center shrink-0">
          <ToolIcon name={tool.icon} />
        </div>
        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', STATUS_STYLES[tool.status] ?? STATUS_STYLES.draft)}>
          {tool.status}
        </span>
      </div>

      <h3 className="text-[15px] font-bold text-[#1a1a1a] mb-1 group-hover:text-[#2196f3] transition-colors">
        {tool.name}
      </h3>
      <p className="text-[12px] text-[#6b6b6b] leading-relaxed mb-4 line-clamp-2">
        {tool.description}
      </p>

      <div className="flex items-center justify-between text-[11px]">
        <div className="flex gap-2 flex-wrap">
          {tool.adapter && (
            <span className="px-2 py-0.5 bg-[#f0f0ec] text-[#6b6b6b] rounded-[4px] font-medium">
              {ADAPTER_LABELS[tool.adapter] ?? tool.adapter}
            </span>
          )}
          {tool.currentVersion && (
            <span className="px-2 py-0.5 bg-[#f0f0ec] text-[#6b6b6b] rounded-[4px] font-mono">
              {tool.currentVersion}
            </span>
          )}
        </div>
        {tool.usageCount > 0 && (
          <span className="text-[#949494] font-mono">{tool.usageCount} runs</span>
        )}
      </div>

      {tool.tags && tool.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#f0f0ec]">
          {tool.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-[#fbfaf9] text-[#949494] text-[10px] font-medium rounded-full border border-[#ece9e3]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#ece9e3] rounded-[16px] p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-[10px] bg-[#f0f0ec]" />
        <div className="h-4 w-16 bg-[#f0f0ec] rounded-full" />
      </div>
      <div className="h-4 w-3/4 bg-[#f0f0ec] rounded mb-2" />
      <div className="h-3 w-full bg-[#f0f0ec] rounded mb-1" />
      <div className="h-3 w-2/3 bg-[#f0f0ec] rounded mb-4" />
      <div className="flex gap-2">
        <div className="h-5 w-14 bg-[#f0f0ec] rounded" />
        <div className="h-5 w-12 bg-[#f0f0ec] rounded" />
      </div>
    </div>
  );
}

export default function ToolsPage() {
  const navigate = useNavigate();
  const { data: tools = [], isLoading, isError } = useToolList();

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[#1a1a1a] tracking-tight">Tool Registry</h1>
          <p className="text-[13px] text-[#6b6b6b] mt-1">
            {isLoading ? 'Loading...' : `${tools.length} tool${tools.length !== 1 ? 's' : ''} available`}
          </p>
        </div>
        <button
          onClick={() => navigate('/tools/register')}
          className="h-[40px] px-5 bg-[#1a1a1a] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={14} /> Register Tool
        </button>
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-[#ffebee] border border-[#ffcdd2] rounded-[12px] p-6 text-center text-[#e74c3c] text-[13px] mb-6">
          Failed to load tools. Please check your connection and try again.
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : tools.length === 0
            ? (
              <div className="col-span-3 bg-white border border-dashed border-[#ece9e3] rounded-[16px] p-12 text-center">
                <Wrench size={32} className="text-[#acacac] mx-auto mb-4" />
                <h3 className="text-[15px] font-bold text-[#1a1a1a] mb-2">No tools registered yet</h3>
                <p className="text-[13px] text-[#6b6b6b] mb-6">Register your first tool to get started.</p>
                <button
                  onClick={() => navigate('/tools/register')}
                  className="h-[40px] px-6 bg-[#2196f3] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#1976d2] transition-colors"
                >
                  Register Tool
                </button>
              </div>
            )
            : tools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onClick={() => navigate(`/tools/${tool.id}`)}
              />
            ))
        }
      </div>
    </div>
  );
}
