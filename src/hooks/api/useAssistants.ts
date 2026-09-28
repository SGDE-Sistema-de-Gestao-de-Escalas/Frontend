import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import assistantsService, { AssistantFilters } from "../../api/services/assistants.service";
import { assistants as mockAssistants } from "../../api/mockData";
import { Assistant } from "../../types";

export const ASSISTANTS_QUERY_KEY = ["assistants"];

export function useAssistantsList(filters?: AssistantFilters) {
  return useQuery({
    queryKey: [...ASSISTANTS_QUERY_KEY, filters],
    queryFn: async () => {
      try {
        const result = await assistantsService.getAll(filters);
        return result.data;
      } catch {
        // Fallback to local mock data during offline/dev transition
        let filtered = [...mockAssistants];
        if (filters?.schoolId) {
          filtered = filtered.filter((a) => a.schoolId === filters.schoolId);
        }
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
    },
  });
}

export function useAssistant(id?: number | string) {
  return useQuery({
    queryKey: [...ASSISTANTS_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const result = await assistantsService.getById(id);
        return result.data;
      } catch {
        // Fallback to local mock data
        const found = mockAssistants.find((a) => a.id === Number(id));
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
      toast.success("Assistente Criado", {
        description: "O assistente foi registado com sucesso.",
      });
    },
    onError: () => {
      toast.error("Erro ao Criar", {
        description: "Não foi possível criar o assistente.",
      });
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
        queryKey: [...ASSISTANTS_QUERY_KEY, variables.id],
      });
      toast.success("Assistente Atualizado", {
        description: "Os dados do assistente foram guardados.",
      });
    },
    onError: () => {
      toast.error("Erro ao Atualizar", {
        description: "Não foi possível guardar as alterações.",
      });
    },
  });
}

export function useDeleteAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => assistantsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY });
      toast.success("Assistente Eliminado", {
        description: "O registo do assistente foi removido.",
      });
    },
    onError: () => {
      toast.error("Erro ao Eliminar", {
        description: "Não foi possível remover o assistente.",
      });
    },
  });
}
