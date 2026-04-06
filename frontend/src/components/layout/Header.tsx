import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, MoreHorizontal, Sun, Moon } from 'lucide-react';
import { useDarkMode } from '@hooks/useDarkMode';
import { cn } from '@utils/cn';
import { PAGE_TABS } from '@constants/routes';
import airaielogo from '@/assets/airaie-logo.png';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';
import Breadcrumb from './Breadcrumb';

export default function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const { isDark, toggle: toggleDark } = useDarkMode();

  // Cmd+K / Ctrl+K global shortcut
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <>
      <div className="flex flex-col items-center gap-[6px]">
        <header
          className="h-[52px] bg-white dark:bg-gray-900 rounded-[16px] border border-[#ece9e3] dark:border-gray-700 shadow-[0px_2px_12px_0px_rgba(0,0,0,0.08)] inline-flex items-center px-[10px] py-[8px] gap-[8px] mx-auto"
        >
          {/* Logo */}
          <div className="flex items-center justify-center shrink-0 w-[18px] h-[18px] ml-[2px]">
            <img src={airaielogo} alt="" className="w-[18px] h-[18px]" />
          </div>

          {/* AIRAIE */}
          <button onClick={() => navigate('/dashboard')} className="shrink-0" aria-label="Go to dashboard">
            <span className="font-bold text-[14px] text-[#1a1a1a]" style={{ letterSpacing: '1px' }}>AIRAIE</span>
          </button>

          {/* Divider */}
          <div className="w-px h-[24px] bg-[#e8e8e8] shrink-0" />

          {/* Tabs */}
          <nav className="flex items-center gap-0" aria-label="Main navigation">
            {PAGE_TABS.map((tab) => {
              const isActive = pathname === tab.path || pathname.startsWith(tab.matchPrefix);
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={cn(
                    'relative h-[36px] px-[14px] text-[13px] flex items-center justify-center rounded-[10px] transition-colors duration-100',
                    isActive
                      ? 'text-[#1a1a1a] font-semibold'
                      : 'text-[#6b6b6b] hover:text-[#1a1a1a] font-normal'
                  )}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-[6px] left-[14px] right-[14px] h-[2px] bg-[#e74c3c] rounded-[2px]" />
                  )}
                </button>
              );
            })}
            {/* More button */}
            <button className="h-[36px] px-[10px] flex items-center justify-center text-[#6b6b6b] hover:text-[#1a1a1a] rounded-[10px] transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-[6px] h-[32px] px-[10px] bg-[#f8f8f7] rounded-[8px] cursor-pointer hover:bg-[#f0f0ec] transition-colors shrink-0"
          >
            <Search size={13} className="text-[#acacac]" />
            <span className="text-[12px] text-[#acacac]">Search...</span>
            <div className="bg-white border border-[#e8e8e8] rounded-[4px] px-[5px] py-[1px]">
              <span className="text-[10px] text-[#acacac] font-medium">Cmd+K</span>
            </div>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-[8px] hover:bg-[#f0f0ec] dark:hover:bg-gray-700 transition-colors shrink-0"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-[#6b6b6b]" />}
          </button>

          {/* Notification Center */}
          <NotificationCenter />

          {/* Avatar */}
          <div className="w-[32px] h-[32px] rounded-full bg-[#2d2d2d] flex items-center justify-center text-white text-[13px] font-semibold shrink-0">
            S
          </div>
        </header>

        {/* Breadcrumb below header */}
        <Breadcrumb />
      </div>

      {/* Global Search Overlay */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
