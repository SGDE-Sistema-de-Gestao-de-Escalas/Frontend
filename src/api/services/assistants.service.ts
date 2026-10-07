import apiClient from "../client";
import { ApiResponse, PaginatedResponse } from "../types/api.types";
import { Assistant, CreateAssistantPayload, UpdateAssistantPayload } from "../../types";

export interface AssistantFilters {
  status?: "active" | "inactive" | "all";
  search?: string;
  page?: number;
  per_page?: number;
  schoolId?: number | string;
  active?: boolean;
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

  async create(data: CreateAssistantPayload): Promise<ApiResponse<Assistant>> {
    const response = await apiClient.post<ApiResponse<Assistant>>("/assistants", data);
    return response.data;
  },

  async update(id: number | string, data: UpdateAssistantPayload): Promise<ApiResponse<Assistant>> {
    const response = await apiClient.put<ApiResponse<Assistant>>(`/assistants/${id}`, data);
    return response.data;
  },

  async delete(id: number | string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/assistants/${id}`);
    return response.data;
  },
};

export default assistantsService;

