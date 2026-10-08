import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import activityTypesService, {
  ActivityTypePayload,
  BackendActivityTypeResource,
} from "../../api/services/activityTypes.service";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";

export const ACTIVITY_TYPES_QUERY_KEY = ["activity-types"];

/**
 * Hook para obter a lista de tipos de atividade da escola ativa.
 * A chave TanStack Query inclui o `selectedSchoolId`, permitindo invalidação/refetch automático na troca de escola.
 */
export function useActivityTypesList() {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey("activity-types", selectedSchoolId, "list"),
    queryFn: async (): Promise<BackendActivityTypeResource[]> => {
      const result = await activityTypesService.getAll();
      if (Array.isArray(result)) return result;
      if (Array.isArray((result as any)?.data)) return (result as any).data;
      return [];
    },
    enabled: !!selectedSchoolId,
  });
}

/**
 * Hook para obter o detalhe de um tipo de atividade por ID.
 */
export function useActivityType(id?: string) {
  return useQuery({
    queryKey: [...ACTIVITY_TYPES_QUERY_KEY, "detail", id],
    queryFn: async (): Promise<BackendActivityTypeResource | null> => {
      if (!id) return null;
      const result = await activityTypesService.getById(id);
      return (result as any)?.data ?? (result as any) ?? null;
    },
    enabled: !!id,
    retry: false,
  });
}

/**
 * Hook para criar um novo tipo de atividade.
 */
export function useCreateActivityType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ActivityTypePayload) => activityTypesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVITY_TYPES_QUERY_KEY });
      notify.success("O tipo de atividade foi criado com sucesso.", "Tipo de Atividade Criado");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Não foi possível criar o tipo de atividade.";
      notify.error(message, undefined, "Erro ao Criar");
    },
  });
}

/**
 * Hook para atualizar um tipo de atividade existente.
 */
export function useUpdateActivityType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ActivityTypePayload> }) =>
      activityTypesService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ACTIVITY_TYPES_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...ACTIVITY_TYPES_QUERY_KEY, "detail", variables.id],
      });
      notify.success(
        "Os dados do tipo de atividade foram guardados com sucesso.",
        "Tipo de Atividade Atualizado"
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Não foi possível atualizar o tipo de atividade.";
      notify.error(message, undefined, "Erro ao Atualizar");
    },
  });
}

/**
 * Hook para eliminar um tipo de atividade.
 */
export function useDeleteActivityType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activityTypesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVITY_TYPES_QUERY_KEY });
      notify.success(
        "O tipo de atividade foi eliminado com sucesso.",
        "Tipo de Atividade Eliminado"
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Não foi possível eliminar o tipo de atividade.";
      notify.error(message, undefined, "Erro ao Eliminar");
    },
  });
}

