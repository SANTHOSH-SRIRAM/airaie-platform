# AirAie Platform - Centralized UI Design System

## Overview

This document outlines the recommended approach for implementing a centralized UI design system in the AirAie Platform frontend. This system provides **single-source-of-truth** for all UI styling, ensuring consistency, maintainability, and easy theming across the entire application.

---

## Table of Contents

1. [Recommended Architecture](#1-recommended-architecture)
2. [Design Token System](#2-design-token-system)
3. [Theme Provider Implementation](#3-theme-provider-implementation)
4. [Component Architecture](#4-component-architecture)
5. [Icon System](#5-icon-system)
6. [File Structure](#6-file-structure)
7. [Implementation Plan](#7-implementation-plan)
8. [Usage Examples](#8-usage-examples)

---

## 1. Recommended Architecture

### Best Approach Summary

| Aspect | Recommendation | Why |
|--------|----------------|-----|
| **Design Tokens** | CSS Variables + TypeScript | Zero runtime cost, native browser, SSR safe, type-safe |
| **Theme Switching** | React Context + CSS `data-theme` | Simple, performant, no FOUC |
| **Tailwind Integration** | CSS Variable references | Single source of truth |
| **Icons (UI)** | Lucide React | Tree-shakeable, consistent, 1000+ icons |
| **Icons (Platform)** | Custom SVG Components | Brand-specific, domain icons |
| **Component Library** | Compound Components | Flexible, composable, accessible |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     AirAie Platform Frontend                     │
├─────────────────────────────────────────────────────────────────┤
│  Design Token Layer (CSS Variables)                              │
│  ├── Primitives: colors, typography, spacing, shadows            │
│  ├── Semantic: surface, text, border, status                     │
│  └── Component: button, card, input, sidebar                     │
├─────────────────────────────────────────────────────────────────┤
│  Theme Provider (React Context)                                  │
│  ├── Theme state: light / dark / system                          │
│  ├── Sets data-theme="light|dark" on <html>                      │
│  └── Persists preference to localStorage                         │
├─────────────────────────────────────────────────────────────────┤
│  Tailwind CSS                                                    │
│  ├── Colors reference CSS variables                              │
│  ├── Extended with custom utilities                              │
│  └── Component classes (.btn, .card, .input)                     │
├─────────────────────────────────────────────────────────────────┤
│  UI Components (Atomic Design)                                   │
│  ├── Atoms: Button, Input, Badge, Avatar                         │
│  ├── Molecules: Card, Dropdown, SearchInput                      │
│  ├── Organisms: Sidebar, Header, DataTable                       │
│  └── Templates: AppLayout, AuthLayout                            │
├─────────────────────────────────────────────────────────────────┤
│  Icon System                                                     │
│  ├── Lucide React (UI icons)                                     │
│  └── Custom Platform Icons (workflow, agent, etc.)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Design Token System

### 2.1 Token Structure

Create a centralized token file that defines ALL design values:

```css
/* src/styles/tokens.css */

/* ============================================
   DESIGN TOKENS - CSS Variables
   Single source of truth for all styling
   ============================================ */

:root {
  /* ========================================
     COLOR PRIMITIVES
     ======================================== */

  /* Gray Scale (Neutral) */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  --gray-950: #030712;

  /* Slate (Blue-tinted Gray - for sidebar) */
  --slate-50: #f8fafc;
  --slate-100: #f1f5f9;
  --slate-200: #e2e8f0;
  --slate-300: #cbd5e1;
  --slate-400: #94a3b8;
  --slate-500: #64748b;
  --slate-600: #475569;
  --slate-700: #334155;
  --slate-800: #1e293b;
  --slate-900: #0f172a;
  --slate-950: #020617;

  /* Brand Primary (Orange - AirAie) */
  --orange-50: #fff7ed;
  --orange-100: #ffedd5;
  --orange-200: #fed7aa;
  --orange-300: #fdba74;
  --orange-400: #fb923c;
  --orange-500: #f97316;
  --orange-600: #ea580c;
  --orange-700: #c2410c;
  --orange-800: #9a3412;
  --orange-900: #7c2d12;

  /* Brand Secondary (Blue) */
  --blue-50: #eff6ff;
  --blue-100: #dbeafe;
  --blue-200: #bfdbfe;
  --blue-300: #93c5fd;
  --blue-400: #60a5fa;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  --blue-700: #1d4ed8;
  --blue-800: #1e40af;
  --blue-900: #1e3a8a;

  /* Success (Green) */
  --green-50: #f0fdf4;
  --green-100: #dcfce7;
  --green-400: #4ade80;
  --green-500: #22c55e;
  --green-600: #16a34a;
  --green-700: #15803d;

  /* Warning (Amber) */
  --amber-50: #fffbeb;
  --amber-100: #fef3c7;
  --amber-400: #fbbf24;
  --amber-500: #f59e0b;
  --amber-600: #d97706;

  /* Error (Red) */
  --red-50: #fef2f2;
  --red-100: #fee2e2;
  --red-400: #f87171;
  --red-500: #ef4444;
  --red-600: #dc2626;

  /* ========================================
     TYPOGRAPHY
     ======================================== */

  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* ========================================
     SPACING
     ======================================== */

  --space-0: 0;
  --space-0.5: 0.125rem;  /* 2px */
  --space-1: 0.25rem;     /* 4px */
  --space-1.5: 0.375rem;  /* 6px */
  --space-2: 0.5rem;      /* 8px */
  --space-2.5: 0.625rem;  /* 10px */
  --space-3: 0.75rem;     /* 12px */
  --space-3.5: 0.875rem;  /* 14px */
  --space-4: 1rem;        /* 16px */
  --space-5: 1.25rem;     /* 20px */
  --space-6: 1.5rem;      /* 24px */
  --space-7: 1.75rem;     /* 28px */
  --space-8: 2rem;        /* 32px */
  --space-9: 2.25rem;     /* 36px */
  --space-10: 2.5rem;     /* 40px */
  --space-12: 3rem;       /* 48px */
  --space-14: 3.5rem;     /* 56px */
  --space-16: 4rem;       /* 64px */

  /* ========================================
     BORDER RADIUS
     ======================================== */

  --radius-none: 0;
  --radius-sm: 0.125rem;  /* 2px */
  --radius-md: 0.375rem;  /* 6px */
  --radius-lg: 0.5rem;    /* 8px */
  --radius-xl: 0.75rem;   /* 12px */
  --radius-2xl: 1rem;     /* 16px */
  --radius-3xl: 1.5rem;   /* 24px */
  --radius-full: 9999px;

  /* ========================================
     SHADOWS
     ======================================== */

  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* ========================================
     TRANSITIONS
     ======================================== */

  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --ease-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  /* ========================================
     LAYOUT
     ======================================== */

  --sidebar-width: 260px;
  --sidebar-width-collapsed: 72px;
  --header-height: 64px;
  --footer-height: 48px;
  --content-max-width: 1400px;

  /* ========================================
     Z-INDEX
     ======================================== */

  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-overlay: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
  --z-toast: 800;

  /* ========================================
     ICON SIZES
     ======================================== */

  --icon-xs: 12px;
  --icon-sm: 16px;
  --icon-md: 20px;
  --icon-lg: 24px;
  --icon-xl: 32px;
  --icon-2xl: 40px;
}

/* ============================================
   LIGHT THEME (Default for Platform)
   ============================================ */

:root,
[data-theme="light"] {
  /* Brand */
  --color-brand-primary: var(--orange-500);
  --color-brand-primary-hover: var(--orange-600);
  --color-brand-primary-active: var(--orange-700);
  --color-brand-primary-muted: rgba(249, 115, 22, 0.1);

  --color-brand-secondary: var(--blue-500);
  --color-brand-secondary-hover: var(--blue-600);
  --color-brand-secondary-active: var(--blue-700);
  --color-brand-secondary-muted: rgba(59, 130, 246, 0.1);

  /* Surfaces */
  --color-surface-bg: var(--gray-50);
  --color-surface: white;
  --color-surface-elevated: var(--gray-100);
  --color-surface-overlay: rgba(255, 255, 255, 0.95);

  /* Sidebar (Always Dark) */
  --color-sidebar-bg: var(--slate-900);
  --color-sidebar-bg-elevated: var(--slate-800);
  --color-sidebar-text: var(--slate-400);
  --color-sidebar-text-active: white;
  --color-sidebar-hover: var(--slate-800);
  --color-sidebar-active: var(--blue-600);
  --color-sidebar-border: var(--slate-700);

  /* Text */
  --color-text-primary: var(--gray-900);
  --color-text-secondary: var(--gray-600);
  --color-text-tertiary: var(--gray-500);
  --color-text-muted: var(--gray-400);
  --color-text-disabled: var(--gray-300);
  --color-text-inverse: white;

  /* Borders */
  --color-border: var(--gray-200);
  --color-border-light: var(--gray-100);
  --color-border-dark: var(--gray-300);
  --color-border-focus: var(--blue-500);

  /* Status */
  --color-success: var(--green-500);
  --color-success-bg: var(--green-50);
  --color-success-border: var(--green-200);
  --color-success-text: var(--green-700);

  --color-warning: var(--amber-500);
  --color-warning-bg: var(--amber-50);
  --color-warning-border: var(--amber-200);
  --color-warning-text: var(--amber-700);

  --color-error: var(--red-500);
  --color-error-bg: var(--red-50);
  --color-error-border: var(--red-200);
  --color-error-text: var(--red-700);

  --color-info: var(--blue-500);
  --color-info-bg: var(--blue-50);
  --color-info-border: var(--blue-200);
  --color-info-text: var(--blue-700);

  /* Shadows (Light theme) */
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

/* ============================================
   DARK THEME
   ============================================ */

[data-theme="dark"] {
  /* Brand */
  --color-brand-primary: var(--orange-500);
  --color-brand-primary-hover: var(--orange-400);
  --color-brand-primary-active: var(--orange-600);
  --color-brand-primary-muted: rgba(249, 115, 22, 0.15);

  --color-brand-secondary: var(--blue-500);
  --color-brand-secondary-hover: var(--blue-400);
  --color-brand-secondary-active: var(--blue-600);
  --color-brand-secondary-muted: rgba(59, 130, 246, 0.15);

  /* Surfaces */
  --color-surface-bg: var(--gray-950);
  --color-surface: var(--gray-900);
  --color-surface-elevated: var(--gray-800);
  --color-surface-overlay: rgba(17, 24, 39, 0.95);

  /* Sidebar (Same as light) */
  --color-sidebar-bg: var(--slate-950);
  --color-sidebar-bg-elevated: var(--slate-900);

  /* Text */
  --color-text-primary: var(--gray-100);
  --color-text-secondary: var(--gray-400);
  --color-text-tertiary: var(--gray-500);
  --color-text-muted: var(--gray-600);
  --color-text-disabled: var(--gray-700);
  --color-text-inverse: var(--gray-900);

  /* Borders */
  --color-border: var(--gray-700);
  --color-border-light: var(--gray-800);
  --color-border-dark: var(--gray-600);
  --color-border-focus: var(--blue-500);

  /* Status (Adjusted for dark) */
  --color-success-bg: rgba(34, 197, 94, 0.1);
  --color-success-border: var(--green-800);
  --color-success-text: var(--green-400);

  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-warning-border: var(--amber-800);
  --color-warning-text: var(--amber-400);

  --color-error-bg: rgba(239, 68, 68, 0.1);
  --color-error-border: var(--red-800);
  --color-error-text: var(--red-400);

  --color-info-bg: rgba(59, 130, 246, 0.1);
  --color-info-border: var(--blue-800);
  --color-info-text: var(--blue-400);

  /* Shadows (Dark theme - more subtle) */
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5);
}
```

### 2.2 TypeScript Token Definitions

```typescript
// src/styles/tokens.ts - Type-safe token access

export const colors = {
  brand: {
    primary: 'var(--color-brand-primary)',
    primaryHover: 'var(--color-brand-primary-hover)',
    primaryActive: 'var(--color-brand-primary-active)',
    primaryMuted: 'var(--color-brand-primary-muted)',
    secondary: 'var(--color-brand-secondary)',
    secondaryHover: 'var(--color-brand-secondary-hover)',
    secondaryActive: 'var(--color-brand-secondary-active)',
    secondaryMuted: 'var(--color-brand-secondary-muted)',
  },
  surface: {
    bg: 'var(--color-surface-bg)',
    default: 'var(--color-surface)',
    elevated: 'var(--color-surface-elevated)',
    overlay: 'var(--color-surface-overlay)',
  },
  sidebar: {
    bg: 'var(--color-sidebar-bg)',
    bgElevated: 'var(--color-sidebar-bg-elevated)',
    text: 'var(--color-sidebar-text)',
    textActive: 'var(--color-sidebar-text-active)',
    hover: 'var(--color-sidebar-hover)',
    active: 'var(--color-sidebar-active)',
    border: 'var(--color-sidebar-border)',
  },
  text: {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    tertiary: 'var(--color-text-tertiary)',
    muted: 'var(--color-text-muted)',
    disabled: 'var(--color-text-disabled)',
    inverse: 'var(--color-text-inverse)',
  },
  border: {
    default: 'var(--color-border)',
    light: 'var(--color-border-light)',
    dark: 'var(--color-border-dark)',
    focus: 'var(--color-border-focus)',
  },
  status: {
    success: 'var(--color-success)',
    successBg: 'var(--color-success-bg)',
    successBorder: 'var(--color-success-border)',
    successText: 'var(--color-success-text)',
    warning: 'var(--color-warning)',
    warningBg: 'var(--color-warning-bg)',
    warningBorder: 'var(--color-warning-border)',
    warningText: 'var(--color-warning-text)',
    error: 'var(--color-error)',
    errorBg: 'var(--color-error-bg)',
    errorBorder: 'var(--color-error-border)',
    errorText: 'var(--color-error-text)',
    info: 'var(--color-info)',
    infoBg: 'var(--color-info-bg)',
    infoBorder: 'var(--color-info-border)',
    infoText: 'var(--color-info-text)',
  },
} as const;

export const spacing = {
  0: 'var(--space-0)',
  0.5: 'var(--space-0.5)',
  1: 'var(--space-1)',
  1.5: 'var(--space-1.5)',
  2: 'var(--space-2)',
  2.5: 'var(--space-2.5)',
  3: 'var(--space-3)',
  3.5: 'var(--space-3.5)',
  4: 'var(--space-4)',
  5: 'var(--space-5)',
  6: 'var(--space-6)',
  7: 'var(--space-7)',
  8: 'var(--space-8)',
  9: 'var(--space-9)',
  10: 'var(--space-10)',
  12: 'var(--space-12)',
  14: 'var(--space-14)',
  16: 'var(--space-16)',
} as const;

export const radius = {
  none: 'var(--radius-none)',
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
  '3xl': 'var(--radius-3xl)',
  full: 'var(--radius-full)',
} as const;

export const shadows = {
  xs: 'var(--shadow-xs)',
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
} as const;

export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
} as const;

export type IconSize = keyof typeof iconSizes | number;
```

---

## 3. Theme Provider Implementation

```typescript
// src/contexts/ThemeContext.tsx

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

// Types
export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Storage key
const THEME_STORAGE_KEY = 'airaie-platform-theme';

// Provider
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = 'light', // Platform defaults to light
}: ThemeProviderProps) {
  // Initialize from localStorage or default
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored as Theme) || defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (resolved: ResolvedTheme) => {
      setResolvedTheme(resolved);
      root.setAttribute('data-theme', resolved);
      // Also set color-scheme for native elements
      root.style.colorScheme = resolved;
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches ? 'dark' : 'light');

      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Set theme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === 'system') {
        return resolvedTheme === 'dark' ? 'light' : 'dark';
      }
      return prev === 'dark' ? 'light' : 'dark';
    });
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Hook
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

---

## 4. Component Architecture

### 4.1 Updated Tailwind Configuration

```javascript
// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Colors from CSS variables
      colors: {
        brand: {
          primary: {
            DEFAULT: 'var(--color-brand-primary)',
            hover: 'var(--color-brand-primary-hover)',
            active: 'var(--color-brand-primary-active)',
            muted: 'var(--color-brand-primary-muted)',
          },
          secondary: {
            DEFAULT: 'var(--color-brand-secondary)',
            hover: 'var(--color-brand-secondary-hover)',
            active: 'var(--color-brand-secondary-active)',
            muted: 'var(--color-brand-secondary-muted)',
          },
        },
        surface: {
          bg: 'var(--color-surface-bg)',
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          overlay: 'var(--color-surface-overlay)',
        },
        sidebar: {
          bg: 'var(--color-sidebar-bg)',
          'bg-elevated': 'var(--color-sidebar-bg-elevated)',
          text: 'var(--color-sidebar-text)',
          'text-active': 'var(--color-sidebar-text-active)',
          hover: 'var(--color-sidebar-hover)',
          active: 'var(--color-sidebar-active)',
          border: 'var(--color-sidebar-border)',
        },
        content: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          muted: 'var(--color-text-muted)',
          disabled: 'var(--color-text-disabled)',
          inverse: 'var(--color-text-inverse)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
          dark: 'var(--color-border-dark)',
          focus: 'var(--color-border-focus)',
        },
        status: {
          success: {
            DEFAULT: 'var(--color-success)',
            bg: 'var(--color-success-bg)',
            border: 'var(--color-success-border)',
            text: 'var(--color-success-text)',
          },
          warning: {
            DEFAULT: 'var(--color-warning)',
            bg: 'var(--color-warning-bg)',
            border: 'var(--color-warning-border)',
            text: 'var(--color-warning-text)',
          },
          error: {
            DEFAULT: 'var(--color-error)',
            bg: 'var(--color-error-bg)',
            border: 'var(--color-error-border)',
            text: 'var(--color-error-text)',
          },
          info: {
            DEFAULT: 'var(--color-info)',
            bg: 'var(--color-info-bg)',
            border: 'var(--color-info-border)',
            text: 'var(--color-info-text)',
          },
        },
      },

      // Font family
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },

      // Border radius
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        full: 'var(--radius-full)',
      },

      // Box shadow
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        card: 'var(--shadow-sm)',
        'card-hover': 'var(--shadow-md)',
        dropdown: 'var(--shadow-lg)',
      },

      // Layout spacing
      spacing: {
        sidebar: 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-width-collapsed)',
        header: 'var(--header-height)',
        footer: 'var(--footer-height)',
      },

      // Z-index
      zIndex: {
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        fixed: 'var(--z-fixed)',
        overlay: 'var(--z-overlay)',
        modal: 'var(--z-modal)',
        popover: 'var(--z-popover)',
        tooltip: 'var(--z-tooltip)',
        toast: 'var(--z-toast)',
      },

      // Transitions
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
      },

      // Animations
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          from: { opacity: '0', transform: 'translateX(10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn var(--duration-normal) var(--ease-out)',
        fadeOut: 'fadeOut var(--duration-normal) var(--ease-out)',
        slideUp: 'slideUp var(--duration-normal) var(--ease-out)',
        slideDown: 'slideDown var(--duration-normal) var(--ease-out)',
        slideLeft: 'slideLeft var(--duration-normal) var(--ease-out)',
        slideRight: 'slideRight var(--duration-normal) var(--ease-out)',
        scaleIn: 'scaleIn var(--duration-normal) var(--ease-out)',
        spin: 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
};
```

### 4.2 Component Variants with CVA

```typescript
// src/components/ui/Button/Button.tsx

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@utils/cn';

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-lg',
    'transition-colors duration-fast',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-brand-primary text-white',
          'hover:bg-brand-primary-hover',
          'active:bg-brand-primary-active',
          'focus:ring-brand-primary',
        ],
        secondary: [
          'bg-brand-secondary text-white',
          'hover:bg-brand-secondary-hover',
          'active:bg-brand-secondary-active',
          'focus:ring-brand-secondary',
        ],
        outline: [
          'border-2 border-border',
          'text-content-primary bg-transparent',
          'hover:bg-surface-elevated hover:border-border-dark',
          'focus:ring-border-focus',
        ],
        ghost: [
          'text-content-secondary bg-transparent',
          'hover:text-content-primary hover:bg-surface-elevated',
          'focus:ring-border-focus',
        ],
        danger: [
          'bg-status-error text-white',
          'hover:bg-red-600',
          'focus:ring-status-error',
        ],
        success: [
          'bg-status-success text-white',
          'hover:bg-green-600',
          'focus:ring-status-success',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !loading && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
```

---

## 5. Icon System

### 5.1 Icon Wrapper Component

```typescript
// src/components/ui/Icon.tsx

import { type LucideIcon, type LucideProps } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '@utils/cn';

const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
} as const;

export type IconSize = keyof typeof iconSizes | number;

export interface IconProps extends Omit<LucideProps, 'size'> {
  icon: LucideIcon;
  size?: IconSize;
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ icon: LucideIcon, size = 'md', className, ...props }, ref) => {
    const sizeValue = typeof size === 'number' ? size : iconSizes[size];

    return (
      <LucideIcon
        ref={ref}
        size={sizeValue}
        className={cn('shrink-0', className)}
        {...props}
      />
    );
  }
);

Icon.displayName = 'Icon';
```

### 5.2 Platform-Specific Icons

```typescript
// src/components/icons/platform/index.tsx

import { forwardRef, type SVGProps } from 'react';

export interface PlatformIconProps extends SVGProps<SVGSVGElement> {
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { xs: 12, sm: 16, md: 20, lg: 24, xl: 32 };

function getSize(size: PlatformIconProps['size'] = 'md'): number {
  return typeof size === 'number' ? size : sizes[size];
}

function createPlatformIcon(name: string, paths: React.ReactNode) {
  const Icon = forwardRef<SVGSVGElement, PlatformIconProps>(
    ({ size = 'md', className = '', ...props }, ref) => {
      const s = getSize(size);
      return (
        <svg
          ref={ref}
          width={s}
          height={s}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 ${className}`}
          {...props}
        >
          {paths}
        </svg>
      );
    }
  );
  Icon.displayName = name;
  return Icon;
}

// ============================================
// PLATFORM ICONS
// ============================================

export const WorkflowIcon = createPlatformIcon('WorkflowIcon', (
  <>
    <rect x="3" y="3" width="6" height="6" rx="1" />
    <rect x="15" y="3" width="6" height="6" rx="1" />
    <rect x="9" y="15" width="6" height="6" rx="1" />
    <path d="M6 9v3a3 3 0 003 3h6a3 3 0 003-3V9" />
    <path d="M12 12v3" />
  </>
));

export const AgentIcon = createPlatformIcon('AgentIcon', (
  <>
    <circle cx="12" cy="8" r="5" />
    <path d="M12 13v2" />
    <rect x="6" y="17" width="12" height="4" rx="2" />
    <path d="M9 8h6" strokeWidth="2" />
    <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
  </>
));

export const TemplateIcon = createPlatformIcon('TemplateIcon', (
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </>
));

export const CADStudioIcon = createPlatformIcon('CADStudioIcon', (
  <>
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 7v10l10 5V12L2 7z" />
    <path d="M22 7v10l-10 5V12l10-5z" />
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
  </>
));

export const ProjectIcon = createPlatformIcon('ProjectIcon', (
  <>
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    <path d="M12 11v6" />
    <path d="M9 14h6" />
  </>
));

export const DashboardIcon = createPlatformIcon('DashboardIcon', (
  <>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </>
));

export const QuickActionIcon = createPlatformIcon('QuickActionIcon', (
  <>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fillOpacity="0.2" />
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </>
));
```

### 5.3 Unified Icon Export

```typescript
// src/components/icons/index.ts

// Re-export Lucide icons for general UI
export {
  // Navigation
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Home,
  MoreHorizontal,
  MoreVertical,

  // Actions
  Plus,
  Minus,
  Pencil,
  Trash2,
  Copy,
  Save,
  Download,
  Upload,
  RefreshCw,
  Undo2,
  Redo2,
  Share,
  ExternalLink,

  // State
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Star,
  StarOff,

  // View
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  List,
  LayoutGrid,

  // Settings
  Settings,
  Filter,
  SortAsc,
  SortDesc,
  Search,
  Bell,
  BellOff,

  // User
  User,
  Users,
  LogOut,
  LogIn,

  // Files
  File,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Image,

  // System
  Sun,
  Moon,
  Monitor,
  Cpu,
  HardDrive,
  Activity,
  Clock,
  Calendar,
  Timer,

  // Communication
  MessageSquare,
  Mail,
  Send,

  // Misc
  Layers,
  Target,
  Sparkles,
  Zap,
  Play,
  Pause,
  Square,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

// Export Icon wrapper component
export { Icon, type IconProps, type IconSize } from '@components/ui/Icon';

// Export all Platform icons
export * from './platform';
```

---

## 6. File Structure

```
src/
├── styles/
│   ├── tokens.css              # All CSS variables (single source of truth)
│   ├── tokens.ts               # TypeScript token definitions
│   └── globals.css             # Global styles (imports tokens.css)
│
├── contexts/
│   ├── ThemeContext.tsx        # Theme provider & hook
│   └── index.ts
│
├── components/
│   ├── ui/                     # Base UI primitives
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Checkbox/
│   │   ├── Switch/
│   │   ├── Dialog/
│   │   ├── Toast/
│   │   ├── Card/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Dropdown/
│   │   ├── Tooltip/
│   │   ├── Icon.tsx            # Lucide wrapper
│   │   └── index.ts
│   │
│   ├── icons/
│   │   ├── platform/           # Platform-specific icons
│   │   │   └── index.tsx
│   │   └── index.ts            # Unified exports
│   │
│   ├── common/                 # Shared compound components
│   │   ├── SearchInput/
│   │   ├── DataTable/
│   │   ├── EmptyState/
│   │   ├── StatusIndicator/
│   │   ├── ProgressBar/
│   │   ├── Pagination/
│   │   └── index.ts
│   │
│   ├── layout/                 # Layout components
│   │   ├── AppLayout/
│   │   ├── Sidebar/
│   │   ├── Header/
│   │   ├── PageHeader/
│   │   └── index.ts
│   │
│   └── [feature]/              # Feature-specific components
│       ├── dashboard/
│       ├── projects/
│       ├── workflows/
│       ├── agents/
│       └── templates/
│
├── utils/
│   ├── cn.ts                   # Class name utility (clsx + tailwind-merge)
│   └── ...
│
└── main.tsx                    # ThemeProvider wraps App
```

---

## 7. Implementation Plan

### Phase 1: Token System Setup

1. Create `src/styles/tokens.css` with all CSS variables
2. Create `src/styles/tokens.ts` with TypeScript definitions
3. Update `src/styles/globals.css` to import tokens
4. Update `tailwind.config.js` to reference CSS variables

### Phase 2: Theme System

1. Create `src/contexts/ThemeContext.tsx`
2. Wrap App with `ThemeProvider` in `main.tsx`
3. Create `ThemeToggle` component

### Phase 3: Icon System

1. Create `src/components/ui/Icon.tsx` wrapper
2. Create `src/components/icons/platform/index.tsx`
3. Create `src/components/icons/index.ts` exports

### Phase 4: Base Components

1. Implement `Button` with CVA variants
2. Implement `Input`, `Select`, `Checkbox`, `Switch`
3. Implement `Card`, `Badge`, `Avatar`
4. Implement `Dialog`, `Toast`, `Dropdown`, `Tooltip`

### Phase 5: Layout Components

1. Implement `Sidebar` (always dark theme)
2. Implement `Header`
3. Implement `AppLayout`
4. Implement `PageHeader`

### Phase 6: Common Components

1. Implement `SearchInput`
2. Implement `DataTable`
3. Implement `EmptyState`
4. Implement `StatusIndicator`, `ProgressBar`

---

## 8. Usage Examples

### Using Theme Colors

```tsx
// Tailwind classes automatically use CSS variables
<div className="bg-surface text-content-primary border-border">
  <h1 className="text-brand-primary">Title</h1>
  <p className="text-content-secondary">Description</p>
  <button className="bg-brand-primary hover:bg-brand-primary-hover">
    Click me
  </button>
</div>

// Status colors
<div className="bg-status-success-bg border border-status-success-border text-status-success-text">
  Success message
</div>
```

### Using Icons

```tsx
import { Settings, Search, Plus } from 'lucide-react';
import { WorkflowIcon, AgentIcon, CADStudioIcon } from '@components/icons';
import { Icon } from '@components/ui/Icon';

// Direct Lucide usage
<Settings size={20} className="text-content-secondary" />
<Search size={20} />

// With Icon wrapper (consistent sizing)
<Icon icon={Settings} size="lg" className="text-content-secondary" />

// Platform icons
<WorkflowIcon size="lg" className="text-brand-primary" />
<AgentIcon size={24} />
<CADStudioIcon size="md" />
```

### Using Theme Hook

```tsx
import { useTheme } from '@contexts/ThemeContext';

function MyComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current: {theme}</p>
      <p>Resolved: {resolvedTheme}</p>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}
```

### Using Button Component

```tsx
import { Button } from '@components/ui/Button';
import { Plus, Download, Trash2 } from 'lucide-react';

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// With icons
<Button leftIcon={<Plus size={16} />}>Add New</Button>
<Button rightIcon={<Download size={16} />}>Export</Button>

// Loading state
<Button loading>Processing...</Button>

// Icon button
<Button size="icon" variant="ghost">
  <Trash2 size={16} />
</Button>
```

---

## Summary

### Benefits of This Approach

1. **Single Source of Truth**: All design values in `tokens.css`
2. **Zero Runtime Cost**: CSS variables are native browser features
3. **Type Safety**: TypeScript definitions for all tokens
4. **Easy Theming**: Just toggle `data-theme` attribute
5. **Consistent Icons**: Unified API for all icons
6. **Accessible**: Focus states, keyboard navigation built-in
7. **Performant**: Tree-shakeable icons, minimal JS overhead
8. **Maintainable**: Change once, apply everywhere

### Key Differences from CAD Studio

| Aspect | CAD Studio | Platform |
|--------|------------|----------|
| Default Theme | Dark | Light |
| Main Surface | Dark throughout | Light with dark sidebar |
| Primary Color | Blue | Orange |
| Icon Library | CAD-specific | Platform/workflow |
| Layout | 3D workspace | Dashboard/admin |

---

*Centralized UI Design System for AirAie Platform*
*Version 1.0 | December 30, 2025*
