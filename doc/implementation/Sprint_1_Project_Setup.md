# Sprint 1: Project Setup & Core Infrastructure

**Project**: AirAie Platform Frontend
**Sprint**: 1 of 12
**Status**: Pending
**Date**: 2025-12-30

---

## Sprint Overview

This sprint establishes the foundational infrastructure for the AirAie Platform Frontend application. It includes project initialization, build configuration, styling setup, and base utility functions.

---

## Objectives

1. Initialize a modern React + TypeScript project with Vite
2. Configure Tailwind CSS with custom design tokens matching the design
3. Set up code quality tools (ESLint, Prettier)
4. Create Docker configuration for development and production
5. Establish project folder structure
6. Implement base utility functions

---

## Tasks

### Task 1.1: Project Initialization

**Create Vite + React + TypeScript Project**

```bash
# Navigate to platform directory
cd /Users/santhosh/airaie/airaie_platform

# Create frontend project
npm create vite@latest frontend -- --template react-ts

# Navigate to frontend
cd frontend

# Install dependencies
npm install
```

**Dependencies to Install**:

```bash
# Core dependencies
npm install react-router-dom@7 axios@1 zustand@5 @tanstack/react-query@5

# UI dependencies
npm install lucide-react@0.460 clsx tailwind-merge

# Form handling
npm install react-hook-form@7 @hookform/resolvers zod@3

# Charts (for system health)
npm install recharts@2

# Dev dependencies
npm install -D @types/node tailwindcss@3 postcss autoprefixer
npm install -D eslint@9 @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier eslint-config-prettier eslint-plugin-react-hooks
```

---

### Task 1.2: Vite Configuration

**File**: `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@api': path.resolve(__dirname, './src/api'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['lucide-react', 'recharts'],
        },
      },
    },
  },
});
```

---

### Task 1.3: TypeScript Configuration

**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@pages/*": ["./src/pages/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@store/*": ["./src/store/*"],
      "@api/*": ["./src/api/*"],
      "@types/*": ["./src/types/*"],
      "@utils/*": ["./src/utils/*"],
      "@constants/*": ["./src/constants/*"],
      "@styles/*": ["./src/styles/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**File**: `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

---

### Task 1.4: Tailwind CSS Configuration

**File**: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sidebar (Dark Theme)
        sidebar: {
          bg: '#1a1a2e',
          'bg-dark': '#16213e',
          text: '#a0aec0',
          'text-active': '#ffffff',
          hover: '#2d3748',
          active: '#3b82f6',
          border: '#2d3748',
        },
        // Main Content (Light Theme)
        surface: {
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
        },
        // Brand Colors
        brand: {
          primary: '#f97316',    // Orange (CTA buttons)
          'primary-dark': '#ea580c',
          secondary: '#3b82f6',  // Blue
          'secondary-dark': '#2563eb',
        },
        // Status Colors
        status: {
          success: '#22c55e',
          'success-light': '#dcfce7',
          warning: '#f59e0b',
          'warning-light': '#fef3c7',
          danger: '#ef4444',
          'danger-light': '#fee2e2',
          info: '#3b82f6',
          'info-light': '#dbeafe',
        },
        // Text Colors
        content: {
          primary: '#1a202c',
          secondary: '#4a5568',
          tertiary: '#718096',
          muted: '#a0aec0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        'sidebar': '260px',
        'sidebar-collapsed': '72px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
```

**File**: `postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

### Task 1.5: Global Styles

**File**: `src/styles/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --sidebar-width: 260px;
    --sidebar-collapsed-width: 72px;
    --header-height: 64px;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply bg-surface-bg text-content-primary;
    min-height: 100vh;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-transparent;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-gray-300 rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-400;
  }

  /* Sidebar scrollbar (dark) */
  .sidebar-scrollbar::-webkit-scrollbar-thumb {
    @apply bg-gray-600;
  }

  .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-500;
  }
}

@layer components {
  /* Button base styles */
  .btn {
    @apply inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200;
    @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
  }

  .btn-primary {
    @apply btn bg-brand-primary text-white hover:bg-brand-primary-dark;
    @apply focus:ring-brand-primary;
  }

  .btn-secondary {
    @apply btn bg-brand-secondary text-white hover:bg-brand-secondary-dark;
    @apply focus:ring-brand-secondary;
  }

  .btn-outline {
    @apply btn border-2 border-gray-300 text-content-primary;
    @apply hover:border-gray-400 hover:bg-gray-50;
    @apply focus:ring-gray-300;
  }

  .btn-ghost {
    @apply btn text-content-secondary hover:bg-gray-100;
    @apply focus:ring-gray-300;
  }

  /* Card styles */
  .card {
    @apply bg-surface-card rounded-xl shadow-card;
  }

  .card-hover {
    @apply card hover:shadow-card-hover transition-shadow duration-200;
  }

  /* Input styles */
  .input {
    @apply w-full px-4 py-2 rounded-lg border border-surface-border;
    @apply bg-white text-content-primary placeholder-content-muted;
    @apply focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-transparent;
    @apply transition-all duration-200;
  }

  .input-error {
    @apply input border-status-danger focus:ring-status-danger;
  }

  /* Badge styles */
  .badge {
    @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium;
  }

  .badge-success {
    @apply badge bg-status-success-light text-green-800;
  }

  .badge-warning {
    @apply badge bg-status-warning-light text-yellow-800;
  }

  .badge-danger {
    @apply badge bg-status-danger-light text-red-800;
  }

  .badge-info {
    @apply badge bg-status-info-light text-blue-800;
  }
}

@layer utilities {
  /* Sidebar navigation item */
  .nav-item {
    @apply flex items-center gap-3 px-4 py-2.5 rounded-lg;
    @apply text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active;
    @apply transition-colors duration-200 cursor-pointer;
  }

  .nav-item-active {
    @apply nav-item bg-sidebar-active text-sidebar-text-active;
  }

  /* Truncate text */
  .truncate-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Glass effect */
  .glass {
    @apply bg-white/80 backdrop-blur-sm;
  }

  /* Loading skeleton */
  .skeleton {
    @apply bg-gray-200 animate-pulse rounded;
  }
}
```

---

### Task 1.6: Utility Functions

**File**: `src/utils/cn.ts`

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

**File**: `src/utils/format.ts`

```typescript
/**
 * Format a number as a percentage
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format a date relative to now (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

/**
 * Format a date to a readable string
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', options).format(targetDate);
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert a string to kebab-case
 */
export function toKebabCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Generate a random ID
 */
export function generateId(prefix = ''): string {
  const random = Math.random().toString(36).substring(2, 11);
  return prefix ? `${prefix}_${random}` : random;
}
```

**File**: `src/utils/storage.ts`

```typescript
/**
 * Type-safe localStorage wrapper
 */
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};
```

**File**: `src/utils/validation.ts`

```typescript
import { z } from 'zod';

/**
 * Common validation schemas
 */
export const schemas = {
  email: z.string().email('Invalid email address'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),

  url: z.string().url('Invalid URL'),

  uuid: z.string().uuid('Invalid ID'),
};

/**
 * Validate data against a schema
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
```

**File**: `src/utils/index.ts`

```typescript
export * from './cn';
export * from './format';
export * from './storage';
export * from './validation';
```

---

### Task 1.7: Constants

**File**: `src/constants/routes.ts`

```typescript
/**
 * Application routes
 */
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Protected routes
  DASHBOARD: '/dashboard',
  CAD_STUDIO: '/cad-studio',
  PROJECTS: '/projects',
  PROJECT_DETAIL: '/projects/:id',
  WORKFLOWS: '/workflows',
  WORKFLOW_DETAIL: '/workflows/:id',
  AGENTS: '/agents',
  AGENT_DETAIL: '/agents/:id',
  TEMPLATES: '/templates',
  SETTINGS: '/settings',
  PROFILE: '/profile',
} as const;

/**
 * Generate route with parameters
 */
export function generateRoute(
  route: string,
  params: Record<string, string>
): string {
  let result = route;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, value);
  }
  return result;
}
```

**File**: `src/constants/api.ts`

```typescript
/**
 * API configuration
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || '/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    ME: '/auth/me',
  },

  // Projects
  PROJECTS: {
    LIST: '/projects',
    CREATE: '/projects',
    GET: '/projects/:id',
    UPDATE: '/projects/:id',
    DELETE: '/projects/:id',
  },

  // Workflows
  WORKFLOWS: {
    LIST: '/workflows',
    CREATE: '/workflows',
    GET: '/workflows/:id',
    UPDATE: '/workflows/:id',
    DELETE: '/workflows/:id',
  },

  // Agents
  AGENTS: {
    LIST: '/agents',
    CREATE: '/agents',
    GET: '/agents/:id',
    UPDATE: '/agents/:id',
    DELETE: '/agents/:id',
  },

  // Templates
  TEMPLATES: {
    LIST: '/templates',
    GET: '/templates/:id',
    USE: '/templates/:id/use',
  },

  // System
  SYSTEM: {
    HEALTH: '/system/health',
    STATS: '/system/stats',
  },
} as const;
```

**File**: `src/constants/index.ts`

```typescript
export * from './routes';
export * from './api';

/**
 * Application metadata
 */
export const APP_CONFIG = {
  NAME: 'AirAie Platform',
  VERSION: '1.0.0',
  DESCRIPTION: 'Precision Parametric Engineering Platform',
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'airaie_auth_token',
  REFRESH_TOKEN: 'airaie_refresh_token',
  USER: 'airaie_user',
  THEME: 'airaie_theme',
  SIDEBAR_COLLAPSED: 'airaie_sidebar_collapsed',
} as const;

/**
 * Query keys for React Query
 */
export const QUERY_KEYS = {
  USER: ['user'],
  PROJECTS: ['projects'],
  PROJECT: (id: string) => ['project', id],
  WORKFLOWS: ['workflows'],
  WORKFLOW: (id: string) => ['workflow', id],
  AGENTS: ['agents'],
  AGENT: (id: string) => ['agent', id],
  TEMPLATES: ['templates'],
  SYSTEM_HEALTH: ['system', 'health'],
  SYSTEM_STATS: ['system', 'stats'],
} as const;
```

---

### Task 1.8: Environment Configuration

**File**: `.env.example`

```env
# API Configuration
VITE_API_URL=http://localhost:8080/api

# App Configuration
VITE_APP_NAME=AirAie Platform
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

**File**: `.env.development`

```env
VITE_API_URL=http://localhost:8080/api
VITE_ENABLE_DEBUG=true
```

---

### Task 1.9: Docker Configuration

**File**: `Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

**File**: `nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;
    gzip_disable "MSIE [1-6]\.";

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Health check endpoint
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }

        # Static assets caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API proxy
        location /api {
            proxy_pass http://backend:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # SPA fallback
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=http://backend:8080/api
    depends_on:
      - backend
    networks:
      - airaie-network

  backend:
    image: airaie-platform-backend:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/airaie
    depends_on:
      - db
    networks:
      - airaie-network

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: airaie
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - airaie-network

networks:
  airaie-network:
    driver: bridge

volumes:
  postgres_data:
```

---

### Task 1.10: ESLint Configuration

**File**: `eslint.config.js`

```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['dist', 'node_modules'],
  },
];
```

---

### Task 1.11: Package.json Scripts

**File**: `package.json` (scripts section)

```json
{
  "name": "airaie-platform-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

### Task 1.12: Entry Files

**File**: `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/logo.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="AirAie Platform - Precision Parametric Engineering" />
    <title>AirAie Platform</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**File**: `src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import '@styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

**File**: `src/App.tsx`

```typescript
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface-bg">
        <h1 className="text-2xl font-bold text-center py-8">
          AirAie Platform
        </h1>
        <p className="text-center text-content-secondary">
          Project setup complete. Ready for Sprint 2.
        </p>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

---

## Folder Structure After Sprint 1

```
airaie_platform/
└── frontend/
    ├── public/
    │   └── logo.svg
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── constants/
    │   │   ├── api.ts
    │   │   ├── index.ts
    │   │   └── routes.ts
    │   ├── hooks/
    │   ├── pages/
    │   ├── store/
    │   ├── styles/
    │   │   └── globals.css
    │   ├── types/
    │   ├── utils/
    │   │   ├── cn.ts
    │   │   ├── format.ts
    │   │   ├── index.ts
    │   │   ├── storage.ts
    │   │   └── validation.ts
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── vite-env.d.ts
    ├── .env.example
    ├── .gitignore
    ├── docker-compose.yml
    ├── Dockerfile
    ├── eslint.config.js
    ├── index.html
    ├── nginx.conf
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── vite.config.ts
```

---

## Verification Checklist

- [ ] Vite dev server starts without errors
- [ ] TypeScript compilation passes
- [ ] ESLint shows no errors
- [ ] Tailwind CSS classes work correctly
- [ ] Custom colors are applied
- [ ] Path aliases resolve correctly
- [ ] Docker build completes successfully
- [ ] Utility functions work as expected

---

## Dependencies Summary

### Production Dependencies
```
react: ^18.3.1
react-dom: ^18.3.1
react-router-dom: ^7.1.0
axios: ^1.7.9
zustand: ^5.0.2
@tanstack/react-query: ^5.62.0
lucide-react: ^0.460.0
clsx: ^2.1.1
tailwind-merge: ^2.5.0
react-hook-form: ^7.54.0
@hookform/resolvers: ^3.9.0
zod: ^3.24.0
recharts: ^2.13.0
```

### Development Dependencies
```
@types/node: ^22.0.0
@types/react: ^18.3.0
@types/react-dom: ^18.3.0
@vitejs/plugin-react: ^4.3.4
autoprefixer: ^10.4.20
eslint: ^9.17.0
postcss: ^8.4.49
tailwindcss: ^3.4.17
typescript: ~5.7.2
vite: ^6.0.5
vitest: ^2.1.8
```

---

## Next Sprint

Sprint 2 will focus on implementing UI Primitives and Base Components including Button, Input, Select, Dialog, Toast, and other foundational UI elements.
