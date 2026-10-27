import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../components/common/FeedbackNotification";
import operatingHoursService from "../../api/services/operatingHours.service";
import { useSchool } from "../../context/SchoolContext";
import {
  OperatingRule,
  OperatingRuleStatus,
  CreateOperatingRulePayload,
  UpdateOperatingRulePayload,
  OperatingException,
  OperatingExceptionStatus,
  CreateOperatingExceptionPayload,
  UpdateOperatingExceptionPayload,
  OperatingCalendarDay,
} from "../../types/operatingHours.types";

export const OPERATING_RULES_QUERY_KEY = ["operating-rules"];
export const OPERATING_EXCEPTIONS_QUERY_KEY = ["operating-exceptions"];
export const OPERATING_CALENDAR_QUERY_KEY = ["operating-calendar"];

/**
 * Hook para listar regras de funcionamento (horário fixo) da escola atual
 */
export type OperatingRuleFilter =
  | OperatingRuleStatus
  | "all"
  | { status?: OperatingRuleStatus | "all" | string };

export function useOperatingRules(statusFilter?: OperatingRuleFilter) {
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;
  const rawStatus =
    typeof statusFilter === "object" && statusFilter !== null
      ? statusFilter.status
      : statusFilter;
  const normalizedStatus =
    rawStatus && rawStatus !== "all"
      ? (rawStatus as OperatingRuleStatus)
      : undefined;

  return useQuery({
    queryKey: [...OPERATING_RULES_QUERY_KEY, "list", schoolId, rawStatus ?? "all"],
    queryFn: async (): Promise<OperatingRule[]> => {
      if (!schoolId) return [];
      const res = await operatingHoursService.getRules(
        normalizedStatus ? { status: normalizedStatus } : undefined,
        schoolId
      );
      if (Array.isArray(res)) return res;
      if (Array.isArray((res as any)?.data)) return (res as any).data;
      return [];
    },
    enabled: !!schoolId,
  });
}

/**
 * Hook para obter detalhe de uma versão de horário fixo
 */
export function useOperatingRule(id?: string) {
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;

  return useQuery({
    queryKey: [...OPERATING_RULES_QUERY_KEY, "detail", schoolId, id],
    queryFn: async (): Promise<OperatingRule | null> => {
      if (!schoolId || !id) return null;
      const res = await operatingHoursService.getRuleById(id, schoolId);
      return (res as any)?.data ?? (res as any) ?? null;
    },
    enabled: !!schoolId && !!id,
  });
}

/**
 * Hook para criar uma nova versão de horário fixo
 */
export function useCreateOperatingRule() {
  const queryClient = useQueryClient();
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;

  return useMutation({
    mutationFn: (data: CreateOperatingRulePayload) => {
      if (!schoolId) throw new Error("Nenhuma escola selecionada.");
      return operatingHoursService.createRule(data, schoolId);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: OPERATING_RULES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      queryClient.invalidateQueries({ queryKey: OPERATING_CALENDAR_QUERY_KEY });
      notify.success(res?.message || "Nova versão de horário criada com sucesso.", undefined, "Horário Fixo");

    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível criar a versão do horário fixo.";
      notify.error(msg, undefined, "Erro ao Guardar");
    },
  });
}

/**
 * Hook para atualizar uma versão de horário fixo
 */
export function useUpdateOperatingRule() {
  const queryClient = useQueryClient();
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOperatingRulePayload }) => {
      if (!schoolId) throw new Error("Nenhuma escola selecionada.");
      return operatingHoursService.updateRule(id, payload, schoolId);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: OPERATING_RULES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      queryClient.invalidateQueries({ queryKey: OPERATING_CALENDAR_QUERY_KEY });
      notify.success(res?.message || "Versão de horário atualizada com sucesso.", undefined, "Horário Fixo");

    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível atualizar a versão do horário fixo.";
      notify.error(msg, undefined, "Erro ao Atualizar");
    },
  });
}

/**
 * Hook para eliminar uma versão de horário fixo
 */
export function useDeleteOperatingRule() {
  const queryClient = useQueryClient();
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;

  return useMutation({
    mutationFn: (id: string) => {
      if (!schoolId) throw new Error("Nenhuma escola selecionada.");
      return operatingHoursService.deleteRule(id, schoolId);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: OPERATING_RULES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      queryClient.invalidateQueries({ queryKey: OPERATING_CALENDAR_QUERY_KEY });
      notify.success(res?.message || "Versão eliminada com sucesso.", undefined, "Horário Fixo");

    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível eliminar a versão do horário.";
      notify.error(msg, undefined, "Erro ao Eliminar");
    },
  });
}

/**
 * Hook para listar exceções de funcionamento da escola atual
 */
export type OperatingExceptionFilter =
  | OperatingExceptionStatus
  | "all"
  | { status?: OperatingExceptionStatus | "all" | string };

export function useOperatingExceptions(statusFilter?: OperatingExceptionFilter) {
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;
  const rawStatus =
    typeof statusFilter === "object" && statusFilter !== null
      ? statusFilter.status
      : statusFilter;
  const normalizedStatus =
    rawStatus && rawStatus !== "all"
      ? (rawStatus as OperatingExceptionStatus)
      : undefined;

  return useQuery({
    queryKey: [
      ...OPERATING_EXCEPTIONS_QUERY_KEY,
      "list",
      schoolId,
      rawStatus ?? "all",
    ],
    queryFn: async (): Promise<OperatingException[]> => {
      if (!schoolId) return [];
      const res = await operatingHoursService.getExceptions(
        normalizedStatus ? { status: normalizedStatus } : undefined,
        schoolId
      );
      if (Array.isArray(res)) return res;
      if (Array.isArray((res as any)?.data)) return (res as any).data;
      return [];
    },
    enabled: !!schoolId,
  });
}

/**
 * Hook para obter detalhe de uma exceção
 */
export function useOperatingException(id?: string) {
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;

  return useQuery({
    queryKey: [...OPERATING_EXCEPTIONS_QUERY_KEY, "detail", schoolId, id],
    queryFn: async (): Promise<OperatingException | null> => {
      if (!schoolId || !id) return null;
      const res = await operatingHoursService.getExceptionById(id, schoolId);
      return (res as any)?.data ?? (res as any) ?? null;
    },
    enabled: !!schoolId && !!id,
  });
}

/**
 * Hook para criar uma nova exceção
 */
export function useCreateOperatingException() {
  const queryClient = useQueryClient();
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;

  return useMutation({
    mutationFn: (data: CreateOperatingExceptionPayload) => {
      if (!schoolId) throw new Error("Nenhuma escola selecionada.");
      return operatingHoursService.createException(data, schoolId);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: OPERATING_EXCEPTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      queryClient.invalidateQueries({ queryKey: OPERATING_CALENDAR_QUERY_KEY });
      notify.success(res?.message || "Exceção criada com sucesso.", undefined, "Exceção de Horário");

    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível registar a exceção de horário.";
      notify.error(msg, undefined, "Erro ao Criar");
    },
  });
}

/**
 * Hook para atualizar uma exceção existente
 */
export function useUpdateOperatingException() {
  const queryClient = useQueryClient();
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOperatingExceptionPayload }) => {
      if (!schoolId) throw new Error("Nenhuma escola selecionada.");
      return operatingHoursService.updateException(id, payload, schoolId);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: OPERATING_EXCEPTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      queryClient.invalidateQueries({ queryKey: OPERATING_CALENDAR_QUERY_KEY });
      notify.success(res?.message || "Exceção atualizada com sucesso.", undefined, "Exceção de Horário");

    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível atualizar a exceção.";
      notify.error(msg, undefined, "Erro ao Atualizar");
    },
  });
}

/**
 * Hook para eliminar uma exceção
 */
export function useDeleteOperatingException() {
  const queryClient = useQueryClient();
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;

  return useMutation({
    mutationFn: (id: string) => {
      if (!schoolId) throw new Error("Nenhuma escola selecionada.");
      return operatingHoursService.deleteException(id, schoolId);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: OPERATING_EXCEPTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard-bootstrap"] });
      queryClient.invalidateQueries({ queryKey: OPERATING_CALENDAR_QUERY_KEY });
      notify.success(res?.message || "Exceção eliminada com sucesso.", undefined, "Exceção Removida");

    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Não foi possível eliminar a exceção.";
      notify.error(msg, undefined, "Erro ao Eliminar");
    },
  });
}

/**
 * Hook para consultar o calendário resolvido
 */
export type OperatingCalendarParams =
  | { from?: string; to?: string; start_date?: string; end_date?: string }
  | string;

export function useOperatingCalendar(
  fromOrParams?: OperatingCalendarParams,
  toParam?: string
) {
  const { selectedSchoolId } = useSchool();
  const schoolId = selectedSchoolId ? String(selectedSchoolId) : undefined;

  let from: string | undefined;
  let to: string | undefined;

  if (typeof fromOrParams === "object" && fromOrParams !== null) {
    from = fromOrParams.from || fromOrParams.start_date;
    to = fromOrParams.to || fromOrParams.end_date;
  } else {
    from = typeof fromOrParams === "string" ? fromOrParams : undefined;
    to = toParam;
  }

  return useQuery({
    queryKey: [...OPERATING_CALENDAR_QUERY_KEY, "range", schoolId, from, to],
    queryFn: async (): Promise<OperatingCalendarDay[]> => {
      if (!schoolId || !from || !to) return [];
      const res = await operatingHoursService.getCalendar(from, to, schoolId);
      if (Array.isArray(res)) return res;
      if (Array.isArray((res as any)?.data)) return (res as any).data;
      return [];
    },
    placeholderData: keepPreviousData,
    enabled: !!schoolId && !!from && !!to,
  });
}
