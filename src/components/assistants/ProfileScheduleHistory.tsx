import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import type { BlockState, EntityId } from "../../types";
import {
  BLOCK_STYLES,
  formatDurationSlots,
  slotsToBlocks,
  TIME_SLOTS,
  VIEW_START,
  VIEW_END,
} from "../dashboard/blockStyles";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useSchedulesList } from "../../hooks/api/useSchedules";
import { useAbsencesList } from "../../hooks/api/useAbsences";
import {
  useOperatingCalendar,
  useOperatingExceptions,
  useOperatingRules,
} from "../../hooks/api/useOperatingHours";
import { useHolidaysList } from "../../hooks/api/useHolidays";
import { useAllAssistantSchedules } from "../../hooks/api/useAssistantSchedules";
import { useAllAssistantExceptions } from "../../hooks/api/useAssistantExceptions";
import {
  buildDayMatrixFromApi,
  getDateInfo,
  getRealMonthsRange,
  getSchedulePublishStatusForDate,
  resolveAssistantShiftBounds,
  resolveSchoolDayStatusByIsoDate,
  type AssistantScheduleProfileApi,
  type AssistantExceptionApi,
} from "../../utils/scheduleMatrixUtils";
import { getBlockDisplayColor } from "../staff/StaffScheduleSection";

export interface ProfileScheduleHistoryProps {
  assistantId?: EntityId;
  assistantName?: string;
  schoolId?: EntityId;
}

/**
 * Separador de Histórico de Escalas do Perfil do Assistente.
 * Exibe o histórico semanal e mensal com barras de horário visuais,
 * cores de atividade reais, tooltips informativos e sem duplicações de cabeçalhos.
 */
export default function ProfileScheduleHistory({
  assistantId,
  assistantName = "Assistente",
  schoolId,
}: ProfileScheduleHistoryProps) {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(1);
  const [selectedMonthDay, setSelectedMonthDay] = useState<number | null>(null);

  const monthsList = useMemo(() => getRealMonthsRange(2, 4), []);
  const clampedMonthIdx = Math.max(0, Math.min(monthOffset, monthsList.length - 1));
  const currentMonth = monthsList[clampedMonthIdx];

  // Semana selecionada alinhada à Segunda-feira
  const todayInfo = getDateInfo(0);
  const currentWeekMondayOffset = -todayInfo.dow + weekOffset * 7;
  const weekOffsets = useMemo(
    () => Array.from({ length: 7 }, (_, i) => currentWeekMondayOffset + i),
    [currentWeekMondayOffset]
  );

  const weekStartInfo = getDateInfo(weekOffsets[0]);
  const weekEndInfo = getDateInfo(weekOffsets[6]);

  const queryStart =
    viewMode === "week" ? weekStartInfo.isoDate : currentMonth.startIso;
  const queryEnd =
    viewMode === "week" ? weekEndInfo.isoDate : currentMonth.endIso;

  const { data: schedules = [], isLoading: isLoadingSchedules } = useSchedulesList({
    start_date: queryStart,
    end_date: queryEnd,
    assistant_id: assistantId,
    per_page: 250,
  });

  const { data: absencesRes } = useAbsencesList({
    start_date: queryStart,
    end_date: queryEnd,
    assistant_id: assistantId,
    per_page: 100,
  });

  const { data: calendarDays } = useOperatingCalendar(queryStart, queryEnd);
  const { data: holidays } = useHolidaysList();
  const { data: operatingExceptions } = useOperatingExceptions("all");
  const { data: operatingRules } = useOperatingRules("all");

  const { data: allAssistantSchedules = [] } = useAllAssistantSchedules();
  const { data: allAssistantExceptions = [] } = useAllAssistantExceptions();

  const targetId = (assistantId as string) ?? "assistant";
  const initials = assistantName
    ? assistantName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "AO";

  const profilesByAssistant = useMemo(() => {
    const map: Record<string, AssistantScheduleProfileApi[]> = {};
    allAssistantSchedules.forEach((p) => {
      const aid = String(p.assistant_id);
      if (!map[aid]) map[aid] = [];
      map[aid].push(p);
    });
    return map;
  }, [allAssistantSchedules]);

  const exceptionsByAssistant = useMemo(() => {
    const map: Record<string, AssistantExceptionApi[]> = {};
    allAssistantExceptions.forEach((e) => {
      const aid = String(e.assistant_id);
      if (!map[aid]) map[aid] = [];
      map[aid].push(e);
    });
    return map;
  }, [allAssistantExceptions]);

  return (
    <div className="space-y-4">
      {/* Barra de Controlos (Semanal / Mensal e Navegação) */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-card border border-border p-3 rounded-xl shadow-2xs">
        {/* Toggle Semanal / Mensal */}
        <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border/50">
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "week"
                ? "bg-card shadow-xs text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semanal
          </button>
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "month"
                ? "bg-card shadow-xs text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mensal
          </button>
        </div>

        {/* Navegação Semanal */}
        {viewMode === "week" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset((p) => p - 1)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Semana anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold text-foreground px-2">
              {weekStartInfo.dateStr.slice(0, 6)} – {weekEndInfo.dateStr}
            </span>
            <button
              type="button"
              onClick={() => setWeekOffset((p) => p + 1)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Semana seguinte"
            >
              <ChevronRight size={14} />
            </button>
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="ml-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Esta Semana
              </button>
            )}
          </div>
        )}

        {/* Navegação Mensal */}
        {viewMode === "month" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={monthOffset <= 0}
              onClick={() => setMonthOffset((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold text-foreground px-2">
              {currentMonth.label}
            </span>
            <button
              type="button"
              disabled={monthOffset >= monthsList.length - 1}
              onClick={() => setMonthOffset((p) => Math.min(monthsList.length - 1, p + 1))}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer"
              title="Mês seguinte"
            >
              <ChevronRight size={14} />
            </button>
            {monthOffset !== 1 && (
              <button
                type="button"
                onClick={() => setMonthOffset(1)}
                className="ml-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Mês Atual
              </button>
            )}
          </div>
        )}
      </div>

      {/* VISTA SEMANAL */}
      {viewMode === "week" && (
        <div className="space-y-2.5">
          {weekOffsets.map((offset) => {
            const info = getDateInfo(offset);
            const isToday = offset === 0;
            const status = resolveSchoolDayStatusByIsoDate(info.isoDate, {
              calendarDays,
              holidays,
              operatingExceptions,
              operatingRules,
            });
            const isClosed = !status.isOpen;

            const { matrix, slotMetaByAssistant } = buildDayMatrixFromApi({
              isoDate: info.isoDate,
              isOpen: !isClosed,
              assistants: [
                {
                  id: targetId,
                  name: assistantName,
                  initials,
                },
              ],
              schedules,
              absences: absencesRes?.data || [],
              profilesByAssistant,
              exceptionsByAssistant,
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

            const weekShiftBounds = resolveAssistantShiftBounds({
              assistantId: targetId,
              isoDate: info.isoDate,
              dow: info.dow,
              viewStartSlot: status.viewStartSlot ?? VIEW_START,
              viewEndSlot: status.viewEndSlot ?? VIEW_END,
              profiles: profilesByAssistant[String(targetId)],
              exceptions: exceptionsByAssistant[String(targetId)],
              schedulesList: schedules,
              absences: absencesRes?.data || [],
            });

            const shiftStart = weekShiftBounds.startSlot ?? (entryBlock ? entryBlock.start : 32);
            const shiftEnd = weekShiftBounds.endSlot ?? (lastBlock ? lastBlock.start + lastBlock.count : 68);
            const shiftSlots = Math.max(1, shiftEnd - shiftStart);

            const entryExitStr =
              entryBlock && lastBlock
                ? `${TIME_SLOTS[entryBlock.start]} – ${
                    TIME_SLOTS[lastBlock.start + lastBlock.count] || "24:00"
                  }`
                : null;

            // Estado de publicação para o dia
            const pubInfo = getSchedulePublishStatusForDate(info.isoDate, schedules);

            return (
              <Card
                key={offset}
                className={`p-3.5 transition-all ${
                  isToday
                    ? "border-primary bg-primary/3 shadow-xs"
                    : isClosed || (!hasWork && !hasAbsent)
                    ? "border-border/60 bg-card/60 opacity-85"
                    : "border-border bg-card shadow-2xs"
                }`}
              >
                {/* Linha de Cabeçalho do Dia */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground min-w-[70px]">
                      {info.dayName}
                    </span>
                    <span className={`text-xs font-mono ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
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
                    {(() => {
                      const daySchedule = schedules.find((sc) => {
                        if (sc.entries && sc.entries.length > 0) {
                          return sc.entries.some((entry) => entry.date?.slice(0, 10) === info.isoDate);
                        }
                        const ws = (sc.week_start || "").slice(0, 10);
                        const we = (sc.week_end || "").slice(0, 10);
                        return Boolean(ws && we && ws <= info.isoDate && info.isoDate <= we);
                      });
                      const isDayTransfer = Boolean(
                        daySchedule?.is_temporary_transfer ||
                        (daySchedule?.school_id && schoolId && String(daySchedule.school_id) !== String(schoolId))
                      );
                      if (!isDayTransfer) return null;
                      return (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 flex items-center gap-1 font-medium"
                          title={`Colocação em ${daySchedule?.school_name || "outra escola"}`}
                        >
                          <ArrowRightLeft size={10} className="shrink-0" />
                          <span>{daySchedule?.school_name || "Transferência"}</span>
                        </Badge>
                      );
                    })()}
                  </div>

                  {/* Estado do Dia / Horário de Trabalho */}
                  <div>
                    {isClosed ? (
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          status.reasonType === "exception"
                            ? "border-destructive/30 text-destructive bg-destructive/10 font-medium"
                            : status.reasonType === "holiday"
                            ? "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium"
                            : "border-border text-muted-foreground bg-muted/40"
                        }`}
                      >
                        {status.closedLabel || "Encerrada"}
                      </Badge>
                    ) : isLoadingSchedules ? (
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Loader2 size={11} className="animate-spin text-primary" />
                        <span>A verificar...</span>
                      </span>
                    ) : !pubInfo.hasSchedule ? (
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border">
                        Não gerada
                      </span>
                    ) : !pubInfo.isPublished ? (
                      <span className="text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        Em preparação
                      </span>
                    ) : hasWork && entryExitStr ? (
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
                        Dia de descanso
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra Contínua do Horário com Cores Reais e Tooltips com Titles */}
                {!isClosed && activeBlocks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="relative h-4 rounded-md overflow-hidden bg-muted/40 my-1">
                      {activeBlocks.map((b, bi) => {
                        const cs = Math.max(b.start, shiftStart);
                        const ce = Math.min(b.start + b.count, shiftEnd);
                        if (ce <= cs) return null;
                        const color = getBlockDisplayColor(b);
                        const name = b.activityName || BLOCK_STYLES[b.state]?.label || "Atividade";
                        const timeStr = `${TIME_SLOTS[b.start]} – ${
                          TIME_SLOTS[b.start + b.count] || "24:00"
                        }`;

                        const dMin = b.count * 15;
                        const dStr =
                          dMin >= 60
                            ? `${Math.floor(dMin / 60)}h${dMin % 60 > 0 ? ` ${dMin % 60}m` : ""}`
                            : `${dMin}m`;

                        const tooltipTitle = `${name}: ${timeStr} (${dStr})`;

                        return (
                          <Tooltip key={bi}>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute inset-y-0.5 transition-transform hover:scale-105 hover:z-10 cursor-pointer rounded-xs"
                                style={{
                                  left: `${((cs - shiftStart) / shiftSlots) * 100}%`,
                                  width: `${((ce - cs) / shiftSlots) * 100}%`,
                                  backgroundColor: color,
                                }}
                                title={tooltipTitle}
                              />
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              sideOffset={5}
                              className="bg-popover text-popover-foreground border border-border shadow-xl px-3 py-2 rounded-xl text-left"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="font-semibold text-xs text-foreground">
                                  {name}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-muted-foreground mt-1">
                                {timeStr} ({dStr})
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>

                    {/* Lista resumida das atividades deste dia */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {activeBlocks
                        .filter((b) => b.state !== "lunch")
                        .map((b, bi) => {
                          const color = getBlockDisplayColor(b);
                          const name = b.activityName || BLOCK_STYLES[b.state]?.label || "Atividade";
                          const timeStr = `${TIME_SLOTS[b.start]}–${
                            TIME_SLOTS[b.start + b.count] || "24:00"
                          }`;
                          return (
                            <div
                              key={bi}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground/80 bg-muted/50 border border-border/50 px-2 py-0.5 rounded-md"
                              title={`${name}: ${timeStr}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span>{name}</span>
                              <span className="font-mono text-muted-foreground text-[9px]">
                                {timeStr}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* VISTA MENSAL */}
      {viewMode === "month" && (
        <Card className="p-4 border-border bg-card shadow-2xs space-y-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <div
                key={d}
                className="py-1 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider"
              >
                {d}
              </div>
            ))}

            {Array.from({ length: currentMonth.firstDow }, (_, i) => (
              <div key={`blank-${i}`} className="h-12" />
            ))}

            {Array.from({ length: currentMonth.days }, (_, i) => {
              const dayNum = i + 1;
              const dow = (currentMonth.firstDow + i) % 7;
              const isWeekend = dow >= 5;
              const mm = String(currentMonth.monthIndex + 1).padStart(2, "0");
              const dd = String(dayNum).padStart(2, "0");
              const dayIso = `${currentMonth.year}-${mm}-${dd}`;

              const pubInfo = getSchedulePublishStatusForDate(dayIso, schedules);

              const { matrix } = buildDayMatrixFromApi({
                isoDate: dayIso,
                isOpen: !isWeekend,
                assistants: [{ id: targetId, name: assistantName, initials }],
                schedules,
                absences: absencesRes?.data || [],
                profilesByAssistant,
                exceptionsByAssistant,
              });
              const daySlots = matrix[targetId] || Array(96).fill("off");
              const isAbsent = daySlots.some((s) => s === "absent");
              const hasWork = daySlots.some((s) => s !== "off" && s !== "absent" && s !== "lunch");
              const isSelected = selectedMonthDay === dayNum;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => setSelectedMonthDay(isSelected ? null : dayNum)}
                  className={`h-12 rounded-xl flex flex-col items-center justify-between p-1 transition-colors relative border cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : isAbsent
                      ? "border-destructive/30 bg-destructive/10 text-destructive font-semibold"
                      : isWeekend
                      ? "border-transparent text-muted-foreground/30 bg-muted/10 cursor-default"
                      : "border-border/50 hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <span className="text-[11px] font-mono">{dayNum}</span>
                  {!isWeekend && (
                    <div className="flex items-center gap-0.5 mb-0.5">
                      {isAbsent ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" title="Ausência" />
                      ) : pubInfo.isPublished && hasWork ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" title="Escala Publicada" />
                      ) : pubInfo.isDraft ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Em Preparação" />
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detalhe do Dia Selecionado no Mês */}
          {selectedMonthDay && (
            <div className="pt-3 border-t border-border/60">
              {(() => {
                const mm = String(currentMonth.monthIndex + 1).padStart(2, "0");
                const dd = String(selectedMonthDay).padStart(2, "0");
                const dayIso = `${currentMonth.year}-${mm}-${dd}`;
                const pubInfo = getSchedulePublishStatusForDate(dayIso, schedules);

                const { matrix, slotMetaByAssistant } = buildDayMatrixFromApi({
                  isoDate: dayIso,
                  isOpen: true,
                  assistants: [{ id: targetId, name: assistantName, initials }],
                  schedules,
                  absences: absencesRes?.data || [],
                  profilesByAssistant,
                  exceptionsByAssistant,
                });
                const daySlots = matrix[targetId] || Array(96).fill("off");
                const meta = slotMetaByAssistant?.[targetId] || {};
                const dayBlocks = slotsToBlocks(daySlots, meta);
                const activeBlocks = dayBlocks.filter((b) => b.state !== "off");

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Dia {selectedMonthDay} de {currentMonth.label}
                      </span>
                      <span className="text-xs font-medium">
                        {!pubInfo.hasSchedule ? (
                          <Badge variant="outline" className="text-[10px]">Não gerada</Badge>
                        ) : !pubInfo.isPublished ? (
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 bg-amber-500/10">Em preparação</Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px]">Publicada</Badge>
                        )}
                      </span>
                    </div>

                    {activeBlocks.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Sem horário ou atividades atribuídas neste dia.
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {activeBlocks.map((b, bi) => {
                          const color = getBlockDisplayColor(b);
                          const name = b.activityName || BLOCK_STYLES[b.state]?.label || "Atividade";
                          const timeStr = `${TIME_SLOTS[b.start]} – ${TIME_SLOTS[b.start + b.count] || "24:00"}`;
                          return (
                            <div
                              key={bi}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/40 text-xs font-medium"
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-semibold text-foreground">{name}</span>
                              <span className="font-mono text-muted-foreground text-[11px]">{timeStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
