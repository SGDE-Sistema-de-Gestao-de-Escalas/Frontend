import React from "react";
import {
  BarChart2,
  Calendar,
  FileText,
  Inbox,
  Menu,
  Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface MobileBottomNavProps {
  currentPage: string;
  onNavigate: (pageId: string) => void;
  onOpenMobileMenu: () => void;
}

export default function MobileBottomNav({
  currentPage,
  onNavigate,
  onOpenMobileMenu,
}: MobileBottomNavProps) {
  const { role } = useAuth();
  const isStaff = role === "staff";

  const adminItems = [
    { id: "dashboard", label: "Dashboard", icon: <Calendar size={18} /> },
    { id: "assistants", label: "Assistentes", icon: <Users size={18} /> },
    { id: "absences", label: "Ausências", icon: <Inbox size={18} />, badge: 3 },
    { id: "reports", label: "Relatórios", icon: <BarChart2 size={18} /> },
  ];

  const staffItems = [
    { id: "schedule", label: "Horário", icon: <Calendar size={18} /> },
    { id: "register-absence", label: "Justificar", icon: <FileText size={18} /> },
    { id: "absence-detail", label: "Faltas", icon: <Inbox size={18} /> },
  ];

  const items = isStaff ? staffItems : adminItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex items-center shadow-lg">
      {items.map((item) => {
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative ${
              isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="relative">
              {item.icon}
              {item.badge && (
                <span className="absolute -top-1 -right-1.5 bg-destructive text-destructive-foreground text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-mono font-bold">
                  {item.badge}
                </span>
              )}
            </span>
            <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors text-muted-foreground hover:text-foreground"
      >
        <Menu size={18} />
        <span className="text-[9px] font-medium">Menu</span>
      </button>
    </nav>
  );
}

