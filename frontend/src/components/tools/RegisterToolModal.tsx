import { useState, useCallback } from 'react';
import { Plus, Trash2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import Modal from '@components/ui/Modal';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Toggle from '@components/ui/Toggle';
import Badge from '@components/ui/Badge';
import { useCreateTool, useCreateToolVersion } from '@hooks/useTools';
import type { ToolCategory, ToolAdapter, ToolContractField } from '@/types/tool';
import { cn } from '@utils/cn';

/* ---------- Constants ---------- */

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

const PORT_TYPES = ['artifact', 'string', 'number', 'json', 'boolean'] as const;

const STEPS = ['Details', 'Contract', 'Runtime'] as const;

/* ---------- Types ---------- */

interface RegisterToolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormState {
  name: string;
  description: string;
  category: ToolCategory;
  adapter: ToolAdapter;
  inputs: ToolContractField[];
  outputs: ToolContractField[];
  image: string;
  cpu: string;
  memoryMb: string;
  timeoutSeconds: string;
  sandboxNetwork: 'allow' | 'deny';
}

const INITIAL_STATE: FormState = {
  name: '',
  description: '',
  category: 'simulation',
  adapter: 'docker',
  inputs: [],
  outputs: [],
  image: '',
  cpu: '2',
  memoryMb: '1024',
  timeoutSeconds: '300',
  sandboxNetwork: 'deny',
};

/* ---------- Component ---------- */

export default function RegisterToolModal({ isOpen, onClose }: RegisterToolModalProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({ ...INITIAL_STATE });
  const [error, setError] = useState<string | null>(null);

  const createTool = useCreateTool();
  const [createdToolId, setCreatedToolId] = useState<string | null>(null);
  const createVersion = useCreateToolVersion(createdToolId ?? '');

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addPort = useCallback((direction: 'inputs' | 'outputs') => {
    setForm((prev) => ({
      ...prev,
      [direction]: [...prev[direction], { name: '', type: 'string', required: false }],
    }));
  }, []);

  const removePort = useCallback((direction: 'inputs' | 'outputs', idx: number) => {
    setForm((prev) => ({
      ...prev,
      [direction]: prev[direction].filter((_, i) => i !== idx),
    }));
  }, []);

  const updatePort = useCallback(
    (direction: 'inputs' | 'outputs', idx: number, field: keyof ToolContractField, value: string | boolean) => {
      setForm((prev) => ({
        ...prev,
        [direction]: prev[direction].map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
      }));
    },
    [],
  );

  const handleClose = useCallback(() => {
    setStep(0);
    setForm({ ...INITIAL_STATE });
    setError(null);
    setCreatedToolId(null);
    onClose();
  }, [onClose]);

  const canProceed = (): boolean => {
    if (step === 0) return form.name.trim().length > 0 && form.description.trim().length > 0;
    if (step === 1) return true; // Contract is optional
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      const tool = await createTool.mutateAsync({
        name: form.name,
        description: form.description,
      });
      setCreatedToolId(tool.id);

      const contract = {
        inputs: form.inputs,
        outputs: form.outputs,
      };
      await createVersion.mutateAsync({
        version: '0.1.0',
        contract_json: JSON.stringify(contract),
      });

      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register tool';
      setError(message);
    }
  };

  /* ---------- Step renderers ---------- */

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
              i < step
                ? 'bg-green-50 text-white'
                : i === step
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-20 text-gray-60',
            )}
          >
            {i < step ? <Check size={12} /> : i + 1}
          </div>
          <span
            className={cn(
              'text-xs',
              i === step ? 'text-cds-text-primary font-medium' : 'text-cds-text-secondary',
            )}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-30" />}
        </div>
      ))}
    </div>
  );

  const renderStep0 = () => (
    <div className="space-y-4">
      <Input
        id="tool-name"
        label="Tool Name"
        placeholder="e.g. FEA Solver"
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="tool-description" className="text-xs text-cds-text-secondary tracking-wide">
          Description
        </label>
        <textarea
          id="tool-description"
          className="w-full h-20 px-4 py-2 bg-cds-field-01 text-sm text-cds-text-primary placeholder:text-cds-text-placeholder border-0 border-b border-cds-border-strong focus:outline-2 focus:outline-cds-focus focus:outline-offset-[-2px] resize-none"
          placeholder="Describe what this tool does..."
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="tool-category" className="text-xs text-cds-text-secondary tracking-wide">
          Category
        </label>
        <select
          id="tool-category"
          className="w-full h-10 px-4 bg-cds-field-01 text-sm text-cds-text-primary border-0 border-b border-cds-border-strong focus:outline-2 focus:outline-cds-focus focus:outline-offset-[-2px]"
          value={form.category}
          onChange={(e) => update('category', e.target.value as ToolCategory)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="tool-adapter" className="text-xs text-cds-text-secondary tracking-wide">
          Adapter
        </label>
        <select
          id="tool-adapter"
          className="w-full h-10 px-4 bg-cds-field-01 text-sm text-cds-text-primary border-0 border-b border-cds-border-strong focus:outline-2 focus:outline-cds-focus focus:outline-offset-[-2px]"
          value={form.adapter}
          onChange={(e) => update('adapter', e.target.value as ToolAdapter)}
        >
          {ADAPTERS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderPortList = (direction: 'inputs' | 'outputs', label: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-cds-text-secondary font-medium tracking-wide">{label}</span>
        <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={() => addPort(direction)}>
          Add
        </Button>
      </div>
      {form[direction].length === 0 && (
        <p className="text-xs text-cds-text-placeholder py-2">No {label.toLowerCase()} defined yet.</p>
      )}
      {form[direction].map((port, idx) => (
        <div key={idx} className="flex items-center gap-2 bg-cds-layer-01 p-2 rounded">
          <input
            className="flex-1 h-8 px-2 bg-cds-field-01 text-xs text-cds-text-primary border-0 border-b border-cds-border-strong focus:outline-2 focus:outline-cds-focus"
            placeholder="Port name"
            value={port.name}
            onChange={(e) => updatePort(direction, idx, 'name', e.target.value)}
          />
          <select
            className="w-24 h-8 px-2 bg-cds-field-01 text-xs text-cds-text-primary border-0 border-b border-cds-border-strong focus:outline-2 focus:outline-cds-focus"
            value={port.type}
            onChange={(e) => updatePort(direction, idx, 'type', e.target.value)}
          >
            {PORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-cds-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={port.required ?? false}
              onChange={(e) => updatePort(direction, idx, 'required', e.target.checked)}
              className="accent-brand-primary"
            />
            Req
          </label>
          <button
            className="p-1 text-cds-icon-secondary hover:text-red-50 transition-colors"
            onClick={() => removePort(direction, idx)}
            aria-label={`Remove ${port.name || 'port'}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5">
      <p className="text-xs text-cds-text-helper">
        Define the input and output ports for this tool's contract. These determine how the tool connects in pipelines.
      </p>
      {renderPortList('inputs', 'Input Ports')}
      <div className="border-t border-cds-border-subtle" />
      {renderPortList('outputs', 'Output Ports')}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <Input
        id="tool-image"
        label="Docker Image"
        placeholder="e.g. registry.airaie.io/my-tool:1.0"
        value={form.image}
        onChange={(e) => update('image', e.target.value)}
      />
      <div className="grid grid-cols-3 gap-3">
        <Input
          id="tool-cpu"
          label="CPU Cores"
          type="number"
          min="1"
          max="64"
          value={form.cpu}
          onChange={(e) => update('cpu', e.target.value)}
        />
        <Input
          id="tool-memory"
          label="Memory (MB)"
          type="number"
          min="128"
          max="65536"
          value={form.memoryMb}
          onChange={(e) => update('memoryMb', e.target.value)}
        />
        <Input
          id="tool-timeout"
          label="Timeout (s)"
          type="number"
          min="10"
          max="7200"
          value={form.timeoutSeconds}
          onChange={(e) => update('timeoutSeconds', e.target.value)}
        />
      </div>
      <Toggle
        id="tool-sandbox-network"
        label="Allow network access in sandbox"
        checked={form.sandboxNetwork === 'allow'}
        onChange={(checked) => update('sandboxNetwork', checked ? 'allow' : 'deny')}
      />
      <div className="flex items-center gap-2 mt-2">
        <Badge variant={form.sandboxNetwork === 'deny' ? 'success' : 'warning'}>
          Network: {form.sandboxNetwork}
        </Badge>
      </div>
    </div>
  );

  const stepRenderers = [renderStep0, renderStep1, renderStep2];

  /* ---------- Footer ---------- */

  const footer = (
    <div className="flex items-center justify-between w-full px-4 py-3">
      <div>
        {step > 0 && (
          <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            variant="primary"
            size="sm"
            iconRight={<ChevronRight size={14} />}
            disabled={!canProceed()}
            onClick={() => setStep(step + 1)}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            disabled={!canProceed() || createTool.isPending || createVersion.isPending}
            onClick={handleSubmit}
          >
            {createTool.isPending || createVersion.isPending ? 'Registering...' : 'Register Tool'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Modal open={isOpen} onClose={handleClose} title="Register New Tool" size="lg" footer={footer}>
      {renderStepIndicator()}
      {stepRenderers[step]()}
      {error && (
        <div className="mt-4 p-3 bg-red-20 text-red-80 text-xs rounded" role="alert">
          {error}
        </div>
      )}
    </Modal>
  );
}
