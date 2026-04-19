import { useState, useCallback } from 'react';
import { Play, Loader2, CheckCircle, XCircle, AlertTriangle, RotateCcw, FlaskConical, Filter, Download } from 'lucide-react';
import Badge from '@components/ui/Badge';
import Button from '@components/ui/Button';
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

/* ---------- Subtitle mapping (visual-only) ---------- */

const CASE_SUBTITLES: Record<string, string> = {
  eval_1: 'Baseline validation scenario',
  eval_2: 'Optimization branch behavior',
  eval_3: 'Mixed material decision quality',
  eval_4: 'Failure handling and escalation path',
};

/* ---------- Status config ---------- */

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

  // Derived header chip text — always uses tokenized palette (no new colors).
  const runningCount = testCases.filter((c) => c.status === 'running').length;
  const passCount = testCases.filter((c) => c.status === 'pass').length;
  const failCount = testCases.filter((c) => c.status === 'fail' || c.status === 'error').length;

  let statusChipText = 'All pending';
  if (isRunning) {
    statusChipText = `${Math.max(runningCount, 1)} running`;
  } else if (hasRun) {
    statusChipText = `${passCount} pass · ${failCount} fail`;
  }

  return (
    <div data-testid="eval-tab" className="flex flex-col h-full overflow-y-auto bg-surface-bg">
      <div className="mx-auto w-full max-w-5xl px-10 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold text-content-primary">Agent Evaluation</h1>
            <p className="text-sm text-content-secondary mt-1">
              Run test cases to evaluate agent performance ({testCases.length} cases)
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Status chips */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs',
                'bg-brand-primary-muted text-content-secondary',
              )}
            >
              <span aria-hidden="true">•</span>
              {statusChipText}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs',
                'border border-border text-content-secondary',
              )}
            >
              <span aria-hidden="true">○</span>
              Policy ready
            </span>

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
              icon={isRunning ? <Loader2 className="animate-spin" /> : <FlaskConical />}
              onClick={runEvaluation}
              disabled={isRunning}
            >
              {isRunning ? 'Running...' : 'Run Evaluation'}
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border-subtle" />

        {/* Evaluation Cases section */}
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-content-primary">Evaluation Cases</h2>
              <p className="text-xs text-content-secondary mt-0.5">
                Core evaluation matrix for this session
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs',
                  'border border-border text-content-primary',
                  'hover:bg-surface-hover transition-colors',
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                Filter
              </button>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs',
                  'border border-border text-content-primary',
                  'hover:bg-surface-hover transition-colors',
                )}
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div>
            {/* Table header */}
            <div
              className={cn(
                'grid grid-cols-[minmax(0,2.2fr)_7rem_6rem_6rem_minmax(0,1.4fr)] gap-4 items-center',
                'px-3 py-2',
                'text-2xs font-medium tracking-wider text-content-secondary uppercase',
                'border-b border-border-subtle',
              )}
            >
              <span>Case Name</span>
              <span>Status</span>
              <span>Score</span>
              <span>Cost</span>
              <span>Tools Used</span>
            </div>

            {/* Table rows */}
            {testCases.map((tc) => {
              const config = statusConfig[tc.status];
              const StatusIcon = config.icon;
              const subtitle = CASE_SUBTITLES[tc.id] ?? '';

              return (
                <div
                  key={tc.id}
                  data-testid="eval-test-case-row"
                  className={cn(
                    'grid grid-cols-[minmax(0,2.2fr)_7rem_6rem_6rem_minmax(0,1.4fr)] gap-4 items-center',
                    'px-3 py-4 border-b border-border-subtle',
                  )}
                >
                  {/* Name + subtitle */}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-content-primary truncate">
                      {tc.name}
                    </div>
                    {subtitle && (
                      <div className="text-xs text-content-secondary mt-0.5 truncate">
                        {subtitle}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    {tc.status === 'pending' ? (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs',
                          'bg-brand-primary-muted text-content-primary',
                        )}
                      >
                        Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
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
                    )}
                  </div>

                  {/* Score */}
                  <div>
                    {tc.score > 0 ? (
                      <span className="font-mono text-xs text-content-primary">
                        {tc.score.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-content-placeholder">—</span>
                    )}
                  </div>

                  {/* Cost */}
                  <div>
                    {tc.cost > 0 ? (
                      <span className="font-mono text-xs text-content-primary">
                        ${tc.cost.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-content-placeholder">—</span>
                    )}
                  </div>

                  {/* Tools used */}
                  <div className="flex flex-wrap items-center gap-1 min-w-0">
                    {tc.tools_used.length === 0 ? (
                      <span className="text-content-placeholder">—</span>
                    ) : (
                      tc.tools_used.map((tool) => (
                        <Badge
                          key={tool}
                          variant="default"
                          badgeStyle="outline"
                          className="font-mono text-2xs"
                        >
                          {tool.split('@')[0]}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
