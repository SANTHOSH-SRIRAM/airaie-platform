import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@constants/routes';
import { ThemeProvider } from '@contexts/ThemeContext';
import AppShell from '@components/layout/AppShell';
import ErrorBoundary from '@components/ui/ErrorBoundary';
import PageSkeleton from '@components/ui/PageSkeleton';
import DashboardPage from '@pages/DashboardPage';

/* ── Lazy-loaded pages (heavy deps: ReactFlow, recharts, rich editors) ── */
const WorkflowsPage = lazy(() => import('@pages/WorkflowsPage'));
const WorkflowDetailPage = lazy(() => import('@pages/WorkflowDetailPage'));
const WorkflowEditorPage = lazy(() => import('@pages/WorkflowEditorPage'));
const WorkflowRunsPage = lazy(() => import('@pages/WorkflowRunsPage'));
const AgentsPage = lazy(() => import('@pages/AgentsPage'));
const AgentStudioPage = lazy(() => import('@pages/AgentStudioPage'));
const AgentPlaygroundPage = lazy(() => import('@pages/AgentPlaygroundPage'));
const BoardsPage = lazy(() => import('@pages/BoardsPage'));
const BoardDetailPage = lazy(() => import('@pages/BoardDetailPage'));
const CreateBoardPage = lazy(() => import('@pages/CreateBoardPage'));
const ToolRegistryPage = lazy(() => import('@pages/ToolRegistryPage'));
const IntegrationsPage = lazy(() => import('@pages/IntegrationsPage'));
const CapabilitiesPage = lazy(() => import('@pages/CapabilitiesPage'));
const CommunityPage = lazy(() => import('@pages/CommunityPage'));
const ParametricLogicPage = lazy(() => import('@pages/ParametricLogicPage'));

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path={ROUTES.DASHBOARD} element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
          <Route path={ROUTES.COMMUNITY} element={<LazyPage><CommunityPage /></LazyPage>} />
          <Route path="/parametric" element={<LazyPage><ParametricLogicPage /></LazyPage>} />
          <Route path={ROUTES.WORKFLOWS} element={<LazyPage><WorkflowsPage /></LazyPage>} />
          <Route path={ROUTES.WORKFLOW_DETAIL} element={<LazyPage><WorkflowDetailPage /></LazyPage>} />
          <Route path={ROUTES.AGENTS} element={<LazyPage><AgentsPage /></LazyPage>} />

          <Route path="/tools" element={<LazyPage><ToolRegistryPage /></LazyPage>} />
          <Route path="/integrations" element={<LazyPage><IntegrationsPage /></LazyPage>} />
          <Route path="/capabilities" element={<LazyPage><CapabilitiesPage /></LazyPage>} />

          {/* Embedded studio routes */}
          <Route path={ROUTES.BOARDS} element={<LazyPage><BoardsPage /></LazyPage>} />
          <Route path="/boards/create" element={<LazyPage><CreateBoardPage /></LazyPage>} />
          <Route path={ROUTES.WORKFLOW_STUDIO} element={<LazyPage><WorkflowEditorPage /></LazyPage>} />
          <Route path="/workflow-studio/:workflowId" element={<LazyPage><WorkflowEditorPage /></LazyPage>} />
          <Route path={ROUTES.AGENT_STUDIO} element={<LazyPage><AgentStudioPage /></LazyPage>} />
          <Route path="/agent-studio/:agentId" element={<LazyPage><AgentStudioPage /></LazyPage>} />
          <Route path="/agent-playground" element={<LazyPage><AgentPlaygroundPage /></LazyPage>} />
          <Route path="/agent-playground/:sessionId" element={<LazyPage><AgentPlaygroundPage /></LazyPage>} />
          <Route path="/workflow-runs" element={<LazyPage><WorkflowRunsPage /></LazyPage>} />
          <Route path="/workflow-runs/:runId" element={<LazyPage><WorkflowRunsPage /></LazyPage>} />
        </Route>
        {/* Board detail — full-screen standalone page (no AppShell) */}
        <Route path="/boards/:boardId" element={<LazyPage><BoardDetailPage /></LazyPage>} />
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
