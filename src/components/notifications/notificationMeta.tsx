import React from "react";
import { AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import type { NotificationType } from "../../types";

export interface NotificationStyle {
  icon: React.ReactNode;
  dot: string;
  label: string;
  iconBg: string;
}

/** Aparência de cada categoria (alinhada com o design system da plataforma). */
export const NOTIF_STYLES: Record<NotificationType, NotificationStyle> = {
  alert: {
    icon: <AlertTriangle size={15} className="text-destructive" />,
    dot: "bg-destructive",
    label: "Alerta",
    iconBg: "bg-destructive/10 dark:bg-destructive/20 border-destructive/25 text-destructive",
  },
  absence: {
    icon: <FileText size={15} className="text-amber-600 dark:text-amber-400" />,
    dot: "bg-amber-500",
    label: "Falta",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/25 text-amber-600 dark:text-amber-400",
  },
  expiry: {
    icon: <Clock size={15} className="text-purple-600 dark:text-purple-400" />,
    dot: "bg-purple-500",
    label: "Vigência",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/25 text-purple-600 dark:text-purple-400",
  },
  info: {
    icon: <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400" />,
    dot: "bg-emerald-500",
    label: "Info",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
  },
};

/** Filtros por categoria (usados no dropdown e na página). */
export const NOTIF_FILTERS = [
  { id: "all", label: "Todas" },
  { id: "alert", label: "Alertas" },
  { id: "absence", label: "Faltas" },
  { id: "expiry", label: "Vigências" },
  { id: "info", label: "Info" },
] as const;

export type NotifFilterId = (typeof NOTIF_FILTERS)[number]["id"];

/** "há 5 minutos", "há 2 dias"... */
export function formatRelativeTime(iso: string): string {
  try {
    const raw = formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: pt });
    return raw
      .replace(/aproximadamente\s+/gi, "")
      .replace(/cerca de\s+/gi, "")
      .replace(/menos de um minuto/gi, "agora")
      .replace(/^há\s+agora$/i, "agora");
  } catch {
    return "";
  }
}
