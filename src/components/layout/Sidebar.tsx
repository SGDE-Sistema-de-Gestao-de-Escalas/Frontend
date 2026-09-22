import { Calendar, ClipboardList, Home, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/schedules", label: "Escalas", icon: Calendar },
  { to: "/assistants", label: "Assistentes", icon: Users },
  { to: "/absences", label: "Ausências", icon: ClipboardList },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-60 flex-shrink-0 border-r border-border bg-card md:block">
      <div className="border-b border-border px-5 py-4">
        <p className="text-lg font-semibold text-foreground">SGDE</p>
        <p className="text-xs text-muted-foreground">Gestão de Escalas</p>
      </div>
      <nav className="space-y-1 p-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
