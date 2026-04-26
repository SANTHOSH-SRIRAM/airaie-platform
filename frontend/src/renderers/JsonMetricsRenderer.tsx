import { useEffect, useState } from 'react';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import type { RendererProps } from './types';

// ---------------------------------------------------------------------------
// JsonMetricsRenderer — fetches an artifact's bytes (presigned URL → JSON),
// renders the result as a key-value card grid.
//
// Recognized schemas (concepts/05 §"Structured metrics file"):
//   - schema = "fea-metrics-v*"  → Solver / Convergence / Geometry sections
//   - schema = "cfd-metrics-v*"  → Aero / Convergence / Mesh sections
// Unknown / missing schema → flat list of all top-level keys.
//
// Errors degrade gracefully: parse failure → inline error + download link.
// Registered in `./registry.ts` via lazy().
// ---------------------------------------------------------------------------

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: JsonObject };

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFeaMetrics(data: JsonObject): boolean {
  return typeof data.schema === 'string' && data.schema.startsWith('fea-metrics-v');
}

function isCfdMetrics(data: JsonObject): boolean {
  return typeof data.schema === 'string' && data.schema.startsWith('cfd-metrics-v');
}

// ---------------------------------------------------------------------------
// Value formatters — keep numbers compact, booleans readable.
// ---------------------------------------------------------------------------

function formatValue(value: JsonValue): string {
  if (value === null) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    // Use exponential for very small / very large numbers; otherwise fixed.
    const abs = Math.abs(value);
    if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) {
      return value.toExponential(3);
    }
    return Number.isInteger(value) ? value.toString() : value.toFixed(4).replace(/\.?0+$/, '');
  }
  if (typeof value === 'string') return value;
  // Object / array → compact JSON.
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// Section helpers — pull a known sub-tree out of `data` and render its keys.
// Returns null if the section isn't present so the schema-aware view can
// gracefully drop missing sections.
// ---------------------------------------------------------------------------

function MetricsRow({ k, v }: { k: string; v: JsonValue }) {
  const isObject = isJsonObject(v);
  return (
    <>
      <dt className="text-[#6b6b6b]">{humanize(k)}</dt>
      <dd
        className={`text-[#1a1a1a] tabular-nums ${
          isObject ? 'col-span-1 text-[10px] text-[#acacac] truncate' : ''
        }`}
        title={isObject ? formatValue(v) : undefined}
      >
        {formatValue(v)}
      </dd>
    </>
  );
}

function MetricsSection({ title, data }: { title: string; data: JsonObject }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <section>
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#6b6b6b] mb-[6px]">
        {title}
      </h4>
      <dl className="grid grid-cols-[140px_1fr] gap-y-[4px] gap-x-[12px] text-[11px]">
        {entries.map(([k, v]) => (
          <MetricsRow key={k} k={k} v={v} />
        ))}
      </dl>
    </section>
  );
}

function FlatGrid({ data }: { data: JsonObject }) {
  const entries = Object.entries(data).filter(([k]) => k !== 'schema');
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-[16px] gap-y-[4px] text-[11px]">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[140px_1fr] gap-x-[12px]">
          <MetricsRow k={k} v={v} />
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// camel_case_or_snake_case → "Camel Case Or Snake Case"
// ---------------------------------------------------------------------------

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export default function JsonMetricsRenderer({ artifact, downloadUrl }: RendererProps) {
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetch(downloadUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((parsed) => {
        if (cancelled) return;
        if (!isJsonObject(parsed)) {
          setState({
            status: 'error',
            message: 'Top-level JSON must be an object',
          });
          return;
        }
        setState({ status: 'ok', data: parsed });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load metrics';
        setState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [downloadUrl]);

  if (state.status === 'loading') {
    return (
      <div
        className="rounded-[8px] border border-[#e8e8e8] bg-white p-[16px] flex items-center gap-[8px] text-[11px] text-[#6b6b6b]"
        role="status"
      >
        <Loader2 size={14} className="animate-spin text-[#acacac]" />
        Loading metrics…
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div
        className="rounded-[8px] border border-[#ffcdd2] bg-[#ffebee] p-[12px] flex items-start gap-[8px] text-[11px] text-[#6b6b6b]"
        role="alert"
      >
        <AlertCircle size={14} className="text-[#e74c3c] shrink-0 mt-[2px]" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[#1a1a1a]">Could not load metrics</div>
          <div className="text-[10px] mt-[2px]">{state.message}</div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-[4px] mt-[6px] text-[#1976d2] hover:underline text-[10px]"
          >
            <Download size={10} />
            Download {artifact.name ?? artifact.id}
          </a>
        </div>
      </div>
    );
  }

  const { data } = state;

  // Schema-aware rendering for known shapes.
  if (isFeaMetrics(data)) {
    return (
      <div className="rounded-[8px] border border-[#e8e8e8] bg-white p-[16px] flex flex-col gap-[12px]">
        <header className="flex items-baseline justify-between">
          <h3 className="text-[12px] font-semibold text-[#1a1a1a]">FEA Metrics</h3>
          <span className="text-[10px] text-[#acacac] tabular-nums">{String(data.schema)}</span>
        </header>
        <MetricsSection title="Solver" data={pick(data, ['solver_wall_seconds'])} />
        <MetricsSection
          title="Geometry"
          data={pick(data, ['n_elements', 'n_nodes', 'mesh_size_mm'])}
        />
        <MetricsSection
          title="Results"
          data={pick(data, ['max_von_mises_pa', 'max_displacement_m', 'min_factor_of_safety'])}
        />
        {isJsonObject(data.convergence) && (
          <MetricsSection title="Convergence" data={data.convergence} />
        )}
      </div>
    );
  }

  if (isCfdMetrics(data)) {
    return (
      <div className="rounded-[8px] border border-[#e8e8e8] bg-white p-[16px] flex flex-col gap-[12px]">
        <header className="flex items-baseline justify-between">
          <h3 className="text-[12px] font-semibold text-[#1a1a1a]">CFD Metrics</h3>
          <span className="text-[10px] text-[#acacac] tabular-nums">{String(data.schema)}</span>
        </header>
        <MetricsSection
          title="Aero"
          data={pick(data, ['lift_coefficient', 'drag_coefficient', 'pressure_drop_pa'])}
        />
        <MetricsSection
          title="Mesh"
          data={pick(data, ['n_cells', 'n_faces', 'mesh_quality_min'])}
        />
        {isJsonObject(data.convergence) && (
          <MetricsSection title="Convergence" data={data.convergence} />
        )}
      </div>
    );
  }

  // Unknown schema — flat top-level grid.
  return (
    <div className="rounded-[8px] border border-[#e8e8e8] bg-white p-[16px]">
      <header className="flex items-baseline justify-between mb-[8px]">
        <h3 className="text-[12px] font-semibold text-[#1a1a1a]">
          {artifact.name ?? 'Metrics'}
        </h3>
        {typeof data.schema === 'string' && (
          <span className="text-[10px] text-[#acacac] tabular-nums">{data.schema}</span>
        )}
      </header>
      <FlatGrid data={data} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// pick(data, keys) — extract only present keys (drops undefined ones so a
// section with no surviving keys collapses to nothing).
// ---------------------------------------------------------------------------

function pick(data: JsonObject, keys: string[]): JsonObject {
  const out: JsonObject = {};
  for (const k of keys) {
    if (k in data && data[k] !== undefined) out[k] = data[k];
  }
  return out;
}
