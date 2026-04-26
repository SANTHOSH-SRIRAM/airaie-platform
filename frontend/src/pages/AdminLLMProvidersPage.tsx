import { RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { useLLMConfig, useLLMHealth } from '@hooks/useLLMProvider';
import Card from '@components/ui/Card';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';

/**
 * Admin → LLM Providers
 *
 * Read-only view of the gateway's active LLM provider config and runtime health.
 * Provider switching at runtime requires admin RBAC + secret-store integration
 * and is deferred to Phase F. For now operators set environment variables
 * before gateway start.
 *
 * TODO(Phase F): gate this page (and the sidebar entry) behind an admin role.
 */
export default function AdminLLMProvidersPage() {
  const configQ = useLLMConfig();
  const healthQ = useLLMHealth();

  const config = configQ.data;
  const health = healthQ.data;

  const dotColor = !health
    ? 'bg-gray-400'
    : !health.configured
      ? 'bg-red-500'
      : health.reachable
        ? 'bg-emerald-500'
        : 'bg-amber-500';

  const dotLabel = !health
    ? 'Loading…'
    : !health.configured
      ? 'Not configured'
      : health.reachable
        ? 'Healthy'
        : 'Configured but unreachable';

  return (
    <div className="flex flex-col gap-4 p-6 max-w-[960px] mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1a1a1a]">LLM Providers</h1>
          <p className="text-sm text-[#6b6b6b] mt-1">
            Active provider for agent reasoning, scoring, and explanations.
          </p>
        </div>
        <Button
          variant="tertiary"
          size="sm"
          icon={<RefreshCw className={healthQ.isFetching ? 'animate-spin' : ''} />}
          onClick={() => healthQ.refetch()}
          disabled={healthQ.isFetching}
        >
          Refresh
        </Button>
      </div>

      {/* Phase F notice */}
      <Card variant="outlined">
        <Card.Body className="flex items-start gap-3">
          <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-[#3a3a3a]">
            <strong>Provider switching at runtime is not yet supported.</strong> Set environment
            variables (<code className="font-mono text-[12px]">AIRAIE_LLM_PROVIDER</code>,{' '}
            <code className="font-mono text-[12px]">AIRAIE_LLM_MODEL</code>,{' '}
            <code className="font-mono text-[12px]">AIRAIE_LLM_API_KEY</code>) before gateway start
            to change the active provider.
          </div>
        </Card.Body>
      </Card>

      {/* Health card */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1a1a1a]">Status</h2>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} aria-hidden="true" />
              <span className="text-xs text-[#6b6b6b]">{dotLabel}</span>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {healthQ.isLoading ? (
            <div className="text-sm text-[#9b978f]">Loading health…</div>
          ) : !health ? (
            <div className="text-sm text-red-500">Failed to load health.</div>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-[#6b6b6b]">Provider</dt>
              <dd className="font-mono text-[13px] text-[#1a1a1a]">
                {health.provider || <span className="text-[#9b978f]">— not set —</span>}
              </dd>

              <dt className="text-[#6b6b6b]">Model</dt>
              <dd className="font-mono text-[13px] text-[#1a1a1a]">
                {health.model || <span className="text-[#9b978f]">— not set —</span>}
              </dd>

              {health.base_url && (
                <>
                  <dt className="text-[#6b6b6b]">Base URL</dt>
                  <dd className="font-mono text-[13px] text-[#1a1a1a] break-all">
                    {health.base_url}
                  </dd>
                </>
              )}

              <dt className="text-[#6b6b6b]">Configured</dt>
              <dd>
                <Badge variant={health.configured ? 'success' : 'danger'}>
                  {health.configured ? 'yes' : 'no'}
                </Badge>
              </dd>

              <dt className="text-[#6b6b6b]">Reachable</dt>
              <dd>
                <Badge variant={health.reachable ? 'success' : 'warning'}>
                  {health.reachable ? 'yes' : 'no'}
                </Badge>
              </dd>

              <dt className="text-[#6b6b6b]">Last checked</dt>
              <dd className="font-mono text-[12px] text-[#6b6b6b]">
                {health.last_checked_at
                  ? new Date(health.last_checked_at).toLocaleString()
                  : '—'}
              </dd>
            </dl>
          )}

          {health?.last_error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span className="font-mono text-[12px]">{health.last_error}</span>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Available providers */}
      <Card>
        <Card.Header>
          <h2 className="text-sm font-semibold text-[#1a1a1a]">Available providers</h2>
        </Card.Header>
        <Card.Body>
          {configQ.isLoading ? (
            <div className="text-sm text-[#9b978f]">Loading catalog…</div>
          ) : !config ? (
            <div className="text-sm text-red-500">Failed to load provider catalog.</div>
          ) : (
            <div className="space-y-3">
              {config.available_providers.map((p) => {
                const models = config.available_models[p] ?? [];
                const isActive = p === config.provider;
                return (
                  <div
                    key={p}
                    className={`rounded-lg border p-3 ${
                      isActive ? 'border-emerald-300 bg-emerald-50' : 'border-[#ece9e3] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[13px] font-medium text-[#1a1a1a]">{p}</span>
                      {isActive && <Badge variant="success">active</Badge>}
                    </div>
                    {models.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {models.map((m) => (
                          <span
                            key={m}
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-mono ${
                              isActive && m === config.model
                                ? 'bg-emerald-200 text-emerald-900'
                                : 'bg-[#f5f3ef] text-[#6b6b6b]'
                            }`}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] text-[#9b978f]">
                        Bring-your-own model id (any value the provider accepts).
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
