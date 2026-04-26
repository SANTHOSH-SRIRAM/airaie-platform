import { useEffect, useCallback, useMemo, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import { useWorkflowStore } from '@store/workflowStore';
import type { WorkflowEditorNode, WorkflowEditorEdge } from '@/types/workflow';
import { useExecutionStore } from '@store/executionStore';
import {
  useWorkflowWithVersions,
  useCreateWorkflowVersion,
  useCreateWorkflow,
} from '@hooks/useWorkflow';
import { useRunWorkflow } from '@hooks/useRunWorkflow';
import { decodeDsl, dslToFlow, flowToDsl } from '@utils/workflowDsl';
import type { RawWorkflowVersion } from '@api/workflows';
import WorkflowCanvas from '@components/workflows/WorkflowCanvas';
import WorkflowEditorTopBar from '@components/workflows/WorkflowEditorTopBar';
import WorkflowEditorBottomBar from '@components/workflows/WorkflowEditorBottomBar';
import NodePalette from '@components/workflows/NodePalette';
import NodePropertiesPanel from '@components/workflows/NodePropertiesPanel';
import VersionPanel from '@components/workflows/VersionPanel';
import CreateWorkflowModal from '@components/workflows/CreateWorkflowModal';

/**
 * Pick the version to load when the page first opens. Prefers the latest
 * `published` row, otherwise the highest version number, otherwise null.
 */
function pickInitialVersion(versions: RawWorkflowVersion[]): RawWorkflowVersion | null {
  if (versions.length === 0) return null;
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  return sorted.find((v) => v.status === 'published') ?? sorted[0];
}

export default function WorkflowEditorPage() {
  const navigate = useNavigate();
  const { workflowId: routeWorkflowId } = useParams<{ workflowId: string }>();
  const workflowId = routeWorkflowId ?? '';

  // --- store wires --------------------------------------------------------
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const isDirty = useWorkflowStore((s) => s.isDirty);
  const metadata = useWorkflowStore((s) => s.metadata);
  const errorsByNode = useWorkflowStore((s) => s.errorsByNode);
  const clearErrors = useWorkflowStore((s) => s.clearErrors);
  const markClean = useWorkflowStore((s) => s.markClean);
  const setMetadata = useWorkflowStore((s) => s.setMetadata);
  const runStatus = useExecutionStore((s) => s.runStatus);

  // --- data hooks ---------------------------------------------------------
  const { data: envelope, isLoading, isError, error } = useWorkflowWithVersions(workflowId);
  const createVersionMutation = useCreateWorkflowVersion(workflowId);
  const createWorkflowMutation = useCreateWorkflow();
  const { isStarting, isRunning, isCompleted, error: runError, start, cancel } = useRunWorkflow(workflowId);

  // --- local UI state -----------------------------------------------------
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(workflowId === '');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessVersion, setSaveSuccessVersion] = useState<number | null>(null);

  const versions = envelope?.versions ?? [];

  // --- load initial version ----------------------------------------------
  // Runs once per workflow id (and when versions change e.g. after a save).
  useEffect(() => {
    if (!envelope) return;
    // If the user already picked a version, respect it; otherwise auto-select.
    const target = selectedVersion != null
      ? versions.find((v) => v.version === selectedVersion) ?? null
      : pickInitialVersion(versions);

    if (selectedVersion == null && target) {
      setSelectedVersion(target.version);
    }

    // If the user picked a specific version that hasn't yet been refetched
    // into `versions` (post-save), don't clobber the canvas. The next
    // refetch tick will bring the row in and re-run the effect.
    if (selectedVersion != null && !target) {
      return;
    }

    const dsl = target ? decodeDsl(target.dsl) : null;
    if (dsl) {
      try {
        const { nodes, edges } = dslToFlow(dsl);
        loadWorkflow(
          nodes as unknown as WorkflowEditorNode[],
          edges as unknown as WorkflowEditorEdge[],
          {
            id: envelope.workflow.id,
            name: envelope.workflow.name,
            version: `v${target!.version}`,
            versionStatus: (target!.status === 'published' ? 'published' : 'draft'),
            createdAt: envelope.workflow.created_at,
            updatedAt: envelope.workflow.updated_at,
          },
        );
        // Default selection: first node, if any.
        selectNode(nodes[0]?.id ?? null);
      } catch (err) {
        console.error('[editor] dslToFlow failed:', err);
        loadWorkflow([], [], {
          id: envelope.workflow.id,
          name: envelope.workflow.name,
          version: target ? `v${target.version}` : 'v1',
          versionStatus: 'draft',
          createdAt: envelope.workflow.created_at,
          updatedAt: envelope.workflow.updated_at,
        });
      }
    } else {
      // New workflow with no versions yet.
      loadWorkflow([], [], {
        id: envelope.workflow.id,
        name: envelope.workflow.name,
        version: 'v1',
        versionStatus: 'draft',
        createdAt: envelope.workflow.created_at,
        updatedAt: envelope.workflow.updated_at,
      });
    }
  // We deliberately depend on the version count and the chosen version to
  // re-run when versions list changes (e.g. after a save adds a new row).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelope, selectedVersion]);

  // --- handlers -----------------------------------------------------------

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setSaveSuccessVersion(null);
    if (!workflowId) {
      // No workflow yet — surface the create dialog.
      setCreateOpen(true);
      return;
    }
    const { nodes, edges, metadata: meta } = useWorkflowStore.getState();
    try {
      // The store types are nominally separate from the converter's
      // (`WorkflowEditorNode` vs `WorkflowFlowNode`) but they are
      // structurally identical; the metadata field has a richer shape
      // than the converter's free-form `Record<string, unknown>`. Cast
      // through `unknown` so the converter sees the right structural type.
      const dsl = flowToDsl({
        nodes: nodes as unknown as Parameters<typeof flowToDsl>[0]['nodes'],
        edges: edges as unknown as Parameters<typeof flowToDsl>[0]['edges'],
        metadata: meta ? (meta as unknown as Record<string, unknown>) : undefined,
      });
      // Backend route expects `dsl_yaml`. JSON is valid YAML, so we pass
      // a stringified JSON DSL through that field. The server-side parser
      // accepts either flavour.
      const dslJson = JSON.stringify(dsl);
      const created = await createVersionMutation.mutateAsync(dslJson);
      markClean();
      setLastSavedAt(new Date());
      if (created?.version) {
        setSaveSuccessVersion(created.version);
        setSelectedVersion(created.version);
        // Update metadata version label without forcing a reload-driven
        // canvas reset (the envelope refetch will fire from invalidate).
        if (meta) {
          setMetadata({ ...meta, version: `v${created.version}`, versionStatus: 'draft' });
        }
        window.setTimeout(() => setSaveSuccessVersion(null), 2500);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed.';
      setSaveError(message);
    }
  }, [workflowId, createVersionMutation, markClean, setMetadata]);

  const handleRun = useCallback(() => {
    void start({
      version: selectedVersion ?? undefined,
    }).then((newRunId) => {
      if (newRunId) navigate(`/workflow-runs/${newRunId}`);
    });
  }, [start, selectedVersion, navigate]);

  const handleCancel = useCallback(() => {
    void cancel();
  }, [cancel]);

  const handleTabChange = useCallback((tab: string) => {
    if (tab === 'editor') return;
    if (tab === 'runs') navigate('/workflow-runs');
  }, [navigate]);

  // Cmd+S / Ctrl+S → save.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  // --- version selector handlers -----------------------------------------

  const handleSelectVersion = useCallback((v: number) => {
    if (isDirty) {
      const ok = window.confirm('Discard unsaved changes and load this version?');
      if (!ok) return;
    }
    clearErrors();
    setSelectedVersion(v);
    // The load effect above will re-decode & loadWorkflow.
  }, [isDirty, clearErrors]);

  const handleToggleVersions = useCallback(() => {
    setVersionsOpen((open) => !open);
  }, []);

  // --- create workflow flow ----------------------------------------------

  const handleCreateSubmit = useCallback(
    async (data: { name: string; description: string }) => {
      try {
        const { id } = await createWorkflowMutation.mutateAsync({
          name: data.name || 'Untitled workflow',
          description: data.description || undefined,
        });
        setCreateOpen(false);
        navigate(`/workflow-studio/${id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create workflow.';
        // Surface in the save banner — same channel.
        setSaveError(msg);
      }
    },
    [createWorkflowMutation, navigate],
  );

  // --- top-level error/banner --------------------------------------------

  const topLevelDiagnostics = errorsByNode[''] ?? [];
  const totalErrorNodes = useMemo(
    () => Object.entries(errorsByNode).filter(([key, arr]) => key !== '' && arr.length > 0).length,
    [errorsByNode],
  );

  const isSaving = createVersionMutation.isPending;

  // --- render -------------------------------------------------------------

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
                selectedVersion={selectedVersion}
                onToggleVersions={handleToggleVersions}
                versionsOpen={versionsOpen}
                hasWorkflow={!!workflowId}
              />
            </div>
          </div>

          {/* Banners */}
          {(saveError || saveSuccessVersion || (totalErrorNodes > 0) || topLevelDiagnostics.length > 0) && (
            <div className="flex justify-center">
              <div className="flex w-full max-w-[770px] flex-col gap-2">
                {saveSuccessVersion !== null && (
                  <div className="flex items-center justify-between rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                    <span>Saved as v{saveSuccessVersion}.</span>
                    <button
                      onClick={() => setSaveSuccessVersion(null)}
                      className="rounded-md p-1 hover:bg-emerald-100"
                      aria-label="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {saveError && (
                  <div className="flex items-center justify-between rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                    <span className="flex items-center gap-2">
                      <AlertTriangle size={13} />
                      {saveError}
                    </span>
                    <button
                      onClick={() => setSaveError(null)}
                      className="rounded-md p-1 hover:bg-red-100"
                      aria-label="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                {topLevelDiagnostics.map((d, i) => (
                  <div
                    key={`top-${i}`}
                    className={`flex items-center justify-between rounded-[10px] border px-3 py-2 text-[12px] ${d.severity === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle size={13} />
                      {d.message}
                    </span>
                  </div>
                ))}
                {totalErrorNodes > 0 && (
                  <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                    {totalErrorNodes} node{totalErrorNodes === 1 ? '' : 's'} have compile diagnostics. Click a node to see details.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading state */}
          {workflowId && isLoading && (
            <div className="flex flex-1 items-center justify-center text-[13px] text-[#6b6b6b]">
              <Loader2 size={18} className="mr-2 animate-spin" />
              Loading workflow…
            </div>
          )}

          {/* Error state */}
          {workflowId && isError && (
            <div className="flex flex-1 items-center justify-center">
              <div className="rounded-[12px] border border-red-200 bg-red-50 px-6 py-4 text-[13px] text-red-800">
                <AlertTriangle size={16} className="mr-2 inline" />
                {error instanceof Error ? error.message : 'Failed to load workflow.'}
              </div>
            </div>
          )}

          {/* Editor body */}
          {(!workflowId || (!isLoading && !isError)) && (
            <div className="flex flex-1 min-h-0 gap-[12px]">
              <aside className="relative w-[260px] shrink-0 overflow-hidden rounded-[18px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
                <NodePalette />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.98))]" />
                <div className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 rounded-full bg-[#fbfaf9] px-3 py-2 shadow-[0px_1px_6px_0px_rgba(0,0,0,0.05)]">
                  <span className={`h-[7px] w-[7px] rounded-full ${isDirty ? 'bg-[#ff9800]' : 'bg-[#4caf50]'}`} />
                  <span className="text-[11px] text-[#6b6b6b]">{isDirty ? 'Unsaved' : 'Saved'}</span>
                  <span className="text-[11px] text-[#d3d3d3]">·</span>
                  <span className="text-[11px] text-[#acacac]">
                    {metadata ? `${metadata.version} ${metadata.versionStatus}` : 'v1 draft'}
                  </span>
                </div>
              </aside>

              <section className="relative min-w-0 flex-1 overflow-hidden rounded-[18px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
                {!workflowId && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3 rounded-[12px] border border-[#ece9e3] bg-white px-8 py-6 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
                      <span className="text-[14px] font-semibold text-[#1a1a1a]">Untitled workflow</span>
                      <span className="text-[12px] text-[#6b6b6b]">Create a workflow to start editing.</span>
                      <button
                        onClick={() => setCreateOpen(true)}
                        className="rounded-[8px] bg-[#2196f3] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#1976d2]"
                      >
                        Create workflow
                      </button>
                    </div>
                  </div>
                )}
                {workflowId && versions.length === 0 && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 pointer-events-none">
                    <span className="rounded-full bg-white/90 px-4 py-2 text-[12px] text-[#6b6b6b] shadow-sm">
                      Empty workflow — drag a node from the palette to begin.
                    </span>
                  </div>
                )}
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

              {versionsOpen && workflowId && (
                <VersionPanel
                  workflowId={workflowId}
                  selectedVersion={selectedVersion}
                  onSelectVersion={handleSelectVersion}
                  onClose={() => setVersionsOpen(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <CreateWorkflowModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          if (!workflowId) navigate('/workflows');
        }}
        onSubmit={(data) => {
          void handleCreateSubmit({ name: data.name, description: data.description });
        }}
      />
    </ReactFlowProvider>
  );
}
