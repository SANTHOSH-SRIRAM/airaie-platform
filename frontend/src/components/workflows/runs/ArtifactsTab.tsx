import { Package } from 'lucide-react';

interface ArtifactsTabProps {
  runId: string;
}

export default function ArtifactsTab({ runId }: ArtifactsTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <Package size={32} className="text-cds-icon-secondary mb-3" />
      <p className="text-sm text-cds-text-primary mb-1">Artifacts for run {runId}</p>
      <p className="text-xs text-cds-text-secondary">
        Artifacts will appear here when nodes produce output files.
      </p>
    </div>
  );
}
