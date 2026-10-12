import apiClient from "../client";
import { ApiResponse } from "../types/api.types";
import {
  AssistantScheduleProfileApi,
  CreateAssistantScheduleProfilePayload,
  UpdateAssistantScheduleProfilePayload,
} from "../../types/assistantSchedule.types";
import { AssistantScheduleItem } from "../../components/assistants/AssistantScheduleManager";

const DAY_MAP_TO_NUM: Record<string, number> = {
  Seg: 1,
  Ter: 2,
  Qua: 3,
  Qui: 4,
  Sex: 5,
  Sáb: 6,
  Dom: 7,
};

const NUM_TO_DAY_MAP: Record<number, string> = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
  7: "Dom",
};

export function scheduleItemToApiPayload(
  assistantId: string,
  item: AssistantScheduleItem
): CreateAssistantScheduleProfilePayload {
  const isFixed = item.type === "fixed";

  if (isFixed) {
    return {
      assistant_id: assistantId,
      type: "fixo",
      valid_from: item.from,
      valid_until: item.to || null,
      shifts: [
        {
          shift_label: "A",
          entry_time: item.entry || "08:00",
          exit_time: item.exit || "16:00",
          lunch_enabled: !!item.lunch,
          lunch_start: item.lunch?.start || null,
          lunch_end: item.lunch?.end || null,
          lunch_duration_minutes: item.lunch?.duration ?? 30,
          days: (item.days || ["Seg", "Ter", "Qua", "Qui", "Sex"]).map(
            (d) => DAY_MAP_TO_NUM[d] || 1
          ),
        },
      ],
    };
  }

  const rotPeriod =
    item.period === "Semanal"
      ? "weekly"
      : item.period === "Mensal"
      ? "monthly"
      : "biweekly";

  return {
    assistant_id: assistantId,
    type: "rotativo",
    rotation_period: rotPeriod,
    starts_with: item.startsWith || "A",
    valid_from: item.from,
    valid_until: item.to || null,
    shifts: [
      {
        shift_label: "A",
        entry_time: item.shiftA?.entry || "07:30",
        exit_time: item.shiftA?.exit || "15:30",
        days: (item.days || ["Seg", "Ter", "Qua", "Qui", "Sex"]).map(
          (d) => DAY_MAP_TO_NUM[d] || 1
        ),
      },
      {
        shift_label: "B",
        entry_time: item.shiftB?.entry || "10:00",
        exit_time: item.shiftB?.exit || "17:00",
        days: (item.days || ["Seg", "Ter", "Qua", "Qui", "Sex"]).map(
          (d) => DAY_MAP_TO_NUM[d] || 1
        ),
      },
    ],
  };
}

export function apiProfileToScheduleItem(
  profile: AssistantScheduleProfileApi
): AssistantScheduleItem {
  const isFixed = profile.type === "fixo";
  const shiftA = profile.shifts?.find((s) => s.shift_label === "A");
  const shiftB = profile.shifts?.find((s) => s.shift_label === "B");

  const daysA = shiftA?.days?.map((n) => NUM_TO_DAY_MAP[n] || "Seg") || [
    "Seg",
    "Ter",
    "Qua",
    "Qui",
    "Sex",
  ];

  if (isFixed) {
    return {
      id: profile.id as any,
      type: "fixed",
      entry: shiftA?.entry_time || "08:00",
      exit: shiftA?.exit_time || "16:00",
      days: daysA,
      lunch: shiftA?.lunch_enabled
        ? {
            start: shiftA.lunch_start || "12:00",
            end: shiftA.lunch_end || "13:30",
            duration: shiftA.lunch_duration_minutes ?? 30,
          }
        : undefined,
      from: profile.valid_from,
      to: profile.valid_until || null,
    };
  }

  const periodMap: Record<string, "Semanal" | "Quinzenal" | "Mensal"> = {
    weekly: "Semanal",
    biweekly: "Quinzenal",
    monthly: "Mensal",
  };

  return {
    id: profile.id as any,
    type: "rotating",
    period: periodMap[profile.rotation_period || "biweekly"] || "Quinzenal",
    startsWith: (profile.starts_with as "A" | "B") || "A",
    shiftA: {
      entry: shiftA?.entry_time || "07:30",
      exit: shiftA?.exit_time || "15:30",
    },
    shiftB: {
      entry: shiftB?.entry_time || "10:00",
      exit: shiftB?.exit_time || "17:00",
    },
    days: daysA,
    from: profile.valid_from,
    to: profile.valid_until || null,
  };
}

export const assistantSchedulesService = {
  /**
   * Listar perfis de horário do assistente
   * GET /api/assistant-schedule-profiles?assistant_id={assistantId}
   */
  async getAll(assistantId: string | number): Promise<AssistantScheduleProfileApi[]> {
    const aid = String(assistantId);
    try {
      const response = await apiClient.get<any>(
        "/assistant-schedule-profiles",
        {
          params: { assistant_id: aid },
        }
      );
      const data = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Criar perfil de horário
   * POST /api/assistant-schedule-profiles
   */
  async create(
    payload: CreateAssistantScheduleProfilePayload
  ): Promise<ApiResponse<AssistantScheduleProfileApi>> {
    const response = await apiClient.post<ApiResponse<AssistantScheduleProfileApi>>(
      "/assistant-schedule-profiles",
      payload
    );
    return response.data;
  },

  /**
   * Atualizar perfil de horário
   * PUT /api/assistant-schedule-profiles/{id}
   */
  async update(
    id: string | number,
    payload: UpdateAssistantScheduleProfilePayload
  ): Promise<ApiResponse<AssistantScheduleProfileApi>> {
    const response = await apiClient.put<ApiResponse<AssistantScheduleProfileApi>>(
      `/assistant-schedule-profiles/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Eliminar perfil de horário
   * DELETE /api/assistant-schedule-profiles/{id}
   */
  async delete(
    id: string | number
  ): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/assistant-schedule-profiles/${id}`
    );
    return response.data;
  },
};

export default assistantSchedulesService;
