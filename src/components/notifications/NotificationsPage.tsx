import React, { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Notification } from "../../types";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
} from "../../hooks/api/useNotifications";
import {
  NOTIF_FILTERS,
  NOTIF_STYLES,
  formatRelativeTime,
  type NotifFilterId,
} from "./notificationMeta";

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NotifFilterId>("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [page, setPage] = useState(1);

  // Voltar à primeira página sempre que os filtros mudam.
  useEffect(() => setPage(1), [filter, onlyUnread]);

  const { data, isLoading, isError, isFetching } = useNotificationsList({
    type: filter,
    unread: onlyUnread,
    page,
    per_page: PAGE_SIZE,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  const items: Notification[] = data?.items ?? [];
  const counts = data?.unreadCounts;
  const meta = data?.meta;

  function open(n: Notification) {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Bell size={20} /> Notificações
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Alertas e avisos do sistema para a escola selecionada.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            markAllRead.mutate(filter === "all" ? undefined : filter)
          }
          disabled={(counts?.all ?? 0) === 0 || markAllRead.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCheck size={15} />
          {filter === "all"
            ? "Marcar todas como lidas"
            : "Marcar esta categoria como lida"}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {NOTIF_FILTERS.map((f) => {
            const count = counts?.[f.id] ?? 0;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === f.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f.label}
                {count > 0 && (
                  <span className="ml-1.5 font-mono text-xs opacity-80">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={(e) => setOnlyUnread(e.target.checked)}
            className="accent-[var(--primary,#4f46e5)]"
          />
          Só por ler
        </label>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Não foi possível carregar as notificações.
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {onlyUnread ? "Não tem notificações por ler." : "Sem notificações."}
          </div>
        ) : (
          <ul
            className={`divide-y divide-border/60 ${
              isFetching ? "opacity-70" : ""
            }`}
          >
            {items.map((n) => {
              const style = NOTIF_STYLES[n.type];
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3.5 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div
                    className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${style.iconBg}`}
                  >
                    {style.icon}
                  </div>

                  <button
                    type="button"
                    onClick={() => open(n)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm ${
                          !n.read
                            ? "font-semibold text-foreground"
                            : "font-medium text-muted-foreground"
                        }`}
                      >
                        {n.title}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        {style.label}
                      </span>
                      {!n.read && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${style.dot}`}
                        />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {n.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/80 mt-1 font-mono">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </button>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.read && (
                      <button
                        type="button"
                        title="Marcar como lida"
                        aria-label="Marcar como lida"
                        onClick={() => markRead.mutate(n.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <CheckCheck size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Eliminar"
                      aria-label="Eliminar notificação"
                      onClick={() => remove.mutate(n.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Paginação */}
      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {meta.currentPage} de {meta.lastPage} · {meta.total}{" "}
            notificações
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
              disabled={page >= meta.lastPage}
              className="p-2 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página seguinte"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
