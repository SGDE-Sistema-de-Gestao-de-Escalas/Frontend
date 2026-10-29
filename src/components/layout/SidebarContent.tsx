import React from "react";
import {
  BarChart2,
  Calendar,
  ChevronRight,
  Inbox,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import logoHorizontal from "../../assets/logo-horizontal.svg";

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  group?: string;
  badge?: number;
  to?: string;
}

export const ADMIN_NAV: NavItemConfig[] = [
  { id: "dashboard", label: "Dashboard", icon: <Calendar size={16} />, group: "Diário", to: "/dashboard" },
  { id: "assistants", label: "Assistentes", icon: <Users size={16} />, group: "Diário", to: "/assistants" },
  { id: "absences", label: "Ausências", icon: <Inbox size={16} />, group: "Diário", to: "/absences" },
  { id: "reports", label: "Relatórios", icon: <BarChart2 size={16} />, group: "Análise", to: "/reports" },
  { id: "config", label: "Regras do Motor", icon: <SlidersHorizontal size={16} />, group: "Configuração", to: "/config" },
  { id: "platform-settings", label: "Definições", icon: <Settings size={16} />, group: "Configuração", to: "/platform-settings" },
];

export const STAFF_NAV: NavItemConfig[] = [
  { id: "schedule", label: "O Meu Horário", icon: <Calendar size={16} />, to: "/staff/schedule" },
  { id: "absences", label: "Ausências", icon: <Inbox size={16} />, to: "/staff/absences" },
];

export interface SidebarContentProps {
  currentPage?: string;
  onNavigate?: (pageId: string) => void;
  onCloseMobile?: () => void;
  onSwitchRole?: () => void;
  onLogout?: () => void;
}

export default function SidebarContent({
  currentPage = "dashboard",
  onNavigate,
  onCloseMobile,
  onSwitchRole,
  onLogout,
}: SidebarContentProps) {
  const { role, user } = useAuth();

  const isStaff = role === "staff";

  function handleItemClick(id: string) {
    if (onNavigate) {
      onNavigate(id);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  }

  return (
    <div className="flex flex-col h-full bg-sidebar select-none">
      {/* SGDE Brand Logo Horizontal */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-center flex-shrink-0 w-full">
        <img
          src={logoHorizontal}
          alt="SGDE - Sistema de Gestão de Escalas"
          className="h-13 w-auto max-w-[210px] object-contain mx-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-4">
        {!isStaff ? (
          ["Diário", "Análise", "Configuração"].map((group) => {
            const items = ADMIN_NAV.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="px-3 pb-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.14em]">
                  {group}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item.id)}
                        className={`group relative w-full flex items-center gap-3 pl-3 pr-2.5 py-2.5 rounded-lg text-sm transition-colors text-left ${
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                        )}
                        <span
                          className={`flex-shrink-0 ${
                            active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-primary"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="bg-destructive text-destructive-foreground text-[9px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-mono font-semibold">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-1">
            {STAFF_NAV.map((item) => {
              const active = item.id === "absences"
                ? (currentPage === "absences" || currentPage === "absence-detail")
                : currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer User Profile Card */}
      <div className="p-3 border-t border-sidebar-border flex-shrink-0 space-y-1">
        <button
          type="button"
          onClick={() => handleItemClick("account")}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors text-left ${
            currentPage === "account"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "hover:bg-sidebar-accent/60"
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-primary font-mono">
              {user.initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {user.name}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {user.roleLabel}
            </p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
        </button>

      </div>
    </div>
  );
}

