import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkflowStore } from '@store/workflowStore';
import { useExecutionStore } from '@store/executionStore';
import { useWorkflow } from '@hooks/useWorkflow';
import { useRunWorkflow } from '@hooks/useRunWorkflow';
import { useAutoSave } from '@hooks/useAutoSave';
import { workflowToGraph } from '@utils/workflowGraph';
import WorkflowCanvas from '@components/workflows/WorkflowCanvas';
import WorkflowEditorTopBar from '@components/workflows/WorkflowEditorTopBar';
import WorkflowEditorBottomBar from '@components/workflows/WorkflowEditorBottomBar';
import NodePalette from '@components/workflows/NodePalette';
import NodePropertiesPanel from '@components/workflows/NodePropertiesPanel';

const DEFAULT_WORKFLOW_ID = 'wf_fea_validation';

export default function WorkflowEditorPage() {
  const navigate = useNavigate();
  const { workflowId: routeWorkflowId } = useParams<{ workflowId: string }>();
  const workflowId = routeWorkflowId ?? DEFAULT_WORKFLOW_ID;
  const { data: workflow } = useWorkflow(workflowId);
  const { isSaving, lastSavedAt, saveNow } = useAutoSave(workflowId);
  const { isStarting, isRunning, isCompleted, error: runError, start, cancel } = useRunWorkflow(workflowId);
  const runStatus = useExecutionStore((s) => s.runStatus);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const isDirty = useWorkflowStore((s) => s.isDirty);
  const metadata = useWorkflowStore((s) => s.metadata);

  useEffect(() => {
    if (workflow) {
      const { nodes, edges, metadata: wfMeta } = workflowToGraph(workflow);
      loadWorkflow(nodes, edges, wfMeta);
      const preferredNode = nodes.find((node) => node.data.subtype === 'fea-solver') ?? nodes[0] ?? null;
      selectNode(preferredNode?.id ?? null);
    }
  }, [workflow, loadWorkflow, selectNode]);

  const handleSave = () => {
    void saveNow();
  };

  const handleRun = () => {
    start();
  };

  const handleCancel = () => {
    cancel();
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'editor') return;
    if (tab === 'runs') {
      navigate('/workflow-runs');
    }
  };

  return (
    <ReactFlowProvider>
      <div className="h-full min-h-0 overflow-hidden bg-[#f5f5f0]">
        <div className="flex h-full min-h-0 flex-col gap-4 px-[16px] py-[16px]">
          <div className="flex justify-center">
            <div className="w-full max-w-[770px]">
              <WorkflowEditorTopBar
                activeTab="editor"
                onTabChange={handleTabChange}
                isSaving={isSaving}
                lastSavedAt={lastSavedAt}
                onSave={handleSave}
              />
            </div>
          </div>

          <div className="flex flex-1 min-h-0 gap-[12px]">
            <aside className="relative w-[260px] shrink-0 overflow-hidden rounded-[18px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
              <NodePalette />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.98))]" />
              <div className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 rounded-full bg-[#fbfaf9] px-3 py-2 shadow-[0px_1px_6px_0px_rgba(0,0,0,0.05)]">
                <span className={`h-[7px] w-[7px] rounded-full ${isDirty ? 'bg-[#ff9800]' : 'bg-[#4caf50]'}`} />
                <span className="text-[11px] text-[#6b6b6b]">{isDirty ? 'Unsaved' : 'Saved'}</span>
                <span className="text-[11px] text-[#d3d3d3]">·</span>
                <span className="text-[11px] text-[#acacac]">{metadata ? `${metadata.version} ${metadata.versionStatus}` : 'v3 draft'}</span>
              </div>
            </aside>

            <section className="relative min-w-0 flex-1 overflow-hidden rounded-[18px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
              <WorkflowCanvas />
              <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2">
                <WorkflowEditorBottomBar
                  onRun={handleRun}
                  onCancel={handleCancel}
                  isStarting={isStarting}
                  isRunning={isRunning}
                  isCompleted={isCompleted}
                  runStatus={runStatus}
                  runError={runError}
                />
              </div>
            </section>

            <aside className="w-[300px] shrink-0 overflow-y-auto rounded-[18px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)] scrollbar-hide">
              <NodePropertiesPanel />
            </aside>
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
