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
  BOARDS: {
    LIST: '/v0/boards',
    CREATE: '/v0/boards',
    GET: (id: string) => `/v0/boards/${id}`,
    UPDATE: (id: string) => `/v0/boards/${id}`,
    DELETE: (id: string) => `/v0/boards/${id}`,
    SUMMARY: (id: string) => `/v0/boards/${id}/summary`,
    MODE_CONFIG: (id: string) => `/v0/boards/${id}/mode-config`,
    ESCALATE: (id: string) => `/v0/boards/${id}/mode-escalate`,
    CHILDREN: (id: string) => `/v0/boards/${id}/children`,
    FROM_INTENT: '/v0/boards/from-intent',
  },
  CARDS: {
    LIST: (boardId: string) => `/v0/boards/${boardId}/cards`,
    CREATE: (boardId: string) => `/v0/boards/${boardId}/cards`,
    GET: (id: string) => `/v0/cards/${id}`,
    UPDATE: (id: string) => `/v0/cards/${id}`,
    DELETE: (id: string) => `/v0/cards/${id}`,
    EVIDENCE: (id: string) => `/v0/cards/${id}/evidence`,
    RUNS: (id: string) => `/v0/cards/${id}/runs`,
    GRAPH: (boardId: string) => `/v0/boards/${boardId}/cards/graph`,
  },
  INTENTS: {
    LIST: (boardId: string) => `/v0/boards/${boardId}/intents`,
    CREATE: (boardId: string) => `/v0/boards/${boardId}/intents`,
    GET: (id: string) => `/v0/intents/${id}`,
    UPDATE: (id: string) => `/v0/intents/${id}`,
    LOCK: (id: string) => `/v0/intents/${id}/lock`,
  },
  PLANS: {
    GENERATE: (cardId: string) => `/v0/cards/${cardId}/plan/generate`,
    GET: (cardId: string) => `/v0/cards/${cardId}/plan`,
    EDIT: (cardId: string) => `/v0/cards/${cardId}/plan`,
    VALIDATE: (cardId: string) => `/v0/cards/${cardId}/plan/validate`,
    COMPILE: (cardId: string) => `/v0/cards/${cardId}/plan/compile`,
    EXECUTE: (cardId: string) => `/v0/cards/${cardId}/plan/execute`,
  },
  TOOLS: {
    LIST: '/v0/tools',
    CREATE: '/v0/tools',
    GET: (id: string) => `/v0/tools/${id}`,
    VERSIONS: (id: string) => `/v0/tools/${id}/versions`,
    PUBLISH: (id: string, v: string) => `/v0/tools/${id}/versions/${v}/publish`,
    RESOLVE: '/v0/toolshelf/resolve',
  },
  VERTICALS: {
    LIST: '/v0/verticals',
    GET: (slug: string) => `/v0/verticals/${slug}`,
    INTENT_TYPES: (slug: string) => `/v0/verticals/${slug}/intent-types`,
    BOARD_TYPES: (slug: string) => `/v0/verticals/${slug}/board-types`,
  },
  PIPELINES: {
    LIST: '/v0/pipelines',
    GET: (id: string) => `/v0/pipelines/${id}`,
  },
} as const;
