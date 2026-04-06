import { useToolRegistryStore } from '@store/toolRegistryStore';
import { useToolDetail } from '@hooks/useTools';
import Badge from '@components/ui/Badge';
import type { ToolVersion } from '@/types/tool';

function SectionHeader({ label }: { label: string }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-content-helper mb-2 mt-4 first:mt-0">
      {label}
    </h3>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-content-helper">{label}</span>
      <span className="text-xs text-content-primary font-mono">{value}</span>
    </div>
  );
}

function VersionRow({ v }: { v: ToolVersion }) {
  const badgeVariant = v.status === 'published' ? 'success' : v.status === 'deprecated' ? 'danger' : 'default';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border-subtle last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-content-primary">{v.version}</span>
        <Badge variant={badgeVariant} className="text-[9px] h-4 px-1.5">{v.status}</Badge>
      </div>
      <span className="text-[10px] text-content-placeholder">{v.publishedAt}</span>
    </div>
  );
}

export default function ToolPropertiesPanel() {
  const selectedToolId = useToolRegistryStore((s) => s.selectedToolId);
  const { data: tool, isLoading } = useToolDetail(selectedToolId);

  if (!selectedToolId) {
    return (
      <div data-testid="tool-properties-panel" className="p-4 text-xs text-content-helper text-center pt-12">
        Select a tool to view properties
      </div>
    );
  }

  if (isLoading || !tool) {
    return (
      <div data-testid="tool-properties-panel" className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 bg-surface-layer animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="tool-properties-panel" className="p-4 text-sm overflow-y-auto h-full">
      {/* SELECTION */}
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-content-primary">{tool.name}</h2>
        <p className="text-[11px] text-content-helper capitalize">{tool.category} &middot; {tool.adapter}</p>
      </div>

      {/* VERSION HISTORY */}
      <div data-testid="tool-properties-versions">
        <SectionHeader label="Version History" />
        <div className="mb-1">
          <Badge variant="info" badgeStyle="outline" className="text-[10px] h-5">
            Current: {tool.currentVersion}
          </Badge>
        </div>
        <div className="max-h-32 overflow-y-auto">
          {tool.versions.map((v) => (
            <VersionRow key={v.version} v={v} />
          ))}
        </div>
      </div>

      {/* TOOL CONTRACT */}
      <div data-testid="tool-properties-contract">
        <SectionHeader label="Tool Contract" />

        <p className="text-[10px] font-semibold text-content-secondary mb-1 mt-2">Inputs</p>
        <div className="space-y-1">
          {tool.contract.inputs.map((f) => (
            <div key={f.name} className="flex items-center gap-2 py-0.5">
              <span className="text-xs text-content-primary font-medium">{f.name}</span>
              <Badge variant="default" className="text-[9px] h-4 px-1.5">{f.type}</Badge>
              {f.required && <span className="text-[9px] text-brand-danger">*</span>}
            </div>
          ))}
        </div>

        <p className="text-[10px] font-semibold text-content-secondary mb-1 mt-2">Outputs</p>
        <div className="space-y-1">
          {tool.contract.outputs.map((f) => (
            <div key={f.name} className="flex items-center gap-2 py-0.5">
              <span className="text-xs text-content-primary font-medium">{f.name}</span>
              <Badge variant="default" className="text-[9px] h-4 px-1.5">{f.type}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* EXECUTION */}
      <div data-testid="tool-properties-execution">
        <SectionHeader label="Execution" />
        <KeyValue label="Adapter" value={tool.adapter} />
        <KeyValue label="Image" value={tool.image} />
        <KeyValue label="Registry" value={tool.registry} />
      </div>

      {/* DEFAULT LIMITS */}
      <div data-testid="tool-properties-limits">
        <SectionHeader label="Default Limits" />
        <KeyValue label="CPU" value={`${tool.limits.cpu} cores`} />
        <KeyValue label="Memory" value={`${tool.limits.memoryMb} MB`} />
        <KeyValue label="Timeout" value={`${tool.limits.timeoutSeconds}s`} />
      </div>

      {/* SANDBOX POLICY */}
      <div data-testid="tool-properties-sandbox">
        <SectionHeader label="Sandbox Policy" />
        <div className="flex items-center justify-between py-1">
          <span className="text-xs text-content-helper">Network</span>
          <Badge
            variant={tool.sandboxNetwork === 'deny' ? 'danger' : 'success'}
            className="text-[9px] h-4 px-1.5"
          >
            {tool.sandboxNetwork}
          </Badge>
        </div>
      </div>
    </div>
  );
}
