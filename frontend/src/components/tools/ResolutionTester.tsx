import { useState, useCallback } from 'react';
import { Search, Star, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';
import Input from '@components/ui/Input';
import { useResolveTools } from '@hooks/useTools';
import type { ToolShelfEntry, UnavailableEntry } from '@api/tools';
import { cn } from '@utils/cn';

/* ---------- Sub-components ---------- */

function RecommendedCard({ entry }: { entry: ToolShelfEntry }) {
  return (
    <div className="border border-green-50 bg-green-20/20 p-4 rounded space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-green-60" />
          <span className="text-sm font-semibold text-cds-text-primary">{entry.name}</span>
        </div>
        <Badge variant="success">Recommended</Badge>
      </div>
      <div className="grid grid-cols-4 gap-3 text-xs text-cds-text-secondary">
        <div>
          <span className="block text-cds-text-helper">Score</span>
          <span className="font-medium text-cds-text-primary">{entry.score.toFixed(2)}</span>
        </div>
        <div>
          <span className="block text-cds-text-helper">Confidence</span>
          <span className="font-medium text-cds-text-primary">{(entry.confidence * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="block text-cds-text-helper">Success Rate</span>
          <span className="font-medium text-cds-text-primary">{(entry.success_rate * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="block text-cds-text-helper">Trust</span>
          <Badge variant="info" className="text-[10px] h-5">{entry.trust_level}</Badge>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-cds-text-secondary">
        <span>~${entry.cost_estimate.toFixed(2)}</span>
        <span className="text-cds-text-placeholder">/</span>
        <span>{entry.time_estimate}</span>
      </div>
      {entry.match_reasons.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {entry.match_reasons.map((reason) => (
            <Badge key={reason} variant="default" className="text-[10px] h-5">
              {reason}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function AlternativeRow({ entry }: { entry: ToolShelfEntry }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-cds-layer-01 rounded">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-cds-text-primary font-medium truncate">{entry.name}</span>
        <Badge variant="info" badgeStyle="outline" className="text-[10px] h-5 shrink-0">
          v{entry.tool_version}
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-xs text-cds-text-secondary shrink-0">
        <span>Score: {entry.score.toFixed(2)}</span>
        <span>{(entry.confidence * 100).toFixed(0)}%</span>
        <span>~${entry.cost_estimate.toFixed(2)}</span>
      </div>
    </div>
  );
}

function UnavailableRow({ entry }: { entry: UnavailableEntry }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-red-20/10 rounded">
      <div className="flex items-center gap-2 min-w-0">
        <XCircle size={14} className="text-red-50 shrink-0" />
        <span className="text-sm text-cds-text-secondary truncate">{entry.name}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-cds-text-secondary shrink-0">
        <span className="text-red-60">{entry.reason}</span>
        <Badge variant="default" className="text-[10px] h-5">{entry.filter_stage}</Badge>
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

export default function ResolutionTester() {
  const [intentType, setIntentType] = useState('');
  const [constraintsJson, setConstraintsJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const resolve = useResolveTools();

  const handleResolve = useCallback(() => {
    setJsonError(null);

    let constraints: Record<string, unknown> | undefined;
    if (constraintsJson.trim()) {
      try {
        constraints = JSON.parse(constraintsJson);
      } catch {
        setJsonError('Invalid JSON in constraints field');
        return;
      }
    }

    resolve.mutate({
      intent_type: intentType,
      constraints,
    });
  }, [intentType, constraintsJson, resolve]);

  const hasResults = resolve.isSuccess && resolve.data;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-cds-border-subtle">
        <h3 className="text-sm font-semibold text-cds-text-primary flex items-center gap-2">
          <Search size={16} className="text-cds-icon-secondary" />
          Resolution Tester
        </h3>
        <p className="text-xs text-cds-text-helper mt-0.5">
          Test which tools the resolver recommends for a given intent type.
        </p>
      </div>

      {/* Form */}
      <div className="px-4 py-4 space-y-3 border-b border-cds-border-subtle">
        <Input
          id="intent-type"
          label="Intent Type"
          placeholder="e.g. sim.fea, sim.cfd, analysis.tolerance"
          value={intentType}
          onChange={(e) => setIntentType(e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="constraints-json" className="text-xs text-cds-text-secondary tracking-wide">
            Constraints (optional JSON)
          </label>
          <textarea
            id="constraints-json"
            className={cn(
              'w-full h-20 px-4 py-2 bg-cds-field-01 text-xs text-cds-text-primary font-mono',
              'placeholder:text-cds-text-placeholder',
              'border-0 border-b border-cds-border-strong',
              'focus:outline-2 focus:outline-cds-focus focus:outline-offset-[-2px] resize-none',
              jsonError && 'border-b-2 border-cds-support-error',
            )}
            placeholder='{"max_cost": 1.0, "trust_level": "verified"}'
            value={constraintsJson}
            onChange={(e) => {
              setConstraintsJson(e.target.value);
              if (jsonError) setJsonError(null);
            }}
          />
          {jsonError && (
            <p className="text-xs text-cds-text-error" role="alert">
              {jsonError}
            </p>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={resolve.isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          disabled={!intentType.trim() || resolve.isPending}
          onClick={handleResolve}
        >
          {resolve.isPending ? 'Resolving...' : 'Resolve'}
        </Button>

        {resolve.isError && (
          <div className="p-3 bg-red-20 text-red-80 text-xs rounded flex items-center gap-2" role="alert">
            <AlertTriangle size={14} />
            {resolve.error instanceof Error ? resolve.error.message : 'Resolution failed'}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!hasResults && !resolve.isPending && (
          <p className="text-xs text-cds-text-placeholder text-center py-8">
            Enter an intent type and click Resolve to test tool resolution.
          </p>
        )}

        {hasResults && (
          <>
            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-cds-text-secondary">
              <Badge variant="info" badgeStyle="outline" className="text-[10px] h-5">
                {resolve.data.intent_type}
              </Badge>
              <span>Resolved at {new Date(resolve.data.resolved_at).toLocaleTimeString()}</span>
            </div>

            {/* Recommended */}
            {resolve.data.recommended ? (
              <RecommendedCard entry={resolve.data.recommended} />
            ) : (
              <div className="p-4 bg-yellow-20/20 border border-yellow-30 rounded text-xs text-cds-text-secondary flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-30" />
                No recommended tool found for this intent type.
              </div>
            )}

            {/* Alternatives */}
            {resolve.data.alternatives.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-cds-text-secondary">
                  Alternatives ({resolve.data.alternatives.length})
                </h4>
                {resolve.data.alternatives.map((alt) => (
                  <AlternativeRow key={`${alt.tool_id}-${alt.tool_version}`} entry={alt} />
                ))}
              </div>
            )}

            {/* Unavailable */}
            {resolve.data.unavailable.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-cds-text-secondary">
                  Unavailable ({resolve.data.unavailable.length})
                </h4>
                {resolve.data.unavailable.map((u) => (
                  <UnavailableRow key={u.tool_id} entry={u} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
