export interface SaveScheduleDayEntryPayload {
  assistant_id: string;
  activity_type_id?: string | null;
  activity_name: string;
  schedule_rule_id?: string | null;
  start_time: string;
  end_time: string;
  is_locked?: boolean;
}

export interface SaveScheduleDayPayload {
  date: string;
  entries: SaveScheduleDayEntryPayload[];
}

export interface SaveScheduleDaysPayload {
  days: SaveScheduleDayPayload[];
}

import apiClient from "../client";
import type { EntityId } from "../../types";

export interface BackendScheduleEntryResource {
  id: string;
  schedule_id: string;
  activity_type_id: string | null;
  activity_name: string | null;
  activity_color?: string | null;
  is_fallback: boolean;
  schedule_rule_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  is_locked: boolean;
  replaced_assistant_id: string | null;
  replacement_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BackendScheduleResource {
  id: string;
  school_id: string;
  school_name?: string | null;
  assistant_id: string;
  assistant_name: string | null;
  shift_start?: string | null;
  shift_end?: string | null;
  is_temporary_transfer?: boolean;
  origin_school_id?: string | null;
  origin_school_name?: string | null;
  assistant_schedule_profile_id: string | null;
  week_start: string;
  week_end: string;
  status: "draft" | "published";
  generated_at: string | null;
  published_at: string | null;
  entries?: BackendScheduleEntryResource[];
  created_at?: string;
  updated_at?: string;
}

export interface TransferCandidateApi {
  assistant_id: string;
  name: string;
  origin_school_id: string;
  origin_school_name: string | null;
  causes_origin_shortfall: boolean;
  selectable: boolean;
  score: number;
  origin_impact_detail: string | null;
  shift_start?: string | null;
  shift_end?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  lunch_duration?: number | null;
  is_absent?: boolean;
  partial_absence?: string | null;
  absence_overlaps?: boolean;
  works_today?: boolean;
  shift_covers_deficit?: "full" | "partial" | "outside";
  overlap_minutes?: number;
  deficit_duration_minutes?: number;
}

export interface SkippedCandidateApi {
  assistant_id: string;
  priority: number;
  reason: string;
}

export interface ScheduleConflictApi {
  date: string;
  rule_id: string;
  activity_type_id: string;
  activity_name: string | null;
  period_start: string;
  period_end: string;
  required: number;
  assigned: number;
  missing: number;
  skipped: SkippedCandidateApi[];
  transfer_candidates: TransferCandidateApi[];
}

export type ScheduleInsightType =
  | "substitute_assigned"
  | "optional_swap"
  | "partition_sub_block"
  | "atomic_mandatory_swap"
  | "internal_universal_fallback"
  | "cascade_optional_reallocation"
  | "optional_incomplete"
  | "locked_absence_conflict";

export interface ScheduleInsightApi {
  type: ScheduleInsightType;
  date: string;
  rule_id?: string;
  other_rule_id?: string;
  activity_type_id?: string;
  activity_name?: string | null;
  assistant_id?: string;
  replaced_assistant_id?: string | null;
  replacement_assistant_id?: string | null;
  start_time?: string;
  end_time?: string;
  assigned?: number;
  required?: number;
  message: string;
}

export interface HoursAccountingApi {
  date: string;
  assistant_id: string;
  assistant_name: string;
  contracted_minutes: number;
  assigned_specific_minutes: number;
  assigned_fallback_minutes: number;
  lunch_minutes: number;
  absence_minutes: number;
  school_closed_clipped_minutes: number;
}

export interface ValidationCheckItemApi {
  code: string;
  status: "ok" | "warn" | "error";
  detail: string;
}

export interface ScheduleDaySummaryApi {
  date: string;
  day_of_week: number;
  is_open: boolean;
  source: string;
  reason: string | null;
  opening_time?: string;
  closing_time?: string;
}

export interface LunchBlockApi {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export interface ApprovedTransferPayload {
  assistant_id: string;
  date: string;
  rule_id?: string;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string;
}

export interface GenerateSchedulePayload {
  start_date: string;
  end_date: string;
  preserve_locked?: boolean;
  idempotency_key?: string;
  transfers?: ApprovedTransferPayload[];
}

export interface GenerateScheduleResponse {
  status: "draft" | "blocked";
  resolution_status: "complete_validated" | "draft_with_deficit";
  school_id: string;
  start_date: string;
  end_date: string;
  days: ScheduleDaySummaryApi[];
  schedules_count: number;
  entries_count: number;
  lunch_blocks: Record<string, Record<string, LunchBlockApi>>;
  conflicts: ScheduleConflictApi[];
  insights: ScheduleInsightApi[];
  hours_accounting: HoursAccountingApi[];
  validations: {
    pre: {
      has_blocking_errors: boolean;
      items: ValidationCheckItemApi[];
    };
    post: {
      all_passed: boolean;
      items: ValidationCheckItemApi[];
    };
  };
  audit_log: { date: string; message: string }[];
}

export interface PublishSchedulePayload {
  start_date: string;
  end_date: string;
}

export interface PublishScheduleResponse {
  status: "published";
  published_schedules_count: number;
}

export interface PendingRecalculationConflict {
  date: string;
  type: string;
  assistant_id?: string;
  assistant_name?: string;
  rule_id?: string;
  activity_name?: string;
  period_start?: string;
  period_end?: string;
  period?: string;
  start_time?: string;
  end_time?: string;
  required?: number;
  covered?: number;
  missing?: number;
  message: string;
}

export interface PendingRecalculationsResponse {
  has_pending: boolean;
  affected_dates: string[];
  conflicts: Record<string, PendingRecalculationConflict[]>;
  summary: string;
}

export interface ListSchedulesParams {
  start_date?: string;
  end_date?: string;
  week_start?: string;
  assistant_id?: EntityId;
  status?: "draft" | "published";
  per_page?: number;
}

export interface ExportSchedulesParams {
  start_date: string;
  end_date: string;
  format?: "pdf" | "csv";
  model?: "wall" | "individual" | "monthly";
  assistant_id?: string;
  school_id?: string;
}

export const schedulesService = {
  /**
   * Lista as escalas da escola ativa (filtradas por intervalo de datas, assistente ou estado).
   * GET /api/schedules
   */
  async getAll(params?: ListSchedulesParams): Promise<BackendScheduleResource[]> {
    const response = await apiClient.get<any>("/schedules", { params });
    if (Array.isArray(response.data?.data)) {
      return response.data.data;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  /**
   * Obtém o detalhe de uma escala específica.
   * GET /api/schedules/{id}
   */
  async getById(id: string): Promise<BackendScheduleResource> {
    const response = await apiClient.get<any>(`/schedules/${id}`);
    return response.data?.data ?? response.data;
  },

  /**
   * Executa o Super Algoritmo de Geração Automática de Escalas.
   * POST /api/schedules/generate
   */
  async generate(payload: GenerateSchedulePayload): Promise<GenerateScheduleResponse> {
    const response = await apiClient.post<GenerateScheduleResponse>(
      "/schedules/generate",
      payload
    );
    return response.data;
  },

  /**
   * Publica as escalas em rascunho (draft -> published) no intervalo de datas indicado.
   * POST /api/schedules/publish
   */
  async publish(payload: PublishSchedulePayload): Promise<PublishScheduleResponse> {
    const response = await apiClient.post<PublishScheduleResponse>(
      "/schedules/publish",
      payload
    );
    return response.data;
  },

  /**
   * Obtém a lista de dias com escalas geradas que têm quebra de integridade/regras e requerem recálculo.
   * GET /api/schedules/pending-recalculations
   */
  async getPendingRecalculations(schoolId?: string): Promise<PendingRecalculationsResponse> {
    const response = await apiClient.get<PendingRecalculationsResponse>(
      "/schedules/pending-recalculations",
      {
        headers: schoolId ? { "X-School-ID": schoolId } : {},
      }
    );
    return response.data;
  },

  /**
   * Grava as alterações manuais às escalas dos dias indicados.
   * POST /api/schedules/save-days
   */
  async saveDays(
    payload: SaveScheduleDaysPayload
  ): Promise<{ message: string; saved_days_count: number }> {
    const response = await apiClient.post<{
      message: string;
      saved_days_count: number;
    }>("/schedules/save-days", payload);
    return response.data;
  },

  /**
   * Exporta a escala em PDF (A4 Horizontal) ou CSV (UTF-8 BOM) a partir do Backend.
   * GET /api/schedules/export
   */
  async exportSchedules(params: ExportSchedulesParams): Promise<Blob> {
    try {
      const response = await apiClient.get<Blob>("/schedules/export", {
        params,
        responseType: "blob",
        headers: params.school_id ? { "X-School-ID": params.school_id } : {},
      });
      return response.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const errData = err?.response?.data;
      if (errData instanceof Blob) {
        try {
          const text = await errData.text();
          const parsed = JSON.parse(text);
          if (parsed?.message) {
            err.backendMessage = parsed.message;
          }
        } catch {
          // Ignorar falha de parse caso não seja JSON
        }
      } else if (errData?.message) {
        err.backendMessage = errData.message;
      }
      err.httpStatus = status;
      throw err;
    }
  },

  /**
   * Faz download direto do ficheiro PDF ou CSV gerado pelo Backend.
   */
  async downloadExport(params: ExportSchedulesParams): Promise<void> {
    const blob = await this.exportSchedules(params);
    const ext = (params.format || "pdf") === "csv" ? "csv" : "pdf";
    const prefix =
      params.model === "monthly"
        ? "horario_mensal"
        : params.model === "individual"
        ? "horario_individual"
        : ext === "csv"
        ? "escala_servico"
        : "escala_diaria";
    const dateSuffix =
      params.start_date === params.end_date
        ? params.start_date
        : `${params.start_date}_a_${params.end_date}`;
    const filename = `${prefix}_${dateSuffix}.${ext}`;

    const fileBlob =
      ext === "pdf"
        ? new Blob([blob], { type: "application/pdf" })
        : new Blob([blob], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(fileBlob);

    if (ext === "pdf") {
      window.open(url, "_blank", "noopener,noreferrer");
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
};

export default schedulesService;

