import { keepPreviousData, useQuery } from "@tanstack/react-query";
import reportsService, { type ReportData } from "../../api/services/reports.service";
import { useSchool } from "../../context/SchoolContext";

export const REPORTS_QUERY_KEY = ["reports"];

export function useReports(startDate?: string, endDate?: string) {
  const { selectedSchoolId } = useSchool();

  return useQuery<ReportData>({
    queryKey: [...REPORTS_QUERY_KEY, selectedSchoolId, startDate, endDate],
    queryFn: () => {
      if (!startDate || !endDate) {
        throw new Error("As datas de início e fim são obrigatórias.");
      }
      return reportsService.getReport({
        start_date: startDate,
        end_date: endDate,
        school_id: selectedSchoolId ?? undefined,
      });
    },
    enabled: Boolean(selectedSchoolId && startDate && endDate),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}
