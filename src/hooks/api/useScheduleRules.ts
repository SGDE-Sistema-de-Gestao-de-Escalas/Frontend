import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import scheduleRulesService, {
  BackendScheduleRuleResource,
  CreateScheduleRulePayload,
  UpdateScheduleRulePayload,
} from "../../api/services/scheduleRules.service";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";

export const SCHEDULE_RULES_QUERY_KEY = ["schedule-rules"];

/**
 * Hook para obter a lista de regras de horário da escola ativa.
 */
export function useScheduleRulesList() {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey("schedule-rules", selectedSchoolId, "list"),
    queryFn: async (): Promise<BackendScheduleRuleResource[]> => {
      return await scheduleRulesService.getAll();
    },
    enabled: !!selectedSchoolId,
  });
}

/**
 * Hook para criar uma nova regra de horário.
 */
export function useCreateScheduleRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScheduleRulePayload) => scheduleRulesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_RULES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      notify.success("A regra de horário foi criada com sucesso.", "Regra Criada");
    },
    onError: (error: any) => {
      const errors = error?.response?.data?.errors;
      const message =
        errors?.valid_from?.[0] ||
        errors?.valid_until?.[0] ||
        errors?.assistant_ids?.[0] ||
        errors?.period_start?.[0] ||
        errors?.period_end?.[0] ||
        error?.response?.data?.message ||
        "Não foi possível criar a regra de horário.";
      notify.error(message, "Erro ao Criar Regra");
    },
  });
}

/**
 * Hook para atualizar uma regra de horário existente.
 */
export function useUpdateScheduleRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleRulePayload }) =>
      scheduleRulesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_RULES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      notify.success("A regra de horário foi atualizada com sucesso.", "Regra Atualizada");
    },
    onError: (error: any) => {
      const errors = error?.response?.data?.errors;
      const message =
        errors?.valid_from?.[0] ||
        errors?.valid_until?.[0] ||
        errors?.assistant_ids?.[0] ||
        errors?.period_start?.[0] ||
        errors?.period_end?.[0] ||
        error?.response?.data?.message ||
        "Não foi possível atualizar a regra de horário.";
      notify.error(message, "Erro ao Atualizar Regra");
    },
  });
}

/**
 * Hook para eliminar uma regra de horário.
 */
export function useDeleteScheduleRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => scheduleRulesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_RULES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      notify.success("A regra de horário foi removida com sucesso.", "Regra Removida");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Não foi possível remover a regra de horário.";
      notify.error(message, "Erro ao Remover Regra");
    },
  });
}

