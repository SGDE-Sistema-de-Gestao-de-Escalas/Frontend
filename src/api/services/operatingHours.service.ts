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

const RULES_STORAGE_PREFIX = "sgde_mock_operating_rules_";
const EXCEPTIONS_STORAGE_PREFIX = "sgde_mock_operating_exceptions_";

// Mockdata inicial realista por omissão para quando não existir nada em local storage
function getInitialMockRules(schoolId: string): OperatingRule[] {
  return [
    {
      id: "rule-curr-1",
      school_id: schoolId,
      valid_from: "2026-09-01",
      valid_until: "2027-01-31",
      status: "current",
      status_message: "Em vigor (1º Semestre)",
      can_edit: false,
      can_delete: false,
      cannot_delete_reason: "Esta versão já está em vigor e não pode ser eliminada nem alterada.",
      days: [
        { day_of_week: 1, opening_time: "08:00", closing_time: "18:30", lunch_start: "12:15", lunch_end: "13:45", lunch_duration_minutes: 60 },
        { day_of_week: 2, opening_time: "08:00", closing_time: "18:30", lunch_start: "12:15", lunch_end: "13:45", lunch_duration_minutes: 60 },
        { day_of_week: 3, opening_time: "08:00", closing_time: "18:30", lunch_start: "12:15", lunch_end: "13:45", lunch_duration_minutes: 60 },
        { day_of_week: 4, opening_time: "08:00", closing_time: "18:30", lunch_start: "12:15", lunch_end: "13:45", lunch_duration_minutes: 60 },
        { day_of_week: 5, opening_time: "08:00", closing_time: "17:30", lunch_start: "12:15", lunch_end: "13:30", lunch_duration_minutes: 45 },
      ],
      created_at: "2026-08-15T10:00:00Z",
    },
    {
      id: "rule-up-2",
      school_id: schoolId,
      valid_from: "2027-02-01",
      valid_until: null,
      status: "upcoming",
      status_message: "Versão futura (2º Semestre)",
      can_edit: true,
      can_delete: true,
      cannot_delete_reason: null,
      days: [
        { day_of_week: 1, opening_time: "08:00", closing_time: "18:30", lunch_start: "12:15", lunch_end: "13:45", lunch_duration_minutes: 60 },
        { day_of_week: 2, opening_time: "08:00", closing_time: "18:30", lunch_start: "12:15", lunch_end: "13:45", lunch_duration_minutes: 60 },
        { day_of_week: 3, opening_time: "08:00", closing_time: "18:30", lunch_start: "12:15", lunch_end: "13:45", lunch_duration_minutes: 60 },
        { day_of_week: 4, opening_time: "08:00", closing_time: "18:30", lunch_start: "12:15", lunch_end: "13:45", lunch_duration_minutes: 60 },
        { day_of_week: 5, opening_time: "08:00", closing_time: "18:00", lunch_start: "12:15", lunch_end: "13:30", lunch_duration_minutes: 45 },
      ],
      created_at: "2026-09-20T14:30:00Z",
    },
  ];
}

function getInitialMockExceptions(schoolId: string): OperatingException[] {
  return [
    {
      id: "exc-1",
      school_id: schoolId,
      name: "Pausa Letiva de Natal",
      is_closed: true,
      valid_from: "2026-12-21",
      valid_until: "2027-01-04",
      opening_time: null,
      closing_time: null,
      lunch_start: null,
      lunch_end: null,
      lunch_duration_minutes: null,
      status: "upcoming",
      status_message: "Exceção futura",
      can_edit_all: true,
      can_change_end_date: true,
      can_delete: true,
      cannot_delete_reason: null,
      created_at: "2026-09-10T11:00:00Z",
    },
    {
      id: "exc-2",
      school_id: schoolId,
      name: "Semana de Atividades de Receção",
      is_closed: false,
      valid_from: "2026-10-12",
      valid_until: "2026-10-16",
      opening_time: "08:30",
      closing_time: "16:00",
      lunch_start: "12:30",
      lunch_end: "13:30",
      lunch_duration_minutes: 45,
      status: "upcoming",
      status_message: "Exceção futura",
      can_edit_all: true,
      can_change_end_date: true,
      can_delete: true,
      cannot_delete_reason: null,
      created_at: "2026-10-01T09:15:00Z",
    },
  ];
}

// Helpers para LocalStorage mock
function loadMockRules(schoolId: string): OperatingRule[] {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_PREFIX + schoolId);
    if (raw) return JSON.parse(raw);
  } catch {}
  const init = getInitialMockRules(schoolId);
  saveMockRules(schoolId, init);
  return init;
}

function saveMockRules(schoolId: string, rules: OperatingRule[]) {
  try {
    localStorage.setItem(RULES_STORAGE_PREFIX + schoolId, JSON.stringify(rules));
  } catch {}
}

function loadMockExceptions(schoolId: string): OperatingException[] {
  try {
    const raw = localStorage.getItem(EXCEPTIONS_STORAGE_PREFIX + schoolId);
    if (raw) return JSON.parse(raw);
  } catch {}
  const init = getInitialMockExceptions(schoolId);
  saveMockExceptions(schoolId, init);
  return init;
}

function saveMockExceptions(schoolId: string, exceptions: OperatingException[]) {
  try {
    localStorage.setItem(EXCEPTIONS_STORAGE_PREFIX + schoolId, JSON.stringify(exceptions));
  } catch {}
}

export const operatingHoursService = {
  // ── 1) Horário fixo — /api/operating-rules ──────────────────────────────────
  async getRules(params?: { status?: string }, schoolId?: string): Promise<{ data: OperatingRule[] }> {
    try {
      const response = await apiClient.get<{ data: OperatingRule[] }>("/operating-rules", { params });
      if (response?.data?.data) return response.data;
    } catch (err: any) {
      // Se 404 (endpoint ainda não existe no backend) usa mockdata
      if (err?.response?.status === 404 || !err?.response) {
        let rules = loadMockRules(schoolId || "default");
        if (params?.status) {
          rules = rules.filter((r) => r.status === params.status);
        }
        return { data: rules };
      }
      throw err;
    }
    return { data: loadMockRules(schoolId || "default") };
  },

  async createRule(payload: CreateOperatingRulePayload, schoolId?: string): Promise<ApiResponse<OperatingRule>> {
    try {
      const response = await apiClient.post<ApiResponse<OperatingRule>>("/operating-rules", payload);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || !err?.response) {
        const rules = loadMockRules(schoolId || "default");
        const newRule: OperatingRule = {
          id: `rule-${Date.now()}`,
          school_id: schoolId || "default",
          valid_from: payload.valid_from,
          valid_until: null,
          days: payload.days,
          status: "upcoming",
          status_message: "Versão futura",
          can_edit: true,
          can_delete: true,
          cannot_delete_reason: null,
          created_at: new Date().toISOString(),
        };
        // Adiciona e ordena por data decrescente
        const updated = [newRule, ...rules].sort((a, b) => b.valid_from.localeCompare(a.valid_from));
        saveMockRules(schoolId || "default", updated);
        return { data: newRule, message: "Regra de funcionamento criada com sucesso." };
      }
      throw err;
    }
  },

  async updateRule(id: string, payload: UpdateOperatingRulePayload, schoolId?: string): Promise<ApiResponse<OperatingRule>> {
    try {
      const response = await apiClient.put<ApiResponse<OperatingRule>>(`/operating-rules/${id}`, payload);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || !err?.response) {
        const rules = loadMockRules(schoolId || "default");
        const index = rules.findIndex((r) => r.id === id);
        if (index === -1) throw new Error("Versão não encontrada.");
        if (!rules[index].can_edit) {
          throw { response: { status: 409, data: { error: "CONFLICT", message: "Apenas versões futuras podem ser alteradas." } } };
        }
        const updatedRule: OperatingRule = {
          ...rules[index],
          valid_from: payload.valid_from ?? rules[index].valid_from,
          days: payload.days,
          updated_at: new Date().toISOString(),
        };
        rules[index] = updatedRule;
        saveMockRules(schoolId || "default", rules);
        return { data: updatedRule, message: "Versão de horário atualizada com sucesso." };
      }
      throw err;
    }
  },

  async deleteRule(id: string, schoolId?: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<{ message: string }>(`/operating-rules/${id}`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || !err?.response) {
        const rules = loadMockRules(schoolId || "default");
        const target = rules.find((r) => r.id === id);
        if (target && !target.can_delete) {
          throw { response: { status: 409, data: { error: "CONFLICT", message: target.cannot_delete_reason || "Esta versão não pode ser eliminada." } } };
        }
        const filtered = rules.filter((r) => r.id !== id);
        saveMockRules(schoolId || "default", filtered);
        return { message: "Versão de horário eliminada com sucesso." };
      }
      throw err;
    }
  },

  // ── 2) Exceções — /api/operating-exceptions ─────────────────────────────────
  async getExceptions(params?: { status?: string }, schoolId?: string): Promise<{ data: OperatingException[] }> {
    try {
      const response = await apiClient.get<{ data: OperatingException[] }>("/operating-exceptions", { params });
      if (response?.data?.data) return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || !err?.response) {
        let exceptions = loadMockExceptions(schoolId || "default");
        if (params?.status) {
          exceptions = exceptions.filter((e) => e.status === params.status);
        }
        return { data: exceptions };
      }
      throw err;
    }
    return { data: loadMockExceptions(schoolId || "default") };
  },

  async createException(payload: CreateOperatingExceptionPayload, schoolId?: string): Promise<ApiResponse<OperatingException>> {
    try {
      const response = await apiClient.post<ApiResponse<OperatingException>>("/operating-exceptions", payload);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || !err?.response) {
        const exceptions = loadMockExceptions(schoolId || "default");
        const newException: OperatingException = {
          id: `exc-${Date.now()}`,
          school_id: schoolId || "default",
          ...payload,
          status: "upcoming",
          status_message: "Exceção futura",
          can_edit_all: true,
          can_change_end_date: true,
          can_delete: true,
          cannot_delete_reason: null,
          created_at: new Date().toISOString(),
        };
        const updated = [newException, ...exceptions].sort((a, b) => b.valid_from.localeCompare(a.valid_from));
        saveMockExceptions(schoolId || "default", updated);
        return { data: newException, message: "Exceção de funcionamento criada com sucesso." };
      }
      throw err;
    }
  },

  async updateException(id: string, payload: UpdateOperatingExceptionPayload, schoolId?: string): Promise<ApiResponse<OperatingException>> {
    try {
      const response = await apiClient.put<ApiResponse<OperatingException>>(`/operating-exceptions/${id}`, payload);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || !err?.response) {
        const exceptions = loadMockExceptions(schoolId || "default");
        const index = exceptions.findIndex((e) => e.id === id);
        if (index === -1) throw new Error("Exceção não encontrada.");
        const current = exceptions[index];
        if (!current.can_edit_all && !current.can_change_end_date) {
          throw { response: { status: 409, data: { error: "CONFLICT", message: "Esta exceção já terminou e não pode ser editada." } } };
        }
        const updatedException: OperatingException = {
          ...current,
          ...(current.can_edit_all ? payload : { valid_until: payload.valid_until }),
          updated_at: new Date().toISOString(),
        };
        exceptions[index] = updatedException;
        saveMockExceptions(schoolId || "default", exceptions);
        return { data: updatedException, message: "Exceção atualizada com sucesso." };
      }
      throw err;
    }
  },

  async deleteException(id: string, schoolId?: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<{ message: string }>(`/operating-exceptions/${id}`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || !err?.response) {
        const exceptions = loadMockExceptions(schoolId || "default");
        const target = exceptions.find((e) => e.id === id);
        if (target && !target.can_delete) {
          throw { response: { status: 409, data: { error: "CONFLICT", message: target.cannot_delete_reason || "Esta exceção não pode ser eliminada." } } };
        }
        const filtered = exceptions.filter((e) => e.id !== id);
        saveMockExceptions(schoolId || "default", filtered);
        return { message: "Exceção eliminada com sucesso." };
      }
      throw err;
    }
  },

  // ── 3) Calendário resolvido — /api/operating-calendar ───────────────────────
  async getCalendar(from: string, to: string, schoolId?: string): Promise<{ data: OperatingCalendarDay[] }> {
    try {
      const response = await apiClient.get<{ data: OperatingCalendarDay[] }>("/operating-calendar", {
        params: { from, to },
      });
      if (response?.data?.data) return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404 || !err?.response) {
        // Gera dias simulados entre from e to respeitando a ordem: feriado > exceção > fixo > none
        const rules = loadMockRules(schoolId || "default");
        const exceptions = loadMockExceptions(schoolId || "default");
        const currentRule = rules.find((r) => r.status === "current") || rules[0];

        const days: OperatingCalendarDay[] = [];
        const start = new Date(from);
        const end = new Date(to);
        const curr = new Date(start);

        while (curr <= end) {
          const dateStr = curr.toISOString().split("T")[0];
          const dow = (curr.getDay() === 0 ? 7 : curr.getDay()) as 1 | 2 | 3 | 4 | 5 | 6 | 7;

          // Verificar se coincide com alguma exceção
          const matchedExc = exceptions.find(
            (e) => dateStr >= e.valid_from && dateStr <= e.valid_until
          );

          if (matchedExc) {
            if (matchedExc.is_closed) {
              days.push({
                date: dateStr,
                day_of_week: dow,
                is_open: false,
                source: "exception",
                reason: matchedExc.name,
                opening_time: null,
                closing_time: null,
                lunch_start: null,
                lunch_end: null,
                lunch_duration_minutes: null,
              });
            } else {
              days.push({
                date: dateStr,
                day_of_week: dow,
                is_open: true,
                source: "exception",
                reason: matchedExc.name,
                opening_time: matchedExc.opening_time ?? "08:00",
                closing_time: matchedExc.closing_time ?? "16:00",
                lunch_start: matchedExc.lunch_start ?? "12:00",
                lunch_end: matchedExc.lunch_end ?? "13:00",
                lunch_duration_minutes: matchedExc.lunch_duration_minutes ?? 45,
              });
            }
          } else {
            // Horário fixo
            const dayConfig = currentRule?.days.find((d) => d.day_of_week === dow);
            if (dayConfig) {
              days.push({
                date: dateStr,
                day_of_week: dow,
                is_open: true,
                source: "fixed",
                reason: "Horário em vigor",
                opening_time: dayConfig.opening_time,
                closing_time: dayConfig.closing_time,
                lunch_start: dayConfig.lunch_start,
                lunch_end: dayConfig.lunch_end,
                lunch_duration_minutes: dayConfig.lunch_duration_minutes,
              });
            } else {
              days.push({
                date: dateStr,
                day_of_week: dow,
                is_open: false,
                source: "none",
                reason: "Sem funcionamento ao fim de semana / dia encerrado",
                opening_time: null,
                closing_time: null,
                lunch_start: null,
                lunch_end: null,
                lunch_duration_minutes: null,
              });
            }
          }
          curr.setDate(curr.getDate() + 1);
        }
        return { data: days };
      }
      throw err;
    }
    return { data: [] };
  },
};

export default operatingHoursService;

