import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Zap, Loader2, RotateCcw } from 'lucide-react';
import { useUiStore } from '@store/uiStore';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { useCreateSession } from '@hooks/useAgentPlayground';
import { useAgentExecution } from '@hooks/useRunAgent';
import { useAgentVersions } from '@hooks/useAgents';
import AgentPlaygroundTopBar from '@components/agents/AgentPlaygroundTopBar';
import ChatInterface from '@components/agents/ChatInterface';
import ProposalViewer from '@components/agents/execution/ProposalViewer';
import PolicyDecisionDisplay from '@components/agents/execution/PolicyDecisionDisplay';
import ApprovalFlow from '@components/agents/execution/ApprovalFlow';
import RunOutputsPanel from '@components/agents/execution/RunOutputsPanel';
import EvalTab from '@components/agents/eval/EvalTab';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';

const DEFAULT_AGENT_ID = 'agent_fea_opt';

export default function AgentPlaygroundPage() {
  const { agentId } = useParams<{ agentId?: string }>();
  const resolvedAgentId = agentId ?? DEFAULT_AGENT_ID;

  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const setBottomBar = useUiStore((s) => s.setBottomBar);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);
  const openRightPanel = useUiStore((s) => s.openRightPanel);
  const closeRightPanel = useUiStore((s) => s.closeRightPanel);

  const setActiveSession = useAgentPlaygroundStore((s) => s.setActiveSession);
  const pendingUserPrompt = useAgentPlaygroundStore((s) => s.pendingUserPrompt);
  const clearPendingUserPrompt = useAgentPlaygroundStore((s) => s.clearPendingUserPrompt);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('playground');

  // Resolve latest published version from API
  const { data: versionsData } = useAgentVersions(resolvedAgentId);
  const latestVersion = (versionsData ?? [])
    .filter((v) => v.status === 'published')
    .reduce((max, v) => Math.max(max, v.version), 0) || 1;

  // Execution flow state
  const execution = useAgentExecution(resolvedAgentId, latestVersion);
  const [showProposal, setShowProposal] = useState(false);

  const createSessionMutation = useCreateSession(resolvedAgentId);

  // Create a session when the page mounts for this agentId
  useEffect(() => {
    let cancelled = false;
    createSessionMutation.mutateAsync()
      .then((sess) => {
        if (!cancelled) {
          setSessionId(sess.id);
          setActiveSession(sess.id);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSessionError((err as { message?: string })?.message ?? 'Failed to create session');
        }
      });
    return () => { cancelled = true; };
    // Run once on mount per agentId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedAgentId]);

  // Set layout on mount, clean up on unmount
  useEffect(() => {
    setSidebarContentType('sessions');
    setBottomBar('agent-playground');
    openRightPanel('inspector');

    return () => {
      setSidebarContentType('navigation');
      hideBottomBar();
      closeRightPanel();
    };
  }, [setSidebarContentType, setBottomBar, hideBottomBar, openRightPanel, closeRightPanel]);

  // Show proposal panel when reviewing
  useEffect(() => {
    if (execution.phase === 'reviewing') {
      setShowProposal(true);
    }
  }, [execution.phase]);

  const handleDryRun = () => {
    // Default sample text so the demo Dry Run button produces real, non-zero
    // counts. The user can override by typing in the chat input below.
    execution.propose({ text: 'the quick brown fox jumps over the lazy dog the fox is quick' });
  };

  // When the user types a prompt in the chat input and presses Send, run the
  // agent's tool with that text as the `text` input port.
  useEffect(() => {
    if (!pendingUserPrompt) return;
    execution.propose({ text: pendingUserPrompt.text });
    clearPendingUserPrompt();
    // execution is intentionally not in deps — it's recreated each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUserPrompt, clearPendingUserPrompt]);

  const handleApprove = () => {
    execution.approve();
    setShowProposal(false);
  };

  const handleReject = () => {
    execution.reject();
    setShowProposal(false);
  };

  const handleReset = () => {
    execution.reset();
    setShowProposal(false);
  };

  // Determine if policy decision needs approval flow
  const needsApproval = execution.policyDecision?.overall_verdict === 'needs_approval';
  const pendingActions = execution.policyDecision?.action_decisions.filter(
    (a) => a.verdict === 'needs_approval' || a.verdict === 'blocked'
  ) ?? [];

  // Loading state while session is being created
  if (createSessionMutation.isPending && !sessionId) {
    return (
      <div data-testid="agent-playground-page" className="flex flex-col h-full">
        <AgentPlaygroundTopBar agentName="Loading..." agentVersion="" activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-cds-text-secondary" size={24} />
        </div>
      </div>
    );
  }

  // Error state if session creation failed
  if (sessionError) {
    return (
      <div data-testid="agent-playground-page" className="flex flex-col h-full">
        <AgentPlaygroundTopBar agentName="Error" agentVersion="" activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-500">{sessionError} — is the backend running on localhost:8080?</p>
        </div>
      </div>
    );
  }

  // Render evals tab
  if (activeTab === 'evals') {
    return (
      <div data-testid="agent-playground-page" className="flex flex-col h-full">
        <AgentPlaygroundTopBar
          agentName="FEA Optimizer Agent"
          agentVersion="v2"
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <EvalTab agentId={resolvedAgentId} />
      </div>
    );
  }

  return (
    <div data-testid="agent-playground-page" className="flex flex-col h-full">
      <AgentPlaygroundTopBar
        agentName="FEA Optimizer Agent"
        agentVersion="v2"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Execution controls bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-cds-border-subtle bg-cds-layer-01 shrink-0">
        <Button
          data-testid="dry-run-btn"
          variant="tertiary"
          size="sm"
          icon={execution.isLoading ? <Loader2 className="animate-spin" /> : <Zap />}
          onClick={handleDryRun}
          disabled={execution.isLoading || execution.phase === 'proposing'}
        >
          Dry Run
        </Button>

        {execution.phase !== 'idle' && (
          <Badge
            variant={
              execution.phase === 'completed' ? 'success' :
              execution.phase === 'failed' ? 'danger' :
              execution.phase === 'executing' ? 'warning' :
              'info'
            }
          >
            {execution.phase}
          </Badge>
        )}

        {execution.error && (
          <span className="text-xs text-red-50 ml-2">{execution.error}</span>
        )}

        {(execution.phase === 'completed' || execution.phase === 'failed') && (
          <Button
            data-testid="execution-reset-btn"
            variant="ghost"
            size="sm"
            icon={<RotateCcw />}
            onClick={handleReset}
          >
            Reset
          </Button>
        )}

        {execution.runId && (
          <span className="text-xs text-cds-text-secondary ml-auto font-mono">
            Run: {execution.runId}
          </span>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatInterface agentId={resolvedAgentId} sessionId={sessionId} />
        </div>

        {/* Proposal / Policy / Outputs panel */}
        {((showProposal && execution.proposal) || execution.runId) && (
          <div
            data-testid="execution-panel"
            className="w-[480px] border-l border-cds-border-subtle overflow-y-auto bg-cds-layer-01 shrink-0"
          >
            <div className="p-4 space-y-4">
              {/* Proposal Viewer (review phase only) */}
              {showProposal && execution.proposal && (
                <>
                  <ProposalViewer
                    proposal={execution.proposal}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />

                  {execution.policyDecision && (
                    <PolicyDecisionDisplay decision={execution.policyDecision} />
                  )}

                  {needsApproval && pendingActions.length > 0 && execution.proposal.status === 'draft' && (
                    <ApprovalFlow
                      proposalId={execution.proposal.id}
                      approvalId={execution.approvalId ?? undefined}
                      agentId={resolvedAgentId}
                      sessionId={sessionId ?? undefined}
                      actions={pendingActions}
                      onApproved={handleApprove}
                      onRejected={handleReject}
                    />
                  )}
                </>
              )}

              {/* Live tool outputs from the worker (visible the moment a run starts) */}
              {execution.runId && <RunOutputsPanel runId={execution.runId} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
