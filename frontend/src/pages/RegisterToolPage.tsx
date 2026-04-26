import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Wrench,
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useUiStore } from '@store/uiStore';
import { useCreateTool, useCreateToolVersion } from '@hooks/useTools';
import { useDebouncedValidateContract } from '@hooks/useValidateContract';
import { createToolVersion, manifestErrorByField } from '@api/tools';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';
import Input from '@components/ui/Input';
import Toggle from '@components/ui/Toggle';
import WizardStepper from '@components/tools/WizardStepper';
import ContractPortEditor from '@components/tools/ContractPortEditor';
import type { PortRow } from '@components/tools/ContractPortEditor';
import ResourceSlider from '@components/tools/ResourceSlider';
import ContractJsonPreview from '@components/tools/ContractJsonPreview';
import { cn } from '@utils/cn';
import type { ToolCategory, ToolAdapter } from '@/types/tool';

/* ---------- Constants ---------- */

const STEPS = ['Details', 'Contract', 'Execution', 'Review'];

const CATEGORIES: { value: ToolCategory; label: string }[] = [
  { value: 'simulation', label: 'Simulation' },
  { value: 'meshing', label: 'Meshing' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'materials', label: 'Materials' },
  { value: 'ml-ai', label: 'ML / AI' },
  { value: 'utilities', label: 'Utilities' },
];

const ADAPTERS: { value: ToolAdapter; label: string }[] = [
  { value: 'docker', label: 'Docker' },
  { value: 'python', label: 'Python' },
  { value: 'wasm', label: 'WebAssembly' },
  { value: 'remote-api', label: 'Remote API' },
];

/* ---------- Form state ---------- */

interface FormState {
  name: string;
  description: string;
  category: ToolCategory;
  adapter: ToolAdapter;
  domainTags: string[];
  tagInput: string;
  inputs: PortRow[];
  outputs: PortRow[];
  image: string;
  cpu: number;
  memoryMb: number;
  timeoutSeconds: number;
  sandboxNetwork: 'allow' | 'deny';
  sandboxFilesystem: 'sandbox' | 'readonly' | 'shared';
  pidsLimit: number;
}

const INITIAL: FormState = {
  name: '',
  description: '',
  category: 'simulation',
  adapter: 'docker',
  domainTags: [],
  tagInput: '',
  inputs: [],
  outputs: [],
  image: '',
  cpu: 2,
  memoryMb: 1024,
  timeoutSeconds: 300,
  sandboxNetwork: 'deny',
  sandboxFilesystem: 'sandbox',
  pidsLimit: 64,
};

/* ---------- Helpers ---------- */

// Maps frontend port types to backend contract standard types.
// Standard types: string, integer, number, boolean, file, object, array
function mapPortType(t: string): string {
  if (t === 'artifact') return 'file';
  if (t === 'json') return 'object';
  return t; // string, number, integer, boolean pass through
}

// Builds a backend-compatible ToolContract JSON object from form state
function buildBackendContract(form: FormState): Record<string, unknown> {
  const now = new Date().toISOString();
  const slug = form.name.toLowerCase().replace(/\s+/g, '-');
  return {
    api_version: 'airaie.toolcontract/v1',
    kind: 'ToolContract',
    metadata: {
      id: slug,
      name: form.name,
      version: '0.1.0',
      owner: 'current-user',
      domain_tags: form.domainTags.length > 0 ? form.domainTags : [form.category],
      description: form.description,
      license: 'MIT',
      created_at: now,
      updated_at: now,
    },
    interface: {
      inputs: form.inputs.map((p) => ({
        name: p.name,
        title: p.name,
        type: mapPortType(p.type),
        description: p.description || p.name,
        optional: !p.required,
      })),
      outputs: form.outputs.map((p) => ({
        name: p.name,
        title: p.name,
        type: mapPortType(p.type),
        description: p.description || p.name,
      })),
      errors: [],
    },
    runtime: {
      adapter: form.adapter,
      locality: 'local',
      timeout_seconds: form.timeoutSeconds,
      retries: 1,
      idempotent: true,
      deterministic: false,
      resources: {
        cpu_cores: form.cpu,
        memory_mb: form.memoryMb,
        disk_mb: 512,
      },
      docker: {
        image: form.image || `airaie/${slug}:0.1.0`,
        command: ['run'],
        env: {},
      },
    },
    capabilities: {
      computes: [`${form.category}.${slug}`],
      requires: [],
      improves: [],
      invocation_modes: ['batch'],
    },
    governance: {
      sandbox: form.sandboxNetwork === 'deny',
      audit_log: 'enabled',
      quota: {
        cpu_limit: `${form.cpu} cores`,
        memory_limit: `${form.memoryMb} MB`,
        max_concurrency: 5,
      },
    },
    observability: {
      log_level: 'info',
      emit_metrics: true,
      emit_traces: true,
    },
    tests: {
      sample_cases: [],
    },
  };
}

/* ---------- Component ---------- */

export default function RegisterToolPage() {
  const navigate = useNavigate();
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);
  const hideBottomBar = useUiStore((s) => s.hideBottomBar);
  const closeRightPanel = useUiStore((s) => s.closeRightPanel);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({ ...INITIAL });
  const [error, setError] = useState<string | null>(null);

  const createTool = useCreateTool();
  const createVersion = useCreateToolVersion('');

  useEffect(() => {
    setSidebarContentType('navigation');
    hideBottomBar();
    closeRightPanel();
    return () => {
      hideBottomBar();
      closeRightPanel();
    };
  }, [closeRightPanel, hideBottomBar, setSidebarContentType]);

  /* ---- Form updaters ---- */

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addTag = useCallback(() => {
    const tag = form.tagInput.trim();
    if (tag && !form.domainTags.includes(tag)) {
      setForm((prev) => ({ ...prev, domainTags: [...prev.domainTags, tag], tagInput: '' }));
    }
  }, [form.tagInput, form.domainTags]);

  const removeTag = useCallback((tag: string) => {
    setForm((prev) => ({ ...prev, domainTags: prev.domainTags.filter((t) => t !== tag) }));
  }, []);

  const addPort = useCallback((direction: 'inputs' | 'outputs') => {
    setForm((prev) => ({
      ...prev,
      [direction]: [...prev[direction], { name: '', type: 'string', required: false, description: '' }],
    }));
  }, []);

  const removePort = useCallback((direction: 'inputs' | 'outputs', idx: number) => {
    setForm((prev) => ({ ...prev, [direction]: prev[direction].filter((_, i) => i !== idx) }));
  }, []);

  const updatePort = useCallback(
    (direction: 'inputs' | 'outputs', idx: number, field: keyof PortRow, value: string | boolean) => {
      setForm((prev) => ({
        ...prev,
        [direction]: prev[direction].map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
      }));
    },
    [],
  );

  /* ---- Validation ---- */

  const canProceed = useMemo((): boolean => {
    if (step === 0) return form.name.trim().length > 0 && form.description.trim().length > 0;
    if (step === 1) return true;
    if (step === 2) return true;
    return true;
  }, [step, form.name, form.description]);

  const manifest = useMemo(() => buildBackendContract(form), [form]);

  // Only validate once required basics are filled in — empty manifests just
  // produce noise. Re-runs (debounced) on every form change.
  const validationEnabled = form.name.trim().length > 0;
  const { result: validation, isValidating, error: validationError } = useDebouncedValidateContract(
    manifest,
    { delayMs: 500, enabled: validationEnabled },
  );

  const errorForField = useCallback(
    (path: string) => (validation ? manifestErrorByField(validation.errors, path) : undefined),
    [validation],
  );

  const handleRegister = useCallback(async () => {
    setError(null);
    try {
      const tool = await createTool.mutateAsync({ name: form.name, description: form.description });
      await createToolVersion(tool.id, {
        version: '0.1.0',
        contract: buildBackendContract(form),
      });
      navigate(`/tools?registered=${tool.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register tool';
      setError(message);
    }
  }, [createTool, form, navigate]);

  /* ---- Step renderers ---- */

  const renderStep0 = () => {
    const nameIssue = errorForField('metadata.name');
    const descIssue = errorForField('metadata.description');
    return (
    <div className="space-y-5">
      <Input
        id="reg-name"
        label="Tool Name"
        placeholder="e.g. FEA Solver"
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        error={nameIssue?.message}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="reg-description" className="text-[11px] text-[#6b6b6b]">
          Description
        </label>
        <textarea
          id="reg-description"
          className={cn(
            'w-full h-20 rounded-[8px] bg-[#f5f5f0] px-3 py-2 text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] border focus:outline-none resize-none',
            descIssue
              ? 'border-[#e74c3c] focus:border-[#e74c3c]'
              : 'border-[#ece9e3] focus:border-[#2196f3]',
          )}
          placeholder="Describe what this tool does..."
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          aria-invalid={descIssue ? 'true' : undefined}
        />
        {descIssue && (
          <p className="text-[10px] text-[#e74c3c]" role="alert">{descIssue.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="reg-category" className="text-[11px] text-[#6b6b6b]">
          Category
        </label>
        <select
          id="reg-category"
          className="w-full h-9 rounded-[8px] bg-[#f5f5f0] px-3 text-[12px] text-[#1a1a1a] border border-[#ece9e3] focus:outline-none focus:border-[#2196f3]"
          value={form.category}
          onChange={(e) => update('category', e.target.value as ToolCategory)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="reg-adapter" className="text-[11px] text-[#6b6b6b]">
          Adapter
        </label>
        <select
          id="reg-adapter"
          className="w-full h-9 rounded-[8px] bg-[#f5f5f0] px-3 text-[12px] text-[#1a1a1a] border border-[#ece9e3] focus:outline-none focus:border-[#2196f3]"
          value={form.adapter}
          onChange={(e) => update('adapter', e.target.value as ToolAdapter)}
        >
          {ADAPTERS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[#6b6b6b]">Domain Tags</label>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 h-9 rounded-[8px] bg-[#f5f5f0] px-3 text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] border border-[#ece9e3] focus:outline-none focus:border-[#2196f3]"
            placeholder="Type a tag and press Enter"
            value={form.tagInput}
            onChange={(e) => update('tagInput', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button variant="ghost" size="sm" onClick={addTag}>
            Add
          </Button>
        </div>
        {form.domainTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {form.domainTags.map((tag) => (
              <Badge key={tag} variant="info">
                {tag}
                <button
                  type="button"
                  className="ml-1 text-[10px] hover:text-[#e74c3c]"
                  onClick={() => removeTag(tag)}
                >
                  x
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderStep1 = () => {
    const interfaceIssues = (validation?.errors ?? []).filter((e) => e.path?.startsWith('interface'));
    return (
    <div className="space-y-6">
      <p className="text-[11px] text-[#6b6b6b]">
        Define the input and output ports for this tool's contract. These determine how the tool connects in pipelines.
      </p>
      {interfaceIssues.length > 0 && (
        <div className="rounded-[8px] bg-[#ffebee] px-3 py-2 space-y-1" role="alert">
          {interfaceIssues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] text-[#e74c3c]">
              <XCircle size={12} className="shrink-0 mt-0.5" />
              <span>
                {issue.path && <strong className="font-mono">{issue.path}: </strong>}
                {issue.message}
              </span>
            </div>
          ))}
        </div>
      )}
      <ContractPortEditor
        label="Input Ports"
        ports={form.inputs}
        onAdd={() => addPort('inputs')}
        onRemove={(idx) => removePort('inputs', idx)}
        onUpdate={(idx, field, value) => updatePort('inputs', idx, field, value)}
      />
      <div className="border-t border-[#ece9e3]" />
      <ContractPortEditor
        label="Output Ports"
        ports={form.outputs}
        onAdd={() => addPort('outputs')}
        onRemove={(idx) => removePort('outputs', idx)}
        onUpdate={(idx, field, value) => updatePort('outputs', idx, field, value)}
      />
    </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-6">
      <Input
        id="reg-image"
        label="Docker Image"
        placeholder="e.g. registry.airaie.io/my-tool:1.0"
        value={form.image}
        onChange={(e) => update('image', e.target.value)}
      />
      <div className="space-y-4">
        <ResourceSlider
          id="reg-cpu"
          label="CPU Cores"
          value={form.cpu}
          min={1}
          max={32}
          step={1}
          unit="cores"
          onChange={(v) => update('cpu', v)}
        />
        <ResourceSlider
          id="reg-memory"
          label="Memory"
          value={form.memoryMb}
          min={128}
          max={16384}
          step={128}
          unit="MB"
          onChange={(v) => update('memoryMb', v)}
        />
        <ResourceSlider
          id="reg-timeout"
          label="Timeout"
          value={form.timeoutSeconds}
          min={10}
          max={3600}
          step={10}
          unit="s"
          onChange={(v) => update('timeoutSeconds', v)}
        />
      </div>
      <div className="space-y-3 pt-2">
        <Toggle
          id="reg-network"
          label="Allow network access"
          checked={form.sandboxNetwork === 'allow'}
          onChange={(checked) => update('sandboxNetwork', checked ? 'allow' : 'deny')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="reg-filesystem" className="text-[11px] text-[#6b6b6b]">
            Filesystem Mode
          </label>
          <select
            id="reg-filesystem"
            className="w-full h-9 rounded-[8px] bg-[#f5f5f0] px-3 text-[12px] text-[#1a1a1a] border border-[#ece9e3] focus:outline-none focus:border-[#2196f3]"
            value={form.sandboxFilesystem}
            onChange={(e) => update('sandboxFilesystem', e.target.value as FormState['sandboxFilesystem'])}
          >
            <option value="sandbox">Sandbox</option>
            <option value="readonly">Read-only</option>
            <option value="shared">Shared</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={form.sandboxNetwork === 'deny' ? 'success' : 'warning'}>
          Network: {form.sandboxNetwork}
        </Badge>
        <Badge variant={form.sandboxFilesystem === 'sandbox' ? 'success' : 'warning'}>
          FS: {form.sandboxFilesystem}
        </Badge>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      {/* Summary */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Summary</div>
        <div className="space-y-2 rounded-[8px] bg-[#f5f5f0] px-4 py-3">
          <SummaryRow label="Name" value={form.name} />
          <SummaryRow label="Description" value={form.description} />
          <SummaryRow label="Category" value={CATEGORIES.find((c) => c.value === form.category)?.label ?? form.category} />
          <SummaryRow label="Adapter" value={ADAPTERS.find((a) => a.value === form.adapter)?.label ?? form.adapter} />
          <SummaryRow label="Tags" value={form.domainTags.length > 0 ? form.domainTags.join(', ') : 'None'} />
          <SummaryRow label="Inputs" value={`${form.inputs.length} port${form.inputs.length !== 1 ? 's' : ''}`} />
          <SummaryRow label="Outputs" value={`${form.outputs.length} port${form.outputs.length !== 1 ? 's' : ''}`} />
          <SummaryRow label="Image" value={form.image || 'Not specified'} />
          <SummaryRow label="CPU" value={`${form.cpu} cores`} />
          <SummaryRow label="Memory" value={`${form.memoryMb} MB`} />
          <SummaryRow label="Timeout" value={`${form.timeoutSeconds}s`} />
          <SummaryRow label="Network" value={form.sandboxNetwork} />
          <SummaryRow label="Filesystem" value={form.sandboxFilesystem} />
        </div>
      </div>

      {/* Manifest preview */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">
          Manifest preview
        </div>
        <p className="text-[10px] text-[#6b6b6b]">
          Read-only — this is exactly what will be POSTed to the registry.
        </p>
        <ContractJsonPreview data={manifest} />
      </div>
    </div>
  );

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3];

  /* ---- Render ---- */

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 pb-8">
      <div className="space-y-4">
        {/* Header */}
        <section className="flex min-h-[72px] flex-col gap-4 rounded-[12px] bg-white px-4 py-4 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/tools')}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#6b6b6b] hover:bg-[#f5f5f0] transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <Wrench size={18} className="text-[#2196f3]" />
            <h1 className="text-[20px] font-semibold leading-[22px] text-[#1a1a1a]">Register New Tool</h1>
          </div>
          <WizardStepper steps={STEPS} currentStep={step} />
        </section>

        {/* Content */}
        <section className="rounded-[12px] bg-white px-6 py-6 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
          <div className="mb-6">
            <h2 className="text-[14px] font-semibold text-[#1a1a1a]">{STEPS[step]}</h2>
            <p className="text-[11px] text-[#6b6b6b] mt-1">
              {step === 0 && 'Basic information about your tool.'}
              {step === 1 && 'Define inputs and outputs for the tool contract.'}
              {step === 2 && 'Configure runtime resources and sandbox settings.'}
              {step === 3 && 'Review your configuration, validate, and register.'}
            </p>
          </div>

          {stepRenderers[step]()}

          {/* Live validation panel — visible across every step */}
          <div className="mt-6">
            <ValidationPanel
              validation={validation}
              isValidating={isValidating}
              networkError={validationError}
              enabled={validationEnabled}
            />
          </div>

          {error && (
            <div className="mt-4 rounded-[8px] bg-[#ffebee] px-3 py-2 text-[11px] text-[#e74c3c]" role="alert">
              {error}
            </div>
          )}
        </section>

        {/* Footer nav */}
        <section className="flex items-center justify-between rounded-[12px] bg-white px-5 py-3 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)]">
          <div>
            {step > 0 && (
              <Button
                variant="ghost"
                size="sm"
                icon={<ChevronLeft size={14} />}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
              Cancel
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                variant="primary"
                size="sm"
                iconRight={<ChevronRight size={14} />}
                disabled={!canProceed}
                onClick={() => setStep(step + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<Send size={14} />}
                disabled={
                  createTool.isPending ||
                  createVersion.isPending ||
                  isValidating ||
                  !validation ||
                  !validation.valid
                }
                onClick={handleRegister}
                title={
                  !validation
                    ? 'Waiting for validation…'
                    : !validation.valid
                      ? 'Resolve validation errors before registering.'
                      : undefined
                }
              >
                {createTool.isPending || createVersion.isPending ? 'Registering...' : 'Register Tool'}
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Tiny helper component ---------- */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-[#6b6b6b]">{label}</span>
      <span className={cn('max-w-[320px] text-right text-[11px] text-[#1a1a1a]', 'truncate')}>
        {value}
      </span>
    </div>
  );
}

/* ---------- Validation panel ---------- */

interface ValidationPanelProps {
  validation: import('@api/tools').ContractValidation | null;
  isValidating: boolean;
  networkError: Error | null;
  enabled: boolean;
}

/**
 * Inline live-validation summary. Shown beneath the active wizard step.
 * Color-coded: red for errors, amber for warnings, green for success,
 * neutral while validating.
 */
function ValidationPanel({ validation, isValidating, networkError, enabled }: ValidationPanelProps) {
  if (!enabled) {
    return (
      <div className="rounded-[8px] bg-[#f5f5f0] px-3 py-2 text-[11px] text-[#6b6b6b]">
        Fill in a tool name to start live validation.
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="flex items-start gap-2 rounded-[8px] bg-[#ffebee] px-3 py-2 text-[11px] text-[#e74c3c]" role="alert">
        <XCircle size={14} className="shrink-0 mt-0.5" />
        <div>
          <div className="font-medium">Validation request failed</div>
          <div className="text-[10px] opacity-80">{networkError.message}</div>
        </div>
      </div>
    );
  }

  if (!validation) {
    return (
      <div className="flex items-center gap-2 rounded-[8px] bg-[#f5f5f0] px-3 py-2 text-[11px] text-[#6b6b6b]">
        <Loader2 size={14} className="animate-spin" />
        <span>Validating manifest…</span>
      </div>
    );
  }

  const { valid, errors, warnings } = validation;

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center justify-between rounded-[8px] px-3 py-2',
          valid && warnings.length === 0 && 'bg-[#e8f5e9]',
          valid && warnings.length > 0 && 'bg-[#fff3e0]',
          !valid && 'bg-[#ffebee]',
        )}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium">
          {valid ? (
            <CheckCircle2 size={14} className="text-[#4caf50]" />
          ) : (
            <XCircle size={14} className="text-[#e74c3c]" />
          )}
          <span
            className={cn(
              valid ? 'text-[#1a1a1a]' : 'text-[#e74c3c]',
            )}
          >
            {valid ? 'Manifest is valid; ready to register' : 'Manifest has validation errors'}
          </span>
          {isValidating && <Loader2 size={12} className="animate-spin text-[#6b6b6b] ml-1" />}
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {errors.length > 0 && (
            <span className="text-[#e74c3c]">
              {errors.length} error{errors.length !== 1 ? 's' : ''}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="text-[#ff9800]">
              {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1" aria-label="Validation errors">
          {errors.map((err, i) => (
            <li
              key={`e-${i}`}
              className="flex items-start gap-2 rounded-[6px] bg-[#ffebee] px-3 py-1.5"
            >
              <XCircle size={12} className="text-[#e74c3c] shrink-0 mt-0.5" />
              <span className="text-[10px] text-[#e74c3c]">
                {err.path && <strong className="font-mono">{err.path}: </strong>}
                {err.message}
              </span>
            </li>
          ))}
        </ul>
      )}

      {warnings.length > 0 && (
        <ul className="space-y-1" aria-label="Validation warnings">
          {warnings.map((warn, i) => (
            <li
              key={`w-${i}`}
              className="flex items-start gap-2 rounded-[6px] bg-[#fff3e0] px-3 py-1.5"
            >
              <AlertTriangle size={12} className="text-[#ff9800] shrink-0 mt-0.5" />
              <span className="text-[10px] text-[#ff9800]">
                {warn.path && <strong className="font-mono">{warn.path}: </strong>}
                {warn.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
