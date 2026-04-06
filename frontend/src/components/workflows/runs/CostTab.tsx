import type { RunDetail } from '@/types/run';

interface CostTabProps {
  runDetail: RunDetail | undefined;
}

export default function CostTab({ runDetail }: CostTabProps) {
  if (!runDetail) {
    return (
      <div className="p-4 text-xs text-cds-text-secondary">No run data available.</div>
    );
  }

  return (
    <div className="p-3">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-left text-cds-text-secondary border-b border-cds-border-subtle">
            <th className="pb-2 font-medium">Node</th>
            <th className="pb-2 font-medium text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          {runDetail.nodes.map((node) => (
            <tr key={node.nodeId} className="border-b border-cds-border-subtle/50">
              <td className="py-1.5 text-cds-text-primary">{node.nodeName}</td>
              <td className="py-1.5 text-right text-cds-text-primary">
                {node.metrics ? `$${node.metrics.costUsd.toFixed(2)}` : '\u2014'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="pt-2 text-cds-text-primary">Total</td>
            <td className="pt-2 text-right text-cds-text-primary">
              ${runDetail.costUsd.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
