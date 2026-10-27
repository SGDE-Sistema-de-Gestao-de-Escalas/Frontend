import apiClient from "../client";
import type { PaginationMeta } from "../types/api.types";
import type {
  Notification,
  NotificationType,
  NotificationUnreadCounts,
} from "../../types";

/** Formato devolvido pelo backend (NotificationResource). */
export interface BackendNotificationResource {
  id: string;
  type: NotificationType;
  event: string | null;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  link: string | null;
  school_id: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationFilterParams {
  type?: NotificationType | "all";
  /** true = só não lidas */
  unread?: boolean;
  page?: number;
  per_page?: number;
}

export interface PaginatedNotificationsResult {
  items: Notification[];
  meta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
  unreadCounts: NotificationUnreadCounts;
}

const EMPTY_COUNTS: NotificationUnreadCounts = {
  all: 0,
  alert: 0,
  absence: 0,
  expiry: 0,
  info: 0,
};

export function mapNotification(n: BackendNotificationResource): Notification {
  return {
    id: n.id,
    type: n.type,
    event: n.event ?? null,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
    schoolId: n.school_id ?? null,
    read: !!n.read,
    readAt: n.read_at ?? null,
    createdAt: n.created_at,
    data: n.data ?? null,
  };
}

export const notificationsService = {
  /**
   * GET /api/notifications
   * Lista paginada das notificações do utilizador autenticado (escola ativa + globais).
   */
  async getAll(
    filters: NotificationFilterParams = {}
  ): Promise<PaginatedNotificationsResult> {
    const params: Record<string, unknown> = {};
    if (filters.type && filters.type !== "all") params.type = filters.type;
    if (filters.unread) params.unread = 1;
    if (filters.page) params.page = filters.page;
    if (filters.per_page) params.per_page = filters.per_page;

    const { data } = await apiClient.get<{
      data: BackendNotificationResource[];
      meta?: Partial<PaginationMeta> & {
        unread_counts?: Partial<NotificationUnreadCounts>;
      };
    }>("/notifications", { params });

    const meta = data.meta ?? {};
    return {
      items: (data.data ?? []).map(mapNotification),
      meta: {
        currentPage: meta.current_page ?? 1,
        lastPage: meta.last_page ?? 1,
        perPage: meta.per_page ?? (data.data ?? []).length,
        total: meta.total ?? (data.data ?? []).length,
      },
      unreadCounts: { ...EMPTY_COUNTS, ...(meta.unread_counts ?? {}) },
    };
  },

  /** PATCH /api/notifications/{id}/read */
  async markAsRead(id: string): Promise<Notification> {
    const { data } = await apiClient.patch<
      BackendNotificationResource | { data: BackendNotificationResource }
    >(`/notifications/${id}/read`);
    // O recurso tem um campo próprio `data` (payload), por isso distinguimos pelo `id`.
    const resource = "id" in data ? data : data.data;
    return mapNotification(resource);
  },

  /** POST /api/notifications/read-all  (opcionalmente só de uma categoria) */
  async markAllAsRead(type?: NotificationType): Promise<number> {
    const { data } = await apiClient.post<{ updated: number }>(
      "/notifications/read-all",
      type ? { type } : {}
    );
    return data.updated ?? 0;
  },

  /** DELETE /api/notifications/{id} */
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },
};

export default notificationsService;
