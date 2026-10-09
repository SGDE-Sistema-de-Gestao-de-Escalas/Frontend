import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import assistantsService, { AssistantFilters } from "../../api/services/assistants.service";
import usersService from "../../api/services/users.service";
import { Assistant, CreateAssistantPayload, UpdateAssistantPayload, EntityId } from "../../types";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";

export const ASSISTANTS_QUERY_KEY = ["assistants"];

/**
 * Lista de assistentes da escola ativa.
 * O `selectedSchoolId` faz parte da queryKey: ao trocar de escola no header
 * a key muda e a lista é pedida de novo (com o novo header X-School-ID).
 */
export function useAssistantsList(filters?: AssistantFilters) {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey("assistants", selectedSchoolId, "list", filters ?? {}),
    queryFn: async (): Promise<Assistant[]> => {
      const result = await assistantsService.getAll(filters);
      return Array.isArray(result?.data) ? result.data : [];
    },
    enabled: !!selectedSchoolId,
  });
}

export function useAssistant(id?: number | string) {
  return useQuery({
    queryKey: [...ASSISTANTS_QUERY_KEY, "detail", id],
    queryFn: async (): Promise<Assistant | null> => {
      if (!id) return null;
      const result = await assistantsService.getById(id);
      return result.data ?? null;
    },
    enabled: !!id,
    retry: false,
  });
}

export function useCreateAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssistantPayload) => assistantsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY });
      notify.success("O assistente foi registado com sucesso.", "Assistente Criado");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Não foi possível criar o assistente.";
      notify.error(message, "Erro ao Criar");
    },
  });
}

export function useUpdateAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateAssistantPayload }) =>
      assistantsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...ASSISTANTS_QUERY_KEY, "detail", variables.id],
      });
      notify.success("Os dados do assistente foram guardados.", "Assistente Atualizado");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Não foi possível guardar as alterações.";
      notify.error(message, "Erro ao Atualizar");
    },
  });
}

export function useDeleteAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => assistantsService.delete(id),
    onSuccess: (_, id) => {
      // 1. Cancelar e remover o detalhe da cache para evitar refetch automático 404
      queryClient.cancelQueries({ queryKey: [...ASSISTANTS_QUERY_KEY, "detail", id] });
      queryClient.removeQueries({ queryKey: [...ASSISTANTS_QUERY_KEY, "detail", id] });

      // 2. Invalidar apenas as listas de assistentes, excluindo o detalhe que acabou de ser eliminado
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (
            Array.isArray(key) &&
            key[0] === "assistants" &&
            key[1] === "detail" &&
            key[2] === id
          ) {
            return false;
          }
          return Array.isArray(key) && key.includes("assistants");
        },
      });
      notify.success("O registo do assistente foi removido.", "Assistente Eliminado");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Não foi possível remover o assistente.";
      notify.error(message, "Erro ao Eliminar");
    },
  });
}

export function useToggleAssistantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      assistantId,
      activate,
    }: {
      userId: EntityId;
      assistantId: EntityId;
      activate: boolean;
    }) => {
      if (activate) {
        return await usersService.update(userId, { is_active: true });
      } else {
        return await usersService.deactivate(userId);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...ASSISTANTS_QUERY_KEY, "detail", variables.assistantId],
      });
      if (variables.activate) {
        notify.success("O assistente foi reativado com sucesso.", "Assistente Ativo");
      } else {
        notify.success("O assistente foi inativado com sucesso.", "Assistente Inativo");
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Não foi possível alterar o estado do assistente.";
      notify.error(message, "Erro ao alterar estado");
    },
  });
}

export function useAnonymizeAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      assistantId,
    }: {
      userId: EntityId;
      assistantId: EntityId;
    }) => {
      return await usersService.delete(userId);
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...ASSISTANTS_QUERY_KEY, "detail", variables.assistantId],
      });
      notify.success(
        res?.message || "Os dados pessoais do assistente foram anonimizados.",
        "Dados Anonimizados"
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        "Não foi possível anonimizar os dados do assistente.";
      notify.error(message, "Erro ao Anonimizar");
    },
  });
}



