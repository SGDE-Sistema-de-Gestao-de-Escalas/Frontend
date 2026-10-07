import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import assistantsService, { AssistantFilters } from "../../api/services/assistants.service";
import { assistants as mockAssistants } from "../../api/mockData";
import { Assistant } from "../../types";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";

export const ASSISTANTS_QUERY_KEY = ["assistants"];

function mockFallback(schoolId: number | string, filters?: AssistantFilters) {
  // Fallback local enquanto o endpoint do backend não está implementado.
  let filtered = mockAssistants.filter((a) => String(a.schoolId) === String(schoolId));
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.name.toLowerCase().includes(s) ||
        a.mecanografico?.toLowerCase().includes(s) ||
        a.initials.toLowerCase().includes(s)
    );
  }
  return filtered;
}

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
      try {
        const result = await assistantsService.getAll(filters);
        // Se o backend ainda não devolve uma coleção (endpoint vazio), usa o fallback.
        if (Array.isArray(result?.data)) return result.data;
        return mockFallback(selectedSchoolId, filters);
      } catch {
        return mockFallback(selectedSchoolId, filters);
      }
    },
  });
}

export function useAssistant(id?: number | string) {
  return useQuery({
    queryKey: [...ASSISTANTS_QUERY_KEY, "detail", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const result = await assistantsService.getById(id);
        return result.data;
      } catch {
        // Fallback to local mock data
        const found = mockAssistants.find((a) => String(a.id) === String(id));
        return found || mockAssistants[0] || null;
      }
    },
    enabled: !!id,
  });
}

export function useCreateAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Assistant>) => assistantsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY });
      notify.success("O assistente foi registado com sucesso.", "Assistente Criado");
    },
    onError: () => {
      notify.error("Não foi possível criar o assistente.", "Erro ao Criar");
    },
  });
}

export function useUpdateAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<Assistant> }) =>
      assistantsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...ASSISTANTS_QUERY_KEY, "detail", variables.id],
      });
      notify.success("Os dados do assistente foram guardados.", "Assistente Atualizado");
    },
    onError: () => {
      notify.error("Não foi possível guardar as alterações.", "Erro ao Atualizar");
    },
  });
}

export function useDeleteAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => assistantsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY });
      notify.success("O registo do assistente foi removido.", "Assistente Eliminado");
    },
    onError: () => {
      notify.error("Não foi possível remover o assistente.", "Erro ao Eliminar");
    },
  });
}
