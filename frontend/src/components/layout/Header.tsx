import { Search, Bell, HelpCircle } from 'lucide-react';
import Kbd from '@components/ui/Kbd';
import Breadcrumb from './Breadcrumb';
import SyncBadge from './SyncBadge';
import RegionDropdown from './RegionDropdown';

export default function Header() {
  return (
    <header className="h-[52px] bg-white border-b border-surface-border flex items-center px-5 shrink-0">
      {/* Left: Breadcrumb */}
      <Breadcrumb />

      {/* Center: Search */}
      <div className="flex-1 flex justify-center px-8">
        <div className="relative w-full max-w-[420px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
          <input
            type="text"
            placeholder="Search components, flows, or data..."
            className="w-full pl-9 pr-14 py-1.5 text-sm bg-white border border-surface-border rounded-lg placeholder-content-muted text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Kbd>⌘K</Kbd>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <SyncBadge />
        <button className="relative p-1.5 text-content-tertiary hover:bg-gray-50 rounded-md transition-colors">
          <Bell size={18} />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-status-danger rounded-full border border-white" />
        </button>
        <button className="p-1.5 text-content-tertiary hover:bg-gray-50 rounded-md transition-colors">
          <HelpCircle size={18} />
        </button>
        <RegionDropdown />
      </div>
    </header>
  );
}
