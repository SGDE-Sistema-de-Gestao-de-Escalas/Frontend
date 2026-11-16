import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Calendar,
  ArrowRight,
  Clock,
  Edit2,
} from "lucide-react";
import { Badge } from "../ui/badge";
import type {
  PendingRecalculationsResponse,
  ScheduleConflictApi,
} from "../../api/services/schedules.service";
import {
  getDateInfo,
  getOffsetFromIsoDate,
} from "../../utils/scheduleMatrixUtils";

interface AlertBannerProps {
  onRecalculate?: (affectedDates?: string[]) => void;
  onSelectDate?: (isoDate: string) => void;
  conflicts?: ScheduleConflictApi[];
  pendingRecalculations?: PendingRecalculationsResponse | null;
  hasGeneratedClean?: boolean;
}

interface AlertItem {
  time: string;
  activityName: string;
  message: string;
  type?: string;
}

interface DayAlertGroup {
  date: string;
  dayName: string;
  dateStr: string;
  isToday: boolean;
  alerts: AlertItem[];
  activities: string[];
}

export default function AlertBanner({
  onRecalculate,
  onSelectDate,
  conflicts,
  pendingRecalculations,
  hasGeneratedClean = false,
}: AlertBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

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

  // Agrupamento estruturado por dia
  const dayGroups = useMemo(() => {
    const map = new Map<string, { alerts: AlertItem[]; seenKeys: Set<string> }>();

    function getOrCreateGroup(date: string) {
      if (!map.has(date)) {
        map.set(date, { alerts: [], seenKeys: new Set<string>() });
      }
      return map.get(date)!;
    }

    // 1. Pendências da BD
    if (pendingRecalculations?.conflicts) {
      Object.entries(pendingRecalculations.conflicts).forEach(([date, list]) => {
        const group = getOrCreateGroup(date);
        list.forEach((item) => {
          const timeStr =
            item.period ||
            (item.start_time && item.end_time
              ? `${item.start_time} – ${item.end_time}`
              : "Dia completo");
          const normTime = timeStr.replace(/[^0-9:]/g, "");
          const actName =
            item.activity_name ||
            (item.type === "school_closed"
              ? "Estabelecimento Encerrado"
              : "Conflito de Escala");
          const key = `${actName}_${normTime}`;

          if (!group.seenKeys.has(key)) {
            group.seenKeys.add(key);
            group.alerts.push({
              time: timeStr,
              activityName: actName,
              message: item.message,
              type: item.type,
            });
          }
        });
      });
    }

    // 2. Conflitos imediatos da última geração
    if (conflicts && conflicts.length > 0) {
      conflicts.forEach((c) => {
        const group = getOrCreateGroup(c.date);
        const timeStr = `${c.period_start} – ${c.period_end}`;
        const normTime = timeStr.replace(/[^0-9:]/g, "");
        const actName = c.activity_name ?? "Regra Obrigatória";
        const key = `${actName}_${normTime}`;

        if (!group.seenKeys.has(key)) {
          group.seenKeys.add(key);
          group.alerts.push({
            time: timeStr,
            activityName: actName,
            message: `Apenas ${c.assigned} assistente(s) atribuído(s) (mínimo: ${c.required}).`,
            type: "generation_deficit",
          });
        }
      });
    }

    // 3. Garantir que todas as affected_dates aparecem no mapa
    const affectedDates = pendingRecalculations?.affected_dates || [];
    affectedDates.forEach((date) => {
      const group = getOrCreateGroup(date);
      if (group.alerts.length === 0) {
        group.alerts.push({
          time: "Dia completo",
          activityName: "Revisão Geral",
          message: "Horários de assistentes ou regras alteradas requerem recálculo.",
          type: "pending_date",
        });
      }
    });

    // Converter para array ordenado por data
    const sortedDates = Array.from(map.keys()).sort();
    const result: DayAlertGroup[] = [];

    sortedDates.forEach((date) => {
      const group = map.get(date)!;
      let dayName = date;
      let dateStr = "";
      let isToday = false;

      try {
        const offset = getOffsetFromIsoDate(date);
        const info = getDateInfo(offset);
        dayName = info.dayName;
        dateStr = info.dateStr;
        isToday = offset === 0;
      } catch {
        // Fallback para formatação simples se offset falhar
        const d = new Date(`${date}T12:00:00`);
        dayName = d.toLocaleDateString("pt-PT", { weekday: "long" });
        dateStr = `${d.getDate()} de ${d.toLocaleDateString("pt-PT", { month: "short" })}`;
      }

      // Atividades únicas para resumo visual
      const uniqueActivities = Array.from(
        new Set(group.alerts.map((a) => a.activityName))
      );

      result.push({
        date,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        dateStr,
        isToday,
        alerts: group.alerts,
        activities: uniqueActivities,
      });
    });

    return result;
  }, [pendingRecalculations, conflicts]);

  const affectedDates = pendingRecalculations?.affected_dates ?? dayGroups.map((d) => d.date);
  const daysCount = dayGroups.length;
  const totalAlertsCount = dayGroups.reduce((acc, g) => acc + g.alerts.length, 0);

  return (
    <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden shadow-xs transition-all">
      {/* Cabeçalho Resumido do Alerta */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/15 flex items-center justify-center">
          <AlertTriangle size={16} className="text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {hasPending
                ? "Recálculo de Escala Necessário"
                : "Alerta de Cobertura Insuficiente"}
            </span>
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
              {daysCount} {daysCount === 1 ? "dia afetado" : "dias afetados"}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              ({totalAlertsCount} {totalAlertsCount === 1 ? "pendência no total" : "pendências no total"})
            </span>
          </div>
          <p className="text-xs text-destructive/90 mt-0.5 font-medium">
            {hasPending
              ? `Existem escalas com quebra de regras ou ausências registadas em ${daysCount} dia(s).`
              : `Nível mínimo de segurança não garantido em ${totalAlertsCount} intervalo(s) de regras obrigatórias.`}
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
              <span className="hidden sm:inline">Recalcular Escala</span>
              <span className="sm:hidden">Recalcular</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Recolher dias afetados" : "Expandir dias afetados"}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 text-destructive text-xs font-medium transition-colors"
          >
            <span className="hidden md:inline">{expanded ? "Ocultar Dias" : "Ver Dias"}</span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dispensar alerta"
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/80 hover:text-destructive transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Lista Organizada e Agrupada por Dia (Com altura máxima e scroll) */}
      {expanded && (
        <div className="border-t border-destructive/15 p-3.5 bg-background/50 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mb-1">
            <span className="font-medium text-foreground">Dias com Pendências a Resolver:</span>
            <span className="hidden sm:inline">Clique em "Ver no Editor" para abrir o dia na matriz</span>
          </div>

          <div className="max-h-80 overflow-y-auto pr-1 space-y-2">
            {dayGroups.map((group) => {
              const isDayExpanded = expandedDay === group.date;

              return (
                <div
                  key={group.date}
                  className="rounded-lg border border-destructive/20 bg-card hover:border-destructive/40 transition-colors overflow-hidden"
                >
                  {/* Linha Principal do Dia */}
                  <div className="flex items-center justify-between gap-3 p-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                        <Calendar size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {group.dayName}, {group.dateStr}
                          </span>
                          {group.isToday && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1 border-primary text-primary">
                              Hoje
                            </Badge>
                          )}
                          <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-mono h-4">
                            {group.alerts.length} {group.alerts.length === 1 ? "pendência" : "pendências"}
                          </Badge>
                        </div>
                        {/* Resumo compacto das atividades afetadas */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {group.activities.slice(0, 3).map((act, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium"
                            >
                              {act}
                            </span>
                          ))}
                          {group.activities.length > 3 && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              +{group.activities.length - 3} outras
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações do Dia */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedDay(isDayExpanded ? null : group.date)}
                        className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors flex items-center gap-1"
                      >
                        <span>{isDayExpanded ? "Ocultar" : "Detalhes"}</span>
                        {isDayExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {onSelectDate && (
                        <button
                          type="button"
                          onClick={() => onSelectDate(group.date)}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                          title={`Abrir editor e editar escala de ${group.dayName}`}
                        >
                          <Edit2 size={12} />
                          <span>Editar Escala</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detalhes específicos deste dia quando expandido */}
                  {isDayExpanded && (
                    <div className="border-t border-border/40 bg-muted/20 px-3 py-2 space-y-1.5 text-xs">
                      {group.alerts.map((alert, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 py-1 border-b border-border/20 last:border-b-0"
                        >
                          <div className="flex items-center gap-1 font-mono text-[10px] text-destructive shrink-0 mt-0.5 min-w-28">
                            <Clock size={11} className="shrink-0" />
                            <span>{alert.time}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-foreground text-[11px]">
                              {alert.activityName}:
                            </span>{" "}
                            <span className="text-muted-foreground text-[11px]">
                              {alert.message}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
