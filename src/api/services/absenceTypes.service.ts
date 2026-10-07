import apiClient from "../client";
import type { ApiResponse } from "../types/api.types";
import type { AbsenceType, EntityId } from "../../types";

export interface AbsenceTypePayload {
  name: string;
  requires_document?: boolean;
}

export interface BackendAbsenceTypeResource {
  id: string | number;
  name: string;
  requires_document: boolean;
  can_delete: boolean;
  cannot_delete_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

export const absenceTypesService = {
  /**
   * List all absence types
   * GET /api/absence-types
   */
  async getAll(): Promise<ApiResponse<BackendAbsenceTypeResource[]> | BackendAbsenceTypeResource[]> {
    const response = await apiClient.get<any>("/absence-types");
    return response.data;
  },

  /**
   * Get single absence type by ID
   * GET /api/absence-types/{id}
   */
  async getById(id: EntityId): Promise<ApiResponse<BackendAbsenceTypeResource>> {
    const response = await apiClient.get<ApiResponse<BackendAbsenceTypeResource>>(`/absence-types/${id}`);
    return response.data;
  },

  /**
   * Create new absence type
   * POST /api/absence-types
   */
  async create(data: AbsenceTypePayload): Promise<ApiResponse<BackendAbsenceTypeResource>> {
    const response = await apiClient.post<ApiResponse<BackendAbsenceTypeResource>>("/absence-types", data);
    return response.data;
  },

  /**
   * Update existing absence type
   * PUT /api/absence-types/{id}
   */
  async update(id: EntityId, data: Partial<AbsenceTypePayload>): Promise<ApiResponse<BackendAbsenceTypeResource>> {
    const response = await apiClient.put<ApiResponse<BackendAbsenceTypeResource>>(`/absence-types/${id}`, data);
    return response.data;
  },

  /**
   * Delete absence type
   * DELETE /api/absence-types/{id}
   */
  async delete(id: EntityId): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/absence-types/${id}`);
    return response.data;
  },
};

export default absenceTypesService;

