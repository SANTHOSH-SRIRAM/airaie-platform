import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, MoreHorizontal, Sun, Moon, User, LogOut, Settings } from 'lucide-react';
import { useDarkMode } from '@hooks/useDarkMode';
import { useAuth } from '@contexts/AuthContext';
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
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { isDark, toggle: toggleDark } = useDarkMode();
  const { user, isAuthenticated, logout } = useAuth();

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

          {/* User Profile Dropdown */}
          <div ref={profileRef} className="relative shrink-0">
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setProfileOpen(!profileOpen);
                } else {
                  navigate('/login');
                }
              }}
              className="w-[32px] h-[32px] rounded-full bg-[#2d2d2d] flex items-center justify-center text-white text-[13px] font-semibold hover:ring-2 hover:ring-[#e74c3c] transition-all"
              aria-label={isAuthenticated ? 'User menu' : 'Sign in'}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </button>

            {profileOpen && isAuthenticated && (
              <div className="absolute right-0 top-full mt-2 w-[220px] bg-white dark:bg-gray-800 rounded-[12px] border border-[#ece9e3] dark:border-gray-700 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-[#ece9e3] dark:border-gray-700">
                  <p className="text-[13px] font-medium text-[#1a1a1a] dark:text-white truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-[11px] text-[#6b6b6b] dark:text-gray-400 truncate">
                    {user?.email || ''}
                  </p>
                  {user?.role && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium bg-[#f0f0ec] dark:bg-gray-700 text-[#6b6b6b] dark:text-gray-300 rounded-full">
                      {user.role}
                    </span>
                  )}
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#1a1a1a] dark:text-white hover:bg-[#f8f8f7] dark:hover:bg-gray-700 transition-colors"
                  >
                    <User size={14} className="text-[#6b6b6b]" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#1a1a1a] dark:text-white hover:bg-[#f8f8f7] dark:hover:bg-gray-700 transition-colors"
                  >
                    <Settings size={14} className="text-[#6b6b6b]" />
                    Settings
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-[#ece9e3] dark:border-gray-700 py-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
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
