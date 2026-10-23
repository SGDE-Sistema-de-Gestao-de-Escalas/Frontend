import React, { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Badge } from "../ui/badge";
import type {
  PendingRecalculationsResponse,
  ScheduleConflictApi,
} from "../../api/services/schedules.service";

interface AlertBannerProps {
  onRecalculate?: (affectedDates?: string[]) => void;
  conflicts?: ScheduleConflictApi[];
  pendingRecalculations?: PendingRecalculationsResponse | null;
  hasGeneratedClean?: boolean;
}

export default function AlertBanner({
  onRecalculate,
  conflicts,
  pendingRecalculations,
  hasGeneratedClean = false,
}: AlertBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const hasPending = Boolean(
    pendingRecalculations?.has_pending &&
      pendingRecalculations.affected_dates.length > 0
  );
  const hasGenerationConflicts = Boolean(conflicts && conflicts.length > 0);

  // Se não há pendências na BD nem défices da última geração, não renderiza
  if (!hasPending && !hasGenerationConflicts) {
    return null;
  }

  // Lista unificada de avisos para expansão
  const pendingItems: Array<{
    day: string;
    time: string;
    activityName: string;
    message: string;
    type?: string;
  }> = [];

  if (pendingRecalculations?.conflicts) {
    Object.entries(pendingRecalculations.conflicts).forEach(([date, list]) => {
      list.forEach((item) => {
        const timeStr =
          item.period ||
          (item.start_time && item.end_time
            ? `${item.start_time} – ${item.end_time}`
            : "Dia completo");
        pendingItems.push({
          day: date,
          time: timeStr,
          activityName:
            item.activity_name ||
            (item.type === "school_closed"
              ? "Estabelecimento Encerrado"
              : "Conflito de Escala"),
          message: item.message,
          type: item.type,
        });
      });
    });
  }

  const generationAlerts = (conflicts || []).map((c) => ({
    day: c.date,
    time: `${c.period_start} – ${c.period_end}`,
    activityName: c.activity_name ?? "Regra Obrigatória",
    message: `Apenas ${c.assigned} assistente(s) atribuído(s) (mínimo exigido: ${c.required}).`,
    type: "generation_deficit",
  }));

  const allAlerts = [...pendingItems, ...generationAlerts];

  const affectedDates = pendingRecalculations?.affected_dates ?? [];
  const daysCount = affectedDates.length || (conflicts ? new Set(conflicts.map((c) => c.date)).size : 0);

  return (
    <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden shadow-xs">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center">
          <AlertTriangle size={16} className="text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>
              {hasPending
                ? "Recálculo de Escala Necessário"
                : "Alerta de Cobertura Insuficiente"}
            </span>
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
              {daysCount} {daysCount === 1 ? "dia afetado" : "dias afetados"}
            </Badge>
          </p>
          <p className="text-xs text-destructive mt-0.5 font-medium">
            {hasPending
              ? `Existem escalas geradas com quebra de regras ou ausências em ${daysCount} dia(s). É necessário recalcular o horário.`
              : `Nível mínimo de segurança não garantido em ${allAlerts.length} intervalo(s) obrigatório(s).`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRecalculate && (
            <button
              type="button"
              onClick={() => onRecalculate(affectedDates)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors shadow-xs"
            >
              <RefreshCw size={12} />
              Recalcular Escala
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Recolher alertas" : "Expandir alertas"}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dispensar alerta"
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-destructive/15 px-4 py-3 space-y-2.5 bg-destructive/5">
          {allAlerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-3 text-xs bg-background/60 p-2.5 rounded-lg border border-destructive/15"
            >
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-destructive font-semibold min-w-32">
                <Calendar size={12} className="shrink-0" />
                <span>{alert.day}</span>
                <span className="text-muted-foreground font-normal">({alert.time})</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {alert.activityName}
                </p>
                <p className="text-muted-foreground mt-0.5">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
