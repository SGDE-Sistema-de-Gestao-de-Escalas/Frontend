import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import assistantExceptionsService from "../../api/services/assistantExceptions.service";
import {
  CreateAssistantExceptionPayload,
  UpdateAssistantExceptionPayload,
} from "../../types/assistantSchedule.types";
import { EntityId } from "../../types";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";

export const ASSISTANT_EXCEPTIONS_KEY = ["assistant-exceptions"];

export function useAssistantExceptions(assistantId?: EntityId) {
  const { selectedSchoolId } = useSchool();
  const aid = assistantId ? String(assistantId) : "";

  return useQuery({
    queryKey: schoolScopedKey("assistant-exceptions", selectedSchoolId, aid),
    queryFn: () => assistantExceptionsService.getAll(aid),
    enabled: !!selectedSchoolId && !!aid,
  });
}

export function useAllAssistantExceptions() {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey("assistant-exceptions", selectedSchoolId, "all"),
    queryFn: () => assistantExceptionsService.getAll(),
    enabled: !!selectedSchoolId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAssistantException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssistantExceptionPayload) =>
      assistantExceptionsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ASSISTANT_EXCEPTIONS_KEY,
      });
      notify.success("Regra de exceção registada com sucesso.", "Exceção Criada");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Não foi possível registar a regra de exceção.";
      notify.error(message, "Erro ao Criar");
    },
  });
}

export function useUpdateAssistantException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string | number;
      data: UpdateAssistantExceptionPayload;
      assistantId: string;
    }) => assistantExceptionsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ASSISTANT_EXCEPTIONS_KEY,
      });
      notify.success("Regra de exceção atualizada com sucesso.", "Exceção Atualizada");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Não foi possível atualizar a regra de exceção.";
      notify.error(message, "Erro ao Atualizar");
    },
  });
}

export function useDeleteAssistantException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
    }: {
      id: string | number;
      assistantId: string;
    }) => assistantExceptionsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ASSISTANT_EXCEPTIONS_KEY,
      });
      notify.success("Regra de exceção eliminada com sucesso.", "Exceção Eliminada");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Não foi possível eliminar a regra de exceção.";
      notify.error(message, "Erro ao Eliminar");
    },
  });
}

