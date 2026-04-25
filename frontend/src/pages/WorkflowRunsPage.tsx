import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { ArrowLeft, ScanSearch, Settings2, Wifi, WifiOff, ZoomIn, ZoomOut } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@api/client';
import { useRunStore } from '@store/runStore';
import { useWorkflowStore } from '@store/workflowStore';
import { useExecutionStore } from '@store/executionStore';
import { useWorkflow } from '@hooks/useWorkflow';
import { useRunDetail, useRunList } from '@hooks/useRuns';
import { useRunWorkflow } from '@hooks/useRunWorkflow';
import { workflowToGraph } from '@utils/workflowGraph';
import { cn } from '@utils/cn';
import ExecutionList from '@components/workflows/runs/ExecutionList';
import RunDAGViewer from '@components/workflows/runs/RunDAGViewer';
import LogViewer from '@components/workflows/runs/LogViewer';
import RunNodeDetailPanel from '@components/workflows/runs/RunNodeDetailPanel';
import RunActionBar from '@components/workflows/runs/RunActionBar';

const RUN_TABS = [
  { id: 'editor', label: 'Editor' },
  { id: 'runs', label: 'Runs' },
  { id: 'eval', label: 'Eval' },
];

const CANVAS_ACTIONS = [
  { id: 'zoom-in', icon: ZoomIn, label: 'Zoom in' },
  { id: 'fit-view', icon: ScanSearch, label: 'Fit view' },
  { id: 'zoom-out', icon: ZoomOut, label: 'Zoom out' },
  { id: 'settings', icon: Settings2, label: 'Canvas settings' },
];

function formatStartedAgo(iso?: string): string {
  if (!iso) return 'Started just now';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 1) return 'Started just now';
  if (minutes < 60) return `Started ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Started ${hours}h ago`;
  return 'Started earlier';
}

export default function WorkflowRunsPage() {
  const navigate = useNavigate();
  const { runId: routeRunId } = useParams<{ runId?: string }>();

  // Resolve workflow id from ?workflow=<id> query param; fall back to first
  // workflow returned by /v0/workflows when no param is supplied.
  const [searchParams] = useSearchParams();
  const queryWorkflowId = searchParams.get('workflow');

  const { data: workflowsList } = useQuery({
    queryKey: ['workflows', 'list-fallback'],
    queryFn: async () => {
      const res = await api<unknown>('/v0/workflows', { method: 'GET' });
      if (Array.isArray(res)) return res as Array<{ id: string }>;
      if (res && typeof res === 'object' && 'workflows' in res) {
        return (res as { workflows?: Array<{ id: string }> }).workflows ?? [];
      }
      return [];
    },
    enabled: !queryWorkflowId,
    staleTime: 60_000,
  });

  const resolvedWorkflowId = queryWorkflowId ?? workflowsList?.[0]?.id ?? '';

  const { data: workflow } = useWorkflow(resolvedWorkflowId);
  const { data: runs } = useRunList(resolvedWorkflowId);

  // SSE-powered execution flow
  const { connected: sseConnected } = useRunWorkflow(resolvedWorkflowId);
  useExecutionStore((s) => s.activeRunId);
  const executionSseConnected = useExecutionStore((s) => s.sseConnected);

  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const metadata = useWorkflowStore((s) => s.metadata);

  const selectedRunId = useRunStore((s) => s.selectedRunId);
  const selectedRunNodeId = useRunStore((s) => s.selectedRunNodeId);
  const selectRun = useRunStore((s) => s.selectRun);
  const selectRunNode = useRunStore((s) => s.selectRunNode);

  const { data: runDetail } = useRunDetail(selectedRunId);

  const showConnected = sseConnected || executionSseConnected;

  useEffect(() => {
    if (!workflow) return;
    const { nodes: wfNodes, edges: wfEdges, metadata: wfMetadata } = workflowToGraph(workflow);
    loadWorkflow(wfNodes, wfEdges, wfMetadata);
  }, [workflow, loadWorkflow]);

  useEffect(() => {
    if (!runs || runs.length === 0) return;
    const preferredRunId =
      routeRunId && runs.some((run) => run.id === routeRunId)
        ? routeRunId
        : runs[0]?.id;

    if (preferredRunId && preferredRunId !== selectedRunId) {
      selectRun(preferredRunId);
    }
  }, [routeRunId, runs, selectedRunId, selectRun]);

  useEffect(() => {
    if (!selectedRunId) return;
    const search = queryWorkflowId
      ? `?workflow=${encodeURIComponent(queryWorkflowId)}`
      : '';
    navigate(`/workflow-runs/${selectedRunId}${search}`, { replace: true });
  }, [selectedRunId, navigate, queryWorkflowId]);

  useEffect(() => {
    if (!runDetail || selectedRunNodeId) return;
    const preferredNode =
      runDetail.nodes.find((node) => node.status === 'running') ??
      runDetail.nodes.find((node) => node.nodeName === 'FEA Solver') ??
      runDetail.nodes[0];
    selectRunNode(preferredNode?.nodeId ?? null);
  }, [runDetail, selectedRunNodeId, selectRunNode]);

  const title = metadata?.name ?? workflow?.name ?? 'FEA Validation Pipeline';
  const versionChip = metadata ? `${metadata.version} published` : 'v3 published';

  // Guard: when no workflow can be resolved (no ?workflow query and no workflows
  // exist in the system yet), render an empty state. Hooks above run
  // unconditionally so rules-of-hooks ordering is preserved.
  if (!resolvedWorkflowId) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f5f5f0]">
        <div className="rounded-[16px] border border-[#ece9e3] bg-white px-6 py-8 text-center shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
          <p className="text-[14px] font-semibold text-[#1a1a1a]">No workflow selected</p>
          <p className="mt-1 text-[12px] text-[#8f8a83]">
            Open a workflow from the Workflows page to see its run history.
          </p>
          <button
            type="button"
            onClick={() => navigate('/workflows')}
            className="mt-4 inline-flex h-[36px] items-center gap-2 rounded-[10px] bg-[#2d2d2d] px-4 text-[12px] font-medium text-white"
          >
            Go to Workflows
          </button>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    if (tab === 'editor') navigate('/workflow-studio');
    if (tab === 'runs') {
      const search = queryWorkflowId
        ? `?workflow=${encodeURIComponent(queryWorkflowId)}`
        : '';
      navigate(
        selectedRunId
          ? `/workflow-runs/${selectedRunId}${search}`
          : `/workflow-runs${search}`
      );
    }
  };

  return (
    <ReactFlowProvider>
      <div className="h-full min-h-0 overflow-hidden bg-[#f5f5f0]">
        <div className="flex h-full min-h-0 flex-col gap-4 px-[14px] py-[14px] lg:px-[16px] lg:py-[16px]">
          <div className="flex justify-center">
            <div className="w-full max-w-[742px] rounded-[18px] border border-[#ece9e3] bg-white px-[14px] py-[8px] shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/workflows')}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] text-[#949494] transition-colors hover:bg-[#f8f8f7] hover:text-[#1a1a1a]"
                  aria-label="Back to workflows"
                >
                  <ArrowLeft size={17} />
                </button>

                <div className="min-w-0 flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-[#1a1a1a]">
                    {title}
                  </span>
                  <span className="rounded-full bg-[#efefef] px-[10px] py-[4px] text-[11px] font-medium leading-none text-[#8d8d8d]">
                    {versionChip}
                  </span>
                </div>

                <nav className="ml-4 flex items-center gap-8" aria-label="Run tabs">
                  {RUN_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        'relative px-0 py-2 text-[13px] font-medium transition-colors',
                        tab.id === 'runs'
                          ? 'text-[#1a1a1a]'
                          : 'text-[#949494] hover:text-[#1a1a1a]'
                      )}
                    >
                      {tab.label}
                      {tab.id === 'runs' && (
                        <span className="absolute left-0 right-0 bottom-[2px] h-[2px] rounded-full bg-[#242424]" />
                      )}
                    </button>
                  ))}
                </nav>

                <div className="ml-auto flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#2d2d2d] text-[13px] font-semibold text-white">
                  S
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 gap-[12px]">
            <aside className="w-[300px] shrink-0 overflow-hidden rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
              <ExecutionList workflowId={resolvedWorkflowId} />
            </aside>

            <section className="min-w-0 flex-1">
              <div className="flex h-full min-h-0 flex-col gap-[12px]">
                <div className="rounded-[20px] border border-[#ece9e3] bg-white p-[12px] shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center justify-between px-[10px] pb-[10px]">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[14px] font-semibold text-[#1a1a1a]">
                        Run {runDetail?.id ?? selectedRunId ?? 'loading'}
                      </h2>
                      {/* SSE connection indicator */}
                      <div
                        className="flex items-center gap-1"
                        title={showConnected ? 'SSE connected' : 'SSE disconnected'}
                      >
                        {showConnected ? (
                          <Wifi size={11} className="text-green-500" />
                        ) : (
                          <WifiOff size={11} className="text-gray-400" />
                        )}
                        <span
                          className={`h-[5px] w-[5px] rounded-full ${showConnected ? 'bg-green-500' : 'bg-gray-300'}`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#efefef] px-2 py-0.5 text-[10px] font-medium uppercase text-[#8d8d8d]">
                        {runDetail?.status ?? 'loading'}
                      </span>
                      <span className="rounded-full bg-[#efefef] px-2 py-0.5 text-[10px] font-medium text-[#8d8d8d]">
                        {formatStartedAgo(runDetail?.startedAt)}
                      </span>
                      <span className="rounded-full bg-[#efefef] px-2 py-0.5 text-[10px] font-medium text-[#8d8d8d]">
                        Cost ${runDetail?.costUsd.toFixed(2) ?? '0.00'}
                      </span>
                    </div>
                  </div>

                  <div className="relative h-[330px] overflow-hidden rounded-[16px] border border-[#f0ede8] bg-[#fdfcfa]">
                    <RunDAGViewer
                      runDetail={runDetail}
                      workflowNodes={nodes}
                      workflowEdges={edges}
                    />

                    <div className="absolute bottom-4 right-4 text-[12px] text-[#b2aea8]">
                      Click node to inspect
                    </div>

                    <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 lg:flex">
                      <div className="flex flex-col gap-1 rounded-[14px] border border-[#ece9e3] bg-white p-1.5 shadow-[0px_2px_10px_0px_rgba(0,0,0,0.06)]">
                        {CANVAS_ACTIONS.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.id}
                              type="button"
                              aria-label={action.label}
                              className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-[#3a3a3a] transition-colors hover:bg-[#f7f4ef]"
                            >
                              <Icon size={16} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
                  <LogViewer runId={selectedRunId} runDetail={runDetail} />
                </div>

                {/* Run Action Bar */}
                <div className="flex justify-center py-1">
                  <RunActionBar workflowId={resolvedWorkflowId} />
                </div>
              </div>
            </section>

            <aside className="w-[270px] shrink-0 overflow-hidden rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
              <RunNodeDetailPanel runDetail={runDetail} />
            </aside>
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
