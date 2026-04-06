import type { AgentSession, ChatMessage, DecisionTraceEntry, AgentMetrics, PolicyStatus } from '@/types/agentPlayground';
import { API_CONFIG } from '@constants/api';

const BASE = API_CONFIG.BASE_URL;

async function fetchOrMock<T>(url: string, mockData: T): Promise<T> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(API_CONFIG.TIMEOUT) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch { return mockData; }
}

const MOCK_SESSIONS: AgentSession[] = [
  { id: 'ses_x7k2m', name: 'Bracket Optimization', agentId: 'agent_fea_opt', agentName: 'FEA Optimizer', messageCount: 5, toolCallCount: 3, status: 'active', createdAt: new Date(Date.now() - 600_000).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'ses_m3n4p', name: 'Load Case Analysis', agentId: 'agent_fea_opt', agentName: 'FEA Optimizer', messageCount: 8, toolCallCount: 5, status: 'completed', createdAt: new Date(Date.now() - 7_200_000).toISOString(), updatedAt: new Date(Date.now() - 3_600_000).toISOString() },
  { id: 'ses_q5r6s', name: 'Material Selection', agentId: 'agent_fea_opt', agentName: 'FEA Optimizer', messageCount: 3, toolCallCount: 1, status: 'completed', createdAt: new Date(Date.now() - 86_400_000).toISOString(), updatedAt: new Date(Date.now() - 82_800_000).toISOString() },
];

const MOCK_MESSAGES: ChatMessage[] = [
  { id: 'msg_1', role: 'user', content: 'I have a bracket design in Aluminum 6061, 160mm x 80mm x 5mm. Can you run FEA analysis with a 500N load and check if it meets ISO 12345 stress requirements?', timestamp: new Date(Date.now() - 300_000).toISOString() },
  { id: 'msg_2', role: 'agent', content: "I'll analyze this bracket for you. Let me first generate an optimized mesh for your geometry, then run the FEA simulation against ISO 12345 requirements.", timestamp: new Date(Date.now() - 295_000).toISOString() },
  { id: 'msg_3', role: 'agent', content: '', timestamp: new Date(Date.now() - 290_000).toISOString(), toolCallProposal: { toolName: 'mesh-generator', toolVersion: '1.0', confidence: 0.92, reasoning: 'Need to generate mesh before FEA analysis. Mesh Generator is the optimal first step for Aluminum 6061 plate geometry with uniform thickness.', inputs: { geometry: 'art_cad_001', density: 0.8, element_type: 'hex8' }, estimatedCost: 0.30, estimatedDuration: '~7s', alternatives: [{ name: 'fea-solver@2.1', score: 0.45, reason: 'Wrong order — needs mesh first' }, { name: 'result-analyzer@1.0', score: 0.12, reason: 'No data to analyze yet' }] } },
];

const MOCK_TRACE: DecisionTraceEntry[] = [
  { id: 'dt_1', label: 'Context received', detail: 'Bracket: Al6061, 160×80×5mm, 500N', status: 'completed', timestamp: new Date(Date.now() - 300_000).toISOString() },
  { id: 'dt_2', label: 'Tool search', detail: '3 tools found, ranked by compatibility', status: 'completed', timestamp: new Date(Date.now() - 298_000).toISOString() },
  { id: 'dt_3', label: 'Proposal: mesh-generator', detail: 'Confidence: 0.92 - Auto-approved', status: 'completed', timestamp: new Date(Date.now() - 295_000).toISOString() },
  { id: 'dt_4', label: 'Executed mesh-generator', detail: 'SUCCESS - 7.2s - $0.30', status: 'completed', timestamp: new Date(Date.now() - 288_000).toISOString() },
  { id: 'dt_5', label: 'Proposal: fea-solver', detail: 'Confidence: 0.94 - Auto-approved', status: 'completed', timestamp: new Date(Date.now() - 285_000).toISOString() },
  { id: 'dt_6', label: 'Executing fea-solver', detail: 'Running - 12s elapsed', status: 'running', timestamp: new Date(Date.now() - 273_000).toISOString() },
  { id: 'dt_7', label: 'Evaluate result', detail: 'Pending', status: 'pending' },
];

const MOCK_METRICS: AgentMetrics = { iterations: { current: 2, max: 5 }, totalCost: 0.80, budgetRemaining: 9.20, duration: 19, timeout: 600 };
const MOCK_POLICY: PolicyStatus = { autoApproveThreshold: 0.85, autoApproveEnabled: true };

export const fetchSessions = (agentId: string): Promise<AgentSession[]> => fetchOrMock(`${BASE}/agents/${agentId}/sessions`, MOCK_SESSIONS);
export const fetchMessages = (sessionId: string): Promise<ChatMessage[]> => fetchOrMock(`${BASE}/sessions/${sessionId}/messages`, MOCK_MESSAGES);
export const fetchDecisionTrace = (sessionId: string): Promise<DecisionTraceEntry[]> => fetchOrMock(`${BASE}/sessions/${sessionId}/trace`, MOCK_TRACE);
export const fetchAgentMetrics = (sessionId: string): Promise<AgentMetrics> => fetchOrMock(`${BASE}/sessions/${sessionId}/metrics`, MOCK_METRICS);
export const fetchPolicyStatus = (agentId: string): Promise<PolicyStatus> => fetchOrMock(`${BASE}/agents/${agentId}/policy`, MOCK_POLICY);
export const sendMessage = (sessionId: string, content: string): Promise<ChatMessage> => fetchOrMock(`${BASE}/sessions/${sessionId}/messages`, { id: `msg_${Date.now()}`, role: 'agent' as const, content: 'Processing your request...', timestamp: new Date().toISOString() });
export const stopAgent = (sessionId: string): Promise<void> => fetchOrMock(`${BASE}/sessions/${sessionId}/stop`, undefined);
export const approveAll = (sessionId: string): Promise<void> => fetchOrMock(`${BASE}/sessions/${sessionId}/approve-all`, undefined);
