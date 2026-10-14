import apiClient from "../client";
import type { ApiResponse } from "../types/api.types";
import { absences as initialMockAbsences } from "../mockData";

export interface AbsenceAssistantInfo {
  id: string | number;
  name: string;
  initials?: string;
  is_active?: boolean;
  active?: boolean;
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
  start_date?: string;
  end_date?: string;
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
  start_date?: string;
  end_date?: string;
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
  start_date?: string;
  end_date?: string;
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
  valid_from?: string;
  valid_until?: string;
  page?: number;
  per_page?: number;
}

export interface AbsenceCounts {
  all: number;
  pending: number;
  justified: number;
  unjustified: number;
}

export interface PaginatedAbsencesResult {
  data: BackendAbsenceResource[];
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
  counts: AbsenceCounts;
}

export interface PaginatedAbsencesResponse {
  data: BackendAbsenceResource[];
  total?: number;
  current_page?: number;
  last_page?: number;
  per_page?: number;
  counts?: AbsenceCounts;
}

// Normalizador de registo vindo do backend para garantir compatibilidade com qualquer convenção (snake_case, start_date/valid_from)
export function normalizeAbsenceResource(item: any): BackendAbsenceResource {
  const validFrom = item.valid_from || item.start_date || item.start || "";
  const validUntil = item.valid_until || item.end_date || item.end || validFrom;

  let days = Number(item.total_days || item.days || 0);
  if (!days && validFrom && validUntil) {
    days = Math.max(
      1,
      Math.round(
        (new Date(validUntil).getTime() - new Date(validFrom).getTime()) / 86400000
      ) + 1
    );
  }

  return {
    ...item,
    id: String(item.id),
    assistant_id: String(item.assistant_id || item.assistant?.id || ""),
    absence_type_id: String(item.absence_type_id || item.absence_type?.id || ""),
    assistant_name: item.assistant_name || item.assistant?.name,
    assistant: item.assistant
      ? {
          id: item.assistant.id,
          name: item.assistant.name,
          initials: item.assistant.initials,
          is_active: item.assistant.is_active ?? item.assistant.active,
          active: item.assistant.active ?? item.assistant.is_active,
        }
      : undefined,
    absence_type_name: item.absence_type_name || item.absence_type?.name || item.justification,
    absence_type: item.absence_type
      ? {
          id: item.absence_type.id,
          name: item.absence_type.name,
        }
      : undefined,
    valid_from: validFrom,
    valid_until: validUntil,
    start_date: validFrom,
    end_date: validUntil,
    start_time: item.start_time || item.startTime || "08:00",
    end_time: item.end_time || item.endTime || "17:00",
    total_days: days || 1,
    justification: item.justification || item.absence_type?.name || item.absence_type_name || null,
    document_path: item.document_path || item.documentPath || null,
    status: item.status || "pending",
    notes: item.notes || item.note || null,
    created_at: item.created_at || item.submitted || new Date().toISOString().split("T")[0],
  };
}

// Armazenamento em memória para suporte fallback caso o endpoint ainda esteja a ser iniciado
let localAbsencesMock: BackendAbsenceResource[] = initialMockAbsences.map((a) => ({
  id: String(a.id),
  assistant_id: String(a.id),
  absence_type_id: "1",
  assistant_name: a.assistant,
  assistant: {
    id: a.id,
    name: a.assistant,
    initials: a.initials,
    active: true,
  },
  absence_type_name: a.reason,
  absence_type: {
    id: "1",
    name: a.reason,
  },
  valid_from: a.start.includes("-") ? a.start : "2026-01-27",
  valid_until: a.end.includes("-") ? a.end : "2026-01-31",
  start_date: a.start.includes("-") ? a.start : "2026-01-27",
  end_date: a.end.includes("-") ? a.end : "2026-01-31",
  start_time: a.startTime || "08:00",
  end_time: a.endTime || "17:00",
  total_days: a.days || 1,
  justification: a.reason,
  document_path: a.documentPath || null,
  status: (a.status as any) || "pending",
  notes: a.note || null,
  created_at: a.submitted || "2026-01-27",
}));

export const absencesService = {
  /**
   * Obter lista paginada e filtrada de ausências da escola ativa (Backend Server-Side)
   * GET /api/absences
   */
  async getAll(params?: AbsenceFilterParams): Promise<PaginatedAbsencesResult> {
    const page = Number(params?.page || 1);
    const perPage = Number(params?.per_page || 8);

    try {
      const response = await apiClient.get<any>("/absences", {
        params: {
          ...params,
          page,
          per_page: perPage,
          // Compatibilidade de filtros: envia tanto start_date como valid_from
          ...(params?.start_date ? { valid_from: params.start_date } : {}),
          ...(params?.end_date ? { valid_until: params.end_date } : {}),
        },
      });

      const resData = response.data;
      let rawList: any[] = [];
      if (Array.isArray(resData?.data)) {
        rawList = resData.data;
      } else if (Array.isArray(resData)) {
        rawList = resData;
      }

      const meta = resData?.meta || resData || {};
      const total =
        typeof meta.total === "number"
          ? meta.total
          : typeof resData?.total === "number"
          ? resData.total
          : rawList.length;

      const currentPage = Number(meta.current_page || resData?.current_page || page);
      const resPerPage = Number(meta.per_page || resData?.per_page || perPage);
      const lastPage = Number(
        meta.last_page || resData?.last_page || Math.max(1, Math.ceil(total / resPerPage))
      );

      // Contadores fornecidos pelo backend em meta.counts ou resData.counts
      const bCounts = meta.counts || resData?.counts;
      const counts: AbsenceCounts = {
        all: bCounts?.all ?? total,
        pending: bCounts?.pending ?? 0,
        justified: bCounts?.justified ?? 0,
        unjustified: bCounts?.unjustified ?? 0,
      };

      return {
        data: rawList.map(normalizeAbsenceResource),
        total,
        current_page: currentPage,
        last_page: lastPage,
        per_page: resPerPage,
        counts,
      };
    } catch (err: any) {
      // Se for erro de validação ou erro de servidor diferente de 404/offline, relança
      if (err?.response && err.response.status !== 404) {
        throw err;
      }

      // Fallback para mock caso a rota responda 404 ou não responda
      const counts: AbsenceCounts = {
        all: localAbsencesMock.length,
        pending: localAbsencesMock.filter(
          (a) => a.status === "pending" || a.status === "aguarda_documento"
        ).length,
        justified: localAbsencesMock.filter(
          (a) => a.status === "justified" || a.status === "justificada"
        ).length,
        unjustified: localAbsencesMock.filter(
          (a) => a.status === "unjustified" || a.status === "injustificada"
        ).length,
      };

      let filtered = [...localAbsencesMock];

      if (params?.assistant_id && params.assistant_id !== "all") {
        filtered = filtered.filter(
          (a) =>
            String(a.assistant_id) === String(params.assistant_id) ||
            a.assistant?.name?.toLowerCase().includes(String(params.assistant_id).toLowerCase()) ||
            a.assistant_name?.toLowerCase().includes(String(params.assistant_id).toLowerCase())
        );
      }

      if (params?.status && params.status !== "all") {
        filtered = filtered.filter((a) => {
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
        filtered = filtered.filter((a) => a.valid_until >= params.start_date!);
      }

      if (params?.end_date) {
        filtered = filtered.filter((a) => a.valid_from <= params.end_date!);
      }

      const total = filtered.length;
      const lastPage = Math.max(1, Math.ceil(total / perPage));
      const paged = filtered.slice((page - 1) * perPage, page * perPage);

      return {
        data: paged.map(normalizeAbsenceResource),
        total,
        current_page: page,
        last_page: lastPage,
        per_page: perPage,
        counts,
      };
    }
  },

  /**
   * Obter ausência por ID
   * GET /api/absences/{id}
   */
  async getById(id: string | number): Promise<BackendAbsenceResource> {
    try {
      const response = await apiClient.get<any>(`/absences/${id}`);
      const raw = response.data?.data ?? response.data;
      return normalizeAbsenceResource(raw);
    } catch (err: any) {
      if (err?.response && err.response.status !== 404) {
        throw err;
      }
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
    const formattedPayload = {
      ...payload,
      start_date: payload.valid_from,
      end_date: payload.valid_until,
    };

    try {
      const response = await apiClient.post<any>("/absences", formattedPayload);
      const raw = response.data?.data ?? response.data;
      return normalizeAbsenceResource(raw);
    } catch (error: any) {
      // Se o backend respondeu com erro 422 (validação), 400 ou 403, propaga o erro para o utilizador
      if (error?.response && error.response.status !== 404) {
        throw error;
      }

      // Se a rota falhar (404 / endpoint ainda não registado), atualiza localmente para mock
      const newId = String(Date.now());
      const newAbsence: BackendAbsenceResource = normalizeAbsenceResource({
        id: newId,
        assistant_id: payload.assistant_id,
        absence_type_id: payload.absence_type_id,
        valid_from: payload.valid_from,
        valid_until: payload.valid_until,
        start_time: payload.start_time || "08:00",
        end_time: payload.end_time || "17:00",
        justification: payload.justification || null,
        document_path: payload.document_path || null,
        status: payload.status || "pending",
        notes: payload.notes || null,
        created_at: new Date().toISOString().split("T")[0],
      });
      localAbsencesMock = [newAbsence, ...localAbsencesMock];
      return newAbsence;
    }
  },

  /**
   * Atualizar registo de ausência
   * PUT /api/absences/{id}
   */
  async update(id: string | number, payload: UpdateAbsencePayload): Promise<BackendAbsenceResource> {
    const formattedPayload = {
      ...payload,
      start_date: payload.valid_from,
      end_date: payload.valid_until,
    };

    try {
      const response = await apiClient.put<any>(`/absences/${id}`, formattedPayload);
      const raw = response.data?.data ?? response.data;
      return normalizeAbsenceResource(raw);
    } catch (error: any) {
      if (error?.response && error.response.status !== 404) {
        throw error;
      }
      localAbsencesMock = localAbsencesMock.map((a) => {
        if (String(a.id) === String(id)) {
          return normalizeAbsenceResource({
            ...a,
            ...payload,
            status: payload.status || a.status,
          });
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
   * Tenta primeiro PATCH /api/absences/{id}/status e depois PUT /api/absences/{id}
   */
  async updateStatus(
    id: string | number,
    status: "justified" | "unjustified" | "pending" | "justificada" | "injustificada",
    notes?: string
  ): Promise<BackendAbsenceResource> {
    try {
      try {
        const response = await apiClient.patch<any>(`/absences/${id}/status`, {
          status,
          notes,
        });
        const raw = response.data?.data ?? response.data;
        return normalizeAbsenceResource(raw);
      } catch (patchErr: any) {
        // Se a rota PATCH não estiver disponível (404/405), tenta PUT padrão REST
        if (patchErr?.response?.status === 404 || patchErr?.response?.status === 405) {
          const putResponse = await apiClient.put<any>(`/absences/${id}`, {
            status,
            ...(notes !== undefined ? { notes } : {}),
          });
          const raw = putResponse.data?.data ?? putResponse.data;
          return normalizeAbsenceResource(raw);
        }
        throw patchErr;
      }
    } catch (err: any) {
      if (err?.response && err.response.status !== 404) {
        throw err;
      }
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
    } catch (err: any) {
      if (err?.response && err.response.status !== 404) {
        throw err;
      }
      localAbsencesMock = localAbsencesMock.filter((a) => String(a.id) !== String(id));
      return { message: "Ausência eliminada com sucesso." };
    }
  },

  /**
   * Upload de comprovativo/documento de justificação
   * POST /api/absences/upload
   */
  async uploadDocument(file: File): Promise<{ document_path: string; url?: string }> {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("file", file);
    const response = await apiClient.post<any>("/absences/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data?.data ?? response.data;
  },
};

export default absencesService;
