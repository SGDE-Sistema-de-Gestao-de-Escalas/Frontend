import { useQuery, useQueryClient } from "@tanstack/react-query";
import dashboardService, { DashboardBootstrapData } from "../../api/services/dashboard.service";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";
import { OPERATING_CALENDAR_QUERY_KEY, OPERATING_RULES_QUERY_KEY, OPERATING_EXCEPTIONS_QUERY_KEY } from "./useOperatingHours";
import { HOLIDAYS_QUERY_KEY } from "./useHolidays";
import { ASSISTANT_TEMPORARY_ASSIGNMENTS_KEY } from "./useAssistantTemporaryAssignments";

export const DASHBOARD_BOOTSTRAP_KEY = "dashboard-bootstrap";

/**
 * Hook para carregar num único pedido HTTP ultra-rápido todo o estado inicial do Dashboard.
 * Alimenta a cache do TanStack Query para todos os 11 hooks individuais em simultâneo.
 */
export function useDashboardBootstrap(startDate: string, endDate: string) {
  const queryClient = useQueryClient();
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;

  return useQuery({
    queryKey: schoolScopedKey(DASHBOARD_BOOTSTRAP_KEY, selectedSchoolId, startDate, endDate),
    queryFn: async (): Promise<DashboardBootstrapData> => {
      const data = await dashboardService.getBootstrap({
        start_date: startDate,
        end_date: endDate,
        school_id: schoolId,
      });

      // Hidratação atómica de todas as queries individuais na cache
      if (data && schoolId) {
        // 1. Assistentes
        queryClient.setQueryData(
          schoolScopedKey("assistants", selectedSchoolId, "list", { per_page: -1 }),
          data.assistants.data
        );

        // 2. Escalas
        queryClient.setQueryData(
          schoolScopedKey("schedules", selectedSchoolId, startDate, endDate, "all", "all"),
          data.schedules
        );

        // 3. Ausências
        queryClient.setQueryData(
          schoolScopedKey("absences", selectedSchoolId, { start_date: startDate, end_date: endDate, per_page: 200 }),
          data.absences
        );

        // 4. Calendário de Funcionamento
        queryClient.setQueryData(
          [...OPERATING_CALENDAR_QUERY_KEY, "range", schoolId, startDate, endDate],
          data.operating_calendar
        );

        // 5. Regras de Horário e Exceções
        queryClient.setQueryData(
          [...OPERATING_RULES_QUERY_KEY, "list", schoolId, "all"],
          data.operating_rules
        );
        queryClient.setQueryData(
          [...OPERATING_EXCEPTIONS_QUERY_KEY, "list", schoolId, "all"],
          data.operating_exceptions
        );

        // 6. Regras de Escala e Tipos de Atividade
        queryClient.setQueryData(
          schoolScopedKey("schedule-rules", selectedSchoolId, "list"),
          data.schedule_rules
        );
        queryClient.setQueryData(
          schoolScopedKey("activity-types", selectedSchoolId, "list"),
          data.activity_types
        );

        // 7. Feriados
        queryClient.setQueryData(
          [...HOLIDAYS_QUERY_KEY, "list", {}],
          data.holidays
        );

        // 8. Transferências Temporárias
        queryClient.setQueryData(
          schoolScopedKey(ASSISTANT_TEMPORARY_ASSIGNMENTS_KEY, selectedSchoolId, { start_date: startDate, end_date: endDate }),
          data.temporary_assignments
        );

        // 9. Recálculos Pendentes
        queryClient.setQueryData(
          schoolScopedKey("schedules", selectedSchoolId, "pending-recalculations"),
          data.pending_recalculations
        );
      }

      return data;
    },
    enabled: !!selectedSchoolId && !!startDate && !!endDate,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000, // 5 minutos de retenção em cache
    refetchInterval: 60_000, // Heartbeat de 1 minuto
    refetchIntervalInBackground: false,
  });
}

