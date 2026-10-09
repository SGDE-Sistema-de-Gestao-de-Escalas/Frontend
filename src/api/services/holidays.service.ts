import apiClient from "../client";
import type { ApiResponse } from "../types/api.types";
import type { EntityId, Holiday } from "../../types";

export interface HolidayPayload {
  name: string;
  date: string; // Formato YYYY-MM-DD
  description?: string | null;
}

export interface BackendHolidayResource {
  id: string;
  name: string;
  date: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HolidayFilters {
  year?: number;
  month?: number;
  per_page?: number;
  page?: number;
}

export const holidaysService = {
  /**
   * Listar todos os feriados (com filtros opcionais de ano, mês, paginação)
   * GET /api/holidays
   */
  async getAll(
    filters?: HolidayFilters
  ): Promise<ApiResponse<BackendHolidayResource[]> | BackendHolidayResource[]> {
    const response = await apiClient.get<any>("/holidays", {
      params: filters,
    });
    return response.data;
  },

  /**
   * Obter detalhe de um feriado por ID
   * GET /api/holidays/{id}
   */
  async getById(id: EntityId): Promise<ApiResponse<BackendHolidayResource>> {
    const response = await apiClient.get<ApiResponse<BackendHolidayResource>>(`/holidays/${id}`);
    return response.data;
  },

  /**
   * Criar um novo feriado
   * POST /api/holidays
   */
  async create(data: HolidayPayload): Promise<ApiResponse<BackendHolidayResource>> {
    const response = await apiClient.post<ApiResponse<BackendHolidayResource>>("/holidays", data);
    return response.data;
  },

  /**
   * Atualizar um feriado existente
   * PUT /api/holidays/{id}
   */
  async update(id: EntityId, data: Partial<HolidayPayload>): Promise<ApiResponse<BackendHolidayResource>> {
    const response = await apiClient.put<ApiResponse<BackendHolidayResource>>(`/holidays/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar um feriado
   * DELETE /api/holidays/{id}
   */
  async delete(id: EntityId): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/holidays/${id}`);
    return response.data;
  },
};

export default holidaysService;

