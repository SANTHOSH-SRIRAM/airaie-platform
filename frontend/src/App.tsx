import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@constants/routes';
import { ThemeProvider } from '@contexts/ThemeContext';
import { AuthProvider } from '@contexts/AuthContext';
import AppShell from '@components/layout/AppShell';
import ProtectedRoute from '@components/auth/ProtectedRoute';
import ErrorBoundary from '@components/ui/ErrorBoundary';
import PageSkeleton from '@components/ui/PageSkeleton';
import DashboardPage from '@pages/DashboardPage';
import LoginPage from '@pages/LoginPage';
import RegisterPage from '@pages/RegisterPage';
import ForgotPasswordPage from '@pages/ForgotPasswordPage';
import ResetPasswordPage from '@pages/ResetPasswordPage';

/* -- Lazy-loaded pages (heavy deps: ReactFlow, recharts, rich editors) -- */
const WorkflowsPage = lazy(() => import('@pages/WorkflowsPage'));
const WorkflowDetailPage = lazy(() => import('@pages/WorkflowDetailPage'));
const WorkflowEditorPage = lazy(() => import('@pages/WorkflowEditorPage'));
const WorkflowRunsPage = lazy(() => import('@pages/WorkflowRunsPage'));
const WorkflowEvalPage = lazy(() => import('./pages/WorkflowEvalPage'));
const AgentsPage = lazy(() => import('@pages/AgentsPage'));
const AgentStudioPage = lazy(() => import('@pages/AgentStudioPage'));
const AgentPlaygroundPage = lazy(() => import('@pages/AgentPlaygroundPage'));
const BoardsPage = lazy(() => import('@pages/BoardsPage'));
const BoardDetailPage = lazy(() => import('@pages/BoardDetailPage'));
const CardDetailPage = lazy(() => import('@pages/CardDetailPage'));
const CreateBoardPage = lazy(() => import('@pages/CreateBoardPage'));
const ToolRegistryPage = lazy(() => import('@pages/ToolRegistryPage'));
const ToolDetailPage = lazy(() => import('@pages/ToolDetailPage'));
const RegisterToolPage = lazy(() => import('@pages/RegisterToolPage'));
const IntegrationsPage = lazy(() => import('@pages/IntegrationsPage'));
const CapabilitiesPage = lazy(() => import('@pages/CapabilitiesPage'));
const CommunityPage = lazy(() => import('@pages/CommunityPage'));
const ParametricLogicPage = lazy(() => import('@pages/ParametricLogicPage'));
const ArtifactsPage = lazy(() => import('@pages/ArtifactsPage'));
const ApprovalsPage = lazy(() => import('@pages/ApprovalsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ReleasePacketPage = lazy(() => import('./pages/ReleasePacketPage'));
const AdminLLMProvidersPage = lazy(() => import('@pages/AdminLLMProvidersPage'));
const AdminAuditPage = lazy(() => import('@pages/AdminAuditPage'));
const AdminCostPage = lazy(() => import('@pages/AdminCostPage'));

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Suspense>
  );
}

function ProtectedLazy({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <LazyPage>{children}</LazyPage>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* Public auth routes (no AppShell) */}
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

        {/* Protected app routes (with AppShell) */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path={ROUTES.DASHBOARD} element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
          <Route path={ROUTES.COMMUNITY} element={<LazyPage><CommunityPage /></LazyPage>} />
          <Route path="/parametric" element={<LazyPage><ParametricLogicPage /></LazyPage>} />
          <Route path={ROUTES.WORKFLOWS} element={<LazyPage><WorkflowsPage /></LazyPage>} />
          <Route path={ROUTES.WORKFLOW_DETAIL} element={<LazyPage><WorkflowDetailPage /></LazyPage>} />
          <Route path={ROUTES.AGENTS} element={<LazyPage><AgentsPage /></LazyPage>} />

          <Route path="/tools" element={<LazyPage><ToolRegistryPage /></LazyPage>} />
          <Route path={ROUTES.TOOL_DETAIL} element={<LazyPage><ToolDetailPage /></LazyPage>} />
          <Route path="/tools/register" element={<LazyPage><RegisterToolPage /></LazyPage>} />
          <Route path="/integrations" element={<LazyPage><IntegrationsPage /></LazyPage>} />
          <Route path="/capabilities" element={<LazyPage><CapabilitiesPage /></LazyPage>} />
          <Route path={ROUTES.ARTIFACTS} element={<LazyPage><ArtifactsPage /></LazyPage>} />
          <Route path={ROUTES.APPROVALS} element={<LazyPage><ApprovalsPage /></LazyPage>} />
          <Route path={ROUTES.PROFILE} element={<LazyPage><ProfilePage /></LazyPage>} />

          {/* Embedded studio routes */}
          <Route path={ROUTES.BOARDS} element={<LazyPage><BoardsPage /></LazyPage>} />
          <Route path={ROUTES.RELEASE_PACKET} element={<LazyPage><ReleasePacketPage /></LazyPage>} />
          <Route path="/boards/create" element={<LazyPage><CreateBoardPage /></LazyPage>} />
          <Route path={ROUTES.WORKFLOW_STUDIO} element={<LazyPage><WorkflowEditorPage /></LazyPage>} />
          <Route path="/workflow-studio/:workflowId" element={<LazyPage><WorkflowEditorPage /></LazyPage>} />
          <Route path={ROUTES.AGENT_STUDIO} element={<LazyPage><AgentStudioPage /></LazyPage>} />
          <Route path="/agent-studio/:agentId" element={<LazyPage><AgentStudioPage /></LazyPage>} />
          <Route path="/agent-playground" element={<LazyPage><AgentPlaygroundPage /></LazyPage>} />
          <Route path="/agent-playground/:agentId" element={<LazyPage><AgentPlaygroundPage /></LazyPage>} />
          <Route path="/workflow-runs" element={<LazyPage><WorkflowRunsPage /></LazyPage>} />
          <Route path="/workflow-runs/:runId" element={<LazyPage><WorkflowRunsPage /></LazyPage>} />

          {/* Admin (Phase F: gate behind admin role) */}
          <Route path={ROUTES.ADMIN_LLM_PROVIDERS} element={<LazyPage><AdminLLMProvidersPage /></LazyPage>} />
          <Route path={ROUTES.ADMIN_AUDIT} element={<LazyPage><AdminAuditPage /></LazyPage>} />
          <Route path={ROUTES.ADMIN_COST} element={<LazyPage><AdminCostPage /></LazyPage>} />
        </Route>
        {/* Board detail -- full-screen standalone page (protected, no AppShell) */}
        <Route path="/boards/:boardId" element={<ProtectedLazy><BoardDetailPage /></ProtectedLazy>} />

        {/* Card detail -- per-card route (Phase 8 Card-as-page).
            Mounted inside AppShell so the sidebar can render ThisBoardNav +
            ThisCardStatusPill while on this route. */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path={ROUTES.CARD_DETAIL} element={<LazyPage><CardDetailPage /></LazyPage>} />
        </Route>

        {/* Workflow Eval -- full-screen standalone page */}
        <Route path={ROUTES.WORKFLOW_EVAL} element={<ProtectedLazy><WorkflowEvalPage /></ProtectedLazy>} />

        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
