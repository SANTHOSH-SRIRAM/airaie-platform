import { useState, useCallback } from 'react';
import { Play, Loader2, CheckCircle, XCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import Badge from '@components/ui/Badge';
import Button from '@components/ui/Button';
import EvalSummary from '@components/agents/eval/EvalSummary';
import type { EvalRunSummary } from '@components/agents/eval/EvalSummary';
import { cn } from '@utils/cn';

/* ---------- Types ---------- */

interface EvalTestCase {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'pass' | 'fail' | 'error';
  score: number;
  cost: number;
  tools_used: string[];
  duration_ms: number;
}

interface EvalTabProps {
  agentId: string;
}

/* ---------- Mock Data ---------- */

const MOCK_TEST_CASES: EvalTestCase[] = [
  {
    id: 'eval_1',
    name: 'Bracket FEA with standard load',
    status: 'pending',
    score: 0,
    cost: 0,
    tools_used: [],
    duration_ms: 0,
  },
  {
    id: 'eval_2',
    name: 'Topology optimization for weight reduction',
    status: 'pending',
    score: 0,
    cost: 0,
    tools_used: [],
    duration_ms: 0,
  },
  {
    id: 'eval_3',
    name: 'Multi-material stress analysis',
    status: 'pending',
    score: 0,
    cost: 0,
    tools_used: [],
    duration_ms: 0,
  },
  {
    id: 'eval_4',
    name: 'Edge case: zero-thickness geometry',
    status: 'pending',
    score: 0,
    cost: 0,
    tools_used: [],
    duration_ms: 0,
  },
];

const MOCK_COMPLETED: EvalTestCase[] = [
  {
    id: 'eval_1',
    name: 'Bracket FEA with standard load',
    status: 'pass',
    score: 0.94,
    cost: 0.85,
    tools_used: ['mesh-generator@1.0', 'fea-solver@2.1', 'result-analyzer@1.0'],
    duration_ms: 12400,
  },
  {
    id: 'eval_2',
    name: 'Topology optimization for weight reduction',
    status: 'pass',
    score: 0.88,
    cost: 1.20,
    tools_used: ['mesh-generator@1.0', 'fea-solver@2.1', 'result-analyzer@1.0', 'material-db@1.2'],
    duration_ms: 18700,
  },
  {
    id: 'eval_3',
    name: 'Multi-material stress analysis',
    status: 'fail',
    score: 0.52,
    cost: 0.95,
    tools_used: ['mesh-generator@1.0', 'fea-solver@2.1'],
    duration_ms: 9800,
  },
  {
    id: 'eval_4',
    name: 'Edge case: zero-thickness geometry',
    status: 'error',
    score: 0,
    cost: 0.30,
    tools_used: ['mesh-generator@1.0'],
    duration_ms: 3200,
  },
];

/* ---------- Helpers ---------- */

function computeSummary(cases: EvalTestCase[]): EvalRunSummary {
  const passed = cases.filter((c) => c.status === 'pass').length;
  const failed = cases.filter((c) => c.status === 'fail').length;
  const errors = cases.filter((c) => c.status === 'error').length;
  const total = cases.length;
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const scoredCases = cases.filter((c) => c.status === 'pass' || c.status === 'fail');
  const avgScore = scoredCases.length > 0 ? scoredCases.reduce((s, c) => s + c.score, 0) / scoredCases.length : 0;
  const avgCost = total > 0 ? cases.reduce((s, c) => s + c.cost, 0) / total : 0;
  const totalDuration = cases.reduce((s, c) => s + c.duration_ms, 0);

  return { total, passed, failed, errors, pass_rate: passRate, avg_score: avgScore, avg_cost: avgCost, total_duration_ms: totalDuration };
}

const statusConfig = {
  pending: { icon: null, badgeVariant: 'default' as const, label: 'Pending' },
  running: { icon: Loader2, badgeVariant: 'info' as const, label: 'Running' },
  pass: { icon: CheckCircle, badgeVariant: 'success' as const, label: 'Pass' },
  fail: { icon: XCircle, badgeVariant: 'danger' as const, label: 'Fail' },
  error: { icon: AlertTriangle, badgeVariant: 'warning' as const, label: 'Error' },
};

/* ---------- Component ---------- */

export default function EvalTab({ agentId: _agentId }: EvalTabProps) {
  const [testCases, setTestCases] = useState<EvalTestCase[]>(MOCK_TEST_CASES);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runEvaluation = useCallback(() => {
    setIsRunning(true);
    setHasRun(false);

    // Simulate running each test case progressively
    const cases = [...MOCK_TEST_CASES];
    let currentIndex = 0;

    const runNext = () => {
      if (currentIndex < cases.length) {
        // Set current case to running
        cases[currentIndex] = { ...cases[currentIndex], status: 'running' };
        setTestCases([...cases]);

        setTimeout(() => {
          // Replace with completed result
          cases[currentIndex] = MOCK_COMPLETED[currentIndex];
          setTestCases([...cases]);
          currentIndex++;
          runNext();
        }, 800 + Math.random() * 600);
      } else {
        setIsRunning(false);
        setHasRun(true);
      }
    };

    runNext();
  }, []);

  const resetEval = () => {
    setTestCases(MOCK_TEST_CASES);
    setIsRunning(false);
    setHasRun(false);
  };

  const summary = hasRun ? computeSummary(testCases) : null;

  // Find max score for bar chart scaling
  const maxScore = Math.max(...testCases.map((c) => c.score), 1);

  return (
    <div data-testid="eval-tab" className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-cds-border-subtle shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-cds-text-primary">Agent Evaluation</h2>
          <p className="text-xs text-cds-text-secondary mt-0.5">
            Run test cases to evaluate agent performance ({testCases.length} cases)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasRun && (
            <Button
              data-testid="eval-reset-btn"
              variant="ghost"
              size="sm"
              icon={<RotateCcw />}
              onClick={resetEval}
            >
              Reset
            </Button>
          )}
          <Button
            data-testid="eval-run-btn"
            variant="primary"
            size="sm"
            icon={isRunning ? <Loader2 className="animate-spin" /> : <Play />}
            onClick={runEvaluation}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : 'Run Evaluation'}
          </Button>
        </div>
      </div>

      {/* Summary (after run) */}
      {summary && (
        <div className="px-6 py-4 border-b border-cds-border-subtle">
          <EvalSummary summary={summary} />
        </div>
      )}

      {/* Test Cases Table */}
      <div className="flex-1 px-6 py-4">
        <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-2">
          TEST CASES
        </p>

        {/* Table Header */}
        <div className="grid grid-cols-[1fr_5rem_8rem_5rem_1fr] gap-2 items-center px-3 py-1.5 text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase border-b border-cds-border-subtle">
          <span>Case Name</span>
          <span>Status</span>
          <span>Score</span>
          <span>Cost</span>
          <span>Tools Used</span>
        </div>

        {/* Table Rows */}
        {testCases.map((tc) => {
          const config = statusConfig[tc.status];
          const StatusIcon = config.icon;

          return (
            <div
              key={tc.id}
              data-testid="eval-test-case-row"
              className="grid grid-cols-[1fr_5rem_8rem_5rem_1fr] gap-2 items-center px-3 py-2.5 border-b border-cds-border-subtle"
            >
              {/* Name */}
              <span className="text-xs text-cds-text-primary truncate">{tc.name}</span>

              {/* Status */}
              <span className="flex items-center gap-1">
                {StatusIcon && (
                  <StatusIcon
                    className={cn(
                      'w-3.5 h-3.5',
                      tc.status === 'running' && 'animate-spin text-blue-60',
                      tc.status === 'pass' && 'text-green-50',
                      tc.status === 'fail' && 'text-red-50',
                      tc.status === 'error' && 'text-yellow-30',
                    )}
                  />
                )}
                <Badge variant={config.badgeVariant}>{config.label}</Badge>
              </span>

              {/* Score - bar chart */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-20 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      tc.score >= 0.8 ? 'bg-green-50' : tc.score >= 0.5 ? 'bg-yellow-30' : tc.score > 0 ? 'bg-red-50' : 'bg-gray-30',
                    )}
                    style={{ width: tc.score > 0 ? `${(tc.score / maxScore) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-[10px] text-cds-text-secondary w-8 text-right">
                  {tc.score > 0 ? tc.score.toFixed(2) : '-'}
                </span>
              </div>

              {/* Cost */}
              <span className="text-xs text-cds-text-primary">
                {tc.cost > 0 ? `$${tc.cost.toFixed(2)}` : '-'}
              </span>

              {/* Tools used */}
              <div className="flex items-center gap-1 overflow-hidden">
                {tc.tools_used.length === 0 ? (
                  <span className="text-xs text-cds-text-placeholder">-</span>
                ) : (
                  tc.tools_used.map((tool) => (
                    <Badge key={tool} variant="default" badgeStyle="outline">
                      {tool.split('@')[0]}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Score Bar Chart */}
      {hasRun && (
        <div className="px-6 py-4 border-t border-cds-border-subtle">
          <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-3">
            SCORE DISTRIBUTION
          </p>
          <div className="flex items-end gap-3 h-24">
            {testCases.map((tc) => {
              const barHeight = tc.score > 0 ? Math.max((tc.score / 1.0) * 100, 5) : 5;
              return (
                <div key={tc.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-cds-text-secondary">
                    {tc.score > 0 ? tc.score.toFixed(2) : '-'}
                  </span>
                  <div
                    className={cn(
                      'w-full rounded-t transition-all duration-500',
                      tc.status === 'pass' ? 'bg-green-50' : tc.status === 'fail' ? 'bg-red-50' : tc.status === 'error' ? 'bg-yellow-30' : 'bg-gray-30',
                    )}
                    style={{ height: `${barHeight}%` }}
                  />
                  <span className="text-[9px] text-cds-text-secondary truncate max-w-full text-center">
                    {tc.name.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
