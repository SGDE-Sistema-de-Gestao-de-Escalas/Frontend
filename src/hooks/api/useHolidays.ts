import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import holidaysService, {
  HolidayFilters,
  HolidayPayload,
  BackendHolidayResource,
  MunicipalityResource,
  HolidayPreviewItem,
  HolidayImportPayload,
  HolidayImportResult,
} from "../../api/services/holidays.service";
import type { EntityId } from "../../types";

export const HOLIDAYS_QUERY_KEY = ["holidays"];

/**
 * Hook para listar feriados com cache e refetch reativo
 */
export function useHolidaysList(filters?: HolidayFilters) {
  return useQuery({
    queryKey: [...HOLIDAYS_QUERY_KEY, "list", filters ?? {}],
    queryFn: async (): Promise<BackendHolidayResource[]> => {
      const result = await holidaysService.getAll(filters);
      if (Array.isArray(result)) return result;
      if (Array.isArray((result as any)?.data)) return (result as any).data;
      return [];
    },
  });
}

/**
 * Hook para obter a lista dos 308 concelhos portugueses
 */
export function useMunicipalities() {
  return useQuery({
    queryKey: [...HOLIDAYS_QUERY_KEY, "municipalities"],
    queryFn: async (): Promise<MunicipalityResource[]> => {
      return holidaysService.getMunicipalities();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24h
  });
}

/**
 * Hook para pré-visualizar feriados a importar para um ano e concelho
 */
export function useHolidayPreview(
  params: {
    year: number;
    municipality?: string | null;
    include_carnival?: boolean;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...HOLIDAYS_QUERY_KEY, "preview", params],
    queryFn: async (): Promise<HolidayPreviewItem[]> => {
      return holidaysService.preview(params);
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para importar feriados em lote
 */
export function useImportHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: HolidayImportPayload): Promise<HolidayImportResult> =>
      holidaysService.import(payload),
    onSuccess: (res: HolidayImportResult) => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });

      notify.success(res.message, "Importação Concluída");

      if (res.requires_recalculation) {
        notify.warning(
          "A importação de feriados afeta escalas geradas em estabelecimento(s). É necessário recalcular o horário.",
          "Recálculo Necessário"
        );
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        "Não foi possível importar os feriados.";
      notify.error(message, undefined, "Erro na Importação");
    },
  });
}

/**
 * Hook para obter um feriado específico por ID
 */
export function useHoliday(id?: EntityId) {
  return useQuery({
    queryKey: [...HOLIDAYS_QUERY_KEY, "detail", id],
    queryFn: async (): Promise<BackendHolidayResource | null> => {
      if (!id) return null;
      const result = await holidaysService.getById(id);
      return (result as any)?.data ?? (result as any) ?? null;
    },
    enabled: !!id,
    retry: false,
  });
}

/**
 * Hook para criar um novo feriado
 */
export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: HolidayPayload) => holidaysService.create(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      const msg = res?.message || "O feriado foi registado com sucesso no calendário.";
      notify.success(msg, "Feriado Criado");

      if (res?.impact?.requires_recalculation) {
        notify.warning(
          "A criação do feriado coincide com escalas geradas. É necessário recalcular o horário.",
          "Recálculo Necessário"
        );
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.errors?.date?.[0] ||
        error?.response?.data?.errors?.name?.[0] ||
        error?.response?.data?.message ||
        "Não foi possível registar o feriado.";
      notify.error(message, undefined, "Erro ao Criar");
    },
  });
}

/**
 * Hook para atualizar um feriado existente
 */
export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: EntityId; data: Partial<HolidayPayload> }) =>
      holidaysService.update(id, data),
    onSuccess: (res: any, variables) => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({
        queryKey: [...HOLIDAYS_QUERY_KEY, "detail", variables.id],
      });
      const msg = res?.message || "Os dados do feriado foram atualizados com sucesso.";
      notify.success(msg, "Feriado Atualizado");

      if (res?.impact?.requires_recalculation) {
        notify.warning(
          "A alteração ao feriado afeta escalas geradas em estabelecimento(s). É necessário recalcular o horário.",
          "Recálculo Necessário"
        );
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.errors?.date?.[0] ||
        error?.response?.data?.errors?.name?.[0] ||
        error?.response?.data?.message ||
        "Não foi possível atualizar o feriado.";
      notify.error(message, undefined, "Erro ao Atualizar");
    },
  });
}

/**
 * Hook para eliminar um feriado
 */
export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: EntityId) => holidaysService.delete(id),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      const msg = res?.message || "O feriado foi removido do calendário.";
      notify.success(msg, "Feriado Removido");

      if (res?.impact?.requires_recalculation) {
        notify.warning(
          "A eliminação do feriado afeta escalas geradas em estabelecimento(s). É necessário recalcular o horário.",
          "Recálculo Necessário"
        );
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        "Não foi possível remover o feriado.";
      notify.error(message, undefined, "Erro ao Remover");
    },
  });
}
