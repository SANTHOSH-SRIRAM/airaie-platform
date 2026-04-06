import { useToolRegistryStore } from '@store/toolRegistryStore';
import { useToolList } from '@hooks/useTools';
import type { ToolStatus, ToolCategory, ToolAdapter } from '@/types/tool';
import type { Tool } from '@/types/tool';

const STATUS_OPTIONS: { value: ToolStatus; label: string }[] = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'deprecated', label: 'Deprecated' },
];

const CATEGORY_OPTIONS: { value: ToolCategory; label: string }[] = [
  { value: 'simulation', label: 'Simulation' },
  { value: 'meshing', label: 'Meshing' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'materials', label: 'Materials' },
  { value: 'ml-ai', label: 'ML / AI' },
  { value: 'utilities', label: 'Utilities' },
];

const ADAPTER_OPTIONS: { value: ToolAdapter; label: string }[] = [
  { value: 'docker', label: 'Docker' },
  { value: 'python', label: 'Python' },
  { value: 'wasm', label: 'WASM' },
  { value: 'remote-api', label: 'Remote API' },
];

const SORT_OPTIONS: { value: 'name' | 'usage' | 'cost' | 'recent'; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'usage', label: 'Most Used' },
  { value: 'recent', label: 'Recently Updated' },
  { value: 'cost', label: 'Cost' },
];

function countBy<K extends string>(tools: Tool[], key: keyof Tool, value: K): number {
  return tools.filter((t) => t[key] === value).length;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-content-helper mb-2">
      {label}
    </h3>
  );
}

interface CheckboxItemProps {
  checked: boolean;
  label: string;
  count: number;
  onChange: () => void;
}

function CheckboxItem({ checked, label, count, onChange }: CheckboxItemProps) {
  return (
    <label className="flex items-center gap-2 py-0.5 cursor-pointer text-xs text-content-secondary hover:text-content-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-3.5 h-3.5 rounded border-border-subtle accent-brand-primary"
      />
      <span className="flex-1">{label}</span>
      <span className="text-[10px] text-content-placeholder tabular-nums">{count}</span>
    </label>
  );
}

export default function FilterSidebar() {
  const {
    filterStatus,
    filterCategory,
    filterAdapter,
    sortBy,
    toggleStatus,
    toggleCategory,
    toggleAdapter,
    setSortBy,
    clearFilters,
  } = useToolRegistryStore();

  const { data: allTools } = useToolList();
  const tools = allTools ?? [];

  return (
    <div data-testid="filter-sidebar" className="flex flex-col h-full px-3 py-3 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-content-primary uppercase tracking-wider">Filters</span>
        <button
          onClick={clearFilters}
          className="text-[11px] text-brand-primary hover:underline"
        >
          Clear all
        </button>
      </div>

      {/* STATUS */}
      <div className="mb-4">
        <SectionHeader label="Status" />
        <div className="space-y-1">
          {STATUS_OPTIONS.map((opt) => (
            <CheckboxItem
              key={opt.value}
              checked={filterStatus.includes(opt.value)}
              label={opt.label}
              count={countBy(tools, 'status', opt.value)}
              onChange={() => toggleStatus(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* CATEGORY */}
      <div className="mb-4">
        <SectionHeader label="Category" />
        <div className="space-y-1">
          {CATEGORY_OPTIONS.map((opt) => (
            <CheckboxItem
              key={opt.value}
              checked={filterCategory.includes(opt.value)}
              label={opt.label}
              count={countBy(tools, 'category', opt.value)}
              onChange={() => toggleCategory(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* ADAPTER */}
      <div className="mb-4">
        <SectionHeader label="Adapter" />
        <div className="space-y-1">
          {ADAPTER_OPTIONS.map((opt) => (
            <CheckboxItem
              key={opt.value}
              checked={filterAdapter.includes(opt.value)}
              label={opt.label}
              count={countBy(tools, 'adapter', opt.value)}
              onChange={() => toggleAdapter(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* SORT BY */}
      <div className="mb-4">
        <SectionHeader label="Sort By" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="w-full h-8 px-2 text-xs bg-surface-layer border border-border-subtle rounded text-content-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-border-subtle">
        <p className="text-[10px] text-content-placeholder">Registry &middot; Last sync 5m ago</p>
      </div>
    </div>
  );
}
