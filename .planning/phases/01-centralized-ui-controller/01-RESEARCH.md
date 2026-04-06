# Phase 1: Centralized UI Controller — Research

**Researched:** 2026-04-01
**Status:** Complete

## Key Finding: V1 is Sound But Lacks Centralized Control

The v1 frontend has a working AppShell with sidebar, header, and content area, plus a minimal Zustand store managing only sidebar collapse, studio fullscreen, and route tracking. There is **zero infrastructure** for centralized UI control (right panels, modal stacks, bottom bars, dynamic sidebar content).

## 1. Current AppShell Architecture

- `AppShell.tsx`: Wrapper rendering Sidebar + Header + Outlet
- Uses CSS `display: hidden` (not conditional rendering) to preserve embedded iframes
- Routes-based fullscreen mode for studios
- No state-driven layout management

**Critical constraint:** iframe persistence via CSS hiding must be preserved. All new panel toggling must use CSS hiding, not conditional rendering.

## 2. Zustand Store (38 lines)

Current state:
- `sidebarCollapsed: boolean`
- `studioFullscreen: boolean`
- `activeRoute: string` (set but never consumed — remove or integrate)
- `sidebarSections: { workspace, build, 'project-data' }` (local state, needs migration)

Phase 1 additions needed:
- `sidebarContentType`: 'navigation' | 'nodePalette' | 'sessions' | 'filters'
- `rightPanel`: { open, contentType, width, data }
- `modals`: Array of modal objects
- `bottomBar`: { visible, contentType }

## 3. Routing (Flat, Studio-Aware)

All routes wrapped in `<AppShell>`. Fullscreen flag is the ONLY route-based UI change. Need route metadata to specify sidebar content type per route.

## 4. UI Primitives (14 components, all reusable)

Button, Modal, Input, Tabs, Card, Badge, Dropdown, Avatar, Tooltip, Toggle, Tag, Notification, ProgressBar, DataTable — all production-ready.

## 5. Design Tokens (Comprehensive)

252 lines in tokens.css. Color primitives, typography, layout vars (`--sidebar-width: 256px`, `--header-height: 48px`), z-index scale, shadows, transitions. All mapped in Tailwind config.

Missing tokens (minimal): `--bottom-bar-height`, `--right-panel-width-default`

## 6. No New Dependencies Needed

React 19, react-router-dom 7, Tailwind 3, Zustand 5, lucide-react — all sufficient.

## 7. Constraints & Gotchas

1. **iframe persistence**: CSS hiding only, never conditional rendering
2. **Z-index stack**: Modals (500) > right panel > header/sidebar > tooltips (700) > toast (800)
3. **Sidebar width**: 256px fixed; right panel must not push content off-screen
4. **SidebarSection state**: Currently local useState, must migrate to Zustand
5. **Fullscreen studios**: ALL chrome hides when `studioFullscreen` is true
6. **Route changes**: Must reset sidebar content type appropriately

## 8. Deliverables Summary

**New components:** SidebarContentRouter, RightPanel, RightPanelContent, ModalStack, BottomBar, VerticalToolbar
**Modified components:** AppShell, Sidebar, Header, SidebarSection
**Store changes:** Extend uiStore with 4 new state slices + actions
**Token additions:** 2 CSS variables
