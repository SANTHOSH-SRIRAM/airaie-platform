import { useState, useCallback, useMemo } from 'react';
import { Braces, FolderSearch } from 'lucide-react';
import { cn } from '@utils/cn';
import type { ToolContractPort } from '@store/toolTypesStore';
import { useWorkflowStore } from '@store/workflowStore';
import { getUpstreamOutputs } from '@utils/upstreamOutputs';
import ExpressionAutocomplete from './ExpressionAutocomplete';

interface ParameterInputProps {
  port: ToolContractPort;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  error?: string;
  /**
   * Optional id of the node this input belongs to. When supplied, the
   * expression-mode autocomplete pulls suggestions from upstream nodes in
   * the workflow store. Falls back to `selectedNodeId` from the store when
   * not provided.
   */
  currentNodeId?: string;
}

/** Convert snake_case or camelCase to Title Case */
function toTitleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ParameterInput({
  port,
  value,
  onChange,
  readOnly = false,
  error,
  currentNodeId,
}: ParameterInputProps) {
  const [expressionMode, setExpressionMode] = useState(false);

  const label = toTitleCase(port.name);
  const schemaType = (port.schema?.type as string) ?? '';
  const enumValues = port.schema?.enum as string[] | undefined;
  const minVal = port.schema?.minimum as number | undefined;
  const maxVal = port.schema?.maximum as number | undefined;
  const maxLength = port.schema?.maxLength as number | undefined;
  const descMentionsLong = port.description?.toLowerCase().includes('long');
  const useTextarea =
    (schemaType === 'string' && (descMentionsLong || (maxLength !== undefined && maxLength > 200))) ||
    schemaType === 'object' ||
    schemaType === 'array';

  const handleExpressionToggle = useCallback(() => {
    setExpressionMode((v) => !v);
  }, []);

  // Pull workflow graph for expression autocomplete. Falls back to the
  // currently-selected node if the caller did not pass `currentNodeId`.
  const storeNodes = useWorkflowStore((s) => s.nodes);
  const storeEdges = useWorkflowStore((s) => s.edges);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const resolvedNodeId = currentNodeId ?? selectedNodeId ?? '';

  const upstreamSuggestions = useMemo(
    () => getUpstreamOutputs(resolvedNodeId, storeNodes, storeEdges),
    [resolvedNodeId, storeNodes, storeEdges],
  );

  if (expressionMode) {
    const expressionMultiline =
      schemaType === 'object' || schemaType === 'array' || useTextarea;
    return (
      <ParameterWrapper
        label={label}
        required={port.required}
        description={port.description}
        error={error}
        expressionMode={expressionMode}
        onExpressionToggle={handleExpressionToggle}
      >
        <ExpressionAutocomplete
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
          suggestions={upstreamSuggestions}
          placeholder="{{ $('NodeName').json.port }}"
          readOnly={readOnly}
          multiline={expressionMultiline}
        />
      </ParameterWrapper>
    );
  }

  // Artifact type: text input with Browse button
  if (port.type === 'artifact') {
    return (
      <ParameterWrapper
        label={label}
        required={port.required}
        description={port.description}
        error={error}
        expressionMode={expressionMode}
        onExpressionToggle={handleExpressionToggle}
      >
        <div className="flex gap-1.5">
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            placeholder="artifact ID or path"
            className={cn(
              inputClasses,
              'flex-1',
              readOnly && 'cursor-not-allowed opacity-60'
            )}
          />
          <button
            type="button"
            disabled={readOnly}
            className="flex items-center gap-1 rounded-md border border-[#eceae4] bg-[#f7f7f5] px-2 py-1.5 text-[11px] text-[#1a1a1a] hover:bg-[#efefef] disabled:opacity-50"
          >
            <FolderSearch size={12} />
            Browse
          </button>
        </div>
      </ParameterWrapper>
    );
  }

  // Enum: dropdown select
  if (enumValues && enumValues.length > 0) {
    return (
      <ParameterWrapper
        label={label}
        required={port.required}
        description={port.description}
        error={error}
        expressionMode={expressionMode}
        onExpressionToggle={handleExpressionToggle}
      >
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={cn(inputClasses, readOnly && 'cursor-not-allowed opacity-60')}
        >
          <option value="">Select...</option>
          {enumValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </ParameterWrapper>
    );
  }

  // Boolean: toggle switch
  if (schemaType === 'boolean') {
    return (
      <ParameterWrapper
        label={label}
        required={port.required}
        description={port.description}
        error={error}
        expressionMode={expressionMode}
        onExpressionToggle={handleExpressionToggle}
      >
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          disabled={readOnly}
          onClick={() => onChange(!value)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            value ? 'bg-blue-500' : 'bg-[#d4d4d4]',
            readOnly && 'cursor-not-allowed opacity-60'
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              value ? 'translate-x-4' : 'translate-x-0'
            )}
          />
        </button>
      </ParameterWrapper>
    );
  }

  // Number / integer
  if (schemaType === 'number' || schemaType === 'integer') {
    return (
      <ParameterWrapper
        label={label}
        required={port.required}
        description={port.description}
        error={error}
        expressionMode={expressionMode}
        onExpressionToggle={handleExpressionToggle}
      >
        <input
          type="number"
          value={value !== undefined && value !== null ? Number(value) : ''}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange(undefined);
            } else {
              onChange(schemaType === 'integer' ? parseInt(raw, 10) : parseFloat(raw));
            }
          }}
          readOnly={readOnly}
          min={minVal}
          max={maxVal}
          step={schemaType === 'integer' ? 1 : undefined}
          placeholder={
            minVal !== undefined && maxVal !== undefined
              ? `${minVal} - ${maxVal}`
              : undefined
          }
          className={cn(inputClasses, readOnly && 'cursor-not-allowed opacity-60')}
        />
      </ParameterWrapper>
    );
  }

  // Object / Array: JSON textarea
  if (useTextarea) {
    const jsonValue = useMemo(() => {
      if (typeof value === 'string') return value;
      if (value === undefined || value === null) return '';
      return JSON.stringify(value, null, 2);
    }, [value]);

    return (
      <ParameterWrapper
        label={label}
        required={port.required}
        description={port.description}
        error={error}
        expressionMode={expressionMode}
        onExpressionToggle={handleExpressionToggle}
      >
        <textarea
          value={jsonValue}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          readOnly={readOnly}
          rows={4}
          placeholder={schemaType === 'array' ? '[]' : '{}'}
          className={cn(
            inputClasses,
            'resize-y font-mono',
            readOnly && 'cursor-not-allowed opacity-60'
          )}
        />
      </ParameterWrapper>
    );
  }

  // Default: text input (string or fallback)
  return (
    <ParameterWrapper
      label={label}
      required={port.required}
      description={port.description}
      error={error}
      expressionMode={expressionMode}
      onExpressionToggle={handleExpressionToggle}
    >
      <input
        type="text"
        value={typeof value === 'string' ? value : (value !== undefined && value !== null ? String(value) : '')}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={cn(inputClasses, readOnly && 'cursor-not-allowed opacity-60')}
      />
    </ParameterWrapper>
  );
}

// --- Shared wrapper ---

const inputClasses =
  'w-full rounded-md border border-[#eceae4] bg-white px-2.5 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400';

interface ParameterWrapperProps {
  label: string;
  required: boolean;
  description?: string;
  error?: string;
  expressionMode: boolean;
  onExpressionToggle: () => void;
  children: React.ReactNode;
}

function ParameterWrapper({
  label,
  required,
  description,
  error,
  expressionMode,
  onExpressionToggle,
  children,
}: ParameterWrapperProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-[#1a1a1a]">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={onExpressionToggle}
          className={cn(
            'rounded p-0.5 text-[#949494] hover:text-[#1a1a1a]',
            expressionMode && 'bg-amber-100 text-amber-700'
          )}
          title="Toggle expression mode"
          aria-label="Toggle expression mode"
        >
          <Braces size={12} />
        </button>
      </div>
      {children}
      {description && (
        <p className="text-[10px] leading-tight text-[#949494]">{description}</p>
      )}
      {error && (
        <p className="text-[10px] font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}
