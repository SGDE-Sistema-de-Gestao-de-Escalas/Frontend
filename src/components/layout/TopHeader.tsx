import React from "react";
import {
  ChevronRight,
  Home,
  Languages,
  Maximize2,
  Menu,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import AvatarMenu from "./AvatarMenu";
import NotificationsDropdown from "./NotificationsDropdown";
import SchoolSwitcher from "./SchoolSwitcher";

interface TopHeaderProps {
  currentPageTitle?: string;
  onOpenMobileMenu?: () => void;
  onPlatformSettings?: () => void;
  onAccount?: () => void;
}

export default function TopHeader({
  currentPageTitle = "Dashboard",
  onOpenMobileMenu,
  onPlatformSettings,
  onAccount,
}: TopHeaderProps) {
  const { role, switchRole, logout } = useAuth();
  const { dark, toggleDark } = useTheme();

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  const isStaff = role === "staff";

  return (
    <header className="h-16 bg-card border-b border-border px-4 lg:px-6 flex items-center justify-between flex-shrink-0 gap-3 z-20">
      {/* Left: Mobile hamburger + breadcrumb + school switcher */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger (mobile only) */}
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menu de navegação"
            className="lg:hidden flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground focus:outline-none"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Desktop breadcrumb */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0 text-muted-foreground">
          <Home size={15} />
          <ChevronRight size={13} className="text-muted-foreground/50" />
          <span
            className="text-sm font-semibold text-foreground truncate max-w-[200px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {currentPageTitle}
          </span>
        </div>

        {!isStaff && (
          <>
            <div className="hidden md:block h-5 w-px bg-border" />
            <SchoolSwitcher onPlatformSettings={onPlatformSettings} />
          </>
        )}
      </div>

      {/* Right: search + controls + avatar */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Search button */}
        {!isStaff && (
          <button
            type="button"
            className="hidden lg:flex items-center gap-2 pl-3 pr-2 py-2 rounded-full border border-border bg-muted/50 hover:bg-muted text-muted-foreground transition-colors mr-1 cursor-pointer"
          >
            <Search size={14} />
            <span className="text-xs">Pesquisar</span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-card border border-border">
              Ctrl K
            </span>
          </button>
        )}

        {/* Languages */}
        <button
          type="button"
          title="Idiomas"
          aria-label="Idiomas"
          className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
        >
          <Languages size={17} />
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title="Ecrã inteiro"
          aria-label="Ecrã inteiro"
          className="hidden md:flex w-9 h-9 rounded-full items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
        >
          <Maximize2 size={16} />
        </button>

        {/* Dark/Light mode toggle */}
        <button
          type="button"
          onClick={toggleDark}
          title={dark ? "Modo claro" : "Modo escuro"}
          aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
        >
          {dark ? <Sun size={17} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        {!isStaff && <NotificationsDropdown />}

        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

        {/* Avatar Menu */}
        <AvatarMenu
          onAccount={onAccount}
          onPlatformSettings={onPlatformSettings}
          onSwitchRole={switchRole}
          onLogout={logout}
        />
      </div>
    </header>
  );
}
