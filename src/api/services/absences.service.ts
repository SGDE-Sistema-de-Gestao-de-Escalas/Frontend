import apiClient from "../client";
import type { ApiResponse } from "../types/api.types";
import { absences as initialMockAbsences } from "../mockData";

export interface AbsenceAssistantInfo {
  id: string | number;
  name: string;
  initials?: string;
}

export interface BackendAbsenceResource {
  id: string | number;
  assistant_id: string | number;
  absence_type_id: string | number;
  assistant_name?: string;
  assistant?: AbsenceAssistantInfo;
  absence_type_name?: string;
  absence_type?: { id: string | number; name: string };
  valid_from: string;
  valid_until: string;
  start_time?: string;
  end_time?: string;
  total_days: number;
  justification?: string | null;
  document_path?: string | null;
  status: "pending" | "justified" | "unjustified" | "justificada" | "injustificada" | "aguarda_documento";
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAbsencePayload {
  assistant_id: string | number;
  absence_type_id: string | number;
  valid_from: string;
  valid_until: string;
  start_time?: string;
  end_time?: string;
  justification?: string | null;
  notes?: string | null;
  document_path?: string | null;
  status?: string;
}

export interface UpdateAbsencePayload {
  assistant_id?: string | number;
  absence_type_id?: string | number;
  valid_from?: string;
  valid_until?: string;
  start_time?: string;
  end_time?: string;
  justification?: string | null;
  notes?: string | null;
  document_path?: string | null;
  status?: string;
}

export interface AbsenceFilterParams {
  assistant_id?: string | number;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export interface PaginatedAbsencesResponse {
  data: BackendAbsenceResource[];
  total?: number;
  current_page?: number;
  last_page?: number;
  per_page?: number;
}

// Armazenamento em memória para suporte mock enquanto a rota da API não estiver implementada
let localAbsencesMock: BackendAbsenceResource[] = initialMockAbsences.map((a) => ({
  id: String(a.id),
  assistant_id: String(a.id),
  absence_type_id: "1",
  assistant_name: a.assistant,
  assistant: {
    id: a.id,
    name: a.assistant,
    initials: a.initials,
  },
  absence_type_name: a.reason,
  absence_type: {
    id: "1",
    name: a.reason,
  },
  valid_from: a.start.includes("-") ? a.start : "2026-01-27",
  valid_until: a.end.includes("-") ? a.end : "2026-01-31",
  start_time: a.startTime || "08:00",
  end_time: a.endTime || "17:00",
  total_days: a.days || 1,
  justification: a.reason,
  document_path: a.documentPath || null,
  status: a.status || "pending",
  notes: a.note || null,
  created_at: a.submitted || "2026-01-27",
}));

export const absencesService = {
  /**
   * Obter lista de ausências da escola ativa com filtros opcionais
   * GET /api/absences
   */
  async getAll(params?: AbsenceFilterParams): Promise<BackendAbsenceResource[]> {
    try {
      const response = await apiClient.get<any>("/absences", {
        params,
        // @ts-ignore
        skipGlobalErrorHandler: true,
      });

      if (Array.isArray(response.data?.data)) {
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch {
      // Fallback gracioso para os dados mock caso a rota do Laravel ainda não esteja ativa
      let result = [...localAbsencesMock];

      if (params?.assistant_id && params.assistant_id !== "all") {
        result = result.filter(
          (a) =>
            String(a.assistant_id) === String(params.assistant_id) ||
            a.assistant?.name?.toLowerCase().includes(String(params.assistant_id).toLowerCase()) ||
            a.assistant_name?.toLowerCase().includes(String(params.assistant_id).toLowerCase())
        );
      }

      if (params?.status && params.status !== "all") {
        result = result.filter((a) => {
          if (params.status === "pending") {
            return a.status === "pending" || a.status === "aguarda_documento";
          }
          if (params.status === "justified") {
            return a.status === "justified" || a.status === "justificada";
          }
          if (params.status === "unjustified") {
            return a.status === "unjustified" || a.status === "injustificada";
          }
          return a.status === params.status;
        });
      }

      if (params?.start_date) {
        result = result.filter((a) => a.valid_until >= params.start_date!);
      }

      if (params?.end_date) {
        result = result.filter((a) => a.valid_from <= params.end_date!);
      }

      return result;
    }
  },

  /**
   * Obter ausência por ID
   * GET /api/absences/{id}
   */
  async getById(id: string | number): Promise<BackendAbsenceResource> {
    try {
      const response = await apiClient.get<any>(`/absences/${id}`);
      return response.data?.data ?? response.data;
    } catch {
      const item = localAbsencesMock.find((a) => String(a.id) === String(id));
      if (item) return item;
      throw new Error("Ausência não encontrada");
    }
  },

  /**
   * Criar registo de ausência
   * POST /api/absences
   */
  async create(payload: CreateAbsencePayload): Promise<BackendAbsenceResource> {
    try {
      const response = await apiClient.post<any>("/absences", payload);
      return response.data?.data ?? response.data;
    } catch (error) {
      // Se a rota falhar (404/500/offline), atualiza localmente para mock
      const newId = String(Date.now());
      const newAbsence: BackendAbsenceResource = {
        id: newId,
        assistant_id: payload.assistant_id,
        absence_type_id: payload.absence_type_id,
        valid_from: payload.valid_from,
        valid_until: payload.valid_until,
        start_time: payload.start_time || "08:00",
        end_time: payload.end_time || "17:00",
        total_days: Math.max(
          1,
          Math.round(
            (new Date(payload.valid_until).getTime() - new Date(payload.valid_from).getTime()) /
              86400000
          ) + 1
        ),
        justification: payload.justification || null,
        document_path: payload.document_path || null,
        status: (payload.status as any) || "pending",
        notes: payload.notes || null,
        created_at: new Date().toISOString().split("T")[0],
      };
      localAbsencesMock = [newAbsence, ...localAbsencesMock];
      return newAbsence;
    }
  },

  /**
   * Atualizar registo de ausência
   * PUT /api/absences/{id}
   */
  async update(id: string | number, payload: UpdateAbsencePayload): Promise<BackendAbsenceResource> {
    try {
      const response = await apiClient.put<any>(`/absences/${id}`, payload);
      return response.data?.data ?? response.data;
    } catch (error) {
      localAbsencesMock = localAbsencesMock.map((a) => {
        if (String(a.id) === String(id)) {
          return {
            ...a,
            ...payload,
            status: (payload.status as any) || a.status,
          };
        }
        return a;
      });
      const updated = localAbsencesMock.find((a) => String(a.id) === String(id));
      if (updated) return updated;
      throw error;
    }
  },

  /**
   * Alterar estado da ausência (Justificar / Injustificar)
   * PATCH /api/absences/{id}/status
   */
  async updateStatus(
    id: string | number,
    status: "justified" | "unjustified" | "pending" | "justificada" | "injustificada",
    notes?: string
  ): Promise<BackendAbsenceResource> {
    try {
      const response = await apiClient.patch<any>(`/absences/${id}/status`, {
        status,
        notes,
      });
      return response.data?.data ?? response.data;
    } catch {
      localAbsencesMock = localAbsencesMock.map((a) => {
        if (String(a.id) === String(id)) {
          return {
            ...a,
            status: status as any,
            notes: notes !== undefined ? notes : a.notes,
          };
        }
        return a;
      });
      const updated = localAbsencesMock.find((a) => String(a.id) === String(id));
      if (updated) return updated;
      throw new Error("Erro ao atualizar estado da ausência");
    }
  },

  /**
   * Eliminar ausência
   * DELETE /api/absences/{id}
   */
  async delete(id: string | number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<any>(`/absences/${id}`);
      return response.data;
    } catch {
      localAbsencesMock = localAbsencesMock.filter((a) => String(a.id) !== String(id));
      return { message: "Ausência eliminada com sucesso." };
    }
  },
};

export default absencesService;

