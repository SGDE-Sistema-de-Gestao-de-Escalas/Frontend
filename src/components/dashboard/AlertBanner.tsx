import React, { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
} from "lucide-react";
import { Badge } from "../ui/badge";
import type { ScheduleConflictApi } from "../../api/services/schedules.service";

interface AlertBannerProps {
  onRecalculate?: () => void;
  conflicts?: ScheduleConflictApi[];
  hasGeneratedClean?: boolean;
}

export default function AlertBanner({
  onRecalculate,
  conflicts,
  hasGeneratedClean = false,
}: AlertBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Só apresenta o banner de alerta quando existem défices reais de cobertura
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  const alertsList = conflicts.map((c) => ({
    time: `${c.period_start} – ${c.period_end}`,
    activityName: c.activity_name ?? "Regra Obrigatória",
    count: c.assigned,
    min: c.required,
    day: c.date,
  }));

  return (
    <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden shadow-xs">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center">
          <AlertTriangle size={16} className="text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {alertsList.length}{" "}
            {alertsList.length === 1
              ? "Alerta de Cobertura Insuficiente"
              : "Alertas de Cobertura Insuficiente"}
          </p>
          <p className="text-xs text-destructive mt-0.5 font-medium">
            Nível mínimo de segurança não garantido em{" "}
            {alertsList.length === 1
              ? "um intervalo obrigatório"
              : `${alertsList.length} intervalos obrigatórios`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRecalculate && (
            <button
              type="button"
              onClick={onRecalculate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors shadow-xs"
            >
              <RefreshCw size={12} />
              Recalcular / Transferir
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
        <div className="border-t border-destructive/15 px-4 py-3 space-y-2 bg-destructive/5">
          {alertsList.map((alert, i) => (
            <div key={i} className="flex items-center gap-3 text-sm flex-wrap">
              <span className="font-mono text-xs text-destructive font-semibold w-28">
                {alert.time}
              </span>
              <span className="text-foreground text-xs">
                <strong>{alert.activityName}:</strong> Apenas{" "}
                <strong>{alert.count}</strong> assistentes presentes (mínimo
                exigido: <strong>{alert.min}</strong>)
              </span>
              <Badge variant="destructive" className="ml-auto text-[10px]">
                {alert.day}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
