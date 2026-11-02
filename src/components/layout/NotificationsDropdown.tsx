import React, { useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Notification } from "../../types";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import ActionTooltip from "../common/ActionTooltip";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
} from "../../hooks/api/useNotifications";
import { useSchool } from "../../context/SchoolContext";
import { cn } from "../ui/utils";
import {
  NOTIF_FILTERS,
  NOTIF_STYLES,
  formatRelativeTime,
  type NotifFilterId,
} from "../notifications/notificationMeta";

const DROPDOWN_PAGE_SIZE = 15;

export default function NotificationsDropdown() {
  const navigate = useNavigate();
  const { selectedSchool, selectedSchoolId, setSchoolId } = useSchool();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotifFilterId>("all");
  const [schoolScope, setSchoolScope] = useState<"current" | "all">("current");

  const effectiveSchoolId =
    schoolScope === "current"
      ? (selectedSchoolId ? String(selectedSchoolId) : undefined)
      : "all";

  const { data, isLoading, isError } = useNotificationsList({
    type: filter,
    school_id: effectiveSchoolId,
    per_page: DROPDOWN_PAGE_SIZE,
  });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications: Notification[] = data?.items ?? [];
  const counts = data?.unreadCounts;
  const globalUnreadCounts = data?.globalUnreadCounts;
  const globalUnread = globalUnreadCounts?.all ?? counts?.all ?? 0;
  const currentSchoolUnread =
    selectedSchoolId && data?.unreadBySchool
      ? (data.unreadBySchool[String(selectedSchoolId)] ?? 0)
      : 0;

  const badge = globalUnread > 99 ? "99+" : String(globalUnread);

  function handleClick(n: Notification) {
    if (!n.read) markRead.mutate(n.id);
    if (n.schoolId && String(n.schoolId) !== String(selectedSchoolId)) {
      setSchoolId(n.schoolId);
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  }

  function handleMarkAll() {
    markAllRead.mutate(filter === "all" ? undefined : filter);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <ActionTooltip content="Notificações">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={
              globalUnread > 0
                ? `Notificações (${globalUnread} por ler)`
                : "Notificações"
            }
            className="relative w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none cursor-pointer"
          >
            <Bell size={16} />
            {globalUnread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] rounded-full bg-destructive text-destructive-foreground text-[8px] font-mono flex items-center justify-center px-0.5 ring-2 ring-card font-semibold animate-in zoom-in-50">
                {badge}
              </span>
            )}
          </button>
        </PopoverTrigger>
      </ActionTooltip>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] max-w-[calc(100vw-2rem)] p-0 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="px-3.5 py-2 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              Notificações
            </span>
            {globalUnread > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[9px] font-mono rounded-full px-1.5 py-0.2 font-bold">
                {badge}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={globalUnread === 0 || markAllRead.isPending}
            className="text-[11px] text-primary hover:text-primary/80 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
          >
            <CheckCheck size={12} />
            Marcar lidas
          </button>
        </div>

        {/* Seletor de Âmbito da Escola - Idêntico ao da página de notificações */}
        <div className="px-3 py-1.5 border-b border-border bg-muted/15 flex items-center justify-center">
          <div className="inline-flex items-center p-0.5 rounded-lg border border-border bg-muted/30 text-xs w-full">
            <button
              type="button"
              onClick={() => setSchoolScope("current")}
              className={cn(
                "flex-1 px-2.5 py-1 rounded-md transition-all font-medium flex items-center justify-center gap-1.5 cursor-pointer text-xs truncate",
                schoolScope === "current"
                  ? "bg-card text-foreground shadow-2xs font-semibold border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="truncate max-w-[120px]">{selectedSchool?.name || "Escola Atual"}</span>
              {currentSchoolUnread > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-bold shrink-0">
                  {currentSchoolUnread}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSchoolScope("all")}
              className={cn(
                "flex-1 px-2.5 py-1 rounded-md transition-all font-medium flex items-center justify-center gap-1.5 cursor-pointer text-xs truncate",
                schoolScope === "all"
                  ? "bg-card text-foreground shadow-2xs font-semibold border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="truncate">Todas as Escolas</span>
              {globalUnread > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-bold shrink-0">
                  {globalUnread}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tabs de Categoria (Pills por tipo de notificação) */}
        <div className="flex gap-1 px-3 py-1.5 border-b border-border overflow-x-auto bg-card scrollbar-none">
          {NOTIF_FILTERS.map((f) => {
            const count = counts?.[f.id] ?? 0;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                  filter === f.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className="ml-1 font-mono text-[9px] opacity-80">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[300px] divide-y divide-border/40">
          {isLoading ? (
            <div className="py-6 flex justify-center text-muted-foreground">
              <Loader2 size={16} className="animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Não foi possível carregar as notificações
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Sem notificações nesta seleção
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={cn(
                  "w-full text-left px-3.5 py-2.5 hover:bg-muted/40 transition-colors flex gap-2.5 cursor-pointer group",
                  !n.read ? "bg-primary/5" : ""
                )}
              >
                <div
                  className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    NOTIF_STYLES[n.type].iconBg
                  }`}
                >
                  <span className="scale-75 flex items-center justify-center">
                    {NOTIF_STYLES[n.type].icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-xs truncate ${
                        !n.read
                          ? "font-semibold text-foreground"
                          : "font-medium text-muted-foreground"
                      }`}
                    >
                      {n.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>

                  {n.body && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                      {n.body}
                    </p>
                  )}

                  {(schoolScope === "all" || (n.schoolId && String(n.schoolId) !== String(selectedSchoolId))) && n.schoolName && (
                    <div className="mt-1">
                      <span className="text-[9px] font-medium text-muted-foreground/80 bg-muted px-1.5 py-0.2 rounded border border-border/40 inline-block truncate max-w-[170px]">
                        {n.schoolName}
                      </span>
                    </div>
                  )}
                </div>
                {!n.read && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      NOTIF_STYLES[n.type].dot
                    }`}
                  />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-border bg-muted/15 text-center">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            className="text-[11px] text-primary hover:text-primary/80 transition-colors font-medium cursor-pointer"
          >
            Ver todas as notificações →
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
