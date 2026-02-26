export * from './auth';
export * from './project';
export * from './workflow';
export * from './agent';
export * from './template';
export * from './system';

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
