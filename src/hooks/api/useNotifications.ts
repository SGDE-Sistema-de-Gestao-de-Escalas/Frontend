import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import notificationsService, {
  NotificationFilterParams,
  PaginatedNotificationsResult,
} from "../../api/services/notifications.service";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";
import type { NotificationType } from "../../types";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"];

/** Intervalo de atualização automática (o sino mantém-se atualizado sem F5). */
const POLL_INTERVAL_MS = 60_000;

/**
 * Lista paginada de notificações do utilizador (escola ativa + globais).
 * Devolve também `unreadCounts` por categoria para os badges/filtros.
 */
export function useNotificationsList(filters: NotificationFilterParams = {}) {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey("notifications", selectedSchoolId, filters),
    queryFn: (): Promise<PaginatedNotificationsResult> =>
      notificationsService.getAll(filters),
    enabled: !!selectedSchoolId,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (type?: NotificationType) =>
      notificationsService.markAllAsRead(type),
    onSuccess: invalidate,
  });
}

export function useDeleteNotification() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => notificationsService.remove(id),
    onSuccess: invalidate,
  });
}
