import apiClient from "../client";
import { ApiResponse } from "../types/api.types";
import {
  OperatingRule,
  CreateOperatingRulePayload,
  UpdateOperatingRulePayload,
  OperatingException,
  CreateOperatingExceptionPayload,
  UpdateOperatingExceptionPayload,
  OperatingCalendarDay,
} from "../../types/operatingHours.types";

export const operatingHoursService = {
  // ── 1) Horário fixo de funcionamento — /api/operating-rules ──────────────────
  async getRules(params?: { status?: string }, _schoolId?: string): Promise<{ data: OperatingRule[] }> {
    try {
      const response = await apiClient.get<any>("/operating-rules", { params });
      const list = Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data)
        ? response.data
        : [];
      return { data: list };
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return { data: [] };
      }
      throw err;
    }
  },

  async getRuleById(id: string, _schoolId?: string): Promise<ApiResponse<OperatingRule>> {
    const response = await apiClient.get<ApiResponse<OperatingRule>>(`/operating-rules/${id}`);
    return response.data;
  },

  async createRule(payload: CreateOperatingRulePayload, _schoolId?: string): Promise<ApiResponse<OperatingRule>> {
    const response = await apiClient.post<ApiResponse<OperatingRule>>("/operating-rules", payload);
    return response.data;
  },

  async updateRule(id: string, payload: UpdateOperatingRulePayload, _schoolId?: string): Promise<ApiResponse<OperatingRule>> {
    const response = await apiClient.put<ApiResponse<OperatingRule>>(`/operating-rules/${id}`, payload);
    return response.data;
  },

  async deleteRule(id: string, _schoolId?: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/operating-rules/${id}`);
    return response.data;
  },

  // ── 2) Exceções de funcionamento — /api/operating-exceptions ─────────────────
  async getExceptions(params?: { status?: string }, _schoolId?: string): Promise<{ data: OperatingException[] }> {
    try {
      const response = await apiClient.get<any>("/operating-exceptions", { params });
      const list = Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data)
        ? response.data
        : [];
      return { data: list };
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return { data: [] };
      }
      throw err;
    }
  },

  async getExceptionById(id: string, _schoolId?: string): Promise<ApiResponse<OperatingException>> {
    const response = await apiClient.get<ApiResponse<OperatingException>>(`/operating-exceptions/${id}`);
    return response.data;
  },

  async createException(payload: CreateOperatingExceptionPayload, _schoolId?: string): Promise<ApiResponse<OperatingException>> {
    const response = await apiClient.post<ApiResponse<OperatingException>>("/operating-exceptions", payload);
    return response.data;
  },

  async updateException(id: string, payload: UpdateOperatingExceptionPayload, _schoolId?: string): Promise<ApiResponse<OperatingException>> {
    const response = await apiClient.put<ApiResponse<OperatingException>>(`/operating-exceptions/${id}`, payload);
    return response.data;
  },

  async deleteException(id: string, _schoolId?: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/operating-exceptions/${id}`);
    return response.data;
  },

  // ── 3) Calendário resolvido — /api/operating-calendar ───────────────────────
  async getCalendar(from: string, to: string, _schoolId?: string): Promise<{ data: OperatingCalendarDay[] }> {
    try {
      const response = await apiClient.get<any>("/operating-calendar", {
        params: { from, to },
      });
      const list = Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data)
        ? response.data
        : [];
      return { data: list };
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return { data: [] };
      }
      throw err;
    }
  },
};

export default operatingHoursService;
