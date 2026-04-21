import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Zap, Loader2, RotateCcw } from 'lucide-react';
import { useUiStore } from '@store/uiStore';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { useCreateSession, useSessionList } from '@hooks/useAgentPlayground';
import { useAgentExecution } from '@hooks/useRunAgent';
import { useAgent, useAgentVersions } from '@hooks/useAgents';
import AgentPlaygroundTopBar from '@components/agents/AgentPlaygroundTopBar';
import ChatInterface from '@components/agents/ChatInterface';
import PlaygroundActionBar from '@components/agents/PlaygroundActionBar';
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
  const navigate = useNavigate();
  const resolvedAgentId = agentId ?? DEFAULT_AGENT_ID;

  // If we landed here without a real agentId, the default points at a
  // fixture agent that doesn't exist in the DB and session creation will
  // FK-fail. Send the user back to pick an agent.
  useEffect(() => {
    if (!agentId) {
      navigate('/agents', { replace: true });
    }
  }, [agentId, navigate]);

  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const setBottomBar = useUiStore((s) => s.setBottomBar);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);
  const openRightPanel = useUiStore((s) => s.openRightPanel);
  const closeRightPanel = useUiStore((s) => s.closeRightPanel);

  const setActiveSession = useAgentPlaygroundStore((s) => s.setActiveSession);
  const setActiveAgentId = useAgentPlaygroundStore((s) => s.setActiveAgentId);
  const pendingUserPrompt = useAgentPlaygroundStore((s) => s.pendingUserPrompt);
  const clearPendingUserPrompt = useAgentPlaygroundStore((s) => s.clearPendingUserPrompt);
  const chatRunId = useAgentPlaygroundStore((s) => s.chatRunId);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('playground');

  // Tab navigation: Builder/Runs live on the Studio page (Runs is a tab there);
  // Playground/Evals stay local on this page.
  const handleTabChange = (tab: string) => {
    if (tab === 'builder' || tab === 'runs') {
      const suffix = tab === 'runs' ? '?tab=runs' : '';
      navigate(`/agent-studio/${resolvedAgentId}${suffix}`);
      return;
    }
    setActiveTab(tab);
  };

  // Resolve latest published version from API
  const { data: agentData } = useAgent(resolvedAgentId);
  const { data: versionsData } = useAgentVersions(resolvedAgentId);
  const latestVersionNum = (versionsData ?? [])
    .filter((v) => v.status === 'published')
    .reduce((max, v) => Math.max(max, v.version), 0) || 1;
  const latestVersion = latestVersionNum;
  const agentDisplayName = agentData?.name ?? 'Agent';
  const agentVersionLabel = `v${latestVersionNum}`;

  // Execution flow state
  const execution = useAgentExecution(resolvedAgentId, latestVersion);
  const [showProposal, setShowProposal] = useState(false);

  const createSessionMutation = useCreateSession(resolvedAgentId);
  const { data: existingSessions = [] } = useSessionList(resolvedAgentId);

  // Drop a stale (expired/missing) session id so the auto-pick logic re-runs.
  // existingSessions contains only ACTIVE sessions from the backend.
  useEffect(() => {
    if (!sessionId) return;
    if (existingSessions.length === 0) return; // still loading or empty
    const stillActive = existingSessions.some((s) => s.id === sessionId);
    if (!stillActive) {
      setSessionId(null);
      setActiveSession(null);
    }
  }, [sessionId, existingSessions, setActiveSession]);

  // Pick up the most recent existing session on mount; only create a new
  // one if there are none. The "+ New Session" button creates explicitly.
  useEffect(() => {
    if (sessionId) return; // already have one selected
    if (existingSessions.length > 0) {
      const latest = existingSessions[0]; // backend returns newest-first
      setSessionId(latest.id);
      setActiveSession(latest.id);
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedAgentId, existingSessions.length]);

  // When the user clicks a different session in the sidebar, sync local state.
  const activeSessionFromStore = useAgentPlaygroundStore((s) => s.activeSessionId);
  useEffect(() => {
    if (activeSessionFromStore && activeSessionFromStore !== sessionId) {
      setSessionId(activeSessionFromStore);
    }
  }, [activeSessionFromStore, sessionId]);

  const handleNewSession = async () => {
    try {
      const sess = await createSessionMutation.mutateAsync();
      setSessionId(sess.id);
      setActiveSession(sess.id);
      setSessionError(null);
    } catch (err: unknown) {
      setSessionError((err as { message?: string })?.message ?? 'Failed to create session');
    }
  };

  // Set layout on mount, clean up on unmount
  useEffect(() => {
    setSidebarContentType('sessions');
    // PlaygroundActionBar is rendered inline (full chat-column width)
    // instead of via the global floating bottom-bar slot.
    openRightPanel('inspector');
    setActiveAgentId(resolvedAgentId);

    return () => {
      setSidebarContentType('navigation');
      hideBottomBar();
      closeRightPanel();
      setActiveAgentId(null);
    };
  }, [setSidebarContentType, setBottomBar, hideBottomBar, openRightPanel, closeRightPanel, setActiveAgentId, resolvedAgentId]);

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
      <div data-testid="agent-playground-page" className="h-full min-h-0 overflow-hidden bg-[#f5f5f0]">
        <div className="flex h-full min-h-0 flex-col gap-3 px-[14px] py-[14px] lg:px-[18px] lg:py-[18px]">
          <AgentPlaygroundTopBar agentName="Loading..." agentVersion="" activeTab={activeTab} onTabChange={handleTabChange} />
          <div className="flex flex-1 items-center justify-center rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
            <Loader2 className="animate-spin text-[#9b978f]" size={24} />
          </div>
        </div>
      </div>
    );
  }

  // Error state if session creation failed
  if (sessionError) {
    return (
      <div data-testid="agent-playground-page" className="h-full min-h-0 overflow-hidden bg-[#f5f5f0]">
        <div className="flex h-full min-h-0 flex-col gap-3 px-[14px] py-[14px] lg:px-[18px] lg:py-[18px]">
          <AgentPlaygroundTopBar agentName="Error" agentVersion="" activeTab={activeTab} onTabChange={handleTabChange} />
          <div className="flex flex-1 items-center justify-center rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
            <p className="text-sm text-red-500">{sessionError} — is the backend running on localhost:8080?</p>
          </div>
        </div>
      </div>
    );
  }

  // Render evals tab
  if (activeTab === 'evals') {
    return (
      <div data-testid="agent-playground-page" className="h-full min-h-0 overflow-hidden bg-[#f5f5f0]">
        <div className="flex h-full min-h-0 flex-col gap-3 px-[14px] py-[14px] lg:px-[18px] lg:py-[18px]">
          <AgentPlaygroundTopBar
            agentName={agentDisplayName}
            agentVersion={agentVersionLabel}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onNewSession={handleNewSession}
            newSessionPending={createSessionMutation.isPending}
          />
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
            <div className="flex-1 min-h-0 overflow-hidden">
              <EvalTab agentId={resolvedAgentId} sessionId={sessionId} />
            </div>
            <PlaygroundActionBar />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="agent-playground-page" className="h-full min-h-0 overflow-hidden bg-[#f5f5f0]">
      <div className="flex h-full min-h-0 flex-col gap-3 px-[14px] py-[14px] lg:px-[18px] lg:py-[18px]">
      <AgentPlaygroundTopBar
        agentName={agentDisplayName}
        agentVersion={agentVersionLabel}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNewSession={handleNewSession}
        newSessionPending={createSessionMutation.isPending}
      />

      {/* Execution controls bar */}
      <div className="flex items-center gap-2 px-4 py-2 border border-[#ece9e3] bg-white rounded-[14px] shadow-[0px_1px_8px_0px_rgba(0,0,0,0.03)] shrink-0">
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
      <div className="flex-1 flex min-h-0 gap-3">
        {/* Chat area + inline action bar at bottom (wrapped in card) */}
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)]">
          <ChatInterface agentId={resolvedAgentId} sessionId={sessionId} />
          <PlaygroundActionBar />
        </div>

        {/* Proposal / Policy review panel (Dry Run flow only).
            Live tool outputs are now rendered INLINE in the chat thread via
            <InlineToolCallCard /> — no side panel for chat-driven runs. */}
        {showProposal && execution.proposal && (
          <div
            data-testid="execution-panel"
            className="w-[480px] overflow-y-auto rounded-[20px] border border-[#ece9e3] bg-white shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)] shrink-0"
          >
            <div className="p-4 space-y-4">
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
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
