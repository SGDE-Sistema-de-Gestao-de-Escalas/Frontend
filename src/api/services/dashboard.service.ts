import apiClient from "../client";
import type { Assistant } from "../../types";
import type { BackendScheduleResource, PendingRecalculationsResponse } from "./schedules.service";
import type { BackendAbsenceResource, AbsenceCounts } from "./absences.service";
import type {
  OperatingCalendarDay,
  OperatingRule,
  OperatingException,
} from "../../types/operatingHours.types";
import type { BackendHolidayResource } from "./holidays.service";

export interface DashboardBootstrapData {
  assistants: {
    data: Assistant[];
    counts: { all: number; active: number; inactive: number };
  };
  schedules: BackendScheduleResource[];
  absences: {
    data: BackendAbsenceResource[];
    counts: AbsenceCounts;
  };
  operating_calendar: OperatingCalendarDay[];
  operating_rules: OperatingRule[];
  operating_exceptions: OperatingException[];
  schedule_rules: any[];
  activity_types: any[];
  holidays: BackendHolidayResource[];
  temporary_assignments: any[];
  pending_recalculations: PendingRecalculationsResponse;
}

export interface DashboardBootstrapParams {
  start_date: string;
  end_date: string;
  school_id?: string;
}

export const dashboardService = {
  /**
   * Obtém num único pedido HTTP todos os dados essenciais para o arranque do Dashboard
   */
  async getBootstrap(params: DashboardBootstrapParams): Promise<DashboardBootstrapData> {
    const response = await apiClient.get<{ data: DashboardBootstrapData }>("/dashboard/bootstrap", {
      params: {
        start_date: params.start_date,
        end_date: params.end_date,
        ...(params.school_id ? { school_id: params.school_id } : {}),
      },
    });

    return response.data?.data;
  },
};

export default dashboardService;

