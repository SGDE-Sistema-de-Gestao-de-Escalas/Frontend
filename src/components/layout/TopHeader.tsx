import { Bell } from "lucide-react";

export default function TopHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5">
      <div>
        <p className="text-sm font-semibold text-foreground">Agrupamento de Escolas de Lisboa Norte</p>
        <p className="text-xs text-muted-foreground">AELN</p>
      </div>
      <button type="button" aria-label="Notificações" className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <Bell size={18} />
      </button>
    </header>
  );
}
