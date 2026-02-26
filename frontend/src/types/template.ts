export interface Template {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  thumbnail?: string;
  previewImages?: string[];
  ownerId?: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  rating?: number;
  ratingCount?: number;
  tags?: string[];
  isOfficial: boolean;
  isFeatured: boolean;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  features: string[];
}

export type TemplateCategory =
  | 'mechanical'
  | 'architectural'
  | 'electrical'
  | 'automotive'
  | 'aerospace'
  | 'furniture'
  | 'packaging'
  | 'consumer'
  | 'other';

export interface TemplateListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: TemplateCategory | 'all';
  complexity?: Template['complexity'] | 'all';
  isOfficial?: boolean;
  isFeatured?: boolean;
  sortBy?: 'name' | 'createdAt' | 'usageCount' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface TemplateListResponse {
  templates: Template[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UseTemplateRequest {
  projectName: string;
  projectDescription?: string;
}

export interface UseTemplateResponse {
  projectId: string;
  projectName: string;
}
