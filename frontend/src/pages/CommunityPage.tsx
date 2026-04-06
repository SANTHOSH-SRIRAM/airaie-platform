import { useState } from 'react';
import {
  Search, MoreVertical, Eye, Heart, Copy, Box,
  Cog, FlaskConical,
} from 'lucide-react';

// ============================================================================
// Types & Data
// ============================================================================

type BoardTab = 'engineering' | 'research';

const filters = ['All', 'Aerospace', 'Robotics', 'Bio-Mechanical', 'Material Science', 'Generative Design', 'Structural'];

interface Project {
  id: string;
  title: string;
  username: string;
  version: string;
  previewIcon: 'box' | 'robot' | 'lattice' | 'flask';
  partCount: number;
  status: string;
  statusColor: string;
  lastUpdated: string;
  views: string;
  likes: number;
  avatarBg: string;
}

const engineeringProjects: Project[] = [
  {
    id: '1', title: 'Hyper-Efficient Drone Chassis', username: '@sarah_eng', version: 'v4.2.0',
    previewIcon: 'box', partCount: 42, status: 'Fully Constrained', statusColor: 'text-status-success',
    lastUpdated: '2h ago', views: '1.2k', likes: 84, avatarBg: 'bg-gray-40',
  },
  {
    id: '2', title: 'Robotic Arm Actuator Assembly', username: '@mech_mike', version: 'v2.1.0',
    previewIcon: 'robot', partCount: 18, status: 'Under Review', statusColor: 'text-status-warning',
    lastUpdated: '1d ago', views: '890', likes: 45, avatarBg: 'bg-gray-40',
  },
  {
    id: '3', title: 'Bio-Mimetic Lattice Structure', username: '@dr_materials', version: 'v1.0.0',
    previewIcon: 'lattice', partCount: 8, status: 'Published', statusColor: 'text-status-success',
    lastUpdated: '3d ago', views: '2.1k', likes: 112, avatarBg: 'bg-gray-40',
  },
  {
    id: '4', title: 'Turbine Blade Topology Opt.', username: '@aero_chen', version: 'v3.0.1',
    previewIcon: 'flask', partCount: 24, status: 'Fully Constrained', statusColor: 'text-status-success',
    lastUpdated: '5h ago', views: '670', likes: 38, avatarBg: 'bg-gray-40',
  },
];

const researchProjects: Project[] = [
  {
    id: '5', title: 'Metamaterial Acoustic Panel', username: '@acoustic_lab', version: 'v0.9.0',
    previewIcon: 'lattice', partCount: 6, status: 'In Progress', statusColor: 'text-status-warning',
    lastUpdated: '4h ago', views: '340', likes: 22, avatarBg: 'bg-gray-40',
  },
  {
    id: '6', title: 'Micro-Fluidic Channel Network', username: '@bioeng_priya', version: 'v1.2.0',
    previewIcon: 'flask', partCount: 14, status: 'Peer Reviewed', statusColor: 'text-status-success',
    lastUpdated: '2d ago', views: '1.5k', likes: 67, avatarBg: 'bg-gray-40',
  },
];


// ============================================================================
// Preview Icon Component
// ============================================================================

function PreviewIcon({ type }: { type: Project['previewIcon'] }) {
  const iconClass = 'w-12 h-12 text-gray-50/40';
  switch (type) {
    case 'box': return <Box className={iconClass} strokeWidth={1} />;
    case 'robot': return <Cog className={iconClass} strokeWidth={1} />;
    case 'lattice': return <Box className={iconClass} strokeWidth={1} />;
    case 'flask': return <FlaskConical className={iconClass} strokeWidth={1} />;
  }
}

// ============================================================================
// Project Card
// ============================================================================

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="bg-card-bg border border-card-border rounded-md overflow-hidden shadow-card hover:shadow-elevated transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <div className={`w-8 h-8 rounded-full ${project.avatarBg} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-content-primary truncate">{project.title}</p>
          <p className="text-[11px] text-content-helper">
            {project.username} <span className="text-brand-primary font-medium ml-1">{project.version}</span>
          </p>
        </div>
        <button className="shrink-0 w-7 h-7 flex items-center justify-center text-content-placeholder hover:text-content-secondary rounded-md hover:bg-surface-hover transition-colors">
          <MoreVertical size={14} />
        </button>
      </div>

      {/* 3D Preview Area */}
      <div className="relative mx-3 h-32 bg-[#1e2433] rounded-md flex items-center justify-center overflow-hidden">
        <PreviewIcon type={project.previewIcon} />
        <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono font-medium text-gray-50/60 bg-gray-100/50 px-1.5 py-0.5 rounded">
          3D PREVIEW
        </span>
      </div>

      {/* Stats Row */}
      <div className="flex items-start gap-6 px-3 pt-2.5 pb-1.5">
        <div>
          <p className="text-[9px] text-content-placeholder uppercase tracking-wider font-medium">Part Count</p>
          <p className="text-xs font-semibold text-content-primary font-mono mt-0.5">{project.partCount} Components</p>
        </div>
        <div>
          <p className="text-[9px] text-content-placeholder uppercase tracking-wider font-medium">Status</p>
          <p className={`text-xs font-semibold font-mono mt-0.5 flex items-center gap-1 ${project.statusColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${project.statusColor.replace('text-', 'bg-')}`} />
            {project.status}
          </p>
        </div>
      </div>

      {/* Updated */}
      <div className="px-3 pb-2">
        <p className="text-[10px] text-content-placeholder">Last updated {project.lastUpdated}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-card-border-inner">
        <div className="flex items-center gap-2.5 text-[11px] text-content-placeholder">
          <span className="flex items-center gap-1 font-mono"><Eye size={12} />{project.views}</span>
          <span className="flex items-center gap-1 font-mono"><Heart size={12} />{project.likes}</span>
          <button className="flex items-center justify-center hover:text-content-secondary transition-colors">
            <Copy size={12} />
          </button>
        </div>
        <button className="h-7 px-3 bg-brand-primary text-white text-[11px] font-semibold rounded-md hover:bg-brand-primary-hover transition-colors duration-100">
          Open in Studio
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CommunityPage() {
  const [activeBoard, setActiveBoard] = useState<BoardTab>('engineering');
  const [activeFilter, setActiveFilter] = useState('All');

  const projects = activeBoard === 'engineering' ? engineeringProjects : researchProjects;

  return (
    <div className="p-6 space-y-5 max-w-[1584px]">
      {/* Top Bar: Board Tabs + Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveBoard('engineering')}
            className={`flex items-center gap-2 h-10 px-5 rounded-full border text-sm font-medium transition-all duration-150 ${
              activeBoard === 'engineering'
                ? 'bg-card-bg border-border-strong text-content-primary shadow-card'
                : 'bg-transparent border-border-subtle text-content-helper hover:border-border-default hover:text-content-secondary'
            }`}
          >
            <Cog size={16} />
            Engineering Board
          </button>
          <button
            onClick={() => setActiveBoard('research')}
            className={`flex items-center gap-2 h-10 px-5 rounded-full border text-sm font-medium transition-all duration-150 ${
              activeBoard === 'research'
                ? 'bg-card-bg border-border-strong text-content-primary shadow-card'
                : 'bg-transparent border-border-subtle text-content-helper hover:border-border-default hover:text-content-secondary'
            }`}
          >
            <FlaskConical size={16} />
            Research Board
          </button>
        </div>

        <div className="flex-1 relative ml-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-content-placeholder" />
          <input
            type="text"
            placeholder="Search projects, papers, or researchers..."
            className="w-full h-10 pl-11 pr-4 bg-surface-layer border border-border-subtle rounded-full text-sm text-content-primary placeholder:text-content-placeholder focus:outline-none focus:border-border-focus transition-colors"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-content-placeholder uppercase tracking-wider font-medium mr-1">Filters:</span>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`h-8 px-3.5 rounded-md border text-xs font-medium transition-all duration-100 ${
              activeFilter === f
                ? 'bg-brand-primary border-brand-primary text-white'
                : 'bg-card-bg border-card-border text-content-secondary hover:border-border-strong hover:text-content-primary'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-border-subtle" />

      {/* Section Title */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-brand-primary/10 rounded-md flex items-center justify-center">
          <Box size={16} className="text-brand-primary" />
        </div>
        <h2 className="text-xl font-semibold text-content-primary">
          {activeBoard === 'engineering' ? 'Latest Engineering Projects' : 'Latest Research Projects'}
        </h2>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
