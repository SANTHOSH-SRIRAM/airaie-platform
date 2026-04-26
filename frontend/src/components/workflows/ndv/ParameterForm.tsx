import { useState, useCallback, useMemo } from 'react';
import type { ToolContract } from '@store/toolTypesStore';
import { validateNodeInputs } from '@utils/nodeValidation';
import ParameterInput from './ParameterInput';
import ResourceLimitsSection from './ResourceLimitsSection';
import RetryPolicySection from './RetryPolicySection';

interface ParameterFormProps {
  contract: ToolContract | null;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  readOnly?: boolean;
  resourceLimits?: { cpu: number; memoryMb: number; timeoutSeconds: number };
  onResourceLimitsChange?: (limits: { cpu: number; memoryMb: number; timeoutSeconds: number }) => void;
  retryPolicy?: { maxRetries: number; delaySeconds: number };
  onRetryPolicyChange?: (policy: { maxRetries: number; delaySeconds: number }) => void;
}

export default function ParameterForm({
  contract,
  values,
  onChange,
  readOnly = false,
  resourceLimits,
  onResourceLimitsChange,
  retryPolicy,
  onRetryPolicyChange,
}: ParameterFormProps) {
  // Validation errors
  const validationErrors = useMemo(() => {
    if (!contract) return new Map<string, string>();
    const result = validateNodeInputs(values, contract);
    const errorMap = new Map<string, string>();
    for (const err of result.errors) {
      errorMap.set(err.field, err.message);
    }
    return errorMap;
  }, [contract, values]);

  // No contract: render a basic key-value editor
  if (!contract) {
    return (
      <div className="space-y-4 p-4">
        <KeyValueEditor values={values} onChange={onChange} readOnly={readOnly} />

        {onResourceLimitsChange && (
          <ResourceLimitsSection limits={resourceLimits} onChange={onResourceLimitsChange} />
        )}
        {onRetryPolicyChange && (
          <RetryPolicySection policy={retryPolicy} onChange={onRetryPolicyChange} />
        )}
      </div>
    );
  }

  // Contract-driven form
  return (
    <div>
      <div className="space-y-4 p-4">
        {contract.inputs.map((port) => (
          <ParameterInput
            key={port.name}
            port={port}
            value={values[port.name]}
            onChange={(v) => onChange(port.name, v)}
            readOnly={readOnly}
            error={validationErrors.get(port.name)}
          />
        ))}
        {contract.inputs.length === 0 && (
          <p className="py-4 text-center text-xs text-[#949494]">
            This tool has no configurable inputs.
          </p>
        )}
      </div>

      {onResourceLimitsChange && (
        <ResourceLimitsSection limits={resourceLimits} onChange={onResourceLimitsChange} />
      )}
      {onRetryPolicyChange && (
        <RetryPolicySection policy={retryPolicy} onChange={onRetryPolicyChange} />
      )}
    </div>
  );
}

// --- Fallback key-value editor when no contract is available ---

interface KeyValueEditorProps {
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  readOnly?: boolean;
}

function KeyValueEditor({ values, onChange, readOnly }: KeyValueEditorProps) {
  const [newKey, setNewKey] = useState('');
  const entries = Object.entries(values);

  const handleAdd = useCallback(() => {
    const key = newKey.trim();
    if (!key || key in values) return;
    onChange(key, '');
    setNewKey('');
  }, [newKey, values, onChange]);

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-[#949494]">
        No tool contract available. Edit parameters manually:
      </p>
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="min-w-[80px] text-[11px] font-medium text-[#1a1a1a]">{key}</span>
          <input
            type="text"
            value={typeof val === 'string' ? val : JSON.stringify(val ?? '')}
            onChange={(e) => onChange(key, e.target.value)}
            readOnly={readOnly}
            className="flex-1 rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
        </div>
      ))}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="new parameter key"
            className="flex-1 rounded-md border border-dashed border-[#d4d4d4] bg-[#fafaf8] px-2.5 py-1.5 text-xs text-[#949494] outline-none focus:border-blue-400"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newKey.trim()}
            className="rounded-md bg-[#f7f7f5] px-2 py-1.5 text-[11px] font-medium text-[#1a1a1a] hover:bg-[#efefef] disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
