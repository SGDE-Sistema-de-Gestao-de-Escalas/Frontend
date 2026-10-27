import SidebarContent from "./SidebarContent";

interface SidebarProps {
  currentPage?: string;
  onNavigate?: (pageId: string) => void;
  className?: string;
  onSwitchRole?: () => void;
  onLogout?: () => void;
}

export default function Sidebar({
  currentPage = "dashboard",
  onNavigate,
  className = "",
  onSwitchRole,
  onLogout,
}: SidebarProps) {
  return (
    <aside
      className={`hidden lg:flex w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col h-full ${className}`}
    >
      <SidebarContent
        currentPage={currentPage}
        onNavigate={onNavigate}
        onSwitchRole={onSwitchRole}
        onLogout={onLogout}
      />
    </aside>
  );
}
