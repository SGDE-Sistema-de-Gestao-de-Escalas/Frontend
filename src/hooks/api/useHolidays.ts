import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import holidaysService, {
  HolidayFilters,
  HolidayPayload,
  BackendHolidayResource,
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
      const msg = res?.message || "O feriado foi registado com sucesso no calendário.";
      notify.success(msg, undefined, "Feriado Criado");
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
      queryClient.invalidateQueries({
        queryKey: [...HOLIDAYS_QUERY_KEY, "detail", variables.id],
      });
      const msg = res?.message || "Os dados do feriado foram atualizados com sucesso.";
      notify.success(msg, undefined, "Feriado Atualizado");
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
      const msg = res?.message || "O feriado foi removido do calendário.";
      notify.success(msg, undefined, "Feriado Removido");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        "Não foi possível remover o feriado.";
      notify.error(message, undefined, "Erro ao Remover");
    },
  });
}

