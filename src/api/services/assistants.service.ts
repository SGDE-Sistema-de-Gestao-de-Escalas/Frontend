import apiClient from "../client";
import { ApiResponse, PaginatedResponse } from "../types/api.types";
import { Assistant } from "../../types";

export interface AssistantFilters {
  schoolId?: number;
  active?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export const assistantsService = {
  async getAll(params?: AssistantFilters): Promise<PaginatedResponse<Assistant>> {
    const response = await apiClient.get<PaginatedResponse<Assistant>>("/assistants", {
      params,
    });
    return response.data;
  },

  async getById(id: number | string): Promise<ApiResponse<Assistant>> {
    const response = await apiClient.get<ApiResponse<Assistant>>(`/assistants/${id}`);
    return response.data;
  },

  async create(data: Partial<Assistant>): Promise<ApiResponse<Assistant>> {
    const response = await apiClient.post<ApiResponse<Assistant>>("/assistants", data);
    return response.data;
  },

  async update(id: number | string, data: Partial<Assistant>): Promise<ApiResponse<Assistant>> {
    const response = await apiClient.put<ApiResponse<Assistant>>(`/assistants/${id}`, data);
    return response.data;
  },

  async delete(id: number | string): Promise<void> {
    await apiClient.delete(`/assistants/${id}`);
  },
};

export default assistantsService;
