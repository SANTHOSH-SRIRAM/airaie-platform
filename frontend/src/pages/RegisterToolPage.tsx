import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Wrench, ArrowLeft, FileCheck, Send } from 'lucide-react';
import { useUiStore } from '@store/uiStore';
import { useCreateTool, useCreateToolVersion, useValidateContract } from '@hooks/useTools';
import { createToolVersion } from '@api/tools';
import Button from '@components/ui/Button';
import Badge from '@components/ui/Badge';
import Input from '@components/ui/Input';
import Toggle from '@components/ui/Toggle';
import WizardStepper from '@components/tools/WizardStepper';
import ContractPortEditor from '@components/tools/ContractPortEditor';
import type { PortRow } from '@components/tools/ContractPortEditor';
import ResourceSlider from '@components/tools/ResourceSlider';
import LintResultsPanel from '@components/tools/LintResultsPanel';
import ContractJsonPreview from '@components/tools/ContractJsonPreview';
import { cn } from '@utils/cn';
import type { ToolCategory, ToolAdapter, ToolContractFull, ContractValidationResult } from '@/types/tool';

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

// Maps frontend port types to backend contract types
function mapPortType(t: string): string {
  if (t === 'artifact') return 'file';
  if (t === 'number') return 'float';
  return t; // string, integer, float, boolean, json pass through
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

// Keep old buildContract for the validate preview (used in step 3 review)
function buildContract(form: FormState): ToolContractFull {
  return {
    metadata: {
      tool_id: '',
      name: form.name,
      description: form.description,
      version: '0.1.0',
      domain_tags: form.domainTags,
    },
    interface: {
      inputs: form.inputs.map((p) => ({
        name: p.name,
        type: p.type as ToolContractFull['interface']['inputs'][0]['type'],
        required: p.required,
        description: p.description || undefined,
      })),
      outputs: form.outputs.map((p) => ({
        name: p.name,
        type: p.type as ToolContractFull['interface']['outputs'][0]['type'],
        required: p.required,
        description: p.description || undefined,
      })),
    },
    runtime: {
      adapter: form.adapter,
      image: form.image || undefined,
      resources: { cpu: form.cpu, memory_mb: form.memoryMb, timeout_seconds: form.timeoutSeconds },
    },
    capabilities: { supported_intents: [] },
    governance: {
      sandbox: { network: form.sandboxNetwork, filesystem: form.sandboxFilesystem, pids_limit: form.pidsLimit },
      owner: 'current-user',
    },
    testing: { test_cases: [] },
    documentation: { description: form.description },
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
  const [validationResult, setValidationResult] = useState<ContractValidationResult | null>(null);

  const createTool = useCreateTool();
  const createVersion = useCreateToolVersion('');
  const validateMutation = useValidateContract();

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

  const contract = useMemo(() => buildBackendContract(form) as unknown as ToolContractFull, [form]);

  const handleValidate = useCallback(async () => {
    setError(null);
    try {
      const result = await validateMutation.mutateAsync({ contract });
      setValidationResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      setError(message);
    }
  }, [contract, validateMutation]);

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
  }, [createTool, createVersion, form, navigate]);

  /* ---- Step renderers ---- */

  const renderStep0 = () => (
    <div className="space-y-5">
      <Input
        id="reg-name"
        label="Tool Name"
        placeholder="e.g. FEA Solver"
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="reg-description" className="text-[11px] text-[#6b6b6b]">
          Description
        </label>
        <textarea
          id="reg-description"
          className="w-full h-20 rounded-[8px] bg-[#f5f5f0] px-3 py-2 text-[12px] text-[#1a1a1a] placeholder:text-[#acacac] border border-[#ece9e3] focus:outline-none focus:border-[#2196f3] resize-none"
          placeholder="Describe what this tool does..."
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
        />
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

  const renderStep1 = () => (
    <div className="space-y-6">
      <p className="text-[11px] text-[#6b6b6b]">
        Define the input and output ports for this tool's contract. These determine how the tool connects in pipelines.
      </p>
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

      {/* JSON Preview */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#acacac]">Contract JSON</div>
        <ContractJsonPreview data={contract} />
      </div>

      {/* Validate */}
      <div className="flex items-center gap-3">
        <Button
          variant="tertiary"
          size="sm"
          icon={<FileCheck size={14} />}
          onClick={handleValidate}
          disabled={validateMutation.isPending}
        >
          {validateMutation.isPending ? 'Validating...' : 'Validate Contract'}
        </Button>
      </div>

      {/* Lint results */}
      <LintResultsPanel result={validationResult} />
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
                disabled={createTool.isPending || createVersion.isPending}
                onClick={handleRegister}
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
