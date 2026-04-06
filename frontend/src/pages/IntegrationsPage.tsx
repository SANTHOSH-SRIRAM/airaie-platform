import { useState } from 'react';
import { Search, Check } from 'lucide-react';
import Kbd from '@components/ui/Kbd';

interface Integration {
  name: string;
  logo: string | null;
  abbr: string;
  brandColor: string;
  textColor?: string;
  connected: boolean;
  category: string;
}

// Simple Icons CDN: https://cdn.simpleicons.org/{slug}/{color}
// Verified slugs — fallback to branded letter for unavailable ones
const SI = (slug: string, color?: string) => `https://cdn.simpleicons.org/${slug}${color ? `/${color}` : ''}`;

const integrations: Integration[] = [
  // CAD & Design
  { name: 'FreeCAD',      logo: SI('freecad'),                abbr: 'FC', brandColor: '#E8342C', connected: true,  category: 'CAD & Design' },
  { name: 'SolidWorks',   logo: null,                         abbr: 'SW', brandColor: '#E2231A', connected: true,  category: 'CAD & Design' },
  { name: 'AutoCAD',      logo: SI('autodesk'),               abbr: 'AC', brandColor: '#000000', connected: false, category: 'CAD & Design' },
  { name: 'Fusion 360',   logo: SI('autodesk', 'F58220'),     abbr: 'F3', brandColor: '#F58220', connected: false, category: 'CAD & Design' },
  { name: 'Rhino 3D',     logo: SI('rhinoceros'),             abbr: 'RH', brandColor: '#801010', connected: false, category: 'CAD & Design' },
  { name: 'CATIA',        logo: SI('dassaultsystemes'),       abbr: 'CA', brandColor: '#005386', connected: false, category: 'CAD & Design' },
  { name: 'Creo',         logo: null,                         abbr: 'CR', brandColor: '#4CAF50', connected: false, category: 'CAD & Design' },
  { name: 'Siemens NX',   logo: SI('siemens', '009999'),      abbr: 'NX', brandColor: '#009999', connected: false, category: 'CAD & Design' },
  { name: 'Inventor',     logo: SI('autodesk', 'F58220'),     abbr: 'IN', brandColor: '#F58220', connected: false, category: 'CAD & Design' },

  // Simulation & Analysis
  { name: 'MATLAB',       logo: null,                         abbr: 'ML', brandColor: '#0076A8', connected: true,  category: 'Simulation & Analysis' },
  { name: 'COMSOL',       logo: null,                         abbr: 'CM', brandColor: '#368CCB', connected: true,  category: 'Simulation & Analysis' },
  { name: 'ANSYS',        logo: SI('ansys'),                  abbr: 'AN', brandColor: '#FFB71B', textColor: '#1A1A1A', connected: false, category: 'Simulation & Analysis' },
  { name: 'Abaqus',       logo: SI('dassaultsystemes', '005386'), abbr: 'AB', brandColor: '#005386', connected: false, category: 'Simulation & Analysis' },
  { name: 'OpenFOAM',     logo: null,                         abbr: 'OF', brandColor: '#2E8BC0', connected: true,  category: 'Simulation & Analysis' },
  { name: 'Simulink',     logo: null,                         abbr: 'SL', brandColor: '#0076A8', connected: false, category: 'Simulation & Analysis' },
  { name: 'LS-DYNA',      logo: null,                         abbr: 'LD', brandColor: '#CC0000', connected: false, category: 'Simulation & Analysis' },
  { name: 'Star-CCM+',    logo: SI('siemens', '003D6B'),      abbr: 'SC', brandColor: '#003D6B', connected: false, category: 'Simulation & Analysis' },

  // Data & Compute
  { name: 'Python',       logo: SI('python', '3776AB'),       abbr: 'Py', brandColor: '#3776AB', connected: true,  category: 'Data & Compute' },
  { name: 'Jupyter',      logo: SI('jupyter', 'F37626'),      abbr: 'Jp', brandColor: '#F37626', connected: true,  category: 'Data & Compute' },
  { name: 'AWS',          logo: null,                         abbr: 'aws', brandColor: '#FF9900', textColor: '#1A1A1A', connected: true, category: 'Data & Compute' },
  { name: 'Google Cloud', logo: SI('googlecloud'),            abbr: 'GC', brandColor: '#4285F4', connected: false, category: 'Data & Compute' },
  { name: 'Azure',        logo: null,                         abbr: 'Az', brandColor: '#0078D4', connected: false, category: 'Data & Compute' },
  { name: 'Docker',       logo: SI('docker', '2496ED'),       abbr: 'Dk', brandColor: '#2496ED', connected: true,  category: 'Data & Compute' },
  { name: 'Kubernetes',   logo: SI('kubernetes', '326CE5'),   abbr: 'K8', brandColor: '#326CE5', connected: false, category: 'Data & Compute' },
  { name: 'HPC Cluster',  logo: null,                         abbr: 'HP', brandColor: '#1A1A1A', connected: true,  category: 'Data & Compute' },

  // Version Control & CI
  { name: 'GitHub',       logo: SI('github'),                 abbr: 'GH', brandColor: '#181717', connected: true,  category: 'Version Control & CI' },
  { name: 'GitLab',       logo: SI('gitlab', 'FC6D26'),       abbr: 'GL', brandColor: '#FC6D26', connected: false, category: 'Version Control & CI' },
  { name: 'Bitbucket',    logo: SI('bitbucket', '0052CC'),    abbr: 'BB', brandColor: '#0052CC', connected: false, category: 'Version Control & CI' },
  { name: 'Jenkins',      logo: SI('jenkins', 'D24939'),      abbr: 'Jk', brandColor: '#D24939', connected: false, category: 'Version Control & CI' },
  { name: 'CircleCI',     logo: SI('circleci', '343434'),     abbr: 'CI', brandColor: '#343434', connected: false, category: 'Version Control & CI' },

  // Collaboration
  { name: 'Jira',         logo: SI('jira', '0052CC'),         abbr: 'Ji', brandColor: '#0052CC', connected: true,  category: 'Collaboration' },
  { name: 'Confluence',   logo: SI('confluence', '172B4D'),   abbr: 'Cf', brandColor: '#172B4D', connected: false, category: 'Collaboration' },
  { name: 'Notion',       logo: SI('notion', '000000'),       abbr: 'Nt', brandColor: '#000000', connected: false, category: 'Collaboration' },
];

const categories = [...new Set(integrations.map((i) => i.category))];

function LogoTile({ item }: { item: Integration }) {
  const [imgError, setImgError] = useState(false);

  if (item.logo && !imgError) {
    return (
      <div className="w-12 h-12 rounded-xl bg-surface-layer flex items-center justify-center">
        <img
          src={item.logo}
          alt={item.name}
          className="w-7 h-7"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm tracking-tight select-none"
      style={{ backgroundColor: item.brandColor, color: item.textColor || '#fff' }}
    >
      {item.abbr}
    </div>
  );
}

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = integrations.filter((i) => {
    const matchesSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || i.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const grouped = categories
    .map((cat) => ({ category: cat, items: filtered.filter((i) => i.category === cat) }))
    .filter((g) => g.items.length > 0);

  const totalConnected = integrations.filter((i) => i.connected).length;

  return (
    <div className="p-6 space-y-8 max-w-[1584px]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[2rem] font-light text-content-primary leading-tight tracking-tight">Integrations</h1>
          <p className="text-sm text-content-helper mt-1.5">Connect your engineering tools, simulation platforms, and cloud services.</p>
        </div>
        <div className="flex items-center gap-2 h-9 px-4 bg-surface-layer border border-card-border rounded-lg">
          <span className="w-2 h-2 bg-status-success rounded-full" />
          <span className="text-sm font-medium text-content-primary">{totalConnected}</span>
          <span className="text-sm text-content-helper">connected</span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-4 sticky top-0 z-10 bg-surface-bg py-3 -my-3">
        <div className="relative w-full max-w-[400px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-placeholder" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-12 h-10 text-sm bg-surface border border-card-border rounded-lg text-content-primary placeholder:text-content-placeholder focus:outline-2 focus:outline-content-primary focus:outline-offset-[-2px] transition-colors duration-100"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Kbd>⌘K</Kbd>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`h-8 px-3.5 text-xs font-medium rounded-lg transition-colors duration-100 whitespace-nowrap ${
              !activeCategory
                ? 'bg-content-primary text-white'
                : 'bg-surface text-content-secondary hover:bg-surface-hover border border-card-border'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`h-8 px-3.5 text-xs font-medium rounded-lg transition-colors duration-100 whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-content-primary text-white'
                  : 'bg-surface text-content-secondary hover:bg-surface-hover border border-card-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid by Category */}
      {grouped.map((group) => (
        <div key={group.category}>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-content-primary">{group.category}</h2>
            <p className="text-xs text-content-helper mt-0.5">
              {group.items.filter((i) => i.connected).length} of {group.items.length} connected
            </p>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {group.items.map((item) => (
              <div
                key={item.name}
                className={`group relative bg-card-bg rounded-xl border-2 transition-all duration-150 cursor-pointer hover:shadow-elevated ${
                  item.connected ? 'border-content-primary' : 'border-card-border hover:border-content-helper'
                }`}
              >
                {item.connected && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-content-primary rounded-full flex items-center justify-center z-10">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </div>
                )}

                <div className="flex flex-col items-center py-6 px-3">
                  <LogoTile item={item} />
                  <span className="text-sm font-medium text-content-primary text-center leading-tight mt-3">
                    {item.name}
                  </span>
                  {item.connected ? (
                    <span className="text-[11px] text-status-success font-medium mt-1">Connected</span>
                  ) : (
                    <span className="text-[11px] text-content-placeholder mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                      Click to connect
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
