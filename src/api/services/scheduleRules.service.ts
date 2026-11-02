import apiClient from "../client";

export interface ScheduleRuleAssistantApi {
  id: string;
  name: string;
  priority: number;
}

export interface BackendScheduleRuleResource {
  id: string;
  school_id: string;
  activity_type_id: string;
  period_start: string;
  period_end: string;
  min: number;
  type: "mandatory" | "optional";
  valid_from: string;
  valid_until?: string | null;
  days_of_week: number[];
  assistant_ids: string[];
  assistants: ScheduleRuleAssistantApi[];
}

export interface CreateScheduleRulePayload {
  activity_type_id: string;
  period_start: string;
  period_end: string;
  min: number;
  type: "mandatory" | "optional";
  valid_from: string;
  valid_until?: string | null;
  days_of_week: number[];
  assistant_ids: string[];
}

export interface UpdateScheduleRulePayload {
  activity_type_id?: string;
  period_start?: string;
  period_end?: string;
  min?: number;
  type?: "mandatory" | "optional";
  valid_from?: string;
  valid_until?: string | null;
  days_of_week?: number[];
  assistant_ids?: string[];
}

export const scheduleRulesService = {
  /**
   * Listar todas as regras de horário para a escola ativa (via header X-School-ID)
   * GET /api/schedule-rules
   */
  async getAll(): Promise<BackendScheduleRuleResource[]> {
    const response = await apiClient.get<any>("/schedule-rules");
    if (Array.isArray(response.data?.data)) {
      return response.data.data;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  /**
   * Obter regra por ID
   * GET /api/schedule-rules/{id}
   */
  async getById(id: string): Promise<BackendScheduleRuleResource> {
    const response = await apiClient.get<any>(`/schedule-rules/${id}`);
    return response.data?.data ?? response.data;
  },

  /**
   * Criar regra de horário
   * POST /api/schedule-rules
   */
  async create(payload: CreateScheduleRulePayload): Promise<BackendScheduleRuleResource> {
    const response = await apiClient.post<any>("/schedule-rules", payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Atualizar regra de horário
   * PUT /api/schedule-rules/{id}
   */
  async update(id: string, payload: UpdateScheduleRulePayload): Promise<BackendScheduleRuleResource> {
    const response = await apiClient.put<any>(`/schedule-rules/${id}`, payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Eliminar regra de horário
   * DELETE /api/schedule-rules/{id}
   */
  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<any>(`/schedule-rules/${id}`);
    return response.data;
  },
};

export default scheduleRulesService;

