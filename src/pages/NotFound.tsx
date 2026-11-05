import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";

export default function NotFound() {
  const navigate = useNavigate();
  const { role } = useAuth();

  const homePath = role === "staff" ? "/staff/schedule" : "/dashboard";
  const homeLabel = role === "staff" ? "Ir para o Meu Horário" : "Ir para o Dashboard";

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[460px] h-[460px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl text-center space-y-6">
        {/* Ilustração: Cápsulas da Grelha de Horários + Lupa 404 */}
        <div className="flex flex-col items-center pt-1 gap-3">
          <div className="relative w-48 h-24 flex flex-col justify-center gap-2 p-3 rounded-2xl border border-dashed border-border bg-muted/20">
            {/* Mini barras inspiradas na grelha de escalas */}
            <div className="flex items-center gap-1.5 opacity-60">
              <div className="h-3 w-12 rounded-md bg-emerald-500/80" />
              <div className="h-3 w-6 rounded-md bg-amber-500/80" />
              <div className="h-3 flex-1 rounded-md border border-dashed border-destructive/60 bg-destructive/15" />
            </div>
            <div className="flex items-center gap-1.5 opacity-45">
              <div className="h-3 w-8 rounded-md bg-indigo-500/80" />
              <div className="h-3 flex-1 rounded-md bg-primary/70" />
            </div>
            <div className="flex items-center gap-1.5 opacity-60">
              <div className="h-3 flex-1 rounded-md border border-dashed border-primary/50 bg-primary/10" />
              <div className="h-3 w-10 rounded-md bg-emerald-500/80" />
            </div>

            {/* Ícone central sobreposto */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-card border border-primary/40 shadow-lg flex items-center justify-center text-primary">
                <SearchX size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Página não encontrada
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O endereço a que tentaste aceder não existe, foi movido ou não se
            encontra disponível no <strong>SGDE</strong>.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto gap-1.5 cursor-pointer text-xs"
          >
            <ArrowLeft size={14} />
            Voltar Atrás
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => navigate(homePath, { replace: true })}
            className="w-full sm:w-auto gap-1.5 cursor-pointer text-xs"
          >
            <Home size={14} />
            {homeLabel}
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/60">
          <p className="text-[11px] text-muted-foreground">
            SGDE · Sistema de Gestão e Distribuição de Escalas
          </p>
        </div>
      </div>
    </div>
  );
}
