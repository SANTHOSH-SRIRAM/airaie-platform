import { Search, Bell, HelpCircle } from 'lucide-react';
import Kbd from '@components/ui/Kbd';
import Breadcrumb from './Breadcrumb';
import SyncBadge from './SyncBadge';
import RegionDropdown from './RegionDropdown';

export default function Header() {
  return (
    <header className="h-12 bg-white border-b border-cds-border-subtle flex items-center px-4 shrink-0">
      {/* Left: Breadcrumb */}
      <Breadcrumb />

      {/* Center: Search */}
      <div className="flex-1 flex justify-center px-8">
        <div className="relative w-full max-w-[420px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-40" />
          <input
            type="text"
            placeholder="Search components, flows, or data..."
            className="w-full pl-10 pr-14 h-8 text-sm bg-cds-field-01 border border-cds-border-subtle text-cds-text-primary placeholder:text-cds-text-placeholder focus:outline-2 focus:outline-cds-focus focus:outline-offset-[-2px] focus:border-transparent transition-colors duration-100 rounded-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Kbd>⌘K</Kbd>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <SyncBadge />
        <button className="relative w-10 h-10 flex items-center justify-center text-cds-icon-secondary hover:bg-cds-background-hover rounded-sm transition-colors duration-100">
          <Bell size={18} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-50 rounded-full" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center text-cds-icon-secondary hover:bg-cds-background-hover rounded-sm transition-colors duration-100">
          <HelpCircle size={18} />
        </button>
        <RegionDropdown />
      </div>
    </header>
  );
}
