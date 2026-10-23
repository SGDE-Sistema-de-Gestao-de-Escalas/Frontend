import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import absencesService, {
  BackendAbsenceResource,
  CreateAbsencePayload,
  UpdateAbsencePayload,
  AbsenceFilterParams,
  PaginatedAbsencesResult,
  AbsenceCounts,
} from "../../api/services/absences.service";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";

export const ABSENCES_QUERY_KEY = ["absences"];

/**
 * Hook para obter a lista paginada e filtrada de ausências
 */
export function useAbsencesList(filters?: AbsenceFilterParams) {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey("absences", selectedSchoolId, filters || {}),
    queryFn: async (): Promise<PaginatedAbsencesResult> => {
      return await absencesService.getAll(filters);
    },
    enabled: !!selectedSchoolId,
  });
}

/**
 * Hook para obter contadores globais por estado (Todas, Pendentes, Justificadas, Injustificadas)
 * Independentes da página atual
 */
export function useAbsenceCounts(filters?: Omit<AbsenceFilterParams, "page" | "per_page" | "status">) {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey("absences", selectedSchoolId, {
      ...(filters?.assistant_id ? { assistant_id: filters.assistant_id } : {}),
      ...(filters?.start_date ? { start_date: filters.start_date } : {}),
      ...(filters?.end_date ? { end_date: filters.end_date } : {}),
      _type: "counts",
    }),
    queryFn: async (): Promise<AbsenceCounts> => {
      return await absencesService.getCounts(filters);
    },
    enabled: !!selectedSchoolId,
    staleTime: 30000,
  });
}

/**
 * Hook para criar uma nova ausência
 */
export function useCreateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAbsencePayload) => absencesService.create(data),
    onSuccess: (data: BackendAbsenceResource) => {
      queryClient.invalidateQueries({ queryKey: ABSENCES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      if (data?.impact?.requires_recalculation) {
        notify.warning(
          `Esta ausência afeta a escala gerada em ${data.impact.affected_dates.length} dia(s). É necessário recalcular o horário.`,
          "Recálculo de Escala Necessário"
        );
      } else {
        notify.success("A ausência foi registada com sucesso.", "Ausência Registada");
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.errors?.general?.[0] ||
        error?.response?.data?.message ||
        "Não foi possível registar a ausência.";
      notify.error(message, "Erro ao Registar Ausência");
    },
  });
}

/**
 * Hook para atualizar uma ausência
 */
export function useUpdateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdateAbsencePayload }) =>
      absencesService.update(id, data),
    onSuccess: (data: BackendAbsenceResource) => {
      queryClient.invalidateQueries({ queryKey: ABSENCES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      if (data?.impact?.requires_recalculation) {
        notify.warning(
          `Esta ausência afeta a escala gerada em ${data.impact.affected_dates.length} dia(s). É necessário recalcular o horário.`,
          "Recálculo de Escala Necessário"
        );
      } else {
        notify.success("A ausência foi atualizada com sucesso.", "Ausência Atualizada");
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Não foi possível atualizar a ausência.";
      notify.error(message, "Erro ao Atualizar");
    },
  });
}

/**
 * Hook para alterar o estado da ausência (justificar / injustificar)
 */
export function useUpdateAbsenceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string | number;
      status: "justified" | "unjustified" | "pending" | "justificada" | "injustificada";
      notes?: string;
    }) => absencesService.updateStatus(id, status, notes),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ABSENCES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      const isJustified =
        variables.status === "justified" || variables.status === "justificada";
      notify.success(
        isJustified
          ? "A ausência foi marcada como justificada."
          : "A ausência foi marcada como injustificada.",
        isJustified ? "Ausência Justificada" : "Ausência Injustificada"
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Não foi possível atualizar o estado da ausência.";
      notify.error(message, "Erro ao Alterar Estado");
    },
  });
}

/**
 * Hook para anexar documento comprovativo e/ou notas à ausência
 * Utilizado por administradores ou pelo próprio assistente quando a falta está pendente
 */
export function useUploadAbsenceDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      file,
      justification,
      notes,
    }: {
      id: string | number;
      file?: File | null;
      justification?: string;
      notes?: string;
    }) => absencesService.uploadAbsenceDocument(id, file, justification, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ABSENCES_QUERY_KEY });
      notify.success("Documento comprovativo anexado com sucesso.", "Comprovativo Anexado");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.errors?.document?.[0] ||
        error?.response?.data?.errors?.absence?.[0] ||
        error?.response?.data?.message ||
        "Não foi possível anexar o documento comprovativo.";
      notify.error(message, "Erro ao Anexar Documento");
    },
  });
}

/**
 * Hook para eliminar uma ausência
 */
export function useDeleteAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => absencesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ABSENCES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      notify.success("A ausência foi eliminada com sucesso.", "Ausência Eliminada");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Não foi possível eliminar a ausência.";
      notify.error(message, "Erro ao Eliminar");
    },
  });
}

