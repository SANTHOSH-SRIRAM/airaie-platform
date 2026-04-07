import { cn } from '@utils/cn';
import ProgressBar from '@components/ui/ProgressBar';

/* ---------- Types ---------- */

interface ToolScoreRow {
  toolRef: string;
  scores: {
    compatibility: number;
    trust: number;
    cost: number;
    latency: number;
    reliability: number;
  };
  weights: {
    compatibility: number;
    trust: number;
    cost: number;
    latency: number;
    reliability: number;
  };
  algorithmicScore: number;
  llmScore: number;
  finalScore: number;
  selected: boolean;
}

/* ---------- Mock Data ---------- */

const MOCK_TOOL_SCORES: ToolScoreRow[] = [
  {
    toolRef: 'mesh-generator@1.0',
    scores: { compatibility: 0.95, trust: 0.90, cost: 0.85, latency: 0.80, reliability: 0.92 },
    weights: { compatibility: 0.30, trust: 0.25, cost: 0.20, latency: 0.15, reliability: 0.10 },
    algorithmicScore: 0.89,
    llmScore: 0.91,
    finalScore: 0.90,
    selected: false,
  },
  {
    toolRef: 'fea-solver@2.1',
    scores: { compatibility: 0.93, trust: 0.88, cost: 0.70, latency: 0.65, reliability: 0.90 },
    weights: { compatibility: 0.30, trust: 0.25, cost: 0.20, latency: 0.15, reliability: 0.10 },
    algorithmicScore: 0.83,
    llmScore: 0.92,
    finalScore: 0.87,
    selected: true,
  },
  {
    toolRef: 'result-analyzer@1.0',
    scores: { compatibility: 0.90, trust: 0.92, cost: 0.95, latency: 0.88, reliability: 0.94 },
    weights: { compatibility: 0.30, trust: 0.25, cost: 0.20, latency: 0.15, reliability: 0.10 },
    algorithmicScore: 0.91,
    llmScore: 0.89,
    finalScore: 0.90,
    selected: false,
  },
  {
    toolRef: 'material-db@1.2',
    scores: { compatibility: 0.50, trust: 0.60, cost: 0.95, latency: 0.92, reliability: 0.55 },
    weights: { compatibility: 0.30, trust: 0.25, cost: 0.20, latency: 0.15, reliability: 0.10 },
    algorithmicScore: 0.65,
    llmScore: 0.42,
    finalScore: 0.38,
    selected: false,
  },
];

/* ---------- Helpers ---------- */

const DIMENSION_KEYS = ['compatibility', 'trust', 'cost', 'latency', 'reliability'] as const;
function scoreColor(score: number): string {
  if (score >= 0.7) return 'text-green-50';
  if (score >= 0.4) return 'text-yellow-30';
  return 'text-red-50';
}

function scoreBgColor(score: number): string {
  if (score >= 0.7) return 'bg-green-20';
  if (score >= 0.4) return 'bg-yellow-20/30';
  return 'bg-red-20';
}

function scoreVariant(score: number): 'green' | 'amber' | 'red' {
  if (score >= 0.7) return 'green';
  if (score >= 0.4) return 'amber';
  return 'red';
}

/* ---------- Component ---------- */

export default function ScoringBreakdownPanel() {
  const toolScores = MOCK_TOOL_SCORES;

  return (
    <div data-testid="scoring-breakdown-panel" className="p-3 space-y-4">
      <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase">
        TOOL SCORING BREAKDOWN
      </p>

      {/* Per-tool rows */}
      {toolScores.map((tool) => (
        <div
          key={tool.toolRef}
          data-testid="scoring-tool-row"
          className={cn(
            'rounded-lg border p-3 transition-colors',
            tool.selected
              ? 'border-brand-primary bg-blue-20/30 ring-1 ring-brand-primary'
              : 'border-cds-border-subtle bg-card-bg',
          )}
        >
          {/* Tool header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-cds-text-primary">{tool.toolRef}</span>
              {tool.selected && (
                <span className="inline-flex items-center px-1.5 h-5 rounded-full bg-brand-primary text-white text-[10px] font-medium">
                  Selected
                </span>
              )}
            </div>
            <span
              className={cn(
                'inline-flex items-center px-2 h-5 rounded-full text-[10px] font-medium',
                scoreBgColor(tool.finalScore),
                scoreColor(tool.finalScore),
              )}
            >
              {Math.round(tool.finalScore * 100)}%
            </span>
          </div>

          {/* Dimension scores */}
          <div className="space-y-1.5">
            {DIMENSION_KEYS.map((dim) => {
              const score = tool.scores[dim];
              const weight = tool.weights[dim];
              return (
                <div key={dim} className="flex items-center gap-2">
                  <span className="text-[10px] text-cds-text-secondary w-20 capitalize shrink-0">
                    {dim}
                  </span>
                  <div className="flex-1">
                    <ProgressBar
                      value={Math.round(score * 100)}
                      max={100}
                      variant={scoreVariant(score)}
                      size="sm"
                      showPercent={false}
                    />
                  </div>
                  <span className={cn('text-[10px] font-mono w-8 text-right', scoreColor(score))}>
                    {(score).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-cds-text-placeholder w-8 text-right">
                    x{weight.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* LLM vs Algorithmic comparison */}
          <div className="mt-3 pt-2 border-t border-cds-border-subtle">
            <p className="text-[10px] font-medium tracking-wider text-cds-text-secondary uppercase mb-1.5">
              LLM vs ALGORITHMIC
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cds-text-secondary">Algorithmic</span>
                <span className={cn('text-xs font-medium', scoreColor(tool.algorithmicScore))}>
                  {Math.round(tool.algorithmicScore * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cds-text-secondary">LLM</span>
                <span className={cn('text-xs font-medium', scoreColor(tool.llmScore))}>
                  {Math.round(tool.llmScore * 100)}%
                </span>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-gray-20 overflow-hidden flex">
                <div
                  className="h-full bg-blue-60"
                  style={{ width: `${Math.round(tool.algorithmicScore * 100)}%` }}
                  title={`Algorithmic: ${Math.round(tool.algorithmicScore * 100)}%`}
                />
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-gray-20 overflow-hidden flex">
                <div
                  className="h-full bg-purple-60"
                  style={{ width: `${Math.round(tool.llmScore * 100)}%` }}
                  title={`LLM: ${Math.round(tool.llmScore * 100)}%`}
                />
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-cds-text-placeholder">
              <span>Algorithmic</span>
              <span>LLM</span>
            </div>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-cds-border-subtle">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-50" />
          <span className="text-[10px] text-cds-text-secondary">&gt;0.7</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-30" />
          <span className="text-[10px] text-cds-text-secondary">0.4-0.7</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-50" />
          <span className="text-[10px] text-cds-text-secondary">&lt;0.4</span>
        </div>
      </div>
    </div>
  );
}
