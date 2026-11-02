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

/** Aparência de cada categoria (alinhada com o design existente do sino). */
export const NOTIF_STYLES: Record<NotificationType, NotificationStyle> = {
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
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: pt });
  } catch {
    return "";
  }
}
