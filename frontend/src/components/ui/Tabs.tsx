import { cn } from '@utils/cn';

interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  contained?: boolean;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onChange, contained = false, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex',
        contained ? 'bg-cds-layer-01 h-10' : 'border-b border-cds-border-subtle',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTab}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.id)}
          className={cn(
            'relative px-4 text-sm font-normal transition-colors duration-100',
            'focus-visible:outline-2 focus-visible:outline-cds-focus focus-visible:outline-offset-[-2px]',
            contained ? 'h-10 border-r border-cds-border-subtle' : 'h-10',
            tab.disabled
              ? 'text-cds-text-disabled cursor-not-allowed'
              : tab.id === activeTab
                ? contained
                  ? 'bg-cds-layer-02 text-cds-text-primary font-medium border-t-2 border-t-brand-primary'
                  : 'text-cds-text-primary font-medium border-b-2 border-b-brand-primary'
                : 'text-cds-text-secondary hover:text-cds-text-primary hover:bg-cds-background-hover'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
