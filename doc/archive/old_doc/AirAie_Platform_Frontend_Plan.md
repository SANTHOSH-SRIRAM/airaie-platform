# AirAie Platform Frontend - Implementation Plan

**Project**: AirAie Platform Frontend
**Technology Stack**: React.js + TypeScript + Vite + Tailwind CSS
**Date**: 2025-12-30
**Version**: 1.1 (Updated 2026-02-26)

---

## 1. Project Overview

### 1.1 Description
AirAie Platform is a comprehensive web application for precision parametric engineering. It provides a modern dashboard interface for managing CAD projects, workflows, agents, templates, and integrating with the AirAie CAD Studio. The platform features a clean, professional design with a dark-themed sidebar, quick actions, and real-time system health monitoring.

### 1.2 Key Features (Based on Design)
- **Dashboard Home**: Overview with quick actions and system health
- **CAD Studio Integration**: Launch and manage CAD projects
- **Agents Management**: Management dashboard with stats, recent agents, and quick actions. Opens Agent Studio (port 3002) in a separate browser tab.
- **Workflow Management**: Management dashboard with stats, recent workflows, and quick actions. Opens Workflow Studio (port 3001) in a separate browser tab.
- **Templates Library**: Reusable project templates
- **Pro Tier Features**: Premium features and usage tracking
- **User Management**: Profile, settings, authentication
- **Real-time Monitoring**: System health, compute nodes, storage

### 1.3 Studio Isolation Architecture
Studios (Workflow Studio, Agent Studio) are **separate applications** running on their own ports. They do NOT render inside the platform's main content area.

| App | Port | Role |
|-----|------|------|
| **Platform** | 3000 | Main dashboard, management pages, navigation shell (sidebar + header) |
| **Workflow Studio** | 3001 | Standalone workflow builder — studio content only (BoardTabs + content, no sidebar/header) |
| **Agent Studio** | 3002 | Standalone agent builder — studio content only (BoardTabs + content, no sidebar/header) |

**Navigation flow:**
- Platform sidebar "Workflows" → `/workflows` management dashboard (on platform, port 3000)
- Platform sidebar "Agents" → `/agents` management dashboard (on platform, port 3000)
- "Open Workflow Studio" button → `window.open('http://localhost:3001', '_blank')` (new tab)
- "Open Agent Studio" button → `window.open('http://localhost:3002', '_blank')` (new tab)
- Within Workflow Studio sidebar, clicking "Agents" → opens Agent Studio (port 3002) in new tab
- Within Agent Studio sidebar, clicking "Workflows" → opens Workflow Studio (port 3001) in new tab

**Studio shell (`@airaie/shell`)**: The shared AppShell renders only `BoardTabs` + content. Sidebar and Header are removed from studio apps — the user sees only the studio workspace.

---

## 2. Design Analysis

### 2.1 UI Layout Structure
```
+------------------+----------------------------------------+
|     SIDEBAR      |              MAIN CONTENT              |
|  (Dark Theme)    |            (Light Theme)               |
|                  |                                        |
|  - Logo          |  +----------------------------------+  |
|  - Dashboard     |  | Header: Breadcrumb + Search      |  |
|  - CAD Studio    |  +----------------------------------+  |
|  - Agents        |  | Hero Section                     |  |
|  - Workflows     |  | - Title, Description             |  |
|  - Templates     |  | - Version Badge                  |  |
|                  |  | - CTA Button                     |  |
|  ----------      |  +----------------------------------+  |
|  Quick Rate      |  |                                  |  |
|                  |  | Quick Actions Grid               |  |
|  ----------      |  | - 3D Sketch, Import, Templates   |  |
|  User Profile    |  |                                  |  |
|                  |  +----------------------------------+  |
+------------------+  | Two Column Layout                |  |
                      | - Recent Workflows | System Health|  |
                      | - Pro Tier Active                 |  |
                      +----------------------------------+  |
```

### 2.2 Color Palette
```
Sidebar (Dark):
- Background: #1a1a2e, #16213e
- Text: #ffffff, #a0aec0
- Active Item: #3b82f6 (blue accent)
- Hover: #2d3748

Main Content (Light):
- Background: #f8fafc, #ffffff
- Text: #1a202c, #4a5568
- Borders: #e2e8f0
- Primary Button: #f97316 (orange)
- Success: #22c55e
- Info: #3b82f6
```

### 2.3 Typography
- Font Family: Inter, system-ui, sans-serif
- Headings: 600-700 weight
- Body: 400-500 weight
- Size Scale: 12px, 14px, 16px, 18px, 24px, 32px

---

## 3. Technical Architecture

### 3.1 Technology Stack
| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 18.3.x |
| Language | TypeScript | 5.7.x |
| Build Tool | Vite | 6.x |
| Styling | Tailwind CSS | 3.4.x |
| State Management | Zustand | 5.x |
| Server State | TanStack Query | 5.x |
| Routing | React Router | 7.x |
| HTTP Client | Axios | 1.7.x |
| Icons | Lucide React | 0.460.x |
| Charts | Recharts | 2.x |
| Forms | React Hook Form | 7.x |
| Validation | Zod | 3.x |

### 3.2 Folder Structure
```
airaie_platform_frontend/
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── assets/
├── src/
│   ├── api/                    # API layer
│   │   ├── client.ts           # Axios instance
│   │   ├── auth.ts             # Authentication API
│   │   ├── projects.ts         # Projects API
│   │   ├── workflows.ts        # Workflows API
│   │   ├── agents.ts           # Agents API
│   │   ├── templates.ts        # Templates API
│   │   └── index.ts            # API exports
│   │
│   ├── components/             # Reusable components
│   │   ├── common/             # Shared components
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Breadcrumb.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── StatusIndicator.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── ui/                 # Base UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Radio.tsx
│   │   │   ├── Switch.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Alert.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/             # Layout components
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── dashboard/          # Dashboard components
│   │   │   ├── HeroSection.tsx
│   │   │   ├── QuickActions.tsx
│   │   │   ├── RecentWorkflows.tsx
│   │   │   ├── SystemHealth.tsx
│   │   │   ├── ProTierCard.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── projects/           # Project components
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectGrid.tsx
│   │   │   ├── CreateProjectDialog.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── workflows/          # Workflow components
│   │   │   ├── WorkflowCard.tsx
│   │   │   ├── WorkflowList.tsx
│   │   │   ├── WorkflowBuilder.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── agents/             # Agent components
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentList.tsx
│   │   │   ├── AgentConfig.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── templates/          # Template components
│   │       ├── TemplateCard.tsx
│   │       ├── TemplateGallery.tsx
│   │       └── index.ts
│   │
│   ├── hooks/                  # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useProjects.ts
│   │   ├── useWorkflows.ts
│   │   ├── useAgents.ts
│   │   ├── useTemplates.ts
│   │   ├── useSystemHealth.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useDebounce.ts
│   │   ├── useMediaQuery.ts
│   │   └── index.ts
│   │
│   ├── pages/                  # Page components
│   │   ├── Dashboard.tsx
│   │   ├── CADStudio.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── Workflows.tsx
│   │   ├── WorkflowDetail.tsx
│   │   ├── Agents.tsx
│   │   ├── AgentDetail.tsx
│   │   ├── Templates.tsx
│   │   ├── Settings.tsx
│   │   ├── Profile.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── ForgotPassword.tsx
│   │   └── NotFound.tsx
│   │
│   ├── store/                  # Zustand stores
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   ├── projectStore.ts
│   │   ├── workflowStore.ts
│   │   └── index.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── auth.ts
│   │   ├── project.ts
│   │   ├── workflow.ts
│   │   ├── agent.ts
│   │   ├── template.ts
│   │   ├── system.ts
│   │   └── index.ts
│   │
│   ├── utils/                  # Utility functions
│   │   ├── cn.ts               # Class name utility
│   │   ├── format.ts           # Formatting utilities
│   │   ├── validation.ts       # Validation helpers
│   │   ├── storage.ts          # LocalStorage utilities
│   │   └── index.ts
│   │
│   ├── constants/              # Constants
│   │   ├── routes.ts
│   │   ├── api.ts
│   │   └── index.ts
│   │
│   ├── styles/                 # Global styles
│   │   └── globals.css
│   │
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # Entry point
│   ├── router.tsx              # Router configuration
│   └── vite-env.d.ts
│
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 4. Component Specifications

### 4.1 Layout Components

#### Sidebar Component
```typescript
interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

// Features:
// - Logo with branding
// - Navigation items with icons
// - Active state highlighting
// - Collapsible on mobile
// - Quick rate section
// - User profile section at bottom
```

#### Header Component
```typescript
interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  showSearch?: boolean;
}

// Features:
// - Breadcrumb navigation
// - Global search
// - Notifications
// - User dropdown
```

### 4.2 Dashboard Components

#### HeroSection Component
```typescript
interface HeroSectionProps {
  title: string;
  description: string;
  version: string;
  lastUpdate: string;
}

// Features:
// - Main title and description
// - Version badge
// - Last update timestamp
// - "Launch New Design Board" CTA button
// - Quick links (2D Sketch, Import STEP/IGES, Templates)
```

#### QuickActions Component
```typescript
interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
}

// Features:
// - Start New Project wizard
// - Open Recent dropdown
// - Browse Templates button
```

#### SystemHealth Component
```typescript
interface SystemHealthProps {
  computeNodes: number;
  storage: number;
  uptime?: string;
}

// Features:
// - Compute Nodes percentage with progress bar
// - Storage usage percentage with progress bar
// - Real-time updates via polling/WebSocket
```

#### RecentWorkflows Component
```typescript
interface RecentWorkflowsProps {
  workflows: Workflow[];
  maxItems?: number;
}

// Features:
// - List of recent workflows
// - Workflow name and status
// - Last modified timestamp
// - Quick actions (edit, duplicate, delete)
```

#### ProTierCard Component
```typescript
interface ProTierCardProps {
  tierName: string;
  usage: number;
  limit: number;
  features: string[];
}

// Features:
// - Current tier display
// - Usage percentage
// - Upgrade CTA
```

### 4.3 UI Primitives

#### Button Component
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
```

#### Card Component
```typescript
interface CardProps {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
}
```

#### Badge Component
```typescript
interface BadgeProps {
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size: 'sm' | 'md';
}
```

---

## 5. Sprint Plan

### Sprint 1: Project Setup & Core Infrastructure
**Objectives**: Set up project foundation with build tools, styling, and base configuration

**Tasks**:
1. Initialize Vite + React + TypeScript project
2. Configure Tailwind CSS with custom theme
3. Set up ESLint and Prettier
4. Configure path aliases
5. Create Docker configuration
6. Set up environment variables
7. Implement base utility functions (cn, format)
8. Create constants and routes

**Deliverables**:
- Working Vite development server
- Tailwind configuration with custom design tokens
- Docker development/production setup
- Project structure created

---

### Sprint 2: UI Primitives & Base Components
**Objectives**: Build foundational UI components that will be reused throughout the application

**Tasks**:
1. Button component (all variants and sizes)
2. Input component (text, password, number)
3. Select component with custom styling
4. Checkbox and Radio components
5. Switch/Toggle component
6. Textarea component
7. Dialog/Modal component
8. Toast notification system
9. Alert component
10. Card component

**Deliverables**:
- Complete UI primitive library
- Storybook-ready components (optional)
- Component documentation

---

### Sprint 3: Common Components & Layout
**Objectives**: Build shared components and main layout structure

**Tasks**:
1. Avatar component
2. Badge component
3. Breadcrumb component
4. Dropdown component
5. Pagination component
6. ProgressBar component
7. SearchInput component
8. Skeleton loader component
9. Spinner component
10. StatusIndicator component
11. Tabs component
12. Tooltip component
13. Sidebar component
14. Header component
15. AppLayout component
16. PageHeader component

**Deliverables**:
- Complete common component library
- Responsive layout system
- Navigation structure

---

### Sprint 4: State Management & API Layer
**Objectives**: Implement global state management and API integration

**Tasks**:
1. Create Axios client with interceptors
2. Implement authentication API
3. Implement projects API
4. Implement workflows API
5. Implement agents API
6. Implement templates API
7. Create auth store (Zustand)
8. Create UI store (theme, sidebar state)
9. Create project store
10. Create workflow store
11. Implement React Query configuration

**Deliverables**:
- Complete API layer
- State management setup
- Token refresh logic
- Error handling

---

### Sprint 5: Custom Hooks & Utilities
**Objectives**: Create reusable hooks for common functionality

**Tasks**:
1. useAuth hook
2. useProjects hook with React Query
3. useWorkflows hook
4. useAgents hook
5. useTemplates hook
6. useSystemHealth hook
7. useLocalStorage hook
8. useDebounce hook
9. useMediaQuery hook
10. useClickOutside hook
11. useKeyboardShortcut hook

**Deliverables**:
- Complete hooks library
- Type-safe hook interfaces

---

### Sprint 6: Dashboard Page
**Objectives**: Implement the main dashboard page with all sections

**Tasks**:
1. HeroSection component
2. QuickActions component
3. RecentWorkflows component
4. SystemHealth component
5. ProTierCard component
6. Dashboard page assembly
7. Responsive layout adjustments
8. Loading states
9. Error states
10. Empty states

**Deliverables**:
- Fully functional dashboard
- Pixel-perfect implementation matching design
- Mobile responsive

---

### Sprint 7: Authentication Pages
**Objectives**: Implement authentication flow

**Tasks**:
1. Login page
2. Register page
3. Forgot password page
4. Reset password page
5. Protected route wrapper
6. Auth state persistence
7. Token refresh flow
8. Logout functionality
9. Remember me feature
10. Social login buttons (UI only)

**Deliverables**:
- Complete auth flow
- Session management
- Secure token handling

---

### Sprint 8: Projects Module
**Objectives**: Implement projects management

**Tasks**:
1. ProjectCard component
2. ProjectList component
3. ProjectGrid component
4. CreateProjectDialog
5. Projects page (list/grid view)
6. Project detail page
7. Project settings
8. Project sharing
9. Search and filter
10. Sort functionality

**Deliverables**:
- Complete projects module
- CRUD operations
- Search/filter/sort

---

### Sprint 9: Workflows Module ✅ (Completed 2026-02-26)
**Objectives**: Implement workflows management dashboard (NOT embedded studio)

**Implemented** (`src/pages/WorkflowsPage.tsx` — all inline, no separate component files):
1. Title row: "Workflows | Management" header + "Open Workflow Studio" button (opens localhost:3001 in new tab)
2. Start card: "NEW WORKFLOW" primary button (opens Workflow Studio), "OPEN RECENT" secondary button
3. Quick actions grid: Import YAML, Templates, View All Runs
4. Recent Workflows card: hardcoded sample data with status dots (success/warning/danger)
5. Workflow Stats card: progress bars + running/completed/failed/total counts
6. Quick Links card: links to studio, docs, API reference, templates

**Architecture**: Studios are separate apps. Platform shows management dashboards only. "Open Workflow Studio" opens `http://localhost:3001` in a new browser tab.

**Deliverables**:
- ✅ Workflows management dashboard (Body.png layout pattern)
- ✅ Studio opens in separate tab, not embedded

---

### Sprint 10: Agents & Templates Modules (Agents ✅ Completed 2026-02-26)
**Objectives**: Implement agents management dashboard and templates gallery

**Agents — Implemented** (`src/pages/AgentsPage.tsx` — all inline, no separate component files):
1. Title row: "Agents | Management" header + "Open Agent Studio" button (opens localhost:3002 in new tab)
2. Start card: "NEW AGENT" primary button (opens Agent Studio), "OPEN RECENT" secondary button
3. Quick actions grid: Browse Templates, Import Spec, View Sessions
4. Recent Agents card: sample data with status dots + type badges (Conversational/Task/Autonomous)
5. Agent Stats card: progress bars + active/inactive/error/total counts
6. Quick Links card: links to studio, docs, API reference, marketplace

**Architecture**: Agent Studio is a separate app on port 3002. Platform shows management dashboard only. "Open Agent Studio" opens `http://localhost:3002` in a new browser tab.

**Templates — Remaining Tasks**:
1. TemplateCard component
2. TemplateGallery component
3. Templates page
4. Template preview
5. Template import

**Deliverables**:
- ✅ Agents management dashboard (Body.png layout pattern)
- ✅ Studio opens in separate tab, not embedded
- [ ] Templates module (pending)

---

### Sprint 11: Settings & Profile Pages
**Objectives**: Implement user settings and profile management

**Tasks**:
1. Settings page layout
2. General settings section
3. Appearance settings (theme)
4. Notification settings
5. Security settings
6. API keys management
7. Profile page
8. Profile editing
9. Avatar upload
10. Account deletion

**Deliverables**:
- Complete settings module
- Profile management
- Preference persistence

---

### Sprint 12: Integration & Polish
**Objectives**: Final integration, testing, and polish

**Tasks**:
1. CAD Studio integration page (Note: Studios are separate apps — see Section 1.3 Studio Isolation Architecture)
2. End-to-end testing
3. Performance optimization
4. Accessibility audit
5. Error boundary implementation
6. 404 page
7. Loading optimization
8. Bundle size optimization
9. SEO meta tags
10. Final responsive adjustments

**Deliverables**:
- Production-ready application
- Optimized bundle
- Full test coverage

---

## 6. Component Reusability Matrix

| Component | Used In |
|-----------|---------|
| Button | All pages, dialogs, forms |
| Input | Forms, search, filters |
| Card | Dashboard, projects, workflows |
| Badge | Status, tags, versions |
| Avatar | Header, sidebar, cards |
| Dropdown | Header, actions, filters |
| Dialog | Create/Edit forms, confirmations |
| Toast | All pages (notifications) |
| ProgressBar | System health, uploads |
| Skeleton | All list/grid views |
| Tabs | Detail pages, settings |
| Breadcrumb | All pages |

---

## 7. API Endpoints (Expected)

### Authentication
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
```

### Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
```

### Workflows
```
GET    /api/workflows
POST   /api/workflows
GET    /api/workflows/:id
PUT    /api/workflows/:id
DELETE /api/workflows/:id
```

### Agents
```
GET    /api/agents
POST   /api/agents
GET    /api/agents/:id
PUT    /api/agents/:id
DELETE /api/agents/:id
```

### Templates
```
GET    /api/templates
GET    /api/templates/:id
POST   /api/templates/:id/use
```

### System
```
GET    /api/system/health
GET    /api/system/stats
```

---

## 8. Testing Strategy

### Unit Tests
- Component rendering tests
- Hook logic tests
- Utility function tests
- Store action tests

### Integration Tests
- API integration tests
- User flow tests
- State management tests

### E2E Tests
- Login/logout flow
- Project CRUD
- Workflow management
- Navigation flows

---

## 9. Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Docker
```bash
docker build -t airaie-platform-frontend .
docker run -p 3000:80 airaie-platform-frontend
```

---

## 10. Success Metrics

- **Performance**: Lighthouse score > 90
- **Bundle Size**: < 500KB gzipped
- **Test Coverage**: > 80%
- **Accessibility**: WCAG 2.1 AA compliant
- **Mobile Responsive**: Works on all screen sizes

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-30 | AirAie Team | Initial plan |
| 1.1 | 2026-02-26 | AirAie Team | Studio isolation architecture: Studios (Workflow Studio port 3001, Agent Studio port 3002) run as separate apps with no sidebar/header chrome. Platform Workflows & Agents pages are management dashboards (not embedded studios). Shared shell (`@airaie/shell`) AppShell renders BoardTabs + content only. Sprint 9 (Workflows) and Sprint 10 (Agents) marked completed. |
