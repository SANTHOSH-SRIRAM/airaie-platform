import { useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

const regions = [
  { label: 'USA (East)', value: 'us-east' },
  { label: 'USA (West)', value: 'us-west' },
  { label: 'Europe (West)', value: 'eu-west' },
  { label: 'Asia Pacific', value: 'ap-south' },
];

export default function RegionDropdown() {
  const [selected, setSelected] = useState('us-east');
  const [open, setOpen] = useState(false);
  const current = regions.find((r) => r.value === selected);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 h-10 px-3 text-sm text-cds-text-secondary hover:bg-cds-background-hover rounded-sm transition-colors duration-100"
      >
        <MapPin size={14} />
        <span>{current?.label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-0 w-48 bg-surface border border-cds-border-subtle shadow-dropdown z-50">
            {regions.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setSelected(r.value);
                  setOpen(false);
                }}
                className={`w-full text-left h-10 px-4 text-sm transition-colors duration-100 ${
                  r.value === selected
                    ? 'text-brand-primary bg-blue-10 font-medium'
                    : 'text-cds-text-secondary hover:bg-cds-background-hover'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
