import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@constants/routes';
import AppShell from '@components/layout/AppShell';
import DashboardPage from '@pages/DashboardPage';
import WorkflowsPage from '@pages/WorkflowsPage';
import AgentsPage from '@pages/AgentsPage';
import BoardStudioPage from '@pages/BoardStudioPage';
import WorkflowStudioPage from '@pages/WorkflowStudioPage';
import AgentStudioPage from '@pages/AgentStudioPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.WORKFLOWS} element={<WorkflowsPage />} />
          <Route path={ROUTES.AGENTS} element={<AgentsPage />} />

          {/* Embedded studio routes */}
          <Route path={ROUTES.BOARDS} element={<BoardStudioPage />} />
          <Route path={ROUTES.WORKFLOW_STUDIO} element={<WorkflowStudioPage />} />
          <Route path={ROUTES.AGENT_STUDIO} element={<AgentStudioPage />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
