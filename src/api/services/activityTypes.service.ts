import apiClient from "../client";
import type { ApiResponse } from "../types/api.types";
import type { ActivityType } from "../../types";

export interface ActivityTypePayload {
  name: string;
  color?: string;
  active?: boolean;
}

export interface BackendActivityTypeResource {
  id: string;
  school_id: string;
  name: string;
  color: string;
  is_system: boolean;
  active: boolean;
  status_message: string;
  can_delete: boolean;
  cannot_delete_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

export const activityTypesService = {
  /**
   * List all activity types for the active school context (X-School-ID)
   * GET /api/activity-types
   */
  async getAll(): Promise<ApiResponse<BackendActivityTypeResource[]> | BackendActivityTypeResource[]> {
    const response = await apiClient.get<any>("/activity-types");
    return response.data;
  },

  /**
   * Get single activity type by ID
   * GET /api/activity-types/{id}
   */
  async getById(id: string): Promise<ApiResponse<BackendActivityTypeResource>> {
    const response = await apiClient.get<ApiResponse<BackendActivityTypeResource>>(`/activity-types/${id}`);
    return response.data;
  },

  /**
   * Create new activity type
   * POST /api/activity-types
   */
  async create(data: ActivityTypePayload): Promise<ApiResponse<BackendActivityTypeResource>> {
    const response = await apiClient.post<ApiResponse<BackendActivityTypeResource>>("/activity-types", data);
    return response.data;
  },

  /**
   * Update existing activity type
   * PUT /api/activity-types/{id}
   */
  async update(id: string, data: Partial<ActivityTypePayload>): Promise<ApiResponse<BackendActivityTypeResource>> {
    const response = await apiClient.put<ApiResponse<BackendActivityTypeResource>>(`/activity-types/${id}`, data);
    return response.data;
  },

  /**
   * Delete activity type
   * DELETE /api/activity-types/{id}
   */
  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/activity-types/${id}`);
    return response.data;
  },
};

export default activityTypesService;

