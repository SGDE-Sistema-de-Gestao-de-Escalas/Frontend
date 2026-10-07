/**
 * Standard API response interfaces matching Laravel Eloquent API Resources
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginationMeta {
  current_page: number;
  from?: number;
  last_page: number;
  path?: string;
  per_page: number;
  to?: number;
  total: number;
}

export interface PaginationLinks {
  first?: string;
  last?: string;
  prev?: string | null;
  next?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  links?: PaginationLinks;
  meta: PaginationMeta;
}

export interface ApiValidationError {
  message: string;
  errors?: Record<string, string[]>;
}
