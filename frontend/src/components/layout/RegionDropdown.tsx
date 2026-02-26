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
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-content-secondary hover:bg-gray-50 rounded-md transition-colors"
      >
        <MapPin size={14} />
        <span>{current?.label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-surface-border rounded-lg shadow-dropdown z-50 py-1">
            {regions.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setSelected(r.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  r.value === selected
                    ? 'text-brand-secondary bg-blue-50 font-medium'
                    : 'text-content-primary hover:bg-gray-50'
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
