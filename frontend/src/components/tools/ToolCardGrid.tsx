import { useMemo } from 'react';
import { useToolList } from '@hooks/useTools';
import { useToolRegistryStore } from '@store/toolRegistryStore';
import ToolCard from '@components/tools/ToolCard';
import type { Tool } from '@/types/tool';

function applyFilters(tools: Tool[], store: ReturnType<typeof useToolRegistryStore.getState>): Tool[] {
  let result = tools;

  if (store.filterStatus.length > 0) {
    result = result.filter((t) => store.filterStatus.includes(t.status));
  }
  if (store.filterCategory.length > 0) {
    result = result.filter((t) => store.filterCategory.includes(t.category));
  }
  if (store.filterAdapter.length > 0) {
    result = result.filter((t) => store.filterAdapter.includes(t.adapter));
  }
  if (store.search) {
    const q = store.search.toLowerCase();
    result = result.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }

  const sorted = [...result];
  switch (store.sortBy) {
    case 'usage':
      sorted.sort((a, b) => b.usageCount - a.usageCount);
      break;
    case 'cost':
      sorted.sort((a, b) => a.costPerRun - b.costPerRun);
      break;
    case 'recent':
      sorted.sort((a, b) => b.versions[0]?.publishedAt.localeCompare(a.versions[0]?.publishedAt ?? '') ?? 0);
      break;
    default:
      sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  return sorted;
}

export default function ToolCardGrid() {
  const { data: allTools, isLoading, isError } = useToolList();
  const { filterStatus, filterCategory, filterAdapter, search, sortBy, selectedToolId, selectTool } =
    useToolRegistryStore();

  const tools = useMemo(
    () => (allTools ? applyFilters(allTools, { filterStatus, filterCategory, filterAdapter, search, sortBy } as ReturnType<typeof useToolRegistryStore.getState>) : []),
    [allTools, filterStatus, filterCategory, filterAdapter, search, sortBy],
  );

  if (isLoading) {
    return (
      <div data-testid="tool-card-grid" className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 rounded-md bg-surface-layer animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="tool-card-grid" className="text-sm text-content-helper py-12 text-center">
        Failed to load tools. Please try again.
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div data-testid="tool-card-grid" className="text-sm text-content-helper py-12 text-center">
        No tools match your filters
      </div>
    );
  }

  return (
    <div data-testid="tool-card-grid" className="grid grid-cols-2 gap-4">
      {tools.map((tool) => (
        <ToolCard
          key={tool.id}
          tool={tool}
          selected={tool.id === selectedToolId}
          onSelect={selectTool}
        />
      ))}
    </div>
  );
}
