import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Zap, Loader2, RotateCcw } from 'lucide-react';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { useCreateSession, useSessionList } from '@hooks/useAgentPlayground';
import { useAgentExecution } from '@hooks/useRunAgent';
import { useAgent, useAgentVersions } from '@hooks/useAgents';
import { useAuth } from '@contexts/AuthContext';
import AgentPlaygroundTopBar from '@components/agents/AgentPlaygroundTopBar';
import ChatInterface from '@components/agents/ChatInterface';
import PlaygroundActionBar from '@components/agents/PlaygroundActionBar';
import ProposalViewer from '@components/agents/execution/ProposalViewer';
import PolicyDecisionDisplay from '@components/agents/execution/PolicyDecisionDisplay';
import ApprovalFlow from '@components/agents/execution/ApprovalFlow';
import EvalTab from '@components/agents/eval/EvalTab';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';

const SessionList = lazy(() => import('@components/agents/SessionList'));
const InspectorPanel = lazy(() => import('@components/agents/InspectorPanel'));

export default function AgentPlaygroundPage() {
  const { agentId } = useParams<{ agentId?: string }>();
  const navigate = useNavigate();
  const resolvedAgentId = agentId ?? '';

  useEffect(() => {
    if (!agentId) navigate('/agents', { replace: true });
  }, [agentId, navigate]);

  const { user } = useAuth();
  const setActiveSession = useAgentPlaygroundStore((s) => s.setActiveSession);
  const setActiveAgentId = useAgentPlaygroundStore((s) => s.setActiveAgentId);
  const pendingUserPrompt = useAgentPlaygroundStore((s) => s.pendingUserPrompt);
  const clearPendingUserPrompt = useAgentPlaygroundStore((s) => s.clearPendingUserPrompt);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('playground');

  const handleTabChange = (tab: string) => {
    if (tab === 'builder' || tab === 'runs') {
      const suffix = tab === 'runs' ? '?tab=runs' : '';
      navigate(`/agent-studio/${resolvedAgentId}${suffix}`);
      return;
    }
    setActiveTab(tab);
  };

  const { data: agentData } = useAgent(resolvedAgentId);
  const { data: versionsData } = useAgentVersions(resolvedAgentId);
  const latestVersionNum = (versionsData ?? [])
    .filter((v) => v.status === 'published')
    .reduce((max, v) => Math.max(max, v.version), 0) || 1;
  const agentDisplayName = agentData?.name ?? 'Agent';
  const agentVersionLabel = `v${latestVersionNum}`;
  const agentVersionStatus = (versionsData ?? []).some((v) => v.status === 'published') ? 'published' : 'draft';

  const execution = useAgentExecution(resolvedAgentId, latestVersionNum);
  const [showProposal, setShowProposal] = useState(false);

  const createSessionMutation = useCreateSession(resolvedAgentId);
  const { data: existingSessions = [] } = useSessionList(resolvedAgentId);

  // Drop stale session id when it no longer appears in the active list.
  useEffect(() => {
    if (!sessionId || existingSessions.length === 0) return;
    if (!existingSessions.some((s) => s.id === sessionId)) {
      setSessionId(null);
      setActiveSession(null);
    }
  }, [sessionId, existingSessions, setActiveSession]);

  // Owner-aware auto-pick / create session.
  useEffect(() => {
    if (!resolvedAgentId || !user?.id) return;
    if (sessionId) return;
    const owned = (existingSessions ?? []).filter(
      (s) => s.user_id === user.id || s.user_id == null,
    );
    const newest = owned[0];
    if (newest) {
      setSessionId(newest.id);
      setActiveSession(newest.id);
      return;
    }
    let cancelled = false;
    createSessionMutation.mutateAsync()
      .then((sess) => {
        if (!cancelled) { setSessionId(sess.id); setActiveSession(sess.id); }
      })
      .catch((err: unknown) => {
        if (!cancelled) setSessionError((err as { message?: string })?.message ?? 'Failed to create session');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedAgentId, user?.id, existingSessions.length]);

  // Sync session selected from the sidebar list.
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

  // Register the active agent id in the store (used by InspectorPanel, PlaygroundActionBar, etc.)
  useEffect(() => {
    setActiveAgentId(resolvedAgentId);
    return () => { setActiveAgentId(null); };
  }, [setActiveAgentId, resolvedAgentId]);

  useEffect(() => {
    if (execution.phase === 'reviewing') setShowProposal(true);
  }, [execution.phase]);

  const handleDryRun = () => {
    execution.propose({ text: 'the quick brown fox jumps over the lazy dog the fox is quick' });
  };

  useEffect(() => {
    if (!pendingUserPrompt) return;
    execution.propose({ text: pendingUserPrompt.text });
    clearPendingUserPrompt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUserPrompt, clearPendingUserPrompt]);

  const handleApprove = () => { execution.approve(); setShowProposal(false); };
  const handleReject = () => { execution.reject(); setShowProposal(false); };
  const handleReset = () => { execution.reset(); setShowProposal(false); };

  const needsApproval = execution.policyDecision?.overall_verdict === 'needs_approval';
  const pendingActions = execution.policyDecision?.action_decisions.filter(
    (a) => a.verdict === 'needs_approval' || a.verdict === 'blocked'
  ) ?? [];

  // ── Shared top-bar wrapper ──────────────────────────────────────────────────
  const topBar = (
    <div className="shrink-0 px-[14px] pt-[14px] lg:px-[18px] lg:pt-[18px]">
      <AgentPlaygroundTopBar
        agentName={agentDisplayName}
        agentVersion={agentVersionLabel}
        agentVersionStatus={agentVersionStatus}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNewSession={handleNewSession}
        newSessionPending={createSessionMutation.isPending}
      />
    </div>
  );

  // ── Shared left-panel (Sessions) ────────────────────────────────────────────
  const sessionsPanel = (
    <aside className="w-[220px] shrink-0 flex flex-col bg-white rounded-[20px] border border-[#ece9e3] shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3">
        <Suspense fallback={<div className="p-3 text-xs text-[#9b978f]">Loading…</div>}>
          <SessionList />
        </Suspense>
      </div>
    </aside>
  );

  // ── Shared right-panel (Inspector) ──────────────────────────────────────────
  const inspectorPanel = (
    <div className="w-[280px] shrink-0 flex flex-col bg-white rounded-[20px] border border-[#ece9e3] shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)] overflow-hidden">
      <Suspense fallback={<div className="p-3 text-xs text-[#9b978f]">Loading…</div>}>
        <InspectorPanel />
      </Suspense>
    </div>
  );

  // ── Loading state ────────────────────────────────────────────────────────────
  if (createSessionMutation.isPending && !sessionId) {
    return (
      <div data-testid="agent-playground-page" className="flex flex-col h-full bg-[#f5f5f0] overflow-hidden">
        {topBar}
        <div className="flex flex-1 min-h-0 gap-3 px-[14px] py-3 lg:px-[18px]">
          {sessionsPanel}
          <div className="flex-1 flex items-center justify-center bg-white rounded-[20px] border border-[#ece9e3]">
            <Loader2 className="animate-spin text-[#9b978f]" size={24} />
          </div>
          {inspectorPanel}
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (sessionError) {
    return (
      <div data-testid="agent-playground-page" className="flex flex-col h-full bg-[#f5f5f0] overflow-hidden">
        {topBar}
        <div className="flex flex-1 min-h-0 gap-3 px-[14px] py-3 lg:px-[18px]">
          {sessionsPanel}
          <div className="flex-1 flex items-center justify-center bg-white rounded-[20px] border border-[#ece9e3]">
            <p className="text-sm text-red-500">{sessionError} — is the backend running on localhost:8080?</p>
          </div>
          {inspectorPanel}
        </div>
      </div>
    );
  }

  // ── Evals tab ────────────────────────────────────────────────────────────────
  if (activeTab === 'evals') {
    return (
      <div data-testid="agent-playground-page" className="flex flex-col h-full bg-[#f5f5f0] overflow-hidden">
        {topBar}
        <div className="flex flex-1 min-h-0 gap-3 px-[14px] py-3 lg:px-[18px]">
          {sessionsPanel}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[20px] border border-[#ece9e3] shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <EvalTab agentId={resolvedAgentId} sessionId={sessionId} />
            </div>
            <PlaygroundActionBar />
          </div>
          {inspectorPanel}
        </div>
      </div>
    );
  }

  // ── Playground tab (main) ────────────────────────────────────────────────────
  return (
    <div data-testid="agent-playground-page" className="flex flex-col h-full bg-[#f5f5f0] overflow-hidden">
      {topBar}

      <div className="flex flex-1 min-h-0 gap-3 px-[14px] py-3 lg:px-[18px]">
        {/* Left: Sessions */}
        {sessionsPanel}

        {/* Center: execution controls + chat + (proposal if dry-run) */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[20px] border border-[#ece9e3] shadow-[0px_1px_10px_0px_rgba(0,0,0,0.05)] overflow-hidden">
          {/* Execution controls bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#ece9e3] shrink-0">
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
              <span className="text-xs text-red-500 ml-2">{execution.error}</span>
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
              <span className="text-xs text-[#9b978f] ml-auto font-mono">
                Run: {execution.runId}
              </span>
            )}
          </div>

          {/* Chat + optional proposal panel */}
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              <ChatInterface
                agentId={resolvedAgentId}
                sessionId={sessionId}
              />
              <PlaygroundActionBar />
            </div>

            {/* Proposal / Policy review panel (Dry Run flow only) */}
            {showProposal && execution.proposal && (
              <div
                data-testid="execution-panel"
                className="w-[420px] border-l border-[#ece9e3] overflow-y-auto bg-white shrink-0"
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

        {/* Right: Inspector */}
        {inspectorPanel}
      </div>
    </div>
  );
}
