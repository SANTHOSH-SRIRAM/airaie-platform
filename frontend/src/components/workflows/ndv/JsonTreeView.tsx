import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '@utils/cn';

interface JsonTreeViewProps {
  data: unknown;
  initialExpanded?: number;
}

export default function JsonTreeView({ data, initialExpanded = 2 }: JsonTreeViewProps) {
  return (
    <div className="font-mono text-xs leading-relaxed">
      <JsonNode data={data} depth={0} initialExpanded={initialExpanded} path="root" />
    </div>
  );
}

// --- Internal components ---

interface JsonNodeProps {
  data: unknown;
  depth: number;
  initialExpanded: number;
  path: string;
  keyName?: string;
}

function JsonNode({ data, depth, initialExpanded, path, keyName }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < initialExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [data]
  );

  const isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
  const isArray = Array.isArray(data);
  const isExpandable = isObject || isArray;

  if (!isExpandable) {
    return (
      <div className="group flex items-center gap-1 py-0.5" style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && (
          <span className="font-semibold text-[#1a1a1a]">{keyName}: </span>
        )}
        <ValueDisplay value={data} />
        <button
          onClick={handleCopy}
          className="invisible ml-1 text-[#949494] hover:text-[#1a1a1a] group-hover:visible"
          aria-label="Copy value"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
        </button>
      </div>
    );
  }

  const entries = isArray
    ? data.map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(data as Record<string, unknown>);

  const bracket = isArray ? ['[', ']'] : ['{', '}'];
  const lengthLabel = isArray
    ? `(${data.length})`
    : `(${Object.keys(data as Record<string, unknown>).length} keys)`;

  return (
    <div>
      <div
        className="group flex cursor-pointer items-center gap-1 py-0.5 hover:bg-[#f7f7f5]"
        style={{ paddingLeft: depth * 16 }}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown size={12} className="shrink-0 text-[#949494]" />
        ) : (
          <ChevronRight size={12} className="shrink-0 text-[#949494]" />
        )}
        {keyName !== undefined && (
          <span className="font-semibold text-[#1a1a1a]">{keyName}: </span>
        )}
        <span className="text-[#949494]">
          {bracket[0]} {!expanded && <span>... {bracket[1]}</span>}{' '}
          <span className="text-[10px]">{lengthLabel}</span>
        </span>
        <button
          onClick={handleCopy}
          className="invisible ml-1 text-[#949494] hover:text-[#1a1a1a] group-hover:visible"
          aria-label="Copy subtree"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
        </button>
      </div>
      {expanded && (
        <>
          {entries.map(([key, value]) => (
            <JsonNode
              key={`${path}.${key}`}
              data={value}
              depth={depth + 1}
              initialExpanded={initialExpanded}
              path={`${path}.${key}`}
              keyName={key}
            />
          ))}
          <div className="py-0.5 text-[#949494]" style={{ paddingLeft: depth * 16 }}>
            {bracket[1]}
          </div>
        </>
      )}
    </div>
  );
}

function ValueDisplay({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-[#949494]">null</span>;
  }
  if (value === undefined) {
    return <span className="text-[#949494]">undefined</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-green-700">"{value}"</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-blue-600">{value}</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span
        className={cn(
          'rounded px-1 py-0.5 text-[10px] font-medium',
          value ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
        )}
      >
        {String(value)}
      </span>
    );
  }
  return <span className="text-[#949494]">{String(value)}</span>;
}
