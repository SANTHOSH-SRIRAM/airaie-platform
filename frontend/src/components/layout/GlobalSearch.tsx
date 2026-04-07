import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  GitBranch,
  Brain,
  Wrench,
  Shield,
  Play,
  Command,
} from 'lucide-react';
import { cn } from '@utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string;
  type: 'workflow' | 'agent' | 'tool' | 'board' | 'run';
  name: string;
  description?: string;
  route: string;
}

type ResultCategory = SearchResult['type'];

const CATEGORY_CONFIG: Record<
  ResultCategory,
  { label: string; icon: typeof GitBranch; color: string }
> = {
  workflow: { label: 'Workflows', icon: GitBranch, color: 'text-[#4caf50]' },
  agent: { label: 'Agents', icon: Brain, color: 'text-[#9c27b0]' },
  tool: { label: 'Tools', icon: Wrench, color: 'text-[#2196f3]' },
  board: { label: 'Boards', icon: Shield, color: 'text-[#ff9800]' },
  run: { label: 'Runs', icon: Play, color: 'text-[#e74c3c]' },
};

// ---------------------------------------------------------------------------
// Mock search data (client-side search across cached entities)
// ---------------------------------------------------------------------------

const SEARCHABLE_ITEMS: SearchResult[] = [
  // Workflows
  { id: 'wf_fea_validation', type: 'workflow', name: 'FEA Validation Pipeline', description: 'End-to-end FEA stress validation', route: '/workflows/wf_fea_validation' },
  { id: 'wf_cfd_analysis', type: 'workflow', name: 'CFD Analysis Flow', description: 'Computational fluid dynamics pipeline', route: '/workflows/wf_cfd_analysis' },
  { id: 'wf_material_testing', type: 'workflow', name: 'Material Testing Pipeline', description: 'Automated material property testing', route: '/workflows/wf_material_testing' },
  { id: 'wf_topology_opt', type: 'workflow', name: 'Topology Optimization', description: 'Generative topology optimization', route: '/workflows/wf_topology_opt' },
  { id: 'wf_mesh_quality', type: 'workflow', name: 'Mesh Quality Check', description: 'Quick mesh quality validation', route: '/workflows/wf_mesh_quality' },
  // Agents
  { id: 'fea-optimizer', type: 'agent', name: 'FEA Optimizer Agent', description: 'Determines optimal mesh density parameters', route: '/agent-studio/fea-optimizer' },
  { id: 'design-advisor', type: 'agent', name: 'Design Advisor Agent', description: 'Recommends design optimizations', route: '/agent-studio/design-advisor' },
  { id: 'thermal-analyst', type: 'agent', name: 'Thermal Analyst Agent', description: 'Evaluates thermal performance', route: '/agent-studio/thermal-analyst' },
  // Tools
  { id: 'tool_fea', type: 'tool', name: 'FEA Solver', description: 'Finite element analysis solver', route: '/tools' },
  { id: 'tool_cfd', type: 'tool', name: 'CFD Solver', description: 'Computational fluid dynamics solver', route: '/tools' },
  { id: 'tool_mesher', type: 'tool', name: 'Auto Mesher', description: 'Automatic mesh generation', route: '/tools' },
  // Boards
  { id: 'board_structural_001', type: 'board', name: 'Structural Validation Study', description: 'FEA validation for bracket design', route: '/boards/board_structural_001' },
  { id: 'board_thermal_002', type: 'board', name: 'Thermal Analysis Exploration', description: 'Exploring thermal behavior', route: '/boards/board_thermal_002' },
  // Runs
  { id: 'run_001', type: 'run', name: 'Run #run_001', description: 'FEA Validation Pipeline - Running', route: '/workflow-runs/run_001' },
  { id: 'run_002', type: 'run', name: 'Run #run_002', description: 'CFD Analysis Flow - Completed', route: '/workflow-runs/run_002' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return SEARCHABLE_ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false)
    );
  }, [query]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups = new Map<ResultCategory, SearchResult[]>();
    for (const result of results) {
      const existing = groups.get(result.type) ?? [];
      existing.push(result);
      groups.set(result.type, existing);
    }
    return groups;
  }, [results]);

  // Flat list for keyboard navigation
  const flatResults = useMemo(() => {
    const flat: SearchResult[] = [];
    for (const items of groupedResults.values()) {
      flat.push(...items);
    }
    return flat;
  }, [groupedResults]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= flatResults.length) {
      setSelectedIndex(Math.max(0, flatResults.length - 1));
    }
  }, [flatResults.length, selectedIndex]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onClose();
      navigate(result.route);
    },
    [navigate, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(flatResults[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [flatResults, selectedIndex, handleSelect, onClose]
  );

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[120px]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-[560px] bg-white rounded-[16px] shadow-[0px_24px_64px_rgba(0,0,0,0.2)] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0f0ec]">
          <Search size={18} className="text-[#acacac] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search workflows, agents, tools, boards..."
            className="flex-1 text-[15px] text-[#1a1a1a] placeholder:text-[#acacac] bg-transparent border-none focus:outline-none"
          />
          <button
            onClick={onClose}
            className="flex items-center gap-1 h-[26px] px-2 bg-[#f5f5f0] rounded-[6px] text-[11px] text-[#6b6b6b] hover:bg-[#e8e8e8] transition-colors"
          >
            <span>ESC</span>
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {query.trim() && flatResults.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-[14px] text-[#6b6b6b]">No results found for "{query}"</p>
              <p className="text-[12px] text-[#acacac] mt-1">Try a different search term</p>
            </div>
          )}

          {!query.trim() && (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px] text-[#acacac]">Start typing to search across all domains</p>
              <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-[#acacac]">
                <span className="flex items-center gap-1"><Command size={11} /> K to open</span>
                <span>Arrow keys to navigate</span>
                <span>Enter to select</span>
              </div>
            </div>
          )}

          {Array.from(groupedResults.entries()).map(([category, items]) => {
            const config = CATEGORY_CONFIG[category];
            const CategoryIcon = config.icon;

            return (
              <div key={category} className="mb-1">
                <div className="px-5 py-2 flex items-center gap-2">
                  <CategoryIcon size={12} className={config.color} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
                    {config.label}
                  </span>
                  <span className="text-[10px] text-[#d0d0d0]">{items.length}</span>
                </div>
                {items.map((result) => {
                  const currentIndex = flatIndex++;
                  const isSelected = currentIndex === selectedIndex;

                  return (
                    <button
                      key={result.id}
                      data-index={currentIndex}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={cn(
                        'w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors',
                        isSelected ? 'bg-[#f5f5f0]' : 'hover:bg-[#fafaf8]'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#1a1a1a] truncate">
                          {result.name}
                        </div>
                        {result.description && (
                          <div className="text-[11px] text-[#949494] truncate mt-0.5">
                            {result.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-[10px] text-[#acacac] shrink-0">Enter</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {flatResults.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#f0f0ec] text-[11px] text-[#acacac]">
            <span>{flatResults.length} result{flatResults.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-3">
              <span>Arrow keys to navigate</span>
              <span>Enter to open</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
