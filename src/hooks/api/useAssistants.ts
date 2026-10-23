import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import assistantsService, {
  AssistantCounts,
  AssistantFilters,
  AssistantImportResponse,
  PaginatedAssistantsResponse,
} from "../../api/services/assistants.service";
import usersService from "../../api/services/users.service";
import { Assistant, CreateAssistantPayload, UpdateAssistantPayload, EntityId } from "../../types";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";

export const ASSISTANTS_QUERY_KEY = ["assistants"];

export interface PaginatedAssistantsData {
  items: Assistant[];
  counts: AssistantCounts;
  total: number;
  currentPage: number;
  lastPage: number;
  perPage: number;
}

/**
 * Lista paginada de assistentes com pesquisa e filtros no backend.
 */
export function useAssistantsPaginated(filters?: AssistantFilters) {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey("assistants", selectedSchoolId, "paginated", filters ?? {}),
    queryFn: async (): Promise<PaginatedAssistantsData> => {
      const result: PaginatedAssistantsResponse = await assistantsService.getAll(filters);

      const items = Array.isArray(result?.data) ? result.data : [];
      const meta = result?.meta;
      const counts: AssistantCounts = result?.counts ?? {
        all: items.length,
        active: items.filter((a) => !a.deleted_at && (a.active ?? a.is_active ?? true)).length,
        inactive: items.filter((a) => a.deleted_at || !(a.active ?? a.is_active ?? true)).length,
      };

      return {
        items,
        counts,
        total: meta?.total ?? items.length,
        currentPage: meta?.current_page ?? filters?.page ?? 1,
        lastPage: meta?.last_page ?? 1,
        perPage: meta?.per_page ?? filters?.per_page ?? 10,
      };
    },
    placeholderData: (previousData, previousQuery) => {
      // Manter dados anteriores apenas durante paginação dentro da MESMA escola
      const prevKey = previousQuery?.queryKey;
      const currentSchool = String(selectedSchoolId ?? "");
      const prevSchool = prevKey?.[2]; // ["assistants", "school", schoolId, ...]
      if (prevSchool && String(prevSchool) === currentSchool) {
        return previousData;
      }
      return undefined;
    },
    enabled: !!selectedSchoolId,
  });
}

/**
 * Lista de assistentes da escola ativa (todos os assistentes para dropdowns e selects).
 * Usa per_page = -1 para obter a coleção completa.
 */
export function useAssistantsList(filters?: AssistantFilters) {
  const { selectedSchoolId } = useSchool();

  const finalFilters: AssistantFilters = {
    per_page: -1,
    ...filters,
  };

  return useQuery({
    queryKey: schoolScopedKey("assistants", selectedSchoolId, "list", finalFilters),
    queryFn: async (): Promise<Assistant[]> => {
      const result: any = await assistantsService.getAll(finalFilters);
      if (Array.isArray(result?.data)) return result.data;
      if (Array.isArray(result)) return result;
      return [];
    },
    enabled: !!selectedSchoolId,
  });
}

export function useAssistant(id?: number | string) {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey("assistants", selectedSchoolId, "detail", id),
    queryFn: async (): Promise<Assistant | null> => {
      if (!id || !selectedSchoolId) return null;
      const result: any = await assistantsService.getById(id);
      const data =
        result?.data?.assistant ??
        result?.data?.data ??
        result?.data ??
        result?.assistant ??
        result;

      if (!data || typeof data !== "object") return null;
      if (Array.isArray(data)) return data[0] ?? null;
      return data;
    },
    enabled: !!id,
    retry: false,
  });
}

export function useCreateAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssistantPayload | FormData) => assistantsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY });
      notify.success("O assistente foi registado com sucesso.", "Assistente Criado");
    },
    onError: (error: any) => {
      const errs = error?.response?.data?.errors;
      const fileErr = errs?.criminal_record?.[0] || errs?.criminal_record_file?.[0];
      const message =
        fileErr || error?.response?.data?.message || "Não foi possível criar o assistente.";
      notify.error(message, "Erro ao Criar");
    },
  });
}

export function useUpdateAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateAssistantPayload | FormData }) =>
      assistantsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...ASSISTANTS_QUERY_KEY, "detail", variables.id],
      });
      notify.success("Os dados do assistente foram guardados.", "Assistente Atualizado");
    },
    onError: (error: any) => {
      const errs = error?.response?.data?.errors;
      const fileErr = errs?.criminal_record?.[0] || errs?.criminal_record_file?.[0];
      const message =
        fileErr || error?.response?.data?.message || "Não foi possível guardar as alterações.";
      notify.error(message, "Erro ao Atualizar");
    },
  });
}

export function useDeleteAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => assistantsService.delete(id),
    onSuccess: (_, id) => {
      queryClient.cancelQueries({ queryKey: [...ASSISTANTS_QUERY_KEY, "detail", id] });
      queryClient.removeQueries({ queryKey: [...ASSISTANTS_QUERY_KEY, "detail", id] });

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

/**
 * Mutation para importar assistentes via CSV
 */
export function useImportAssistantsCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      onDuplicate = "skip",
    }: {
      file: File;
      onDuplicate?: "skip" | "overwrite";
    }): Promise<AssistantImportResponse> => {
      return assistantsService.importCsv(file, onDuplicate);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ASSISTANTS_QUERY_KEY });
      const summary = res.summary;
      if (summary.failed === 0 && summary.created + summary.updated > 0) {
        notify.success(
          `${summary.created} assistentes criados e ${summary.updated} atualizados com sucesso.`,
          "Importação Concluída"
        );
      } else if (summary.created + summary.updated > 0) {
        notify.warning(
          `Importados ${summary.created + summary.updated} registos, mas ${summary.failed} linha(s) tiveram erros.`,
          "Importação Parcial"
        );
      } else if (summary.failed > 0) {
        notify.error(
          `Nenhum registo importado. Ocorreram erros em ${summary.failed} linha(s).`,
          "Falha na Importação"
        );
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.file?.[0] ||
        "Não foi possível processar o ficheiro CSV.";
      notify.error(message, "Erro na Importação");
    },
  });
}

/**
 * Mutation para exportar assistentes via CSV
 */
export function useExportAssistantsCsv() {
  return useMutation({
    mutationFn: (status: "active" | "inactive" | "all" = "active") => {
      return assistantsService.downloadCsv(status);
    },
    onSuccess: () => {
      notify.success("Ficheiro CSV gerado e descarregado com sucesso.", "Exportação Concluída");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Não foi possível exportar os assistentes.";
      notify.error(message, "Erro na Exportação");
    },
  });
}
