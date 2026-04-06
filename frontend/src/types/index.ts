export * from './auth';
export * from './project';
export * from './workflow';
export * from './agent';
export * from './template';
export * from './system';
export * from './dashboard';
export * from './run';
export * from './agentPlayground';
export * from './tool';
export * from './board';
export * from './card';
export * from './gate';
export * from './intent';
export * from './plan';
export * from './execution';
export * from './canvas';

// Common types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
