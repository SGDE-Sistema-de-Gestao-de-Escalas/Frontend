export type DayOfWeekNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface OperatingRuleDay {
  day_of_week: DayOfWeekNumber;
  opening_time: string; // "HH:MM"
  closing_time: string; // "HH:MM"
  lunch_start: string; // "HH:MM"
  lunch_end: string; // "HH:MM"
  lunch_duration_minutes: number;
}

export type OperatingRuleStatus = "upcoming" | "current" | "superseded";

export interface OperatingRule {
  id: string;
  school_id: string;
  valid_from: string; // "YYYY-MM-DD"
  valid_until?: string | null; // "YYYY-MM-DD" (calculado pelo backend)
  days: OperatingRuleDay[];
  status: OperatingRuleStatus;
  status_message: string;
  can_edit: boolean;
  can_delete: boolean;
  cannot_delete_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOperatingRulePayload {
  valid_from: string;
  days: OperatingRuleDay[];
}

export interface UpdateOperatingRulePayload {
  valid_from?: string;
  days: OperatingRuleDay[];
}

export type OperatingExceptionStatus = "upcoming" | "active" | "ended";

export interface OperatingException {
  id: string;
  school_id: string;
  name: string;
  is_closed: boolean;
  valid_from: string; // "YYYY-MM-DD"
  valid_until: string; // "YYYY-MM-DD"
  opening_time?: string | null;
  closing_time?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  lunch_duration_minutes?: number | null;
  status: OperatingExceptionStatus;
  status_message: string;
  can_edit_all: boolean;
  can_change_end_date: boolean;
  can_delete: boolean;
  cannot_delete_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOperatingExceptionPayload {
  name: string;
  is_closed: boolean;
  valid_from: string;
  valid_until: string;
  opening_time?: string | null;
  closing_time?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  lunch_duration_minutes?: number | null;
}

export interface UpdateOperatingExceptionPayload {
  name?: string;
  is_closed?: boolean;
  valid_from?: string;
  valid_until: string;
  opening_time?: string | null;
  closing_time?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  lunch_duration_minutes?: number | null;
}

export type CalendarDaySource = "holiday" | "exception" | "fixed" | "none";

export interface OperatingCalendarDay {
  date: string; // "YYYY-MM-DD"
  day_of_week: DayOfWeekNumber;
  is_open: boolean;
  source: CalendarDaySource;
  reason?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  lunch_duration_minutes?: number | null;
}

