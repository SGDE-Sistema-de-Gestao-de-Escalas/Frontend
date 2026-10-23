import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import schedulesService, {
  type BackendScheduleResource,
  type GenerateSchedulePayload,
  type GenerateScheduleResponse,
  type ListSchedulesParams,
  type PublishSchedulePayload,
  type PublishScheduleResponse,
  type PendingRecalculationsResponse,
  type SaveScheduleDaysPayload,
} from "../../api/services/schedules.service";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";

export const SCHEDULES_QUERY_KEY = ["schedules"];
export const PENDING_RECALCULATIONS_QUERY_KEY = ["schedules", "pending-recalculations"];

/**
 * Hook para obter a lista de dias com escalas geradas que têm quebra de integridade/regras e requerem recálculo.
 */
export function usePendingRecalculations() {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey("schedules", selectedSchoolId, "pending-recalculations"),
    queryFn: async (): Promise<PendingRecalculationsResponse> => {
      return await schedulesService.getPendingRecalculations(selectedSchoolId ?? undefined);
    },
    enabled: !!selectedSchoolId,
    staleTime: 10000,
  });
}

/**
 * Hook para obter a lista de escalas da escola ativa num intervalo de datas.
 */
export function useSchedulesList(params?: ListSchedulesParams) {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey(
      "schedules",
      selectedSchoolId,
      params?.start_date ?? "all",
      params?.end_date ?? "all",
      params?.assistant_id ? String(params.assistant_id) : "all",
      params?.status ?? "all"
    ),
    queryFn: async (): Promise<BackendScheduleResource[]> => {
      return await schedulesService.getAll(params);
    },
    enabled: !!selectedSchoolId,
  });
}

/**
 * Hook para executar o motor de geração automática de escalas (POST /api/schedules/generate).
 */
export function useGenerateSchedules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GenerateSchedulePayload): Promise<GenerateScheduleResponse> =>
      schedulesService.generate(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      if (data.conflicts?.length > 0) {
        notify.warning(
          `Escala gerada com ${data.conflicts.length} ${
            data.conflicts.length === 1 ? "défice de cobertura" : "défices de cobertura"
          }. Revê as sugestões de transferência inter-escolar.`,
          "Cobertura Insuficiente Detetada"
        );
      } else {
        notify.success(
          `Foram gerados ${data.entries_count} blocos para ${data.schedules_count} ${
            data.schedules_count === 1 ? "escala" : "escalas"
          } sem défices obrigatórios.`,
          "Escala Recalculada com Sucesso"
        );
      }
    },
    onError: (error: any) => {
      const errors = error?.response?.data?.errors;
      const preValidationMsg = Array.isArray(errors?.pre_validation)
        ? errors.pre_validation.join(" ")
        : null;
      const message =
        preValidationMsg ||
        errors?.start_date?.[0] ||
        errors?.end_date?.[0] ||
        errors?.concurrency?.[0] ||
        error?.response?.data?.message ||
        "Não foi possível gerar a escala para o intervalo selecionado.";
      notify.error(message, "Erro ao Recalcular Escala");
    },
  });
}

/**
 * Hook para publicar as escalas em rascunho (POST /api/schedules/publish).
 */
export function usePublishSchedules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PublishSchedulePayload): Promise<PublishScheduleResponse> =>
      schedulesService.publish(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      notify.success(
        `${data.published_schedules_count} ${
          data.published_schedules_count === 1 ? "escala publicada" : "escalas publicadas"
        } e disponível para os assistentes.`,
        "Escalas Publicadas"
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        "Não foi possível publicar as escalas selecionadas.";
      notify.error(message, "Erro ao Publicar Escalas");
    },
  });
}



export function useSaveScheduleDays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveScheduleDaysPayload) => schedulesService.saveDays(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SCHEDULES_QUERY_KEY,
      });
    },
  });
}
