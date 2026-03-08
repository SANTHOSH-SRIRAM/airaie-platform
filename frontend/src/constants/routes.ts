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

  // Embedded studio routes
  BOARDS: '/boards',
  WORKFLOW_STUDIO: '/workflow-studio',
  AGENT_STUDIO: '/agent-studio',
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
