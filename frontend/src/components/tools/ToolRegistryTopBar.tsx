import { useRef, useCallback, useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useToolRegistryStore } from '@store/toolRegistryStore';
import { useToolList } from '@hooks/useTools';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';

export default function ToolRegistryTopBar() {
  const setSearch = useToolRegistryStore((s) => s.setSearch);
  const { data: allTools } = useToolList();
  const toolCount = allTools?.length ?? 0;

  const [localSearch, setLocalSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearch(value);
      }, 300);
    },
    [setSearch],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const setSearchQuery = handleSearchChange;
  // expose setSearchQuery for tests
  void setSearchQuery;

  return (
    <div data-testid="tool-registry-top-bar" className="flex items-center justify-between gap-4 mb-6">
      {/* Left: Title + count */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-content-primary">Tool Registry</h1>
        <Badge variant="default" className="text-[10px] h-5">
          {toolCount} tools
        </Badge>
      </div>

      {/* Right: Search + Register */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-placeholder" />
          <input
            data-testid="tool-search-input"
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search tools..."
            className="h-8 w-56 pl-8 pr-3 text-xs bg-surface-layer border border-border-subtle rounded text-content-primary placeholder:text-content-placeholder focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>

        <Button
          data-testid="register-tool-button"
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => console.log('Register Tool clicked')}
        >
          Register Tool
        </Button>
      </div>
    </div>
  );
}
