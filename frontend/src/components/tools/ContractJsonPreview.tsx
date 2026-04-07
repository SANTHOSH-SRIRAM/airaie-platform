import { cn } from '@utils/cn';

interface ContractJsonPreviewProps {
  data: unknown;
  className?: string;
}

function syntaxHighlight(json: string): string {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'text-[#ff9800]'; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-[#2196f3]'; // key
        } else {
          cls = 'text-[#4caf50]'; // string
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-[#e74c3c]'; // boolean
      } else if (/null/.test(match)) {
        cls = 'text-[#acacac]'; // null
      }
      return `<span class="${cls}">${match}</span>`;
    },
  );
}

export default function ContractJsonPreview({ data, className }: ContractJsonPreviewProps) {
  const jsonStr = JSON.stringify(data, null, 2);
  const highlighted = syntaxHighlight(jsonStr);

  return (
    <div className={cn('rounded-[8px] bg-[#1a1a1a] p-4 overflow-auto max-h-[400px]', className)}>
      <pre
        className="font-mono text-[11px] leading-[18px] text-[#e0e0e0] whitespace-pre"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}
