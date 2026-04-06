import { lazy, Suspense, type ReactNode } from 'react';
import { useUiStore } from '@store/uiStore';

const SystemStatusBar = lazy(() => import('@components/dashboard/SystemStatusBar'));
const WorkflowEditorBottomBar = lazy(() => import('@components/workflows/WorkflowEditorBottomBar'));
const RunActionBar = lazy(() => import('@components/workflows/runs/RunActionBar'));
const PlaygroundActionBar = lazy(() => import('@components/agents/PlaygroundActionBar'));
const ToolRegistryActionBar = lazy(() => import('@components/tools/ToolRegistryActionBar'));

interface BottomBarProps {
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  centerContent?: ReactNode;
}

export default function BottomBar({ leftActions, rightActions, centerContent }: BottomBarProps) {
  const bottomBar = useUiStore((s) => s.bottomBar);

  // Route to content-type specific bar
  if (bottomBar.contentType === 'workflow-editor') {
    return (
      <Suspense fallback={<div className="h-full" />}>
        <WorkflowEditorBottomBar />
      </Suspense>
    );
  }

  if (bottomBar.contentType === 'run-actions') {
    return <Suspense fallback={<div className="h-full" />}><RunActionBar /></Suspense>;
  }

  if (bottomBar.contentType === 'agent-playground') {
    return <Suspense fallback={<div className="h-full" />}><PlaygroundActionBar /></Suspense>;
  }

  if (bottomBar.contentType === 'tool-registry') {
    return <Suspense fallback={<div className="h-full" />}><ToolRegistryActionBar /></Suspense>;
  }

  if (bottomBar.contentType === 'system-status') {
    return (
      <Suspense fallback={<div className="h-full" />}>
        <SystemStatusBar />
      </Suspense>
    );
  }

  return (
    <div
      data-testid="bottom-bar"
      role="toolbar"
      aria-label="Page actions"
      className="inline-flex items-center h-10 px-5 bg-[#fbfaf9] rounded-full shadow-card"
    >
      <div className="flex items-center gap-3">
        {leftActions}
        <div className="flex items-center gap-2 text-[13px] text-[#949494]">
          {centerContent ?? <span>{bottomBar.contentType}</span>}
        </div>
        {rightActions}
      </div>
    </div>
  );
}
