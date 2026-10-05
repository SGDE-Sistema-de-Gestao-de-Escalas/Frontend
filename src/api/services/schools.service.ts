import apiClient from "../client";
import type { ApiResponse } from "../types/api.types";
import type { EntityId } from "../../types";

export interface SchoolApiPayload {
  name: string;
  acronym: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  active?: boolean;
}

export interface BackendSchoolResource {
  id: string;
  name: string;
  acronym?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  assistants?: number;
  assistants_count?: number;
  can_delete?: boolean;
  cannot_delete_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const schoolsService = {
  /**
   * List all schools
   * GET /api/schools
   */
  async getAll(): Promise<ApiResponse<BackendSchoolResource[]> | BackendSchoolResource[]> {
    const response = await apiClient.get("/schools");
    return response.data;
  },

  /**
   * Get single school by ID
   * GET /api/schools/{id}
   */
  async getById(id: EntityId): Promise<ApiResponse<BackendSchoolResource>> {
    const response = await apiClient.get<ApiResponse<BackendSchoolResource>>(`/schools/${id}`);
    return response.data;
  },

  /**
   * Create a new school
   * POST /api/schools
   */
  async create(data: SchoolApiPayload): Promise<ApiResponse<BackendSchoolResource>> {
    const response = await apiClient.post<ApiResponse<BackendSchoolResource>>("/schools", data);
    return response.data;
  },

  /**
   * Update an existing school
   * PUT /api/schools/{id}
   */
  async update(id: EntityId, data: Partial<SchoolApiPayload>): Promise<ApiResponse<BackendSchoolResource>> {
    const response = await apiClient.put<ApiResponse<BackendSchoolResource>>(`/schools/${id}`, data);
    return response.data;
  },

  /**
   * Delete a school
   * DELETE /api/schools/{id}
   */
  async delete(id: EntityId): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/schools/${id}`);
    return response.data;
  },

  /**
   * Toggle school active status
   * PUT /api/schools/{id}
   */
  async toggleActive(id: EntityId, active: boolean): Promise<ApiResponse<BackendSchoolResource>> {
    const response = await apiClient.put<ApiResponse<BackendSchoolResource>>(`/schools/${id}`, { active });
    return response.data;
  },
};

export default schoolsService;
