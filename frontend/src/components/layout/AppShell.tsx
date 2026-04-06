import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ModalStack from './ModalStack';
import RightPanel from './RightPanel';
import VerticalToolbar from './VerticalToolbar';
import BottomBar from './BottomBar';
import { useUiStore } from '@store/uiStore';
import { ROUTE_SIDEBAR_MAP } from '@constants/routes';

const STUDIO_ROUTES = ['/agent-studio', '/workflow-studio', '/workflow-runs'];

export default function AppShell() {
  const { pathname } = useLocation();
  const studioFullscreen = useUiStore((s) => s.studioFullscreen);
  const setStudioFullscreen = useUiStore((s) => s.setStudioFullscreen);
  const rightPanel = useUiStore((s) => s.rightPanel);
  const closeRightPanel = useUiStore((s) => s.closeRightPanel);
  const bottomBar = useUiStore((s) => s.bottomBar);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const collapseSidebar = useUiStore((s) => s.collapseSidebar);
  const setSidebarContentType = useUiStore((s) => s.setSidebarContentType);

  const isStudio = STUDIO_ROUTES.some((r) => pathname.startsWith(r));
  const isBoardStudio = pathname.startsWith('/boards');
  const hideChrome = isStudio || (isBoardStudio && studioFullscreen);

  useEffect(() => {
    if (!isBoardStudio && studioFullscreen) setStudioFullscreen(false);
  }, [isBoardStudio, studioFullscreen, setStudioFullscreen]);

  useEffect(() => {
    const matchedPrefix = Object.keys(ROUTE_SIDEBAR_MAP).find((prefix) =>
      pathname.startsWith(prefix)
    );
    setSidebarContentType(matchedPrefix ? ROUTE_SIDEBAR_MAP[matchedPrefix] : 'navigation');
  }, [pathname, setSidebarContentType]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1279px)');
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches && !sidebarCollapsed) collapseSidebar();
    };
    handleChange(mql);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && rightPanel.open) closeRightPanel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [rightPanel.open, closeRightPanel]);

  return (
    <div className="h-screen overflow-hidden bg-[#f5f5f0] font-sans flex flex-col" role="application" aria-label="AirAIE Platform">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[1000] focus:px-4 focus:py-2 focus:bg-[#2d2d2d] focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
        data-testid="skip-to-content"
      >
        Skip to main content
      </a>

      {/* Top: Header — floating bar, centered */}
      <div className={hideChrome ? 'hidden' : 'shrink-0 pt-[16px]'}>
        <Header />
      </div>

      {/* Body: sidebar + content + toolbar */}
      <div className={hideChrome ? 'flex flex-1 min-h-0' : 'flex flex-1 min-h-0 pt-[16px] pb-[16px]'}>
        {/* Sidebar — floating panel */}
        <div className={hideChrome ? 'hidden' : 'shrink-0'}>
          <Sidebar />
        </div>

        {/* Center: main content */}
        <div className="flex-1 flex min-w-0 min-h-0 relative">
          <main
            id="main-content"
            tabIndex={-1}
            className={hideChrome ? 'flex-1 h-full' : 'flex-1 overflow-y-auto'}
          >
            <Outlet />
          </main>

          {/* Right Panel */}
          <div
            data-testid="right-panel-zone"
            className={hideChrome ? 'hidden' : ''}
            style={{
              width: rightPanel.open ? `${rightPanel.width}px` : '0px',
              minWidth: rightPanel.open ? `${rightPanel.width}px` : '0px',
              overflow: 'hidden',
              transition: 'width 150ms cubic-bezier(0.4, 0, 0.2, 1), min-width 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              className="h-full m-[8px] bg-white rounded-[12px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] overflow-hidden"
              style={{ width: `${rightPanel.width - 16}px` }}
            >
              <RightPanel />
            </div>
          </div>

          {/* Bottom bar — floating pill positioned OVER content */}
          {bottomBar.visible && !hideChrome && (
            <div
              data-testid="bottom-bar-zone"
              className="absolute bottom-[16px] left-1/2 -translate-x-1/2 z-10"
            >
              <BottomBar />
            </div>
          )}
        </div>

        {/* Vertical Toolbar — floating panel */}
        <div
          data-testid="vertical-toolbar-zone"
          className={hideChrome ? 'hidden' : 'shrink-0'}
        >
          <VerticalToolbar />
        </div>
      </div>

      <ModalStack />
    </div>
  );
}
