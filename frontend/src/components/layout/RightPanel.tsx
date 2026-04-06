import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useUiStore } from '@store/uiStore';

const NodePropertiesPanel = lazy(() => import('@components/workflows/NodePropertiesPanel'));
const RunNodeDetailPanel = lazy(() => import('@components/workflows/runs/RunNodeDetailPanel'));
const InspectorPanel = lazy(() => import('@components/agents/InspectorPanel'));
const ToolPropertiesPanel = lazy(() => import('@components/tools/ToolPropertiesPanel'));

const MIN_WIDTH = 260;
const MAX_WIDTH = 600;

export default function RightPanel() {
  const rightPanel = useUiStore((s) => s.rightPanel);
  const closeRightPanel = useUiStore((s) => s.closeRightPanel);
  const setRightPanelWidth = useUiStore((s) => s.setRightPanelWidth);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Focus the panel when it opens so screen readers announce it
  useEffect(() => {
    if (rightPanel.open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [rightPanel.open]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: rightPanel.width };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startX - moveEvent.clientX;
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragRef.current.startWidth + delta));
        setRightPanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [rightPanel.width, setRightPanelWidth]
  );

  return (
    <div ref={panelRef} tabIndex={-1} className="h-full flex" data-testid="right-panel" role="complementary" aria-label="Properties panel">
      {/* Drag handle (left edge) */}
      <div
        className="w-1 cursor-col-resize hover:bg-[#2196f3]/30 active:bg-[#2196f3] transition-colors shrink-0"
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize right panel"
      />

      {/* Panel content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Panel header */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-[#e8e8e8] shrink-0">
          <span className="text-[11px] font-semibold text-[#acacac] uppercase" style={{ letterSpacing: '0.5px' }}>
            {rightPanel.contentType ?? 'Properties'}
          </span>
          <button
            onClick={closeRightPanel}
            className="w-6 h-6 flex items-center justify-center text-[#949494] hover:text-[#1a1a1a] rounded-md transition-colors"
            aria-label="Close panel"
          >
            <X size={14} />
          </button>
        </div>

        {/* Panel body — routes to content based on contentType */}
        <div className="flex-1 overflow-y-auto">
          {rightPanel.contentType === 'properties' ? (
            <Suspense fallback={<div className="p-3 text-xs text-cds-text-secondary">Loading...</div>}>
              <NodePropertiesPanel />
            </Suspense>
          ) : rightPanel.contentType === 'run-node-detail' ? (
            <Suspense fallback={<div className="p-3 text-xs text-cds-text-secondary">Loading...</div>}>
              <RunNodeDetailPanel />
            </Suspense>
          ) : rightPanel.contentType === 'inspector' ? (
            <Suspense fallback={<div className="p-3 text-xs text-cds-text-secondary">Loading...</div>}>
              <InspectorPanel />
            </Suspense>
          ) : rightPanel.contentType === 'tool-properties' ? (
            <Suspense fallback={<div className="p-3 text-xs text-cds-text-secondary">Loading...</div>}>
              <ToolPropertiesPanel />
            </Suspense>
          ) : (
            <div data-testid="right-panel-content" className="p-3 text-sm text-cds-text-secondary" />
          )}
        </div>
      </div>
    </div>
  );
}
