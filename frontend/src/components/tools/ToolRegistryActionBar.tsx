import { useNavigate } from 'react-router-dom';
import { useToolRegistryStore } from '@store/toolRegistryStore';
import { useToolList } from '@hooks/useTools';
import { useUiStore } from '@store/uiStore';
import Button from '@components/ui/Button';
import { FileText, Play } from 'lucide-react';

export default function ToolRegistryActionBar() {
  const navigate = useNavigate();
  const selectedToolId = useToolRegistryStore((s) => s.selectedToolId);
  const { data: allTools } = useToolList();
  const openRightPanel = useUiStore((s) => s.openRightPanel);

  const tools = allTools ?? [];
  const totalCount = tools.length;
  const publishedCount = tools.filter((t) => t.status === 'published').length;
  const disabled = !selectedToolId;

  return (
    <div
      data-testid="tool-registry-action-bar"
      className="flex items-center justify-between h-full px-4"
    >
      {/* Left: Action buttons.

          G.4.18 (2026-05-01) — "Use in Workflow" was navigating to
          `/workflow-studio?tool=${id}`, but the editor route is
          `/workflow-studio/:workflowId` (positional) and
          WorkflowEditorPage doesn't read the `?tool=` query param.
          Result was a generic "Untitled Pipeline" with no tool placed.
          Removed until the registry → editor handoff is designed (parked
          as 999.5). */}
      <div className="flex items-center gap-2">
        <Button
          data-testid="action-view-contract"
          variant="outline"
          size="sm"
          icon={<FileText size={14} />}
          disabled={disabled}
          onClick={() => openRightPanel('tool-properties')}
        >
          View Contract
        </Button>

        <Button
          data-testid="action-test-run"
          variant="outline"
          size="sm"
          icon={<Play size={14} />}
          disabled={disabled}
          // G.4.19 (2026-05-01) — Replaced console.log stub with a deep
          // link to ToolDetailPage's existing Test Run section. The form
          // + createRunMutation wiring already exists at
          // ToolDetailPage:131,668-755; we just navigate + scroll-to-hash.
          onClick={() => {
            if (selectedToolId) navigate(`/tools/${selectedToolId}#test-run`);
          }}
        >
          Test Run
        </Button>
      </div>

      {/* Right: Tool count */}
      <span className="text-xs text-content-placeholder">
        {totalCount} tools &middot; {publishedCount} published
      </span>
    </div>
  );
}
