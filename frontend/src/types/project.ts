export interface Project {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  status: 'active' | 'archived' | 'deleted';
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  shapeCount: number;
  fileSize: number;
  tags?: string[];
  isPublic: boolean;
  collaborators?: ProjectCollaborator[];
}

export interface ProjectCollaborator {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'viewer' | 'editor' | 'admin';
  addedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  templateId?: string;
  isPublic?: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'archived';
  isPublic?: boolean;
  tags?: string[];
}

export interface ProjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'archived' | 'all';
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastAccessedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
