import { useState } from 'react';
import { Upload, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useCompileWorkflow, usePublishWorkflowVersion } from '@hooks/useWorkflow';
import type { CompileResult } from '@api/workflows';

interface PublishModalProps {
  workflowId: string;
  version: number;
  isOpen: boolean;
  onClose: () => void;
  onPublished: () => void;
}

type PublishStep = 'confirm' | 'compiling' | 'compile-failed' | 'publishing' | 'done';

export default function PublishModal({
  workflowId,
  version,
  isOpen,
  onClose,
  onPublished,
}: PublishModalProps) {
  const [step, setStep] = useState<PublishStep>('confirm');
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);

  const compileMutation = useCompileWorkflow();
  const publishMutation = usePublishWorkflowVersion(workflowId);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    // Step 1: Compile
    setStep('compiling');
    try {
      const result = await compileMutation.mutateAsync({ workflowId, version });
      setCompileResult(result);

      if (!result.success) {
        setStep('compile-failed');
        return;
      }

      // Step 2: Publish
      setStep('publishing');
      await publishMutation.mutateAsync(version);
      setStep('done');
      onPublished();
    } catch {
      setStep('compile-failed');
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setCompileResult(null);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-[440px] rounded-[16px] border border-[#ece9e3] bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-[#ece9e3] px-6 py-4">
            <div className="flex items-center gap-2">
              <Upload size={18} className="text-[#1a1a1a]" />
              <h2 className="text-[15px] font-semibold text-[#1a1a1a]">
                Publish Version {version}
              </h2>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {step === 'confirm' && (
              <div>
                <p className="text-[13px] leading-relaxed text-[#4a4a4a]">
                  Publishing <strong>v{version}</strong> will make it available for execution.
                  This action is irreversible -- published versions cannot be modified.
                </p>
                <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                    <p className="text-[12px] text-amber-700">
                      The workflow will be compiled before publishing. Any compilation errors
                      will prevent the publish.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 'compiling' && (
              <div className="flex items-center gap-3 py-4">
                <Loader2 size={20} className="animate-spin text-blue-500" />
                <div>
                  <p className="text-[13px] font-medium text-[#1a1a1a]">Compiling workflow...</p>
                  <p className="text-[11px] text-[#8d8d8d]">Validating nodes and connections</p>
                </div>
              </div>
            )}

            {step === 'compile-failed' && (
              <div>
                <div className="flex items-center gap-2">
                  <XCircle size={18} className="text-red-500" />
                  <p className="text-[13px] font-medium text-red-700">
                    Compilation failed
                  </p>
                </div>
                {compileResult?.errors && compileResult.errors.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {compileResult.errors.map((err, i) => (
                      <div key={i} className="rounded-lg bg-red-50 px-3 py-2">
                        {err.node_id && (
                          <span className="block text-[10px] font-mono text-red-400">
                            {err.node_id}
                          </span>
                        )}
                        <p className="text-[12px] text-red-700">{err.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 'publishing' && (
              <div className="flex items-center gap-3 py-4">
                <Loader2 size={20} className="animate-spin text-emerald-500" />
                <div>
                  <p className="text-[13px] font-medium text-[#1a1a1a]">Publishing version...</p>
                  <p className="text-[11px] text-[#8d8d8d]">Making v{version} available for execution</p>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="flex items-center gap-3 py-4">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <div>
                  <p className="text-[13px] font-medium text-[#1a1a1a]">
                    Version {version} published successfully
                  </p>
                  <p className="text-[11px] text-[#8d8d8d]">
                    It is now available for execution
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[#ece9e3] px-6 py-4">
            {step === 'confirm' && (
              <>
                <button
                  onClick={handleClose}
                  className="h-[36px] rounded-[10px] border border-[#e0e0e0] px-4 text-[13px] font-medium text-[#4a4a4a] transition-colors hover:bg-[#f8f8f7]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="h-[36px] rounded-[10px] bg-emerald-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  Compile & Publish
                </button>
              </>
            )}

            {step === 'compile-failed' && (
              <button
                onClick={handleClose}
                className="h-[36px] rounded-[10px] border border-[#e0e0e0] px-4 text-[13px] font-medium text-[#4a4a4a] transition-colors hover:bg-[#f8f8f7]"
              >
                Close
              </button>
            )}

            {step === 'done' && (
              <button
                onClick={handleClose}
                className="h-[36px] rounded-[10px] bg-[#242424] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#1a1a1a]"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
