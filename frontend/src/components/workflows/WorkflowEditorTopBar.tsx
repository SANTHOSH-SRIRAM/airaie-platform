import { useState } from 'react';
import { ArrowLeft, AlertTriangle, Loader2, Check, Code2, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore, type NodeDiagnostic } from '@store/workflowStore';
import { useValidateWorkflow, useCompileWorkflow } from '@hooks/useWorkflow';
import { canvasToYamlDsl } from '@utils/canvasToYaml';
import type { ValidateResult, CompileResult, Diagnostic } from '@api/workflows';
import { cn } from '@utils/cn';
import VersionList from './VersionList';
import PublishModal from './PublishModal';
import ValidationPanel from './ValidationPanel';

const EDITOR_TABS = [
  { label: 'Editor', key: 'editor' },
  { label: 'Runs', key: 'runs' },
  { label: 'Eval', key: 'eval' },
] as const;

interface WorkflowEditorTopBarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  onSave?: () => void;
  /** When set, overrides the metadata version for compile (used by version selector). */
  selectedVersion?: number | null;
  onToggleVersions?: () => void;
  versionsOpen?: boolean;
  /** When false, the top bar disables the editor-only actions. */
  hasWorkflow?: boolean;
}

/** Convert wire-shape Diagnostic[] -> store-shape errorsByNode map. */
function diagnosticsToErrorsByNode(items: Diagnostic[]): Record<string, NodeDiagnostic[]> {
  const out: Record<string, NodeDiagnostic[]> = {};
  for (const d of items) {
    const key = d.node_id ?? '';
    const arr = out[key] ?? [];
    arr.push({ message: d.message, severity: d.severity, field_path: d.field_path });
    out[key] = arr;
  }
  return out;
}

export default function WorkflowEditorTopBar({
  activeTab = 'editor',
  onTabChange,
  isSaving = false,
  lastSavedAt,
  onSave,
  selectedVersion,
  onToggleVersions,
  versionsOpen = false,
  hasWorkflow = true,
}: WorkflowEditorTopBarProps) {
  const navigate = useNavigate();
  const metadata = useWorkflowStore((s) => s.metadata);
  const isDirty = useWorkflowStore((s) => s.isDirty);
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const setErrorsByNode = useWorkflowStore((s) => s.setErrorsByNode);
  const clearErrors = useWorkflowStore((s) => s.clearErrors);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateResult | null>(null);
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [compileFlash, setCompileFlash] = useState<'success' | null>(null);

  const validateMutation = useValidateWorkflow();
  const compileMutation = useCompileWorkflow();

  const versionNumber = selectedVersion
    ?? parseInt(metadata?.version.replace(/^v/, '') ?? '1', 10);
  const canPublish = hasWorkflow && Boolean(metadata?.id);

  const handleValidate = async () => {
    const yaml = canvasToYamlDsl(
      nodes,
      edges,
      { name: metadata?.name ?? '', version: metadata?.version ?? 'v1' },
    );
    const result = await validateMutation.mutateAsync(yaml);
    setValidationResult(result);
    setCompileResult(null);
  };

  const handleCompile = async () => {
    if (!metadata?.id) return;
    try {
      const result = await compileMutation.mutateAsync({
        workflowId: metadata.id,
        version: versionNumber,
      });
      setCompileResult(result);
      setValidationResult(null);
      // Surface diagnostics on the canvas: per-node + top-level banner.
      const all: Diagnostic[] = [
        ...(result.errors ?? []),
        ...((result.warnings ?? []) as Diagnostic[]),
      ];
      if (result.success && all.length === 0) {
        clearErrors();
        setCompileFlash('success');
        window.setTimeout(() => setCompileFlash(null), 2000);
      } else {
        setErrorsByNode(diagnosticsToErrorsByNode(all));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compilation request failed. Check your network connection.';
      setCompileResult({
        success: false,
        errors: [{ message, severity: 'error' }],
      });
      setValidationResult(null);
      setErrorsByNode({ '': [{ message, severity: 'error' }] });
    }
  };

  const warningCount = validationResult?.warnings?.length ?? 0;
  const compileErrorCount = compileResult?.errors?.length ?? 0;

  const formatSaveTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <>
      <div className="rounded-[16px] border border-[#ece9e3] bg-white px-[12px] py-[8px] shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workflows')}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] text-[#949494] transition-colors hover:bg-[#f8f8f7] hover:text-[#1a1a1a]"
            aria-label="Back to workflows"
          >
            <ArrowLeft size={17} />
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-[#1a1a1a]">
              {metadata?.name ?? 'Untitled Pipeline'}
            </span>

            {/* Dirty indicator dot */}
            {isDirty && (
              <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-amber-400" title="Unsaved changes" />
            )}

            {/* Version badge -- opens version list dropdown */}
            <VersionList
              workflowId={metadata?.id ?? ''}
              currentVersion={metadata ? `${metadata.version} ${metadata.versionStatus}` : undefined}
            />
          </div>

          <nav
            className="ml-4 flex items-center gap-8"
            aria-label="Editor tabs"
          >
            {EDITOR_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={cn(
                  'relative px-0 py-2 text-[13px] font-medium transition-colors',
                  activeTab === tab.key
                    ? 'text-[#1a1a1a]'
                    : 'text-[#949494] hover:text-[#1a1a1a]'
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute left-0 right-0 bottom-[2px] h-[2px] rounded-full bg-[#242424]" />
                )}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* Compile success flash */}
            {compileFlash === 'success' && (
              <span
                role="status"
                className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700"
              >
                <Check size={13} />
                Compiled
              </span>
            )}

            {/* Validation warnings indicator */}
            {warningCount > 0 && (
              <button
                onClick={() => setValidationResult(validationResult)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-amber-600 transition-colors hover:bg-amber-50"
                title={`${warningCount} validation warning${warningCount > 1 ? 's' : ''}`}
              >
                <AlertTriangle size={13} />
                {warningCount}
              </button>
            )}

            {/* Compile error indicator */}
            {compileErrorCount > 0 && (
              <button
                onClick={() => setCompileResult(compileResult)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50"
                title={`${compileErrorCount} compile error${compileErrorCount > 1 ? 's' : ''}`}
              >
                <AlertTriangle size={13} />
                {compileErrorCount}
              </button>
            )}

            {/* Versions toggle */}
            {onToggleVersions && (
              <button
                onClick={onToggleVersions}
                className={cn(
                  'flex h-[38px] items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-medium transition-colors',
                  versionsOpen
                    ? 'border-[#2196f3] bg-[#e3f2fd] text-[#1976d2]'
                    : 'border-[#e0e0e0] text-[#6b6b6b] hover:bg-[#f8f8f7] hover:text-[#1a1a1a]',
                )}
                aria-pressed={versionsOpen}
                aria-label="Toggle version history"
                disabled={!hasWorkflow}
              >
                <Tag size={14} />
                Versions
              </button>
            )}

            {/* Validate button */}
            <button
              onClick={handleValidate}
              disabled={validateMutation.isPending || !hasWorkflow}
              className="h-[38px] rounded-[10px] border border-[#e0e0e0] px-3 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:bg-[#f8f8f7] hover:text-[#1a1a1a] disabled:opacity-50"
            >
              {validateMutation.isPending ? 'Validating...' : 'Validate'}
            </button>

            {/* Compile button */}
            <button
              onClick={handleCompile}
              disabled={compileMutation.isPending || !metadata?.id}
              className="flex h-[38px] items-center gap-1.5 rounded-[10px] border border-[#e0e0e0] px-3 text-[13px] font-medium text-[#6b6b6b] transition-colors hover:bg-[#f8f8f7] hover:text-[#1a1a1a] disabled:opacity-50"
            >
              {compileMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Compiling...
                </>
              ) : (
                <>
                  <Code2 size={14} />
                  Compile
                </>
              )}
            </button>

            {/* Save button */}
            <button
              onClick={onSave}
              disabled={isSaving || !isDirty}
              className={cn(
                'flex h-[38px] items-center gap-2 rounded-[10px] border px-4 text-[13px] font-medium transition-colors',
                isDirty
                  ? 'border-[#2d2d2d] bg-white text-[#1a1a1a] hover:bg-[#f8f8f7]'
                  : 'border-[#e0e0e0] bg-white text-[#acacac]',
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : lastSavedAt && !isDirty ? (
                <>
                  <Check size={14} className="text-emerald-500" />
                  Saved {formatSaveTime(lastSavedAt)}
                </>
              ) : (
                'Save'
              )}
            </button>

            {/* Publish button */}
            <button
              onClick={() => setShowPublishModal(true)}
              disabled={!canPublish}
              className="h-[38px] rounded-[10px] bg-[#242424] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Publish
            </button>

            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#2d2d2d] text-[13px] font-semibold text-white">
              S
            </div>
          </div>
        </div>
      </div>

      {/* Publish modal */}
      <PublishModal
        workflowId={metadata?.id ?? ''}
        version={versionNumber}
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublished={() => setShowPublishModal(false)}
      />

      {/* Validation panel (floating bottom-right of parent) */}
      {validationResult && (
        <div className="relative">
          <ValidationPanel
            result={validationResult}
            onClose={() => setValidationResult(null)}
          />
        </div>
      )}

      {/* Compile result panel (floating bottom-right of parent) */}
      {compileResult && (
        <div className="relative">
          <ValidationPanel
            result={compileResult}
            onClose={() => setCompileResult(null)}
          />
        </div>
      )}
    </>
  );
}
