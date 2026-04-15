import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAgentPlaygroundStore } from '@store/agentPlaygroundStore';
import { useSession, useSessionTrace, useSessionMetrics, usePolicyStatus } from '@hooks/useAgentPlayground';
import DecisionTraceTimeline from '@components/agents/DecisionTraceTimeline';
import LiveMetrics from '@components/agents/LiveMetrics';
import PolicyStatusCard from '@components/agents/PolicyStatusCard';
import ScoringBreakdownPanel from '@components/agents/ScoringBreakdownPanel';
import { cn } from '@utils/cn';

const INSPECTOR_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'scoring', label: 'Scoring' },
] as const;

type InspectorTab = typeof INSPECTOR_TABS[number]['id'];

export default function InspectorPanel() {
  const { agentId = 'agent_fea_opt' } = useParams<{ agentId?: string }>();
  const activeSessionId = useAgentPlaygroundStore((s) => s.activeSessionId);
  const setPolicyStatus = useAgentPlaygroundStore((s) => s.setPolicyStatus);
  const [activeTab, setActiveTab] = useState<InspectorTab>('overview');

  const { data: activeSession } = useSession(agentId, activeSessionId);
  const { data: traceData } = useSessionTrace(agentId, activeSessionId);
  const { data: metricsData } = useSessionMetrics(agentId, activeSessionId);
  const { data: policyData } = usePolicyStatus(agentId);

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
      {/* Tab bar */}
      <div className="flex border-b border-cds-border-subtle">
        {INSPECTOR_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-testid={`inspector-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 py-2 text-xs font-medium text-center transition-colors',
              activeTab === tab.id
                ? 'text-cds-text-primary border-b-2 border-brand-primary'
                : 'text-cds-text-secondary hover:text-cds-text-primary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <>
          {/* SESSION info */}
          <div data-testid="inspector-session-info" className="p-3 border-b border-cds-border-subtle">
            <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-2">
              SESSION
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-cds-text-secondary">ID</span>
                <span className="font-mono text-cds-text-primary truncate max-w-[140px]">{activeSession.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-cds-text-secondary">Status</span>
                <span className="text-cds-text-primary capitalize">{activeSession.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-cds-text-secondary">Messages</span>
                <span className="text-cds-text-primary">{activeSession.history?.length ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-cds-text-secondary">Expires</span>
                <span className="text-cds-text-primary text-[10px]">
                  {activeSession.expires_at
                    ? new Date(activeSession.expires_at).toLocaleTimeString()
                    : '—'}
                </span>
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
        </>
      )}

      {/* Scoring tab */}
      {activeTab === 'scoring' && (
        <ScoringBreakdownPanel />
      )}
    </div>
  );
}
