import React from "react";
import { ChevronDown, LogOut, Settings, User, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface AvatarMenuProps {
  onAccount?: () => void;
  onPlatformSettings?: () => void;
  onSwitchRole?: () => void;
  onLogout?: () => void;
}

export default function AvatarMenu({
  onAccount,
  onPlatformSettings,
  onSwitchRole,
  onLogout,
}: AvatarMenuProps) {
  const { user, switchRole, logout } = useAuth();

  const handleAccount = onAccount;
  const handlePlatformSettings = onPlatformSettings;
  const handleSwitchRole = onSwitchRole || switchRole;
  const handleLogout = onLogout || logout;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-0.5 pr-1.5 hover:bg-muted transition-colors focus:outline-none"
          aria-label="Menu do utilizador"
        >
          <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[11px] font-bold text-primary-foreground font-mono">
              {user.initials}
            </span>
          </span>
          <ChevronDown size={13} className="text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-60 p-0 rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[11px] font-bold text-primary-foreground font-mono">
              {user.initials}
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-muted-foreground">{user.roleLabel}</p>
          </div>
        </div>

        <div className="py-1">
          {handleAccount && (
            <DropdownMenuItem
              onClick={handleAccount}
              className="cursor-pointer px-4 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted transition-colors"
            >
              <User size={15} className="mr-2 text-muted-foreground" />
              A Minha Conta
            </DropdownMenuItem>
          )}

          {handlePlatformSettings && (
            <DropdownMenuItem
              onClick={handlePlatformSettings}
              className="cursor-pointer px-4 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted transition-colors"
            >
              <Settings size={15} className="mr-2 text-muted-foreground" />
              Configurações da Plataforma
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={handleSwitchRole}
            className="cursor-pointer px-4 py-2 text-sm text-foreground hover:bg-muted focus:bg-muted transition-colors"
          >
            <Users size={15} className="mr-2 text-muted-foreground" />
            {user.role === "admin" ? "Ver como Assistente" : "Vista Admin"}
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-0 border-t border-border" />

        <div className="py-1">
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer px-4 py-2 text-sm text-destructive hover:bg-destructive/10 focus:bg-destructive/10 transition-colors"
          >
            <LogOut size={15} className="mr-2 text-destructive" />
            Terminar Sessão
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

