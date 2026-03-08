import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

/** Routes that render an embedded studio iframe — need full height, no scroll, no grid bg */
const STUDIO_ROUTES = ['/boards', '/workflow-studio', '/agent-studio'];

export default function AppShell() {
  const { pathname } = useLocation();
  const isStudio = STUDIO_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main
          className={
            isStudio
              ? 'flex-1 overflow-hidden bg-surface-bg'
              : 'flex-1 overflow-y-auto bg-surface-bg bg-grid'
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
