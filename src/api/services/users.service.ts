import apiClient from "../client";
import type { ApiResponse, PaginatedResponse } from "../types/api.types";
import type { AdminUser, EntityId } from "../../types";

export interface UserApiPayload {
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role_id?: string;
  is_active?: boolean;
}

export interface BackendUserResource {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  is_active: boolean;
  role?: string;
  created_at?: string;
  can_delete?: boolean;
  cannot_delete_reason?: string | null;
}

export const usersService = {
  /**
   * List users with pagination and optional role filter
   * GET /api/users
   */
  async getAll(): Promise<PaginatedResponse<BackendUserResource>> {
    const response = await apiClient.get<PaginatedResponse<BackendUserResource>>("/users");
    return response.data;
  },

  /**
   * Get single user by ID
   * GET /api/users/{id}
   */
  async getById(id: EntityId): Promise<ApiResponse<BackendUserResource>> {
    const response = await apiClient.get<ApiResponse<BackendUserResource>>(`/users/${id}`);
    return response.data;
  },

  /**
   * Create a new user
   * POST /api/users
   */
  async create(data: UserApiPayload): Promise<ApiResponse<BackendUserResource>> {
    const response = await apiClient.post<ApiResponse<BackendUserResource>>("/users", data);
    return response.data;
  },

  /**
   * Update an existing user
   * PUT /api/users/{id}
   */
  async update(id: EntityId, data: Partial<UserApiPayload>): Promise<ApiResponse<BackendUserResource>> {
    const response = await apiClient.put<ApiResponse<BackendUserResource>>(`/users/${id}`, data);
    return response.data;
  },

  /**
   * Inactivate user (Backend sets is_active = false)
   * DELETE /api/users/{id}
   */
  async delete(id: EntityId): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};

export default usersService;
