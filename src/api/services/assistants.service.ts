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
};

export default assistantsService;

