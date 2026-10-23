import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import assistantSchedulesService from "../../api/services/assistantSchedules.service";
import {
  CreateAssistantScheduleProfilePayload,
  UpdateAssistantScheduleProfilePayload,
} from "../../types/assistantSchedule.types";
import { EntityId } from "../../types";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";

export const ASSISTANT_SCHEDULES_KEY = ["assistant-schedules"];

export function useAssistantSchedules(assistantId?: EntityId) {
  const { selectedSchoolId } = useSchool();
  const aid = assistantId ? String(assistantId) : "";

  return useQuery({
    queryKey: schoolScopedKey("assistant-schedules", selectedSchoolId, aid),
    queryFn: () => assistantSchedulesService.getAll(aid),
    enabled: !!selectedSchoolId && !!aid,
  });
}

export function useAllAssistantSchedules() {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey("assistant-schedules", selectedSchoolId, "all"),
    queryFn: () => assistantSchedulesService.getAll(),
    enabled: !!selectedSchoolId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAssistantSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssistantScheduleProfilePayload) =>
      assistantSchedulesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ASSISTANT_SCHEDULES_KEY,
      });
      notify.success("Horário padrão configurado com sucesso.", "Horário Guardado");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Não foi possível registar o horário.";
      notify.error(message, "Erro ao Guardar");
    },
  });
}

export function useUpdateAssistantSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string | number;
      data: UpdateAssistantScheduleProfilePayload;
      assistantId: string;
    }) => assistantSchedulesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ASSISTANT_SCHEDULES_KEY,
      });
      notify.success("Vigência do horário atualizada com sucesso.", "Horário Atualizado");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Não foi possível atualizar o horário.";
      notify.error(message, "Erro ao Atualizar");
    },
  });
}

export function useDeleteAssistantSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
    }: {
      id: string | number;
      assistantId: string;
    }) => assistantSchedulesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ASSISTANT_SCHEDULES_KEY,
      });
      notify.success("Horário eliminado com sucesso.", "Horário Eliminado");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Não foi possível eliminar o horário.";
      notify.error(message, "Erro ao Eliminar");
    },
  });
}

