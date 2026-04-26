import { useState, useCallback, useEffect } from 'react';
import type { AgentSpec, AgentToolPermission } from '@api/agents';

/* ---------- Helpers ---------- */

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'local', label: 'Local' },
] as const;

const MODELS: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: 'claude-sonnet', label: 'Claude Sonnet' },
    { value: 'claude-opus', label: 'Claude Opus' },
  ],
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
  ],
  local: [
    { value: 'llama-3', label: 'Llama 3' },
  ],
};

const STRATEGIES = [
  { value: 'weighted', label: 'Weighted' },
  { value: 'priority', label: 'Priority' },
  { value: 'cost_optimized', label: 'Cost Optimized' },
] as const;

const APPROVAL_OPTIONS = ['write', 'delete', 'high-cost'] as const;

const ESCALATION_ACTIONS = [
  { value: 'require_approval', label: 'Require Approval' },
  { value: 'escalate_to_human', label: 'Escalate to Human' },
  { value: 'abort', label: 'Abort Run' },
] as const;

function defaultSpec(): AgentSpec {
  return {
    api_version: 'airaie.agentspec/v1',
    kind: 'AgentSpec',
    metadata: { name: '', version: '1.0.0', owner: '', domain_tags: [] },
    goal: '',
    tools: [],
    scoring: {
      strategy: 'weighted',
      llm_weight: 0.3,
      weights: { compatibility: 0.25, trust: 0.25, cost: 0.2, latency: 0.15, reliability: 0.15 },
      min_score_threshold: 0.5,
      risk_penalty_weight: 0.2,
    },
    constraints: {
      max_tools_per_run: 5,
      timeout_seconds: 300,
      max_retries: 2,
      budget_limit: 10.0,
    },
    policy: {
      auto_approve_threshold: 0.85,
      require_approval_for: [],
      escalation_rules: [],
    },
    model: {
      provider: 'anthropic',
      model: 'claude-sonnet',
    },
  };
}

/* ---------- Props ---------- */

interface AgentSpecFormProps {
  spec: AgentSpec | null;
  onChange: (spec: AgentSpec) => void;
  readOnly?: boolean;
}

/* ---------- Component ---------- */

// Like AgentSpec, but with the sub-objects the form always edits required.
type FormSpec = AgentSpec & {
  scoring: NonNullable<AgentSpec['scoring']>;
  constraints: NonNullable<AgentSpec['constraints']>;
  policy: NonNullable<AgentSpec['policy']>;
};

function normalizeSpec(spec: AgentSpec): FormSpec {
  const d = defaultSpec();
  return {
    ...spec,
    scoring: { ...d.scoring!, ...(spec.scoring ?? {}) },
    constraints: { ...d.constraints!, ...(spec.constraints ?? {}) },
    policy: { ...d.policy!, ...(spec.policy ?? {}) },
    model: spec.model ?? d.model,
  } as FormSpec;
}

export default function AgentSpecForm({ spec, onChange, readOnly = false }: AgentSpecFormProps) {
  const [local, setLocal] = useState<FormSpec>(() => normalizeSpec(spec ?? defaultSpec()));

  // Sync external spec changes
  useEffect(() => {
    if (spec) setLocal(normalizeSpec(spec));
  }, [spec]);

  const update = useCallback(
    (patch: Partial<AgentSpec>) => {
      setLocal((prev) => {
        const next = { ...prev, ...patch };
        onChange(next);
        return next;
      });
    },
    [onChange],
  );

  const sectionClass = 'rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900';
  const labelClass = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1';
  const inputClass =
    'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:disabled:bg-zinc-800';
  const btnClass =
    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors';
  const btnPrimary = `${btnClass} bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50`;
  const btnDanger = `${btnClass} bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900`;

  /* ---------- Goal Section ---------- */
  const GoalSection = (
    <div className={sectionClass}>
      <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">Goal</h3>
      <label className={labelClass}>
        Agent objective
        <span className="ml-1 text-xs text-zinc-400">({local.goal.length}/500)</span>
      </label>
      <textarea
        className={`${inputClass} min-h-[80px] resize-y`}
        value={local.goal}
        onChange={(e) => {
          if (e.target.value.length <= 500) update({ goal: e.target.value });
        }}
        placeholder="Describe what this agent should accomplish..."
        disabled={readOnly}
        maxLength={500}
        rows={3}
      />
    </div>
  );

  /* ---------- Model Section ---------- */
  const provider = local.model?.provider ?? 'anthropic';
  const availableModels = MODELS[provider] ?? [];

  const ModelSection = (
    <div className={sectionClass}>
      <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">Model</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Provider</label>
          <select
            className={inputClass}
            value={provider}
            onChange={(e) =>
              update({
                model: {
                  provider: e.target.value,
                  model: MODELS[e.target.value]?.[0]?.value ?? '',
                },
              })
            }
            disabled={readOnly}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Model</label>
          <select
            className={inputClass}
            value={local.model?.model ?? ''}
            onChange={(e) =>
              update({ model: { provider: local.model?.provider ?? 'anthropic', model: e.target.value } })
            }
            disabled={readOnly}
          >
            {availableModels.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>
            LLM Weight
            <span className="ml-2 text-xs font-normal text-zinc-500">
              {(local.scoring.llm_weight ?? 0).toFixed(2)}
            </span>
          </label>
          <input
            type="range"
            className="mt-2 w-full accent-blue-600"
            min={0}
            max={1}
            step={0.05}
            value={local.scoring.llm_weight ?? 0}
            onChange={(e) =>
              update({
                scoring: { ...local.scoring, llm_weight: parseFloat(e.target.value) },
              })
            }
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );

  /* ---------- Tools Section ---------- */
  const addTool = () => {
    const newTool: AgentToolPermission = { tool_ref: '', permissions: ['read'], max_invocations: 3 };
    update({ tools: [...local.tools, newTool] });
  };

  const updateTool = (index: number, patch: Partial<AgentToolPermission>) => {
    const updated = local.tools.map((t, i) => (i === index ? { ...t, ...patch } : t));
    update({ tools: updated });
  };

  const removeTool = (index: number) => {
    update({ tools: local.tools.filter((_, i) => i !== index) });
  };

  const togglePermission = (index: number, perm: string) => {
    const tool = local.tools[index];
    const perms = tool.permissions.includes(perm)
      ? tool.permissions.filter((p) => p !== perm)
      : [...tool.permissions, perm];
    updateTool(index, { permissions: perms });
  };

  const ToolsSection = (
    <div className={sectionClass}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Tools</h3>
        {!readOnly && (
          <button type="button" className={btnPrimary} onClick={addTool}>
            + Add Tool
          </button>
        )}
      </div>
      {local.tools.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No tools configured. Add tools to define what this agent can use.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase text-zinc-500 dark:border-zinc-700">
                <th className="pb-2 pr-3">Tool Ref</th>
                <th className="pb-2 pr-3">Permissions</th>
                <th className="pb-2 pr-3">Max Invocations</th>
                {!readOnly && <th className="pb-2 w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {local.tools.map((tool, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-3">
                    <input
                      className={inputClass}
                      value={tool.tool_ref}
                      onChange={(e) => updateTool(idx, { tool_ref: e.target.value })}
                      placeholder="tool-name@version"
                      disabled={readOnly}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-3">
                      {(['read', 'write', 'execute'] as const).map((perm) => (
                        <label key={perm} className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          <input
                            type="checkbox"
                            className="rounded accent-blue-600"
                            checked={tool.permissions.includes(perm)}
                            onChange={() => togglePermission(idx, perm)}
                            disabled={readOnly}
                          />
                          {perm}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      className={`${inputClass} w-20`}
                      value={tool.max_invocations}
                      onChange={(e) => updateTool(idx, { max_invocations: parseInt(e.target.value, 10) || 1 })}
                      min={1}
                      max={100}
                      disabled={readOnly}
                    />
                  </td>
                  {!readOnly && (
                    <td className="py-2">
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => removeTool(idx)}
                        title="Remove tool"
                      >
                        x
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  /* ---------- Scoring Section ---------- */
  const WEIGHT_KEYS = ['compatibility', 'trust', 'cost', 'latency', 'reliability'] as const;
  type WeightKey = typeof WEIGHT_KEYS[number];

  const defaultWeights = { compatibility: 0.25, trust: 0.25, cost: 0.2, latency: 0.15, reliability: 0.15 };

  const updateWeight = (key: WeightKey, value: number) => {
    const current = { ...defaultWeights, ...local.scoring.weights };
    const others = Object.entries(current).filter(([k]) => k !== key) as [WeightKey, number][];
    const othersSum = others.reduce((s, [, v]) => s + v, 0);

    // Normalize other weights so total = 1.0
    const remaining = Math.max(0, 1 - value);
    const scale = othersSum > 0 ? remaining / othersSum : 0;
    const newWeights = { ...current };
    for (const [k, v] of others) {
      newWeights[k] = v * scale;
    }
    newWeights[key] = value;

    update({ scoring: { ...local.scoring, weights: newWeights } });
  };

  const weightsTotal = WEIGHT_KEYS.reduce(
    (sum, key) => sum + (local.scoring.weights?.[key] ?? defaultWeights[key]),
    0,
  );

  const ScoringSection = (
    <div className={sectionClass}>
      <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">Scoring</h3>
      <div className="mb-4">
        <label className={labelClass}>Strategy</label>
        <select
          className={`${inputClass} max-w-xs`}
          value={local.scoring.strategy}
          onChange={(e) =>
            update({
              scoring: {
                ...local.scoring,
                strategy: e.target.value as NonNullable<AgentSpec['scoring']>['strategy'],
              },
            })
          }
          disabled={readOnly}
        >
          {STRATEGIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {local.scoring.strategy === 'weighted' && (
        <div className="space-y-3">
          {WEIGHT_KEYS.map((key) => {
            const val = local.scoring.weights?.[key] ?? defaultWeights[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-28 text-sm capitalize text-zinc-600 dark:text-zinc-400">
                  {key}
                </span>
                <input
                  type="range"
                  className="flex-1 accent-blue-600"
                  min={0}
                  max={1}
                  step={0.05}
                  value={val}
                  onChange={(e) => updateWeight(key, parseFloat(e.target.value))}
                  disabled={readOnly}
                />
                <span className="w-12 text-right text-xs font-mono text-zinc-500">
                  {val.toFixed(2)}
                </span>
              </div>
            );
          })}
          <p className={`text-xs ${Math.abs(weightsTotal - 1) < 0.01 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            Total: {weightsTotal.toFixed(2)}
            {Math.abs(weightsTotal - 1) >= 0.01 && ' (must sum to 1.0)'}
          </p>
        </div>
      )}

      {/* Min Score Threshold */}
      <div className="mt-5">
        <label className={labelClass}>
          Min Score Threshold
          <span className="ml-2 text-xs font-normal text-zinc-500">
            {(local.scoring.min_score_threshold ?? 0.5).toFixed(2)}
          </span>
        </label>
        <input
          type="range"
          className="w-full max-w-sm accent-blue-600"
          min={0}
          max={1}
          step={0.05}
          value={local.scoring.min_score_threshold ?? 0.5}
          onChange={(e) =>
            update({
              scoring: { ...local.scoring, min_score_threshold: parseFloat(e.target.value) },
            })
          }
          disabled={readOnly}
        />
        <p className="mt-1 text-xs text-zinc-400">
          Tools scoring below this threshold will be excluded from selection.
        </p>
      </div>

      {/* Risk Penalty Weight */}
      <div className="mt-5">
        <label className={labelClass}>
          Risk Penalty Weight
          <span className="ml-2 text-xs font-normal text-zinc-500">
            {(local.scoring.risk_penalty_weight ?? 0.2).toFixed(2)}
          </span>
        </label>
        <input
          type="range"
          className="w-full max-w-sm accent-blue-600"
          min={0}
          max={1}
          step={0.05}
          value={local.scoring.risk_penalty_weight ?? 0.2}
          onChange={(e) =>
            update({
              scoring: { ...local.scoring, risk_penalty_weight: parseFloat(e.target.value) },
            })
          }
          disabled={readOnly}
        />
        <p className="mt-1 text-xs text-zinc-400">
          Penalty applied to high-risk tool invocations. 0 = no penalty, 1 = max penalty.
        </p>
      </div>
    </div>
  );

  /* ---------- Constraints Section ---------- */
  const ConstraintsSection = (
    <div className={sectionClass}>
      <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">Constraints</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Max Tools per Run</label>
          <input
            type="number"
            className={inputClass}
            value={local.constraints.max_tools_per_run ?? ''}
            onChange={(e) =>
              update({
                constraints: {
                  ...local.constraints,
                  max_tools_per_run: parseInt(e.target.value, 10) || undefined,
                },
              })
            }
            min={1}
            max={50}
            disabled={readOnly}
          />
        </div>
        <div>
          <label className={labelClass}>Timeout (seconds)</label>
          <input
            type="number"
            className={inputClass}
            value={local.constraints.timeout_seconds ?? ''}
            onChange={(e) =>
              update({
                constraints: {
                  ...local.constraints,
                  timeout_seconds: parseInt(e.target.value, 10) || undefined,
                },
              })
            }
            min={30}
            max={3600}
            disabled={readOnly}
          />
        </div>
        <div>
          <label className={labelClass}>Max Retries</label>
          <input
            type="number"
            className={inputClass}
            value={local.constraints.max_retries ?? ''}
            onChange={(e) =>
              update({
                constraints: {
                  ...local.constraints,
                  max_retries: parseInt(e.target.value, 10) || undefined,
                },
              })
            }
            min={0}
            max={10}
            disabled={readOnly}
          />
        </div>
        <div>
          <label className={labelClass}>Budget Limit (USD)</label>
          <input
            type="number"
            className={inputClass}
            value={local.constraints.budget_limit ?? ''}
            onChange={(e) =>
              update({
                constraints: {
                  ...local.constraints,
                  budget_limit: parseFloat(e.target.value) || undefined,
                },
              })
            }
            min={0}
            step={0.5}
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );

  /* ---------- Policy Section ---------- */
  const toggleApprovalFor = (item: string) => {
    const current = local.policy.require_approval_for ?? [];
    const next = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    update({ policy: { ...local.policy, require_approval_for: next } });
  };

  const addEscalationRule = () => {
    const rules = local.policy.escalation_rules ?? [];
    update({
      policy: {
        ...local.policy,
        escalation_rules: [...rules, { condition: '', action: 'require_approval' }],
      },
    });
  };

  const updateEscalationRule = (index: number, patch: Partial<{ condition: string; action: string }>) => {
    const rules = (local.policy.escalation_rules ?? []).map((r, i) =>
      i === index ? { ...r, ...patch } : r,
    );
    update({ policy: { ...local.policy, escalation_rules: rules } });
  };

  const removeEscalationRule = (index: number) => {
    const rules = (local.policy.escalation_rules ?? []).filter((_, i) => i !== index);
    update({ policy: { ...local.policy, escalation_rules: rules } });
  };

  const PolicySection = (
    <div className={sectionClass}>
      <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">Policy</h3>

      {/* Auto-approve threshold */}
      <div className="mb-5">
        <label className={labelClass}>
          Auto-approve Threshold
          <span className="ml-2 text-xs font-normal text-zinc-500">
            {(local.policy.auto_approve_threshold ?? 0).toFixed(2)}
          </span>
        </label>
        <input
          type="range"
          className="w-full max-w-sm accent-blue-600"
          min={0}
          max={1}
          step={0.05}
          value={local.policy.auto_approve_threshold}
          onChange={(e) =>
            update({
              policy: { ...local.policy, auto_approve_threshold: parseFloat(e.target.value) },
            })
          }
          disabled={readOnly}
        />
      </div>

      {/* Require approval for */}
      <div className="mb-5">
        <label className={labelClass}>Require Approval For</label>
        <div className="flex gap-4">
          {APPROVAL_OPTIONS.map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                className="rounded accent-blue-600"
                checked={local.policy.require_approval_for?.includes(opt) ?? false}
                onChange={() => toggleApprovalFor(opt)}
                disabled={readOnly}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {/* Escalation rules */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelClass}>Escalation Rules</label>
          {!readOnly && (
            <button type="button" className={btnPrimary} onClick={addEscalationRule}>
              + Add Rule
            </button>
          )}
        </div>
        {(local.policy.escalation_rules ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No escalation rules configured.</p>
        ) : (
          <div className="space-y-2">
            {(local.policy.escalation_rules ?? []).map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  value={rule.condition}
                  onChange={(e) => updateEscalationRule(idx, { condition: e.target.value })}
                  placeholder="e.g. cost > 5.0"
                  disabled={readOnly}
                />
                <select
                  className={`${inputClass} w-48`}
                  value={rule.action}
                  onChange={(e) => updateEscalationRule(idx, { action: e.target.value })}
                  disabled={readOnly}
                >
                  {ESCALATION_ACTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                {!readOnly && (
                  <button
                    type="button"
                    className={btnDanger}
                    onClick={() => removeEscalationRule(idx)}
                    title="Remove rule"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  /* ---------- Render ---------- */
  return (
    <div className="space-y-5">
      {GoalSection}
      {ModelSection}
      {ToolsSection}
      {ScoringSection}
      {ConstraintsSection}
      {PolicySection}
    </div>
  );
}
