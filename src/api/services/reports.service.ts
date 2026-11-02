import apiClient from "../client";

export interface ReportSummary {
  coverage_rate: number | null;
  required_minutes: number;
  covered_minutes: number;
  uncovered_minutes: number;
  absence_minutes: number;
  affected_assistants: number;
  assistants_with_exceptions: number;
  open_days_without_published_schedule: number;
  absence_records_without_profile: number;
  total_gaps_count: number;
  total_absences_count: number;
  pending_absences_count: number;
  approved_absences_count: number;
  total_assigned_minutes: number;
  total_expected_minutes: number;
  active_assistants_count: number;
}

export interface ReportDailyCoverage {
  date: string;
  day_of_week: number;
  is_open: boolean;
  status: "covered" | "partial" | "gap" | "no_published_schedule" | "closed";
  required_minutes: number;
  covered_minutes: number;
  uncovered_minutes: number;
  coverage_rate: number | null;
}

export interface ReportCoverageGap {
  date: string;
  schedule_rule_id: string | number;
  activity_type_id: string | number;
  activity_name: string;
  start_time: string;
  end_time: string;
  required_assistants: number;
  assigned_assistants: number;
  missing_assistants: number;
  uncovered_minutes: number;
}

export interface ReportAbsenceByType {
  absence_type_id: string | number;
  name: string;
  absence_minutes: number;
}

export interface ReportWorkloadByAssistant {
  assistant_id: string | number;
  assistant_name: string;
  expected_minutes: number;
  assigned_minutes: number;
  absence_minutes: number;
}

export interface ReportAbsenceRow {
  id: string | number;
  assistant_id: string | number;
  assistant_name: string;
  absence_type_id: string | number;
  absence_type: string;
  start_date: string;
  end_date: string;
  status: string;
  absence_minutes: number;
  affected_workdays: number;
  has_estimated_lunch: boolean;
  days_without_profile: number;
}

export interface ReportData {
  school: { id: string | number; name: string };
  period: { start_date: string; end_date: string };
  summary: ReportSummary;
  daily_coverage: ReportDailyCoverage[];
  absences_by_type: ReportAbsenceByType[];
  workload_by_assistant: ReportWorkloadByAssistant[];
  coverage_gaps: ReportCoverageGap[];
  absences: ReportAbsenceRow[];
  methodology?: Record<string, string>;
}

export interface ReportParams {
  start_date: string;
  end_date: string;
  school_id?: string | number;
}

const reportsService = {
  async getReport(params: ReportParams): Promise<ReportData> {
    const response = await apiClient.get<{ data: ReportData }>("/reports", {
      params: {
        start_date: params.start_date,
        end_date: params.end_date,
      },
      headers: params.school_id ? { "X-School-ID": String(params.school_id) } : undefined,
    });
    return response.data.data;
  },
};

export default reportsService;

