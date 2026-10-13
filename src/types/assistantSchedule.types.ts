import { EntityId } from "./index";

export type ScheduleProfileType = "fixo" | "rotativo";
export type RotationPeriod = "weekly" | "biweekly" | "monthly";
export type ShiftLabel = "A" | "B";

export interface AssistantScheduleShiftApi {
  id?: string;
  shift_label: ShiftLabel;
  entry_time: string;
  exit_time: string;
  lunch_enabled?: boolean;
  lunch_start?: string | null;
  lunch_end?: string | null;
  lunch_duration_minutes?: number | null;
  days: number[]; // 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb, 7=Dom
}

export interface AssistantScheduleProfileApi {
  id: string;
  assistant_id: string;
  type: ScheduleProfileType;
  rotation_period?: RotationPeriod | null;
  starts_with?: ShiftLabel | null;
  valid_from: string;
  valid_until?: string | null;
  status?: "upcoming" | "current" | "superseded";
  can_edit?: boolean;
  can_change_end_date?: boolean;
  can_delete?: boolean;
  cannot_edit_reason?: string | null;
  cannot_delete_reason?: string | null;
  shifts?: AssistantScheduleShiftApi[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateAssistantScheduleProfilePayload {
  assistant_id: string;
  type: ScheduleProfileType;
  valid_from: string;
  valid_until?: string | null;
  rotation_period?: RotationPeriod | null;
  starts_with?: ShiftLabel | null;
  shifts: AssistantScheduleShiftApi[];
}

export interface UpdateAssistantScheduleProfilePayload {
  type?: ScheduleProfileType;
  valid_from?: string;
  valid_until?: string | null;
  rotation_period?: RotationPeriod | null;
  starts_with?: ShiftLabel | null;
  shifts?: AssistantScheduleShiftApi[];
}

export interface AssistantExceptionApi {
  id: string;
  assistant_id: string;
  type: string;
  description?: string | null;
  valid_from: string;
  valid_until?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  days?: number[] | null; // 0=Seg, 1=Ter, 2=Qua, 3=Qui, 4=Sex, 5=Sáb, 6=Dom
  lunch_enabled?: boolean;
  lunch_start?: string | null;
  lunch_end?: string | null;
  lunch_duration_minutes?: number | null;
  status?: "upcoming" | "current" | "superseded";
  can_edit?: boolean;
  can_change_end_date?: boolean;
  can_delete?: boolean;
  cannot_edit_reason?: string | null;
  cannot_delete_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAssistantExceptionPayload {
  assistant_id: string;
  type: string;
  description?: string | null;
  valid_from: string;
  valid_until?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  days?: number[] | null;
  lunch_enabled?: boolean;
  lunch_start?: string | null;
  lunch_end?: string | null;
  lunch_duration_minutes?: number | null;
}

export interface UpdateAssistantExceptionPayload {
  type?: string;
  description?: string | null;
  valid_from?: string;
  valid_until?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  days?: number[] | null;
  lunch_enabled?: boolean;
  lunch_start?: string | null;
  lunch_end?: string | null;
  lunch_duration_minutes?: number | null;
}

