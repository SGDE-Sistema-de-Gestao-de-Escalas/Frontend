import React, { useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react";
import { INITIAL_NOTIFICATIONS } from "../../api/mockData";
import type { Notification, NotifType } from "../../types";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const NOTIF_STYLES: Record<
  NotifType,
  { icon: React.ReactNode; dot: string; label: string; iconBg: string }
> = {
  alert: {
    icon: <AlertTriangle size={13} className="text-destructive" />,
    dot: "bg-destructive",
    label: "Alerta",
    iconBg: "bg-destructive/10",
  },
  absence: {
    icon: <FileText size={13} className="text-[#D97706]" />,
    dot: "bg-[#D97706]",
    label: "Falta",
    iconBg: "bg-[#D97706]/10",
  },
  expiry: {
    icon: <Clock size={13} className="text-[#7C3AED]" />,
    dot: "bg-[#7C3AED]",
    label: "Vigência",
    iconBg: "bg-[#7C3AED]/10",
  },
  info: {
    icon: <CheckCircle size={13} className="text-[#0E7C59]" />,
    dot: "bg-[#0E7C59]",
    label: "Info",
    iconBg: "bg-[#0E7C59]/10",
  },
};

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<NotifType | "all">("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered =
    filter === "all"
      ? notifications
      : notifications.filter((n) => n.type === filter);

  function markRead(id: number) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Notificações"
          aria-label="Notificações"
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[15px] h-[15px] rounded-full bg-destructive text-destructive-foreground text-[8px] font-mono flex items-center justify-center px-0.5 ring-2 ring-card font-semibold animate-in zoom-in-50">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 p-0 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-foreground" />
            <span className="text-sm font-semibold text-foreground">
              Notificações
            </span>
            {unreadCount > 0 && (
              <span className="bg-destructive text-destructive-foreground text-[9px] font-mono rounded-full px-1.5 py-0.5 font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Marcar todas lidas
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto bg-muted/10">
          {(
            [
              { id: "all", label: "Todas" },
              { id: "alert", label: "Alertas" },
              { id: "absence", label: "Faltas" },
              { id: "expiry", label: "Vigências" },
              { id: "info", label: "Info" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filter === f.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[400px] divide-y divide-border/50">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Sem notificações
            </div>
          ) : (
            filtered.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => markRead(n.id)}
                className={`w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex gap-3 ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                <div
                  className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    NOTIF_STYLES[n.type].iconBg
                  }`}
                >
                  {NOTIF_STYLES[n.type].icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs ${
                        !n.read
                          ? "font-semibold text-foreground"
                          : "font-medium text-muted-foreground"
                      }`}
                    >
                      {n.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                      {n.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {n.body}
                  </p>
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
        <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-center">
          <button
            type="button"
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Ver todas as notificações
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

