import { useState } from 'react';
import {
  FileText,
  Plug,
  Box,
  Sparkles,
  ShieldCheck,
  Activity,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Code2,
  Info,
} from 'lucide-react';
import { cn } from '@utils/cn';

/** Section keys mirror the ATP-SPEC v0.2 top-level objects. */
export type ManifestSectionKey =
  | 'metadata'
  | 'interface'
  | 'runtime'
  | 'capabilities'
  | 'governance'
  | 'observability'
  | 'tests';

export interface ManifestViewerProps {
  manifest: unknown | undefined;
  /** Optional version label rendered in the header (e.g. "v2.20"). */
  versionLabel?: string;
  className?: string;
}

const TAB_DEFS: Array<{
  key: ManifestSectionKey;
  label: string;
  icon: typeof FileText;
}> = [
  { key: 'metadata', label: 'Metadata', icon: FileText },
  { key: 'interface', label: 'Interface', icon: Plug },
  { key: 'runtime', label: 'Runtime', icon: Box },
  { key: 'capabilities', label: 'Capabilities', icon: Sparkles },
  { key: 'governance', label: 'Governance', icon: ShieldCheck },
  { key: 'observability', label: 'Observability', icon: Activity },
  { key: 'tests', label: 'Tests', icon: FlaskConical },
];

/**
 * Pure helper: read a top-level section from a possibly-malformed manifest.
 * Returns `undefined` if the manifest is missing or the key isn't an object.
 *
 * The ATP spec sometimes uses `testing` instead of `tests`, so we check both.
 */
export function manifestSection(
  manifest: unknown,
  key: ManifestSectionKey,
): Record<string, unknown> | undefined {
  if (!manifest || typeof manifest !== 'object') return undefined;
  const m = manifest as Record<string, unknown>;
  const direct = m[key];
  if (direct && typeof direct === 'object') return direct as Record<string, unknown>;
  if (key === 'tests' && m.testing && typeof m.testing === 'object') {
    return m.testing as Record<string, unknown>;
  }
  return undefined;
}

/** Format a single value compactly for the key/value rows. */
function formatValue(v: unknown): string {
  if (v == null) return 'Not specified';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    if (v.every((x) => typeof x === 'string' || typeof x === 'number')) {
      return v.join(', ');
    }
    return `${v.length} item${v.length === 1 ? '' : 's'}`;
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v as Record<string, unknown>);
    if (keys.length === 0) return '{}';
    return `${keys.length} field${keys.length === 1 ? '' : 's'}`;
  }
  return String(v);
}

function isPrimitive(v: unknown): boolean {
  return v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

/** Renders one labelled row. Nested objects expand into indented sub-rows. */
function KeyValueRow({ label, value, depth = 0 }: { label: string; value: unknown; depth?: number }) {
  const isMissing = value == null || (typeof value === 'string' && value === '');
  const isComplex = !isPrimitive(value) && !Array.isArray(value);
  const isPrimitiveArray =
    Array.isArray(value) && value.every((x) => typeof x === 'string' || typeof x === 'number');

  if (isComplex) {
    return (
      <div className="flex flex-col gap-1.5 border-b border-[#ece9e3] py-2 last:border-b-0">
        <div
          className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b6b]"
          style={{ paddingLeft: depth * 12 }}
        >
          {label}
        </div>
        <div className="flex flex-col" style={{ paddingLeft: depth * 12 + 12 }}>
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <KeyValueRow key={k} label={k} value={v} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-start justify-between gap-4 border-b border-[#ece9e3] py-2 last:border-b-0"
      style={{ paddingLeft: depth * 12 }}
    >
      <span className="text-[12px] text-[#6b6b6b] min-w-[140px]">{label}</span>
      <span
        className={cn(
          'flex-1 text-right text-[12px] font-mono break-all',
          isMissing ? 'text-[#acacac] italic' : 'text-[#1a1a1a]',
        )}
      >
        {isMissing
          ? 'Not specified'
          : isPrimitiveArray
            ? (value as Array<string | number>).join(', ')
            : formatValue(value)}
      </span>
    </div>
  );
}

/**
 * Render a section's contents as labelled rows. When no rows can be derived
 * (section missing or empty), shows a small "Not specified" empty state.
 */
function SectionRows({ section }: { section: Record<string, unknown> | undefined }) {
  if (!section || Object.keys(section).length === 0) {
    return (
      <div className="rounded-[6px] border border-dashed border-[#ece9e3] bg-[#fbfaf9] p-6 text-center">
        <Info size={14} className="mx-auto text-[#acacac]" />
        <p className="mt-2 text-[12px] text-[#6b6b6b]">Not specified in manifest.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {Object.entries(section).map(([k, v]) => (
        <KeyValueRow key={k} label={k} value={v} />
      ))}
    </div>
  );
}

function CollapsibleRawJson({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 overflow-hidden rounded-[8px] border border-[#ece9e3] bg-[#fbfaf9]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-bold text-[#1a1a1a] hover:bg-[#f5f5f0]"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Code2 size={12} className="text-[#6b6b6b]" />
        Raw JSON
      </button>
      {open && (
        <pre className="overflow-x-auto bg-[#1a1a1a] p-4 font-mono text-[11px] text-[#a855f7]">
          {JSON.stringify(data ?? null, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function ManifestViewer({ manifest, versionLabel, className }: ManifestViewerProps) {
  const [activeTab, setActiveTab] = useState<ManifestSectionKey>('metadata');

  if (!manifest) {
    return (
      <div
        className={cn(
          'rounded-[12px] border border-dashed border-[#ece9e3] bg-[#fbfaf9] p-8 text-center',
          className,
        )}
      >
        <FileText size={20} className="mx-auto text-[#acacac]" />
        <p className="mt-2 text-[13px] font-bold text-[#6b6b6b]">No manifest available</p>
        <p className="mt-1 text-[11px] text-[#949494]">
          This tool version has no ATP manifest yet, or the contract failed to parse.
        </p>
      </div>
    );
  }

  const activeSection = manifestSection(manifest, activeTab);

  return (
    <div
      className={cn('overflow-hidden rounded-[12px] border border-[#ece9e3] bg-white', className)}
      aria-label="ATP manifest viewer"
    >
      {/* Tab strip */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#ece9e3] bg-[#fafaf8] px-2">
        {TAB_DEFS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const present = !!manifestSection(manifest, tab.key);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold transition-colors',
                'border-b-2 -mb-[1px]',
                isActive
                  ? 'border-[#2196f3] text-[#1a1a1a]'
                  : 'border-transparent text-[#6b6b6b] hover:text-[#1a1a1a]',
              )}
              aria-selected={isActive}
              role="tab"
            >
              <Icon size={13} className={isActive ? 'text-[#2196f3]' : ''} />
              <span>{tab.label}</span>
              {!present && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#d5d5cf]" aria-label="missing section" />
              )}
            </button>
          );
        })}
        {versionLabel && (
          <span className="ml-auto px-3 py-2.5 text-[11px] font-mono text-[#949494]">
            {versionLabel}
          </span>
        )}
      </div>

      {/* Active section */}
      <div className="p-5">
        <SectionRows section={activeSection} />
        <CollapsibleRawJson data={activeSection ?? null} />
      </div>
    </div>
  );
}
