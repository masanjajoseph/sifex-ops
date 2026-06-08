/**
 * Domain-level types and contracts
 * These are the core business domain types used across the application
 */

// User & Auth
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  organizationId: string | null;
  branchId: string | null;
  branchIds?: string[];
  departmentId: string | null;
  stations: string[];
  recentlyUsed?: string[];
  favorites?: string[];
}

export interface AuthSession {
  user: AuthUser;
}

// Permissions & RBAC
export interface PermissionContext {
  userId: string;
  roles: string[];
  permissions: string[];
  organizationId: string | null;
  branchId: string | null;
  stations: string[];
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: number;
    requestId?: string;
  };
}

// Pagination
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Audit
export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Error
export interface AppErrorResponse {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// Module
export interface ModuleAccess {
  moduleId: string;
  canAccess: boolean;
  permissions: string[];
}

// Offline
export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: string;
  data: unknown;
  timestamp: number;
  synced: boolean;
}
