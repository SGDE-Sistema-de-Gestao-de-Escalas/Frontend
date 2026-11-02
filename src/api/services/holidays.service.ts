import apiClient from "../client";
import type { ApiResponse } from "../types/api.types";
import type { EntityId } from "../../types";

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

export interface MunicipalityResource {
  slug: string;
  name: string;
  district: string;
  holiday_name: string;
}

export interface HolidayPreviewItem {
  name: string;
  date: string;
  type: "national" | "municipal";
  municipality?: string | null;
  description?: string | null;
  already_exists: boolean;
  is_past: boolean;
}

export interface HolidayImportPayload {
  year: number;
  municipality?: string | null;
  dates?: string[];
  include_carnival?: boolean;
}

export interface HolidayImportResult {
  message: string;
  imported_count: number;
  skipped_count: number;
  total_processed: number;
  requires_recalculation: boolean;
  impacted_schools: Array<{
    school_id: string;
    impact: any;
  }>;
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
   * Obter lista dos 308 concelhos portugueses
   * GET /api/holidays/municipalities
   */
  async getMunicipalities(): Promise<MunicipalityResource[]> {
    const response = await apiClient.get<{ data: MunicipalityResource[] }>("/holidays/municipalities");
    return response.data.data;
  },

  /**
   * Pré-visualizar feriados nacionais e municipais a importar para um determinado ano
   * GET /api/holidays/preview
   */
  async preview(params: {
    year: number;
    municipality?: string | null;
    include_carnival?: boolean;
  }): Promise<HolidayPreviewItem[]> {
    const response = await apiClient.get<{ data: HolidayPreviewItem[] }>("/holidays/preview", {
      params: {
        year: params.year,
        municipality: params.municipality || undefined,
        include_carnival: params.include_carnival ?? true,
      },
    });
    return response.data.data;
  },

  /**
   * Importar feriados nacionais e municipais em lote
   * POST /api/holidays/import
   */
  async import(data: HolidayImportPayload): Promise<HolidayImportResult> {
    const response = await apiClient.post<HolidayImportResult>("/holidays/import", {
      year: data.year,
      municipality: data.municipality || undefined,
      dates: data.dates,
      include_carnival: data.include_carnival ?? true,
    });
    return response.data;
  },

  /**
   * Criar um novo feriado
   * POST /api/holidays
   */
  async create(data: HolidayPayload): Promise<ApiResponse<BackendHolidayResource> & { impact?: any }> {
    const response = await apiClient.post<any>("/holidays", data);
    return response.data;
  },

  /**
   * Atualizar um feriado existente
   * PUT /api/holidays/{id}
   */
  async update(id: EntityId, data: Partial<HolidayPayload>): Promise<ApiResponse<BackendHolidayResource> & { impact?: any }> {
    const response = await apiClient.put<any>(`/holidays/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar um feriado
   * DELETE /api/holidays/{id}
   */
  async delete(id: EntityId): Promise<{ message: string; impact?: any }> {
    const response = await apiClient.delete<{ message: string; impact?: any }>(`/holidays/${id}`);
    return response.data;
  },
};

export default holidaysService;
