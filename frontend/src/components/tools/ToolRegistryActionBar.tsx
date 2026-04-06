import { useNavigate } from 'react-router-dom';
import { useToolRegistryStore } from '@store/toolRegistryStore';
import { useToolList } from '@hooks/useTools';
import { useUiStore } from '@store/uiStore';
import Button from '@components/ui/Button';
import { Workflow, FileText, Play } from 'lucide-react';

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
      {/* Left: Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          data-testid="action-use-in-workflow"
          variant="primary"
          size="sm"
          icon={<Workflow size={14} />}
          disabled={disabled}
          onClick={() => navigate(`/workflow-studio?tool=${selectedToolId}`)}
        >
          Use in Workflow
        </Button>

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
          onClick={() => {
            console.log('Test Run:', selectedToolId);
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
