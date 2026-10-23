import apiClient from "../client";
import type { ApiResponse } from "../types/api.types";

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
  document_name?: string | null;
  document_path?: string | null;
  document_url?: string | null;
  has_document?: boolean;
  missing_document?: boolean;
  requires_document?: boolean;
  can_attach_document?: boolean;
  can_justify?: boolean;
  warning?: string | null;
  status: "pending" | "justified" | "unjustified" | "justificada" | "injustificada" | "aguarda_documento";
  notes?: string | null;
  can_edit?: boolean;
  cannot_edit_reason?: string | null;
  can_delete?: boolean;
  cannot_delete_reason?: string | null;
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
  document?: File | null;
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
  document?: File | null;
  remove_document?: boolean;
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
    document_name: item.document_name || item.documentName || (item.document_path ? String(item.document_path).split("/").pop() : null),
    document_path: item.document_path || item.documentPath || null,
    document_url: item.document_url || item.documentUrl || null,
    has_document: item.has_document !== undefined ? Boolean(item.has_document) : Boolean(item.document_path || item.documentPath),
    missing_document: Boolean(item.missing_document || item.missingDocument),
    requires_document: Boolean(item.requires_document || item.requiresDocument),
    can_attach_document: item.can_attach_document !== undefined ? Boolean(item.can_attach_document) : true,
    can_justify: item.can_justify !== undefined ? Boolean(item.can_justify) : true,
    warning: item.warning || null,
    status: (() => {
      const rawStatus = String(item.status || item.state || item.estado || "").toLowerCase().trim();
      if (
        rawStatus === "justified" ||
        rawStatus === "justificada" ||
        rawStatus === "justificado" ||
        rawStatus === "aprovada" ||
        rawStatus === "aprovado"
      ) {
        return "justified";
      }
      if (
        rawStatus === "unjustified" ||
        rawStatus === "injustificada" ||
        rawStatus === "injustificado" ||
        rawStatus === "rejeitada" ||
        rawStatus === "rejeitado"
      ) {
        return "unjustified";
      }
      return "pending";
    })(),
    notes: item.notes || item.note || null,
    can_edit: item.can_edit !== undefined ? Boolean(item.can_edit) : true,
    cannot_edit_reason: item.cannot_edit_reason || null,
    can_delete: item.can_delete !== undefined ? Boolean(item.can_delete) : true,
    cannot_delete_reason: item.cannot_delete_reason || null,
    created_at: item.created_at || item.submitted || new Date().toISOString().split("T")[0],
  };
}

// Cache em memória vazia apenas para fallback caso o servidor devolva 404
let localAbsencesMock: BackendAbsenceResource[] = [];

export const absencesService = {
  /**
   * Obter lista paginada e filtrada de ausências da escola ativa (Backend Server-Side)
   * GET /api/absences
   */
  async getAll(params?: AbsenceFilterParams): Promise<PaginatedAbsencesResult> {
    const page = Number(params?.page || 1);
    const perPage = Number(params?.per_page || 10);

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

      const normalizedList = rawList.map(normalizeAbsenceResource);

      // Contadores fornecidos pelo backend (suportando múltiplas convenções: counts, contadores, status_counts, statusCounts)
      const bCounts =
        meta.counts ||
        resData?.counts ||
        meta.contadores ||
        resData?.contadores ||
        meta.status_counts ||
        resData?.status_counts ||
        meta.statusCounts ||
        resData?.statusCounts;

      const counts: AbsenceCounts = {
        all:
          bCounts?.all ??
          bCounts?.total ??
          bCounts?.todas ??
          (params?.status && params.status !== "all" ? undefined : total) ??
          total,
        pending:
          bCounts?.pending ??
          bCounts?.pendentes ??
          bCounts?.pendente ??
          (params?.status === "pending" ? total : 0),
        justified:
          bCounts?.justified ??
          bCounts?.justificadas ??
          bCounts?.justificada ??
          (params?.status === "justified" ? total : 0),
        unjustified:
          bCounts?.unjustified ??
          bCounts?.injustificadas ??
          bCounts?.injustificada ??
          (params?.status === "unjustified" ? total : 0),
      };

      return {
        data: normalizedList,
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
   * Obter contagens absolutas por estado (Todas, Pendentes, Justificadas, Injustificadas)
   * Garante totais fidedignos e independentes da página visualizada
   */
  async getCounts(filters?: Omit<AbsenceFilterParams, "page" | "per_page" | "status">): Promise<AbsenceCounts> {
    const baseParams: any = {
      ...(filters?.assistant_id && filters.assistant_id !== "all" ? { assistant_id: filters.assistant_id } : {}),
      ...(filters?.start_date ? { start_date: filters.start_date, valid_from: filters.start_date } : {}),
      ...(filters?.end_date ? { end_date: filters.end_date, valid_until: filters.end_date } : {}),
      per_page: 1,
      page: 1,
    };

    try {
      const allRes = await apiClient.get<any>("/absences", { params: baseParams });
      const allData = allRes?.data;
      const allMeta = allData?.meta || allData;

      const bCounts =
        allMeta?.counts ||
        allData?.counts ||
        allMeta?.status_counts ||
        allData?.status_counts ||
        allMeta?.contadores ||
        allData?.contadores ||
        allMeta?.statusCounts ||
        allData?.statusCounts;

      const getTotal = (res: any) => {
        if (!res?.data) return 0;
        const d = res.data;
        const m = d?.meta || d;
        if (typeof m?.total === "number") return m.total;
        if (typeof d?.total === "number") return d.total;
        if (Array.isArray(d?.data)) return d.data.length;
        if (Array.isArray(d)) return d.length;
        return 0;
      };

      const totalAll = getTotal(allRes);

      if (bCounts && typeof bCounts.pending === "number") {
        return {
          all: bCounts.all ?? bCounts.total ?? totalAll,
          pending: bCounts.pending,
          justified: bCounts.justified ?? 0,
          unjustified: bCounts.unjustified ?? 0,
        };
      }

      // Se o backend não envia bCounts completos na resposta padrão, obtemos os totais de cada estado em paralelo
      const [pendingRes, justifiedRes, unjustifiedRes] = await Promise.all([
        apiClient.get<any>("/absences", { params: { ...baseParams, status: "pending" } }).catch(() => null),
        apiClient.get<any>("/absences", { params: { ...baseParams, status: "justified" } }).catch(() => null),
        apiClient.get<any>("/absences", { params: { ...baseParams, status: "unjustified" } }).catch(() => null),
      ]);

      return {
        all: totalAll,
        pending: getTotal(pendingRes),
        justified: getTotal(justifiedRes),
        unjustified: getTotal(unjustifiedRes),
      };
    } catch {
      // Fallback para contagem em mock
      let filtered = [...localAbsencesMock];
      if (filters?.assistant_id && filters.assistant_id !== "all") {
        filtered = filtered.filter(
          (a) =>
            String(a.assistant_id) === String(filters.assistant_id) ||
            String(a.assistant?.id) === String(filters.assistant_id)
        );
      }
      if (filters?.start_date) {
        filtered = filtered.filter((a) => a.valid_until >= filters.start_date!);
      }
      if (filters?.end_date) {
        filtered = filtered.filter((a) => a.valid_from <= filters.end_date!);
      }

      return {
        all: filtered.length,
        pending: filtered.filter((a) => a.status === "pending" || a.status === "aguarda_documento").length,
        justified: filtered.filter((a) => a.status === "justified" || a.status === "justificada").length,
        unjustified: filtered.filter((a) => a.status === "unjustified" || a.status === "injustificada").length,
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
   * POST /api/absences (suporta envio direto de ficheiro comprovativo via multipart/form-data)
   */
  async create(payload: CreateAbsencePayload): Promise<BackendAbsenceResource> {
    const hasFile = payload.document instanceof File;
    let body: any;

    if (hasFile) {
      const formData = new FormData();
      formData.append("assistant_id", String(payload.assistant_id));
      formData.append("absence_type_id", String(payload.absence_type_id));
      formData.append("valid_from", payload.valid_from);
      formData.append("valid_until", payload.valid_until || payload.valid_from);
      if (payload.start_time) formData.append("start_time", payload.start_time);
      if (payload.end_time) formData.append("end_time", payload.end_time);
      if (payload.justification) formData.append("justification", payload.justification);
      if (payload.notes) formData.append("notes", payload.notes);
      if (payload.status) formData.append("status", payload.status);
      formData.append("document", payload.document as File);
      body = formData;
    } else {
      body = {
        ...payload,
        start_date: payload.valid_from,
        end_date: payload.valid_until,
      };
    }

    try {
      const response = await apiClient.post<any>("/absences", body);
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
        document_name: payload.document?.name || payload.document_path || null,
        document_path: payload.document?.name || payload.document_path || null,
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
   * Suporta multipart/form-data com _method=PUT para upload/remoção de documento
   */
  async update(id: string | number, payload: UpdateAbsencePayload): Promise<BackendAbsenceResource> {
    const hasFile = payload.document instanceof File;

    try {
      let response: any;
      if (hasFile || payload.remove_document) {
        const formData = new FormData();
        formData.append("_method", "PUT");
        if (payload.assistant_id) formData.append("assistant_id", String(payload.assistant_id));
        if (payload.absence_type_id) formData.append("absence_type_id", String(payload.absence_type_id));
        if (payload.valid_from) formData.append("valid_from", payload.valid_from);
        if (payload.valid_until !== undefined) formData.append("valid_until", payload.valid_until || payload.valid_from || "");
        if (payload.start_time) formData.append("start_time", payload.start_time);
        if (payload.end_time) formData.append("end_time", payload.end_time);
        if (payload.justification !== undefined) formData.append("justification", payload.justification || "");
        if (payload.notes !== undefined) formData.append("notes", payload.notes || "");
        if (payload.status) formData.append("status", payload.status);
        if (payload.remove_document) formData.append("remove_document", "1");
        if (hasFile) formData.append("document", payload.document as File);

        response = await apiClient.post<any>(`/absences/${id}`, formData);
      } else {
        const formattedPayload = {
          ...payload,
          start_date: payload.valid_from,
          end_date: payload.valid_until,
        };
        response = await apiClient.put<any>(`/absences/${id}`, formattedPayload);
      }

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
            document_name: payload.remove_document ? null : (payload.document?.name || a.document_name),
            document_path: payload.remove_document ? null : (payload.document?.name || a.document_path),
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
   * Upload de comprovativo e submissão de justificação para uma ausência específica
   * Rota do Backend: POST /api/absences/{id}/document
   * Acessível tanto pelo Admin como pelo Assistente (se a falta estiver Pendente)
   */
  async uploadAbsenceDocument(
    id: string | number,
    file?: File | null,
    justification?: string,
    notes?: string
  ): Promise<BackendAbsenceResource> {
    const formData = new FormData();
    if (file) {
      formData.append("document", file);
    }
    if (justification !== undefined && justification !== null) {
      formData.append("justification", justification);
    }
    if (notes !== undefined && notes !== null) {
      formData.append("notes", notes);
    }

    try {
      const response = await apiClient.post<any>(`/absences/${id}/document`, formData);
      const raw = response.data?.data ?? response.data;
      return normalizeAbsenceResource(raw);
    } catch (err: any) {
      if (err?.response && err.response.status !== 404) {
        throw err;
      }
      // Fallback mock
      localAbsencesMock = localAbsencesMock.map((a) => {
        if (String(a.id) === String(id)) {
          return normalizeAbsenceResource({
            ...a,
            document_name: file ? file.name : a.document_name,
            document_path: file ? file.name : a.document_path,
            has_document: file ? true : a.has_document,
            missing_document: false,
            justification: justification !== undefined ? justification : a.justification,
            notes: notes !== undefined ? notes : a.notes,
          });
        }
        return a;
      });
      const updated = localAbsencesMock.find((a) => String(a.id) === String(id));
      if (updated) return updated;
      throw err;
    }
  },

  /**
   * Descarrega o documento comprovativo de uma ausência como Blob
   * GET /api/absences/{id}/document
   */
  async downloadDocument(id: string | number): Promise<{ blob: Blob; filename: string }> {
    const response = await apiClient.get(`/absences/${id}/document`, {
      responseType: "blob",
    });

    const disposition = response.headers?.["content-disposition"] || "";
    let filename = `comprovativo_ausencia_${id}.pdf`;
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, "").trim();
      }
    }

    return { blob: response.data, filename };
  },

  /**
   * Abre ou faz o download direto do comprovativo no browser
   */
  async openOrDownloadDocument(id: string | number, fallbackFilename?: string): Promise<void> {
    const { blob, filename } = await this.downloadDocument(id);
    const chosenName = fallbackFilename || filename || "comprovativo.pdf";
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = chosenName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },

  /**
   * Upload genérico de documento de justificação (mantido para compatibilidade)
   */
  async uploadDocument(file: File): Promise<{ document_path: string; url?: string }> {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("file", file);
    const response = await apiClient.post<any>("/absences/upload", formData);
    return response.data?.data ?? response.data;
  },
};

export default absencesService;
