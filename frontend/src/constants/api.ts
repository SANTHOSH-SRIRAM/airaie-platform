/**
 * API configuration
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || '/api',
  KERNEL_URL: '/v0',
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

/**
 * Kernel /v0 endpoints
 */
export const KERNEL_ENDPOINTS = {
  WORKFLOWS: {
    LIST: '/v0/workflows',
    CREATE: '/v0/workflows',
    GET: (id: string) => `/v0/workflows/${id}`,
    COMPILE: '/v0/workflows/compile',
    VALIDATE: '/v0/workflows/validate',
    VERSIONS: (id: string) => `/v0/workflows/${id}/versions`,
  },
  AGENTS: {
    LIST: '/v0/agents',
    CREATE: '/v0/agents',
    GET: (id: string) => `/v0/agents/${id}`,
    VERSIONS: (id: string) => `/v0/agents/${id}/versions`,
    VALIDATE: (id: string, v: number) => `/v0/agents/${id}/versions/${v}/validate`,
    RUN: (id: string, v: number) => `/v0/agents/${id}/versions/${v}/run`,
    SESSIONS: (id: string) => `/v0/agents/${id}/sessions`,
  },
  RUNS: {
    LIST: '/v0/runs',
    CREATE: '/v0/runs',
    GET: (id: string) => `/v0/runs/${id}`,
    CANCEL: (id: string) => `/v0/runs/${id}/cancel`,
    STREAM: (id: string) => `/v0/runs/${id}/stream`,
    LOGS: (id: string) => `/v0/runs/${id}/logs`,
    ARTIFACTS: (id: string) => `/v0/runs/${id}/artifacts`,
  },
  ARTIFACTS: {
    LIST: '/v0/artifacts',
    GET: (id: string) => `/v0/artifacts/${id}`,
    LINEAGE: (id: string) => `/v0/artifacts/${id}/lineage`,
    DOWNLOAD: (id: string) => `/v0/artifacts/${id}/download`,
  },
  GATES: {
    LIST: '/v0/gates',
    GET: (id: string) => `/v0/gates/${id}`,
    APPROVE: (id: string) => `/v0/gates/${id}/approve`,
    REJECT: (id: string) => `/v0/gates/${id}/reject`,
    WAIVE: (id: string) => `/v0/gates/${id}/waive`,
  },
} as const;
