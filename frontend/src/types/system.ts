export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  computeNodes: {
    total: number;
    active: number;
    percentage: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  lastChecked: string;
  services: ServiceStatus[];
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastChecked: string;
  message?: string;
}

export interface SystemStats {
  totalProjects: number;
  totalWorkflows: number;
  totalAgents: number;
  activeUsers: number;
  apiCalls: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  storage: {
    used: number;
    total: number;
  };
  compute: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage?: number;
  };
}

export interface UserStats {
  projectCount: number;
  workflowCount: number;
  agentCount: number;
  storageUsed: number;
  storageLimit: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}
