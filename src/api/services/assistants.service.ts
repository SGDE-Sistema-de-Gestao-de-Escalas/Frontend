import apiClient from "../client";
import { ApiResponse, PaginatedResponse } from "../types/api.types";
import { Assistant, CreateAssistantPayload, UpdateAssistantPayload } from "../../types";

export interface AssistantFilters {
  status?: "active" | "inactive" | "all" | "trashed";
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: "name" | "internal_number";
  sort_direction?: "asc" | "desc";
  schoolId?: number | string;
  active?: boolean;
}

export interface AssistantCounts {
  all: number;
  active: number;
  inactive: number;
}

export interface PaginatedAssistantsResponse extends PaginatedResponse<Assistant> {
  counts?: AssistantCounts;
}

export interface AssistantImportSummary {
  total_rows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface AssistantImportError {
  row: number;
  internal_number?: string | null;
  email?: string | null;
  errors: Record<string, string[]>;
}

export interface AssistantImportSkipped {
  row: number;
  internal_number?: string | null;
  email?: string | null;
  reason: string;
}

export interface AssistantImportResponse {
  message: string;
  on_duplicate: "skip" | "overwrite";
  summary: AssistantImportSummary;
  ignored_columns: string[];
  errors: AssistantImportError[];
  skipped: AssistantImportSkipped[];
}

function hasFileProperty(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  return Object.values(data).some(
    (val) => val instanceof File || (typeof Blob !== "undefined" && val instanceof Blob)
  );
}

function toAssistantFormData(payload: Record<string, any>, isUpdate = false): FormData {
  const formData = new FormData();
  if (isUpdate) {
    formData.append("_method", "PUT");
  }

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (value instanceof File || (typeof Blob !== "undefined" && value instanceof Blob)) {
      formData.append(key, value, (value as File).name || "registo_criminal.pdf");
    } else if (typeof value === "boolean") {
      formData.append(key, value ? "1" : "0");
    } else {
      formData.append(key, String(value));
    }
  }

  return formData;
}

export const assistantsService = {
  async getAll(params?: AssistantFilters): Promise<PaginatedAssistantsResponse> {
    const response = await apiClient.get<PaginatedAssistantsResponse>("/assistants", {
      params,
    });
    return response.data;
  },

  async getById(id: number | string): Promise<ApiResponse<Assistant>> {
    const response = await apiClient.get<ApiResponse<Assistant>>(`/assistants/${id}`);
    return response.data;
  },

  async create(data: CreateAssistantPayload | FormData): Promise<ApiResponse<Assistant>> {
    const body =
      data instanceof FormData
        ? data
        : hasFileProperty(data)
        ? toAssistantFormData(data, false)
        : data;

    const response = await apiClient.post<ApiResponse<Assistant>>("/assistants", body);
    return response.data;
  },

  async update(
    id: number | string,
    data: UpdateAssistantPayload | FormData
  ): Promise<ApiResponse<Assistant>> {
    if (data instanceof FormData) {
      if (!data.has("_method")) {
        data.append("_method", "PUT");
      }
      const response = await apiClient.post<ApiResponse<Assistant>>(`/assistants/${id}`, data);
      return response.data;
    }

    if (hasFileProperty(data) || data.remove_criminal_record) {
      const formData = toAssistantFormData(data, true);
      const response = await apiClient.post<ApiResponse<Assistant>>(`/assistants/${id}`, formData);
      return response.data;
    }

    const response = await apiClient.put<ApiResponse<Assistant>>(`/assistants/${id}`, data);
    return response.data;
  },

  async downloadCriminalRecord(
    id: number | string
  ): Promise<{ blob: Blob; filename: string }> {
    const response = await apiClient.get(`/assistants/${id}/criminal-record`, {
      responseType: "blob",
    });

    const disposition = response.headers?.["content-disposition"] || "";
    let filename = `registo_criminal_${id}.pdf`;
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, "").trim();
      }
    }

    return { blob: response.data, filename };
  },

  async openOrDownloadCriminalRecord(
    id: number | string,
    fallbackFilename?: string
  ): Promise<void> {
    const { blob, filename } = await this.downloadCriminalRecord(id);
    const chosenName = fallbackFilename || filename || "registo_criminal.pdf";
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = chosenName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },

  async delete(id: number | string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/assistants/${id}`);
    return response.data;
  },

  /**
   * Exporta os assistentes da escola ativa para CSV
   */
  async exportCsv(
    status: "active" | "inactive" | "all" = "active"
  ): Promise<{ blob: Blob; filename: string }> {
    const response = await apiClient.get("/assistants/export", {
      params: { status },
      responseType: "blob",
    });

    const disposition = response.headers?.["content-disposition"] || "";
    let filename = `assistentes_${status}_${new Date().toISOString().split("T")[0]}.csv`;
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, "").trim();
      }
    }

    return { blob: response.data, filename };
  },

  /**
   * Faz o download direto do ficheiro CSV de assistentes
   */
  async downloadCsv(status: "active" | "inactive" | "all" = "active"): Promise<void> {
    const { blob, filename } = await this.exportCsv(status);
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },

  /**
   * Gera e descarrega um modelo vazio de CSV (com cabeçalhos padrão)
   */
  downloadTemplateCsv(): void {
    const headers = [
      "internal_number",
      "first_name",
      "last_name",
      "email",
      "phone",
      "nif",
      "social_security_number",
      "birth_date",
      "admission_date",
      "criminal_record_expiry",
      "address_street",
      "address_zip_code",
      "address_city",
      "emergency_contact_name",
      "emergency_contact_phone",
      "emergency_contact_kinship",
      "available_for_transfer",
    ];

    // UTF-8 BOM + Cabeçalho com delimitador ';'
    const csvContent = "\uFEFF" + headers.join(";") + "\r\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "modelo_importacao_assistentes.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },

  /**
   * Importa assistentes a partir de um ficheiro CSV
   */
  async importCsv(
    file: File,
    onDuplicate: "skip" | "overwrite" = "skip"
  ): Promise<AssistantImportResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("on_duplicate", onDuplicate);

    const response = await apiClient.post<AssistantImportResponse>(
      "/assistants/import",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },
};

export default assistantsService;
