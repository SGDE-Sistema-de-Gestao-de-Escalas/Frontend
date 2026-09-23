import React from "react";
import {
  BarChart2,
  Calendar,
  ChevronRight,
  FileText,
  GanttChart,
  Inbox,
  Layers,
  LogOut,
  Settings,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { AdminPage, StaffPage } from "../../types";

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
  { id: "absences", label: "Ausências", icon: <Inbox size={16} />, badge: 3, group: "Diário", to: "/absences" },
  { id: "reports", label: "Relatórios", icon: <BarChart2 size={16} />, group: "Análise", to: "/reports" },
  { id: "gantt", label: "Mapa de Gantt", icon: <GanttChart size={16} />, group: "Análise", to: "/gantt" },
  { id: "config", label: "Regras do Motor", icon: <Settings size={16} />, group: "Configuração", to: "/config" },
];

export const STAFF_NAV: NavItemConfig[] = [
  { id: "schedule", label: "O Meu Horário", icon: <Calendar size={16} />, to: "/staff/schedule" },
  { id: "register-absence", label: "Justificar Falta", icon: <FileText size={16} />, to: "/staff/register-absence" },
  { id: "absence-detail", label: "As Minhas Faltas", icon: <Inbox size={16} />, to: "/staff/absences" },
  { id: "account", label: "A Minha Conta", icon: <User size={16} />, to: "/staff/account" },
];

interface SidebarContentProps {
  currentPage?: string;
  onNavigate?: (pageId: string) => void;
  onCloseMobile?: () => void;
}

export default function SidebarContent({
  currentPage = "dashboard",
  onNavigate,
  onCloseMobile,
}: SidebarContentProps) {
  const { role, user, switchRole, logout } = useAuth();

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
      {/* SGDE Brand Logo */}
      <div className="px-5 h-16 flex items-center border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary/30">
            <Layers size={18} className="text-primary-foreground" />
          </div>
          <div>
            <p
              className="text-[15px] font-bold text-foreground tracking-tight leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              SGDE
            </p>
            <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase mt-1">
              {isStaff ? "Portal Assistente" : "Gestão de Escalas"}
            </p>
          </div>
        </div>
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
              const active = currentPage === item.id;
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

        {isStaff && (
          <div className="pt-1 border-t border-sidebar-border/50 space-y-0.5">
            <button
              type="button"
              onClick={switchRole}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors text-left"
            >
              <Users size={13} />
              <span>Vista Admin</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors text-left"
            >
              <LogOut size={13} />
              <span>Terminar Sessão</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

