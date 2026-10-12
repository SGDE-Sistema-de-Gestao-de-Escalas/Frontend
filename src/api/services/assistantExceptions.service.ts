import apiClient from "../client";
import { ApiResponse } from "../types/api.types";
import {
  AssistantExceptionApi,
  CreateAssistantExceptionPayload,
  UpdateAssistantExceptionPayload,
} from "../../types/assistantSchedule.types";

export const assistantExceptionsService = {
  /**
   * Listar exceções de um assistente
   * GET /api/assistant-exceptions?assistant_id={assistantId}
   */
  async getAll(assistantId: string | number): Promise<AssistantExceptionApi[]> {
    const aid = String(assistantId);
    try {
      const response = await apiClient.get<any>("/assistant-exceptions", {
        params: { assistant_id: aid },
      });
      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];
      return data.filter(
        (e: any) => !e.assistant_id || String(e.assistant_id) === aid
      );
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Criar regra de exceção
   * POST /api/assistant-exceptions
   */
  async create(
    payload: CreateAssistantExceptionPayload
  ): Promise<ApiResponse<AssistantExceptionApi>> {
    const response = await apiClient.post<ApiResponse<AssistantExceptionApi>>(
      "/assistant-exceptions",
      payload
    );
    return response.data;
  },

  /**
   * Atualizar regra de exceção
   * PUT /api/assistant-exceptions/{id}
   */
  async update(
    id: string | number,
    payload: UpdateAssistantExceptionPayload
  ): Promise<ApiResponse<AssistantExceptionApi>> {
    const response = await apiClient.put<ApiResponse<AssistantExceptionApi>>(
      `/assistant-exceptions/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Eliminar regra de exceção
   * DELETE /api/assistant-exceptions/{id}
   */
  async delete(
    id: string | number
  ): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/assistant-exceptions/${id}`
    );
    return response.data;
  },
};

export default assistantExceptionsService;
