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
