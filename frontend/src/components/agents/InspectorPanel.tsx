import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { useDecisionTrace, useAgentMetrics, usePolicyStatus } from '@hooks/useAgentPlayground';
import DecisionTraceTimeline from '@components/agents/DecisionTraceTimeline';
import LiveMetrics from '@components/agents/LiveMetrics';
import PolicyStatusCard from '@components/agents/PolicyStatusCard';

const DEFAULT_AGENT_ID = 'agent_fea_opt';

export default function InspectorPanel() {
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);
  const sessions = useAgentPlaygroundStore((s) => s.sessions);
  const setPolicyStatus = useAgentPlaygroundStore((s) => s.setPolicyStatus);

  const { data: traceData } = useDecisionTrace(activeSessionId);
  const { data: metricsData } = useAgentMetrics(activeSessionId);
  const { data: policyData } = usePolicyStatus(DEFAULT_AGENT_ID);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  if (!activeSessionId || !activeSession) {
    return (
      <div data-testid="inspector-panel" className="p-4 flex items-center justify-center h-full">
        <p className="text-sm text-cds-text-secondary">
          Select a session to view inspection details.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="inspector-panel" className="h-full overflow-y-auto">
      {/* SESSION info */}
      <div data-testid="inspector-session-info" className="p-3 border-b border-cds-border-subtle">
        <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-2">
          SESSION
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-cds-text-secondary">ID</span>
            <span className="font-mono text-cds-text-primary">{activeSession.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-cds-text-secondary">Name</span>
            <span className="text-cds-text-primary">{activeSession.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-cds-text-secondary">Messages</span>
            <span className="text-cds-text-primary">{activeSession.messageCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-cds-text-secondary">Tool calls</span>
            <span className="text-cds-text-primary">{activeSession.toolCallCount}</span>
          </div>
        </div>
      </div>

      {/* DECISION TRACE */}
      <div className="p-3 border-b border-cds-border-subtle">
        <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-2">
          DECISION TRACE
        </p>
        {traceData && traceData.length > 0 ? (
          <DecisionTraceTimeline entries={traceData} />
        ) : (
          <p className="text-xs text-cds-text-secondary">No trace data yet.</p>
        )}
      </div>

      {/* LIVE METRICS */}
      <div className="p-3 border-b border-cds-border-subtle">
        <LiveMetrics metrics={metricsData} />
      </div>

      {/* POLICY STATUS */}
      <div className="p-3">
        {policyData ? (
          <PolicyStatusCard
            policyStatus={policyData}
            onToggleAutoApprove={(enabled) => {
              setPolicyStatus({ ...policyData, autoApproveEnabled: enabled });
            }}
          />
        ) : (
          <p className="text-xs text-cds-text-secondary">Loading policy...</p>
        )}
      </div>
    </div>
  );
}
