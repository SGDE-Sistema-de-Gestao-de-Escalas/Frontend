import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Sparkles,
  UserX,
} from "lucide-react";
import type { BlockState, StaffViewMode } from "../../types";
import {
  BLOCK_STYLES,
  formatDurationSlots,
  slotsToBlocks,
  TIME_SLOTS,
  VIEW_START,
  VIEW_END,
  VIEW_SLOTS,
} from "../dashboard/blockStyles";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useAuth } from "../../context/AuthContext";
import { useSchedulesList } from "../../hooks/api/useSchedules";
import { useAbsencesList } from "../../hooks/api/useAbsences";
import {
  useOperatingCalendar,
  useOperatingExceptions,
  useOperatingRules,
} from "../../hooks/api/useOperatingHours";
import { useHolidaysList } from "../../hooks/api/useHolidays";
import {
  buildDayMatrixFromApi,
  getDateInfo,
  getRealMonthsRange,
  resolveSchoolDayStatusByIsoDate,
} from "../../utils/scheduleMatrixUtils";

/**
 * Retorna a cor exata configurada para o bloco/atividade.
 */
export function getBlockDisplayColor(block: {
  state: BlockState;
  activityColor?: string | null;
  activityName?: string;
}): string {
  if (block.activityColor) {
    if (
      block.activityColor === "#EF4444" &&
      (block.activityName?.toLowerCase().includes("vigilância almoço") ||
        block.activityName?.toLowerCase().includes("vigilancia almoco"))
    ) {
      return "#A855F7";
    }
    return block.activityColor;
  }
  switch (block.state) {
    case "work":
      return "#3B82F6";
    case "collection":
      return "#F59E0B";
    case "surveillance":
      return "#A855F7";
    case "lunch":
      return "#F97316";
    case "cleaning":
      return "#8B5CF6";
    case "delivery":
      return "#14B8A6";
    case "absent":
      return "#EF4444";
    case "off":
    default:
      return "transparent";
  }
}

/**
 * Hook para obter dados e blocos de um determinado dia para o assistente autenticado
 */
function useStaffDayBlocks(dayOffset: number) {
  const { user } = useAuth();
  const info = getDateInfo(dayOffset);
  const assistantId = user.assistant_id ?? user.id ?? "staff";

  const { data: schedules = [], isLoading: isLoadingSchedules } =
    useSchedulesList({
      start_date: info.isoDate,
      end_date: info.isoDate,
      assistant_id: user.assistant_id ?? undefined,
    });

  const { data: absencesRes, isLoading: isLoadingAbsences } = useAbsencesList({
    start_date: info.isoDate,
    end_date: info.isoDate,
    assistant_id: user.assistant_id ?? undefined,
    per_page: 50,
  });

  const { data: calendarDays } = useOperatingCalendar({
    start_date: info.isoDate,
    end_date: info.isoDate,
  });
  const { data: holidays } = useHolidaysList();
  const { data: operatingExceptions } = useOperatingExceptions({
    status: "all",
  });
  const { data: operatingRules } = useOperatingRules({
    status: "all",
  });

  return useMemo(() => {
    const dummyAssistant = {
      id: assistantId,
      name: user.name || "Assistente",
      initials: user.initials || "AO",
    };

    const effectiveSchedules =
      user.assistant_id || schedules.length === 0
        ? schedules
        : [schedules[0]];

    const targetId =
      user.assistant_id ??
      effectiveSchedules[0]?.assistant_id ??
      dummyAssistant.id;

    const dayStatus = resolveSchoolDayStatusByIsoDate(info.isoDate, {
      calendarDays,
      holidays,
      operatingExceptions,
      operatingRules,
    });

    const isSchoolOpen = dayStatus.isOpen;

    const { matrix, slotMetaByAssistant } = buildDayMatrixFromApi({
      isoDate: info.isoDate,
      isOpen: isSchoolOpen,
      assistants: [{ ...dummyAssistant, id: targetId }],
      schedules: effectiveSchedules,
      absences: absencesRes?.data || [],
    });

    const slots = matrix[targetId] || Array(96).fill("off");
    const meta = slotMetaByAssistant?.[targetId] || {};
    const blocks = slotsToBlocks(slots, meta);

    return {
      slots,
      blocks,
      dayStatus,
      isLoading: isLoadingSchedules || isLoadingAbsences,
    };
  }, [
    info.isoDate,
    assistantId,
    user,
    schedules,
    absencesRes,
    calendarDays,
    holidays,
    operatingExceptions,
    operatingRules,
    isLoadingSchedules,
    isLoadingAbsences,
  ]);
}

/**
 * Vista Diária do Horário do Assistente
 */
export function StaffDayView({ dayOffset }: { dayOffset: number }) {
  const info = getDateInfo(dayOffset);
  const { slots, blocks, dayStatus, isLoading } = useStaffDayBlocks(dayOffset);

  const activeBlocks = blocks.filter((b) => b.state !== "off");
  const isOffDay =
    !dayStatus.isOpen ||
    activeBlocks.length === 0 ||
    activeBlocks.every((b) => b.state === "off");

  const entryBlock = activeBlocks.find((b) => b.state !== "absent");
  const lastBlock = [...activeBlocks]
    .reverse()
    .find((b) => b.state !== "absent");

  const activeWorkSlots = slots.filter(
    (s) => s !== "off" && s !== "lunch" && s !== "absent"
  ).length;
  const workloadLabel =
    activeWorkSlots > 0 ? formatDurationSlots(activeWorkSlots) : "—";

  if (isOffDay && !isLoading) {
    return (
      <div className="pt-4 pb-12">
        <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto shadow-sm my-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
            <Sparkles size={22} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Dia de Descanso
          </h3>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {info.dayName}, {info.dateStr}
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Hoje não tem serviço agendado. Desfrute do seu dia de descanso e
            aproveite o tempo com o que e quem mais gosta.
          </p>
        </div>
      </div>
    );
  }

  // Janela da linha temporal da barra de escalas
  const firstSlot = entryBlock ? entryBlock.start : 32; // 08:00 default
  const lastSlot = lastBlock ? lastBlock.start + lastBlock.count : 68; // 17:00 default
  const barStart = Math.min(32, Math.max(0, firstSlot - 2));
  const barEnd = Math.max(68, Math.min(96, lastSlot + 2));
  const barSlots = Math.max(1, barEnd - barStart);

  return (
    <div className="pt-2 pb-8 space-y-4">
      {/* 3 Cartões de Resumo do Dia */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {[
          {
            label: "Entrada",
            value: entryBlock ? TIME_SLOTS[entryBlock.start] : "—",
          },
          {
            label: "Saída",
            value: lastBlock
              ? TIME_SLOTS[lastBlock.start + lastBlock.count] || "24:00"
              : "—",
          },
          { label: "Carga Diária", value: workloadLabel },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl p-3 sm:p-3.5 text-center shadow-xs"
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-base sm:text-lg font-mono font-semibold text-foreground mt-0.5">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Barra de Escalas Contínua (Marca de Identidade Visual da Aplicação) */}
      <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Linha Temporal de Atividades
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {TIME_SLOTS[barStart]} — {TIME_SLOTS[barEnd] || "24:00"}
          </span>
        </div>

        <div className="relative h-10 w-full bg-muted/30 rounded-lg p-1 border border-border/40 overflow-hidden">
          {activeBlocks.map((b, i) => {
            const cs = Math.max(b.start, barStart);
            const ce = Math.min(b.start + b.count, barEnd);
            if (ce <= cs) return null;
            const leftPct = ((cs - barStart) / barSlots) * 100;
            const widthPct = ((ce - cs) / barSlots) * 100;
            const color = getBlockDisplayColor(b);
            const name =
              b.activityName || BLOCK_STYLES[b.state]?.label || "Atividade";
            const timeStr = `${TIME_SLOTS[b.start]} – ${
              TIME_SLOTS[b.start + b.count] || "24:00"
            }`;

            return (
              <div
                key={i}
                title={`${name} (${timeStr})`}
                className="absolute inset-y-1 rounded-md transition-transform hover:scale-[1.01] flex items-center justify-center px-1 text-[11px] font-medium text-white shadow-xs overflow-hidden truncate"
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  backgroundColor: color,
                }}
              >
                {widthPct > 12 && <span className="truncate">{name}</span>}
              </div>
            );
          })}
        </div>

        {/* Marcadores de hora sob a barra */}
        <div className="relative w-full h-4 mt-1 flex justify-between text-[10px] font-mono text-muted-foreground/60 px-0.5">
          <span>{TIME_SLOTS[barStart]}</span>
          {barSlots > 20 && (
            <span>{TIME_SLOTS[Math.round((barStart + barEnd) / 2)]}</span>
          )}
          <span>{TIME_SLOTS[barEnd] || "24:00"}</span>
        </div>
      </div>

      {/* Lista Limpa de Tarefas (Sem ícones desnecessários, com as cores reais) */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1">
          Tarefas Agendadas
        </h3>

        {activeBlocks.length === 0 ? (
          <div className="text-center py-8 bg-card border border-border rounded-xl">
            <p className="text-sm text-muted-foreground">
              A escala ainda não foi gerada para este dia.
            </p>
          </div>
        ) : (
          activeBlocks.map((block, i) => {
            const startTime = TIME_SLOTS[block.start];
            const endTime =
              TIME_SLOTS[block.start + block.count] || "24:00";
            const dMin = block.count * 15;
            const dStr =
              dMin >= 60
                ? `${Math.floor(dMin / 60)}h${
                    dMin % 60 > 0 ? ` ${dMin % 60}min` : ""
                  }`
                : `${dMin}min`;
            const color = getBlockDisplayColor(block);
            const name =
              block.activityName ||
              BLOCK_STYLES[block.state]?.label ||
              "Atividade";

            return (
              <div
                key={i}
                className="bg-card border border-border hover:border-accent/40 rounded-xl p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-2.5 sm:w-3 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-base font-semibold text-foreground truncate">
                        {name}
                      </p>
                      {block.state === "lunch" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 border-orange-500/30 text-orange-600 bg-orange-500/10"
                        >
                          Pausa
                        </Badge>
                      )}
                      {block.state === "absent" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 border-destructive/30 text-destructive bg-destructive/10"
                        >
                          Ausência
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {startTime} – {endTime}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-muted text-xs font-mono font-medium text-muted-foreground border border-border/40">
                    {dStr}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Vista Semanal do Horário do Assistente
 */
export function StaffWeekView({
  weekStart,
  onSelectDay,
}: {
  weekStart: number;
  onSelectDay: (o: number) => void;
}) {
  const { user } = useAuth();
  const offsets = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart + i),
    [weekStart]
  );
  const startInfo = getDateInfo(offsets[0]);
  const endInfo = getDateInfo(offsets[6]);

  const { data: schedules = [] } = useSchedulesList({
    start_date: startInfo.isoDate,
    end_date: endInfo.isoDate,
    assistant_id: user.assistant_id ?? undefined,
  });
  const { data: absencesRes } = useAbsencesList({
    start_date: startInfo.isoDate,
    end_date: endInfo.isoDate,
    assistant_id: user.assistant_id ?? undefined,
    per_page: 50,
  });
  const { data: calendarDays } = useOperatingCalendar({
    start_date: startInfo.isoDate,
    end_date: endInfo.isoDate,
  });
  const { data: holidays } = useHolidaysList();
  const { data: operatingExceptions } = useOperatingExceptions({
    status: "all",
  });
  const { data: operatingRules } = useOperatingRules({
    status: "all",
  });

  const targetId =
    user.assistant_id ?? schedules[0]?.assistant_id ?? "staff";

  return (
    <div className="pt-2 pb-6 space-y-2.5">
      {offsets.map((offset) => {
        const info = getDateInfo(offset);
        const isToday = offset === 0;
        const status = resolveSchoolDayStatusByIsoDate(info.isoDate, {
          calendarDays,
          holidays,
          operatingExceptions,
          operatingRules,
        });
        const isClosed = !status.isOpen;
        const dayViewStart = status.viewStartSlot ?? VIEW_START;
        const dayViewEnd = status.viewEndSlot ?? VIEW_END;
        const dayViewSlots = Math.max(1, dayViewEnd - dayViewStart);

        const { matrix, slotMetaByAssistant } = buildDayMatrixFromApi({
          isoDate: info.isoDate,
          isOpen: !isClosed,
          assistants: [
            {
              id: targetId,
              name: user.name || "Assistente",
              initials: user.initials || "AO",
            },
          ],
          schedules,
          absences: absencesRes?.data || [],
        });

        const slots = matrix[targetId] || Array(96).fill("off");
        const meta = slotMetaByAssistant?.[targetId] || {};
        const dayBlocks = slotsToBlocks(slots, meta);
        const activeBlocks = dayBlocks.filter((b) => b.state !== "off");

        const activeSlots = slots.filter(
          (s) => s !== "off" && s !== "lunch" && s !== "absent"
        ).length;
        const hasWork = activeSlots > 0;
        const hasAbsent = slots.some((s) => s === "absent");

        const entryBlock = activeBlocks.find((b) => b.state !== "absent");
        const lastBlock = [...activeBlocks]
          .reverse()
          .find((b) => b.state !== "absent");

        const entryExitStr =
          entryBlock && lastBlock
            ? `${TIME_SLOTS[entryBlock.start]} – ${
                TIME_SLOTS[lastBlock.start + lastBlock.count] || "24:00"
              }`
            : null;

        return (
          <button
            key={offset}
            type="button"
            onClick={() => onSelectDay(offset)}
            className={`w-full text-left rounded-xl border p-3.5 transition-all
              ${
                isToday
                  ? "border-accent bg-accent/5 shadow-xs"
                  : isClosed || (!hasWork && !hasAbsent)
                  ? "border-border/60 bg-card/60 opacity-80 hover:opacity-100 hover:border-accent/40"
                  : "border-border bg-card hover:border-accent/40 hover:bg-accent/3 shadow-xs"
              }
            `}
          >
            {/* Header do Dia */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold capitalize ${
                    isToday ? "text-accent" : "text-foreground"
                  }`}
                >
                  {info.dayShort}
                </span>
                <span
                  className={`text-xs font-mono ${
                    isToday ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  {info.dateStr}
                </span>
                {isToday && (
                  <Badge variant="default" className="text-[10px] py-0 px-1.5">
                    Hoje
                  </Badge>
                )}
                {hasAbsent && (
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 px-1.5 border-destructive/30 text-destructive bg-destructive/10"
                  >
                    Ausência
                  </Badge>
                )}
              </div>

              <div>
                {!isClosed && hasWork && entryExitStr ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-foreground">
                      {entryExitStr}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {formatDurationSlots(activeSlots)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {isClosed
                      ? status.closedLabel || "Encerrada"
                      : "Dia de descanso"}
                  </span>
                )}
              </div>
            </div>

            {/* Barra de Escalas com Cores Reais */}
            {!isClosed && activeBlocks.length > 0 && (
              <div className="relative h-4 rounded-md overflow-hidden bg-muted/40 my-2">
                {activeBlocks.map((b, bi) => {
                  const cs = Math.max(b.start, dayViewStart);
                  const ce = Math.min(b.start + b.count, dayViewEnd);
                  if (ce <= cs) return null;
                  const color = getBlockDisplayColor(b);
                  const name =
                    b.activityName ||
                    BLOCK_STYLES[b.state]?.label ||
                    "Atividade";
                  const timeStr = `${TIME_SLOTS[b.start]} – ${
                    TIME_SLOTS[b.start + b.count] || "24:00"
                  }`;

                  return (
                    <div
                      key={bi}
                      title={`${name}: ${timeStr}`}
                      className="absolute inset-y-0.5 rounded-xs transition-transform hover:scale-105"
                      style={{
                        left: `${((cs - dayViewStart) / dayViewSlots) * 100}%`,
                        width: `${((ce - cs) / dayViewSlots) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Chips de Atividades com respetivas cores e horários */}
            {!isClosed && activeBlocks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activeBlocks.map((b, bi) => {
                  const color = getBlockDisplayColor(b);
                  const name =
                    b.activityName ||
                    BLOCK_STYLES[b.state]?.label ||
                    "Atividade";
                  const timeRange = `${TIME_SLOTS[b.start]} - ${
                    TIME_SLOTS[b.start + b.count] || "24:00"
                  }`;

                  return (
                    <div
                      key={bi}
                      title={timeRange}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 border border-border/40 text-[11px] text-foreground"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate max-w-[140px]">{name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {TIME_SLOTS[b.start]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Vista Mensal do Horário com Métricas, Calendário e Painel de Detalhes
 */
export function StaffMonthView({
  monthOffset,
  onSelectDay,
  onChangeMonth,
}: {
  monthOffset: number;
  onSelectDay: (o: number) => void;
  onChangeMonth: (d: number) => void;
}) {
  const { user } = useAuth();
  const monthsList = useMemo(() => getRealMonthsRange(1, 2), []);
  const clampedIdx = Math.max(0, Math.min(monthOffset, monthsList.length - 1));
  const month = monthsList[clampedIdx];

  const [selectedDayOffset, setSelectedDayOffset] = useState<number | null>(
    null
  );

  const { data: schedules = [] } = useSchedulesList({
    start_date: month.startIso,
    end_date: month.endIso,
    assistant_id: user.assistant_id ?? undefined,
  });
  const { data: absencesRes } = useAbsencesList({
    start_date: month.startIso,
    end_date: month.endIso,
    assistant_id: user.assistant_id ?? undefined,
    per_page: 100,
  });

  const targetId =
    user.assistant_id ?? schedules[0]?.assistant_id ?? "staff";

  // Calcular métricas mensais do assistente
  const monthMetrics = useMemo(() => {
    let totalWorkSlots = 0;
    let workDaysCount = 0;
    let absenceDaysCount = 0;
    let restDaysCount = 0;

    for (let i = 0; i < month.days; i++) {
      const offset = month.firstOffset + i;
      const dow = (month.firstDow + i) % 7;
      const isWeekend = dow >= 5;
      const info = getDateInfo(offset);

      const { matrix } = buildDayMatrixFromApi({
        isoDate: info.isoDate,
        isOpen: !isWeekend,
        assistants: [
          {
            id: targetId,
            name: user.name || "Assistente",
            initials: user.initials || "AO",
          },
        ],
        schedules,
        absences: absencesRes?.data || [],
      });

      const slots = matrix[targetId] || Array(96).fill("off");
      const activeWork = slots.filter(
        (s) => s !== "off" && s !== "lunch" && s !== "absent"
      ).length;
      const hasAbsent = slots.some((s) => s === "absent");

      if (hasAbsent) absenceDaysCount++;
      if (activeWork > 0) {
        workDaysCount++;
        totalWorkSlots += activeWork;
      } else if (!hasAbsent) {
        restDaysCount++;
      }
    }

    return {
      totalHours: formatDurationSlots(totalWorkSlots),
      workDays: workDaysCount,
      absenceDays: absenceDaysCount,
      restDays: restDaysCount,
    };
  }, [month, targetId, user, schedules, absencesRes]);

  // Detalhes do dia selecionado para o preview abaixo do calendário
  const previewData = useMemo(() => {
    if (selectedDayOffset === null) return null;
    const info = getDateInfo(selectedDayOffset);
    const dow = info.dow;
    const isWeekend = dow >= 5;

    const { matrix, slotMetaByAssistant } = buildDayMatrixFromApi({
      isoDate: info.isoDate,
      isOpen: !isWeekend,
      assistants: [
        {
          id: targetId,
          name: user.name || "Assistente",
          initials: user.initials || "AO",
        },
      ],
      schedules,
      absences: absencesRes?.data || [],
    });

    const slots = matrix[targetId] || Array(96).fill("off");
    const meta = slotMetaByAssistant?.[targetId] || {};
    const blocks = slotsToBlocks(slots, meta);
    const activeBlocks = blocks.filter((b) => b.state !== "off");

    const entryBlock = activeBlocks.find((b) => b.state !== "absent");
    const lastBlock = [...activeBlocks]
      .reverse()
      .find((b) => b.state !== "absent");
    const activeSlots = slots.filter(
      (s) => s !== "off" && s !== "lunch" && s !== "absent"
    ).length;

    return {
      info,
      blocks: activeBlocks,
      entryTime: entryBlock ? TIME_SLOTS[entryBlock.start] : null,
      exitTime: lastBlock
        ? TIME_SLOTS[lastBlock.start + lastBlock.count] || "24:00"
        : null,
      workload:
        activeSlots > 0 ? formatDurationSlots(activeSlots) : null,
      hasAbsent: slots.some((s) => s === "absent"),
    };
  }, [selectedDayOffset, targetId, user, schedules, absencesRes]);

  return (
    <div className="pt-2 pb-6 space-y-4">
      {/* 4 KPIs de Resumo do Mês */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: "Carga Mensal", value: monthMetrics.totalHours },
          { label: "Dias de Trabalho", value: `${monthMetrics.workDays} dias` },
          { label: "Dias de Descanso", value: `${monthMetrics.restDays} dias` },
          { label: "Ausências", value: `${monthMetrics.absenceDays} dias` },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-card border border-border rounded-xl p-3 text-center shadow-xs"
          >
            <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            <p className="text-base sm:text-lg font-mono font-semibold text-foreground mt-0.5">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Navegação de Mês */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => onChangeMonth(-1)}
            disabled={clampedIdx === 0}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-semibold text-foreground capitalize">
            {month.label}
          </span>
          <button
            type="button"
            onClick={() => onChangeMonth(1)}
            disabled={clampedIdx >= monthsList.length - 1}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* DOW headers */}
        <div className="grid grid-cols-7 mb-1.5">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d, i) => (
            <div
              key={i}
              className="text-center text-[11px] font-semibold text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grelha de Dias */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: month.firstDow }, (_, i) => (
            <div key={`pre-${i}`} />
          ))}
          {Array.from({ length: month.days }, (_, i) => {
            const dayNum = i + 1;
            const offset = month.firstOffset + i;
            const dow = (month.firstDow + i) % 7;
            const isWeekend = dow >= 5;
            const isToday = offset === 0;
            const isSelected = selectedDayOffset === offset;
            const info = getDateInfo(offset);

            const { matrix } = buildDayMatrixFromApi({
              isoDate: info.isoDate,
              isOpen: !isWeekend,
              assistants: [
                {
                  id: targetId,
                  name: user.name || "Assistente",
                  initials: user.initials || "AO",
                },
              ],
              schedules,
              absences: absencesRes?.data || [],
            });
            const slots = matrix[targetId] || Array(96).fill("off");
            const hasWork =
              !isWeekend && slots.some((s) => s !== "off" && s !== "absent");
            const hasAbsent = !isWeekend && slots.some((s) => s === "absent");

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => setSelectedDayOffset(offset)}
                className={`min-h-[46px] rounded-lg p-1 flex flex-col items-center justify-between text-xs font-mono transition-all border
                  ${
                    isSelected
                      ? "ring-2 ring-accent border-accent bg-accent/10"
                      : isToday
                      ? "border-accent/60 bg-accent/5 font-bold"
                      : "border-transparent hover:bg-muted/50"
                  }
                  ${!isToday && hasAbsent ? "bg-destructive/10 text-destructive" : ""}
                  ${
                    !isToday && hasWork && !isSelected
                      ? "text-foreground font-medium"
                      : ""
                  }
                  ${
                    !isToday && !hasWork && !hasAbsent
                      ? isWeekend
                        ? "text-muted-foreground/40"
                        : "text-muted-foreground/60"
                      : ""
                  }
                `}
              >
                <span>{dayNum}</span>

                {/* Indicadores Visuais no dia */}
                <div className="flex items-center gap-0.5 mt-0.5">
                  {hasWork && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                  {hasAbsent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  )}
                  {!hasWork && !hasAbsent && !isWeekend && (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/60">
          {[
            { color: "bg-accent", label: "Com Turno" },
            { color: "bg-destructive", label: "Ausência" },
            { color: "bg-muted-foreground/30", label: "Sem Serviço / Folga" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              <span className="text-[11px] text-muted-foreground">
                {l.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Painel de Preview do Dia Selecionado */}
      {previewData && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {previewData.info.dayName}
              </p>
              <h4 className="text-base font-semibold text-foreground">
                {previewData.info.dateStr}
              </h4>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectDay(previewData.info.offset)}
              className="text-xs gap-1.5"
            >
              <span>Ver Dia Completo</span>
              <ArrowRight size={13} />
            </Button>
          </div>

          {previewData.blocks.length > 0 ? (
            <div>
              {previewData.entryTime && (
                <div className="flex items-center gap-2 mb-2 text-xs font-mono text-muted-foreground">
                  <span>
                    Horário: {previewData.entryTime} – {previewData.exitTime}
                  </span>
                  <span>·</span>
                  <span>Carga: {previewData.workload}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {previewData.blocks.map((b, bi) => {
                  const color = getBlockDisplayColor(b);
                  const name =
                    b.activityName ||
                    BLOCK_STYLES[b.state]?.label ||
                    "Atividade";
                  const timeRange = `${TIME_SLOTS[b.start]} - ${
                    TIME_SLOTS[b.start + b.count] || "24:00"
                  }`;

                  return (
                    <div
                      key={bi}
                      title={timeRange}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/40 text-xs text-foreground"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium">{name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        ({TIME_SLOTS[b.start]} -{" "}
                        {TIME_SLOTS[b.start + b.count] || "24:00"})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-1">
              Dia de descanso ou sem tarefas agendadas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Componente Principal de Horários do Assistente
 */
export default function StaffScheduleSection() {
  const monthsList = useMemo(() => getRealMonthsRange(1, 2), []);
  const [viewMode, setViewMode] = useState<StaffViewMode>("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(0);
  const [monthOffset, setMonthOffset] = useState(1);
  const info = getDateInfo(dayOffset);

  function prevNav() {
    if (viewMode === "day") setDayOffset((d) => Math.max(d - 1, -30));
    if (viewMode === "week") setWeekStart((w) => Math.max(w - 7, -28));
    if (viewMode === "month") setMonthOffset((m) => Math.max(m - 1, 0));
  }
  function nextNav() {
    if (viewMode === "day") setDayOffset((d) => Math.min(d + 1, 60));
    if (viewMode === "week") setWeekStart((w) => Math.min(w + 7, 56));
    if (viewMode === "month")
      setMonthOffset((m) => Math.min(m + 1, monthsList.length - 1));
  }

  function navToDay(offset: number) {
    setDayOffset(offset);
    setViewMode("day");
  }

  return (
    <div>
      {/* Top Bar Fixa com Modos e Navegação */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-1 pb-3 border-b border-border mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            {viewMode === "day" && (
              <>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  {info.dayName}
                </p>
                <h1 className="text-xl font-semibold text-foreground">
                  {info.dateStr}
                </h1>
              </>
            )}
            {viewMode === "week" && (
              <h1 className="text-xl font-semibold text-foreground">Semana</h1>
            )}
            {viewMode === "month" && (
              <h1 className="text-xl font-semibold text-foreground">
                Calendário Mensal
              </h1>
            )}
          </div>

          {/* Toggle Dia / Semana / Mês */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border/50">
            {(["day", "week", "month"] as StaffViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === m
                    ? "bg-card shadow-xs text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "day" ? "Dia" : m === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>

        {/* Navegação Dia/Semana */}
        {viewMode !== "month" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevNav}
              className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex-1 text-center">
              {viewMode === "day" && (
                <button
                  type="button"
                  onClick={() => navToDay(0)}
                  className="text-xs text-accent font-semibold hover:underline"
                >
                  Ir para Hoje
                </button>
              )}
              {viewMode === "week" && (
                <span className="text-xs font-mono text-muted-foreground">
                  {getDateInfo(weekStart).dateStr} –{" "}
                  {getDateInfo(weekStart + 6).dateStr}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={nextNav}
              className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {viewMode === "day" && <StaffDayView dayOffset={dayOffset} />}
      {viewMode === "week" && (
        <StaffWeekView weekStart={weekStart} onSelectDay={navToDay} />
      )}
      {viewMode === "month" && (
        <StaffMonthView
          monthOffset={monthOffset}
          onSelectDay={navToDay}
          onChangeMonth={(d) =>
            setMonthOffset((m) =>
              Math.max(0, Math.min(m + d, monthsList.length - 1))
            )
          }
        />
      )}
    </div>
  );
}
