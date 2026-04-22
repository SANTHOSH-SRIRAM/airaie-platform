import { useState } from 'react';
import { cn } from '@utils/cn';
import {
  Sparkles,
  Wrench,
  AlertTriangle,
  CheckSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DraftIntentResult {
  intent_type?: string;
  goal?: string;
  kpis?: Array<{ metric_key: string; unit: string; target_value?: number }>;
  recommended_agents?: string[];
}

interface ToolRecommendation {
  tool_id: string;
  name?: string;
  score: number;
  reason?: string;
}

interface FailureAnalysisResult {
  root_cause?: string;
  suggestions?: string[];
  severity?: string;
}

interface ApprovalSummaryResult {
  summary?: string;
  pending_count?: number;
  items?: Array<{ id: string; description: string; status: string }>;
}

// ---------------------------------------------------------------------------
// Board Assist API calls
// ---------------------------------------------------------------------------

async function apiBoardAssist<T>(boardId: string, action: string, body?: Record<string, unknown>): Promise<T> {
  return apiClient.post<T>(`/v0/boards/${boardId}/assist/${action}`, body ?? {});
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-[#ece9e3] pt-[14px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-[10px] group"
      >
        <div className="flex items-center gap-[7px]">
          <span className="text-[#ff9800]">{icon}</span>
          <span className="text-[13px] font-semibold text-[#1a1a1a]">{title}</span>
        </div>
        {open ? (
          <ChevronUp size={14} className="text-[#acacac] group-hover:text-[#6b6b6b] transition-colors" />
        ) : (
          <ChevronDown size={14} className="text-[#acacac] group-hover:text-[#6b6b6b] transition-colors" />
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

interface ErrorDisplayProps {
  error: unknown;
}

function ErrorDisplay({ error }: ErrorDisplayProps) {
  const isLlmMissing =
    error instanceof Error &&
    (error.message.includes('503') ||
      error.message.toLowerCase().includes('llm') ||
      error.message.toLowerCase().includes('not configured'));

  return (
    <div className="flex items-start gap-[8px] p-[10px] rounded-[8px] bg-[#fff3e0] border border-[#ffe0b2]">
      <AlertCircle size={14} className="text-[#ff9800] mt-[1px] shrink-0" />
      <p className="text-[12px] text-[#ff9800] leading-[16px]">
        {isLlmMissing
          ? 'LLM not configured. Ask your admin to set up an AI provider.'
          : error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draft Intent
// ---------------------------------------------------------------------------

interface DraftIntentSectionProps {
  boardId: string;
}

function DraftIntentSection({ boardId }: DraftIntentSectionProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DraftIntentResult | null>(null);
  const [error, setError] = useState<unknown>(null);

  const handleDraft = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiBoardAssist<DraftIntentResult>(boardId, 'draft-intent', {
        description: description.trim(),
      });
      setResult(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-[10px]">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe what you want to validate or explore..."
        rows={3}
        className="w-full px-[10px] py-[8px] rounded-[8px] border border-[#e8e8e8] text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors resize-none"
      />
      <button
        type="button"
        onClick={handleDraft}
        disabled={!description.trim() || loading}
        className={cn(
          'h-[32px] px-[14px] rounded-[8px] text-[11px] font-semibold flex items-center gap-[6px] transition-colors',
          !description.trim() || loading
            ? 'bg-[#f0f0ec] text-[#acacac] cursor-not-allowed'
            : 'bg-[#ff9800] hover:bg-[#f57c00] text-white',
        )}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {loading ? 'Drafting…' : 'Draft Intent'}
      </button>

      {error && <ErrorDisplay error={error} />}

      {result && (
        <div className="flex flex-col gap-[6px] p-[10px] rounded-[8px] bg-[#fafaf8] border border-[#ece9e3]">
          {result.intent_type && (
            <div>
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">
                Intent Type
              </span>
              <p className="text-[12px] font-mono text-[#1a1a1a] mt-[2px]">{result.intent_type}</p>
            </div>
          )}
          {result.goal && (
            <div>
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">
                Goal
              </span>
              <p className="text-[12px] text-[#1a1a1a] mt-[2px] leading-[16px]">{result.goal}</p>
            </div>
          )}
          {result.kpis && result.kpis.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">
                Suggested KPIs
              </span>
              <div className="flex flex-col gap-[3px] mt-[4px]">
                {result.kpis.map((kpi, i) => (
                  <div key={i} className="flex items-center gap-[6px]">
                    <span className="text-[11px] font-mono text-[#6b6b6b]">{kpi.metric_key}</span>
                    <span className="text-[10px] text-[#acacac]">{kpi.unit}</span>
                    {kpi.target_value !== undefined && (
                      <span className="text-[10px] text-[#4caf50] font-medium">
                        target: {kpi.target_value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.recommended_agents && result.recommended_agents.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">
                Recommended Agents
              </span>
              <div className="flex flex-wrap gap-[4px] mt-[4px]">
                {result.recommended_agents.map((agent) => (
                  <span
                    key={agent}
                    className="h-[20px] px-[8px] rounded-[4px] bg-[#e8f5e9] text-[#4caf50] text-[10px] font-medium inline-flex items-center"
                  >
                    {agent}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommend Tools
// ---------------------------------------------------------------------------

interface RecommendToolsSectionProps {
  boardId: string;
}

function RecommendToolsSection({ boardId }: RecommendToolsSectionProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ToolRecommendation[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  const handleRecommend = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiBoardAssist<{ tools?: ToolRecommendation[] } | ToolRecommendation[]>(
        boardId,
        'recommend-tools',
      );
      // Handle both array and wrapped responses
      const tools = Array.isArray(data) ? data : (data as { tools?: ToolRecommendation[] }).tools ?? [];
      setResult(tools);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-[10px]">
      <p className="text-[11px] text-[#9b978f] leading-[15px]">
        Get AI-ranked tool suggestions based on this board's objectives and card types.
      </p>
      <button
        type="button"
        onClick={handleRecommend}
        disabled={loading}
        className={cn(
          'h-[32px] px-[14px] rounded-[8px] text-[11px] font-semibold flex items-center gap-[6px] transition-colors',
          loading
            ? 'bg-[#f0f0ec] text-[#acacac] cursor-not-allowed'
            : 'bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white',
        )}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
        {loading ? 'Analyzing…' : 'Recommend Tools'}
      </button>

      {error && <ErrorDisplay error={error} />}

      {result && result.length > 0 && (
        <div className="flex flex-col gap-[6px]">
          {result.map((tool, i) => (
            <div
              key={tool.tool_id ?? i}
              className="flex items-start gap-[10px] p-[10px] rounded-[8px] bg-[#fafaf8] border border-[#ece9e3]"
            >
              <span className="text-[11px] font-bold text-[#acacac] w-[18px] shrink-0 text-center mt-[1px]">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[8px]">
                  <span className="text-[12px] font-semibold text-[#1a1a1a] truncate">
                    {tool.name ?? tool.tool_id}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-medium shrink-0',
                      tool.score >= 0.8
                        ? 'text-[#4caf50]'
                        : tool.score >= 0.5
                          ? 'text-[#ff9800]'
                          : 'text-[#9b978f]',
                    )}
                  >
                    {Math.round(tool.score * 100)}%
                  </span>
                </div>
                {tool.reason && (
                  <p className="text-[11px] text-[#6b6b6b] mt-[2px] leading-[15px]">{tool.reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {result && result.length === 0 && (
        <p className="text-[11px] text-[#acacac] text-center py-[8px]">
          No tool recommendations available for this board.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analyze Failure
// ---------------------------------------------------------------------------

interface AnalyzeFailureSectionProps {
  boardId: string;
}

function AnalyzeFailureSection({ boardId }: AnalyzeFailureSectionProps) {
  const [runId, setRunId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FailureAnalysisResult | null>(null);
  const [error, setError] = useState<unknown>(null);

  const handleAnalyze = async () => {
    if (!runId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiBoardAssist<FailureAnalysisResult>(boardId, 'analyze-failure', {
        run_id: runId.trim(),
      });
      setResult(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const severityColor =
    result?.severity === 'critical'
      ? 'text-[#e74c3c]'
      : result?.severity === 'high'
        ? 'text-[#ff9800]'
        : 'text-[#6b6b6b]';

  return (
    <div className="flex flex-col gap-[10px]">
      <p className="text-[11px] text-[#9b978f] leading-[15px]">
        Paste a run ID to get root cause analysis and corrective suggestions.
      </p>
      <div className="flex items-center gap-[8px]">
        <input
          type="text"
          value={runId}
          onChange={(e) => setRunId(e.target.value)}
          placeholder="run_abc123..."
          className="flex-1 h-[32px] px-[10px] rounded-[8px] border border-[#e8e8e8] text-[12px] font-mono text-[#1a1a1a] placeholder:text-[#acacac] focus:outline-none focus:border-[#ff9800] transition-colors"
        />
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!runId.trim() || loading}
          className={cn(
            'h-[32px] px-[12px] rounded-[8px] text-[11px] font-semibold flex items-center gap-[5px] transition-colors shrink-0',
            !runId.trim() || loading
              ? 'bg-[#f0f0ec] text-[#acacac] cursor-not-allowed'
              : 'bg-[#e74c3c] hover:bg-[#c0392b] text-white',
          )}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {error && <ErrorDisplay error={error} />}

      {result && (
        <div className="flex flex-col gap-[8px] p-[10px] rounded-[8px] bg-[#fafaf8] border border-[#ece9e3]">
          {result.severity && (
            <div className="flex items-center gap-[6px]">
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">
                Severity:
              </span>
              <span className={cn('text-[11px] font-semibold capitalize', severityColor)}>
                {result.severity}
              </span>
            </div>
          )}

          {result.root_cause && (
            <div>
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">
                Root Cause
              </span>
              <p className="text-[12px] text-[#1a1a1a] mt-[4px] leading-[16px]">
                {result.root_cause}
              </p>
            </div>
          )}

          {result.suggestions && result.suggestions.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">
                Suggestions
              </span>
              <ul className="flex flex-col gap-[4px] mt-[4px]">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-[6px]">
                    <span className="text-[10px] text-[#acacac] mt-[2px] shrink-0">{i + 1}.</span>
                    <p className="text-[12px] text-[#6b6b6b] leading-[16px]">{s}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summarize Approvals
// ---------------------------------------------------------------------------

interface SummarizeApprovalsSectionProps {
  boardId: string;
}

function SummarizeApprovalsSection({ boardId }: SummarizeApprovalsSectionProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApprovalSummaryResult | null>(null);
  const [error, setError] = useState<unknown>(null);

  const handleSummarize = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiBoardAssist<ApprovalSummaryResult>(boardId, 'summarize-approvals');
      setResult(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-[10px]">
      <p className="text-[11px] text-[#9b978f] leading-[15px]">
        Generate a concise summary of all approval gates and their current status.
      </p>
      <button
        type="button"
        onClick={handleSummarize}
        disabled={loading}
        className={cn(
          'h-[32px] px-[14px] rounded-[8px] text-[11px] font-semibold flex items-center gap-[6px] transition-colors',
          loading
            ? 'bg-[#f0f0ec] text-[#acacac] cursor-not-allowed'
            : 'bg-[#4caf50] hover:bg-[#43a047] text-white',
        )}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckSquare size={12} />}
        {loading ? 'Summarizing…' : 'Summarize Approvals'}
      </button>

      {error && <ErrorDisplay error={error} />}

      {result && (
        <div className="flex flex-col gap-[8px] p-[10px] rounded-[8px] bg-[#fafaf8] border border-[#ece9e3]">
          {result.pending_count !== undefined && (
            <div className="flex items-center gap-[6px]">
              <span
                className={cn(
                  'text-[22px] font-bold',
                  result.pending_count > 0 ? 'text-[#ff9800]' : 'text-[#4caf50]',
                )}
              >
                {result.pending_count}
              </span>
              <span className="text-[11px] text-[#6b6b6b]">approvals pending</span>
            </div>
          )}

          {result.summary && (
            <p className="text-[12px] text-[#1a1a1a] leading-[17px]">{result.summary}</p>
          )}

          {result.items && result.items.length > 0 && (
            <div className="flex flex-col gap-[4px]">
              <span className="text-[10px] font-semibold text-[#acacac] uppercase tracking-[0.5px]">
                Items
              </span>
              {result.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-[8px] py-[4px] border-t border-[#ece9e3]"
                >
                  <span
                    className={cn(
                      'w-[6px] h-[6px] rounded-full shrink-0',
                      item.status === 'approved'
                        ? 'bg-[#4caf50]'
                        : item.status === 'rejected'
                          ? 'bg-[#e74c3c]'
                          : 'bg-[#ff9800]',
                    )}
                  />
                  <span className="text-[11px] text-[#1a1a1a] flex-1 truncate">
                    {item.description}
                  </span>
                  <span className="text-[10px] text-[#9b978f] capitalize shrink-0">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BoardAssistPanel
// ---------------------------------------------------------------------------

export interface BoardAssistPanelProps {
  boardId: string;
}

export default function BoardAssistPanel({ boardId }: BoardAssistPanelProps) {
  return (
    <div className="bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] p-[20px] flex flex-col gap-[0px]">
      {/* Panel header */}
      <div className="flex items-center gap-[8px] mb-[16px]">
        <Sparkles size={15} className="text-[#ff9800]" />
        <span className="text-[14px] font-semibold text-[#1a1a1a]">Board Assist</span>
        <span className="h-[18px] px-[8px] rounded-full bg-[#fff3e0] text-[#ff9800] text-[10px] font-medium inline-flex items-center">
          AI
        </span>
      </div>

      <p className="text-[11px] text-[#9b978f] leading-[15px] mb-[16px]">
        AI-powered tools to help plan, analyze, and summarize your board's progress.
      </p>

      {/* Sections */}
      <div className="flex flex-col gap-[14px]">
        <Section
          title="Draft Intent"
          icon={<Sparkles size={14} />}
          defaultOpen={true}
        >
          <DraftIntentSection boardId={boardId} />
        </Section>

        <Section
          title="Recommend Tools"
          icon={<Wrench size={14} />}
        >
          <RecommendToolsSection boardId={boardId} />
        </Section>

        <Section
          title="Analyze Failure"
          icon={<AlertTriangle size={14} />}
        >
          <AnalyzeFailureSection boardId={boardId} />
        </Section>

        <Section
          title="Summarize Approvals"
          icon={<CheckSquare size={14} />}
        >
          <SummarizeApprovalsSection boardId={boardId} />
        </Section>
      </div>
    </div>
  );
}
