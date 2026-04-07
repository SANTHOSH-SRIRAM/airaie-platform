import { useState, useCallback, useMemo, useRef } from 'react';
import { Braces, FolderSearch } from 'lucide-react';
import { cn } from '@utils/cn';
import type { ToolContractPort } from '@store/toolTypesStore';

interface ParameterInputProps {
  port: ToolContractPort;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  error?: string;
}

/** Expression autocomplete hints for the AIRAIE DSL */
const EXPRESSION_HINTS = [
  { label: '$inputs.', description: 'Reference upstream node output' },
  { label: '$nodes.', description: 'Access any node by ID' },
  { label: '$board.', description: 'Board-level context variables' },
  { label: '$env.', description: 'Environment variables' },
  { label: '$run.id', description: 'Current run identifier' },
  { label: '$run.startedAt', description: 'Run start timestamp' },
  { label: '$artifact(', description: 'Reference an artifact by ID' },
  { label: '$gate.', description: 'Governance gate status' },
];

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

  // Expression mode: text input with {{ }} placeholder and autocomplete hints
  const [showHints, setShowHints] = useState(false);
  const expressionInputRef = useRef<HTMLInputElement>(null);

  const handleExpressionFocus = useCallback(() => setShowHints(true), []);
  const handleExpressionBlur = useCallback(() => {
    // Delay to allow hint click to register
    setTimeout(() => setShowHints(false), 150);
  }, []);

  const handleHintClick = useCallback(
    (hint: string) => {
      const current = typeof value === 'string' ? value : '';
      // Insert hint at cursor or append
      const newValue = current.endsWith('{{') || current.endsWith('{{ ')
        ? current + hint
        : current + (current ? ' ' : '') + '{{ ' + hint;
      onChange(newValue);
      expressionInputRef.current?.focus();
    },
    [value, onChange],
  );

  // Filter hints based on current input
  const filteredHints = useMemo(() => {
    const strVal = typeof value === 'string' ? value : '';
    // Extract the last expression token after {{ or $
    const match = strVal.match(/(?:\{\{\s*|\$)(\w*)\.?(\w*)$/);
    if (!match) return EXPRESSION_HINTS;
    const prefix = match[0].replace(/^\{\{\s*/, '').replace(/^\$/, '$');
    return EXPRESSION_HINTS.filter((h) => h.label.startsWith(prefix) || prefix === '');
  }, [value]);

  if (expressionMode) {
    return (
      <ParameterWrapper
        label={label}
        required={port.required}
        description={port.description}
        error={error}
        expressionMode={expressionMode}
        onExpressionToggle={handleExpressionToggle}
      >
        <div className="relative">
          <input
            ref={expressionInputRef}
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleExpressionFocus}
            onBlur={handleExpressionBlur}
            readOnly={readOnly}
            placeholder="{{ $inputs.field_name }}"
            className={cn(
              'w-full rounded-md border px-2.5 py-1.5 font-mono text-xs outline-none',
              'border-amber-300 bg-amber-50 text-amber-800',
              'focus:border-amber-400 focus:ring-1 focus:ring-amber-400',
              readOnly && 'cursor-not-allowed opacity-60'
            )}
          />
          {showHints && !readOnly && filteredHints.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[160px] overflow-y-auto rounded-lg border border-[#eceae4] bg-white shadow-md">
              {filteredHints.map((hint) => (
                <button
                  key={hint.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleHintClick(hint.label)}
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-[#f8f8f7]"
                >
                  <span className="font-mono text-[11px] text-amber-700">{hint.label}</span>
                  <span className="truncate text-[10px] text-[#949494]">{hint.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
