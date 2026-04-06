import { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  FileCheck,
  Grid3x3,
  HardDrive,
  Lightbulb,
  Radio,
  Repeat,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Triangle,
  Webhook,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NODE_CATEGORIES, type NodeDefinition } from '@constants/nodeCategories';
import { useWorkflowStore } from '@store/workflowStore';
import PaletteNodeItem from './PaletteNodeItem';

/** Map icon name strings (from nodeCategories) to actual Lucide icon components */
const NODE_ICONS: Record<string, LucideIcon> = {
  Webhook,
  Clock,
  Radio,
  Triangle,
  Wind,
  Grid3x3,
  Database,
  Brain,
  Lightbulb,
  GitBranch: ChevronRight, // fallback -- GitBranch imported in node components
  Repeat,
  ShieldCheck,
  FileCheck,
  HardDrive,
  ArrowRightLeft,
};

function resolveIcon(node: NodeDefinition): LucideIcon {
  return NODE_ICONS[node.icon] ?? Webhook;
}

export default function NodePalette() {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    agents: true,
    logic: true,
    governance: true,
    data: true,
  });

  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const nodes = useWorkflowStore((s) => s.nodes);

  const query = search.toLowerCase();

  const selectedSubtype = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId)?.data.subtype,
    [nodes, selectedNodeId]
  );

  const filtered = useMemo(
    () =>
      NODE_CATEGORIES.map((cat) => ({
        ...cat,
        nodes: cat.nodes.filter(
          (n) =>
            n.label.toLowerCase().includes(query) ||
            n.description.toLowerCase().includes(query) ||
            n.subtype.toLowerCase().includes(query)
        ),
      })).filter((cat) => cat.nodes.length > 0),
    [query]
  );

  const toggleSection = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-full flex-col p-[16px]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Nodes</h2>
        <button
          className="rounded-[10px] p-2 text-[#949494] transition-colors hover:bg-[#f8f8f7] hover:text-[#1a1a1a]"
          aria-label="Filter nodes"
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-[#ece9e3] bg-[#fbfaf9] px-3 py-2">
        <Search size={14} className="shrink-0 text-[#acacac]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search nodes..."
          className="h-[36px] w-full bg-transparent pr-1 text-[13px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none"
        />
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto pb-16 scrollbar-hide">
        {filtered.map((cat) => {
          const isCollapsed = collapsed[cat.id] ?? false;
          return (
            <div key={cat.id} className="mb-3">
              <button
                onClick={() => toggleSection(cat.id)}
                className="flex w-full items-center gap-1 py-2 text-left"
              >
                {isCollapsed ? (
                  <ChevronRight size={12} className="text-[#acacac]" />
                ) : (
                  <ChevronDown size={12} className="text-[#acacac]" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
                  {cat.label}
                </span>
                <span className="ml-auto rounded-full bg-[#f5f5f0] px-2 py-[2px] text-[10px] font-medium text-[#949494]">
                  {cat.nodes.length}
                </span>
              </button>
              {!isCollapsed && (
                <div className="mt-1 space-y-1">
                  {cat.nodes.map((node) => (
                    <PaletteNodeItem
                      key={node.subtype}
                      icon={resolveIcon(node)}
                      label={node.label}
                      description={node.description}
                      nodeType={node.type}
                      subtype={node.subtype}
                      isActive={selectedSubtype === node.subtype}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-8 text-center text-[12px] text-[#acacac]">
            No nodes match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
