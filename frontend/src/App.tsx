import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@constants/routes';
import { ThemeProvider } from '@contexts/ThemeContext';
import AppShell from '@components/layout/AppShell';
import DashboardPage from '@pages/DashboardPage';
import WorkflowsPage from '@pages/WorkflowsPage';
import AgentsPage from '@pages/AgentsPage';
import BoardStudioPage from '@pages/BoardStudioPage';
import WorkflowStudioPage from '@pages/WorkflowStudioPage';
import AgentStudioPage from '@pages/AgentStudioPage';
import ToolsPage from '@pages/ToolsPage';
import IntegrationsPage from '@pages/IntegrationsPage';
import CapabilitiesPage from '@pages/CapabilitiesPage';

function App() {
  return (
    <ThemeProvider defaultTheme="light">
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.WORKFLOWS} element={<WorkflowsPage />} />
          <Route path={ROUTES.AGENTS} element={<AgentsPage />} />

          <Route path="/tools/*" element={<ToolsPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/capabilities" element={<CapabilitiesPage />} />

          {/* Embedded studio routes */}
          <Route path={ROUTES.BOARDS} element={<BoardStudioPage />} />
          <Route path={ROUTES.WORKFLOW_STUDIO} element={<WorkflowStudioPage />} />
          <Route path={ROUTES.AGENT_STUDIO} element={<AgentStudioPage />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
