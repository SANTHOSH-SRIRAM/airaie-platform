import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUiStore } from '@store/uiStore';

const STUDIO_ROUTES = ['/workflow-studio', '/agent-studio'];

export default function AppShell() {
  const { pathname } = useLocation();
  const studioFullscreen = useUiStore((s) => s.studioFullscreen);

  const setStudioFullscreen = useUiStore((s) => s.setStudioFullscreen);
  const isStudio = STUDIO_ROUTES.some((r) => pathname.startsWith(r));
  const isBoardStudio = pathname.startsWith('/boards');
  const hideChrome = isStudio || (isBoardStudio && studioFullscreen);

  // Reset fullscreen when navigating away from boards
  useEffect(() => {
    if (!isBoardStudio && studioFullscreen) {
      setStudioFullscreen(false);
    }
  }, [isBoardStudio, studioFullscreen, setStudioFullscreen]);


  // Use CSS to hide/show sidebar instead of conditional rendering
  // This prevents the iframe from unmounting and reloading
  return (
    <div className="flex h-screen overflow-hidden bg-surface-bg">
      <div className={hideChrome ? 'hidden' : 'contents'}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className={hideChrome ? 'hidden' : 'contents'}>
          <Header />
        </div>
        <main className={hideChrome ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto bg-surface-bg bg-grid'}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
