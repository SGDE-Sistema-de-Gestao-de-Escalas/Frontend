import { useMemo } from "react";
import { Lock } from "lucide-react";
import type { BlockState, EntityId } from "../../types";
import { Card } from "../ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import ActionTooltip from "../common/ActionTooltip";
import {
  BLOCK_STYLES,
  formatDurationSlots,
  slotsToBlocks,
  TIME_SLOTS,
} from "./blockStyles";
import { useAssistantsList } from "../../hooks/api/useAssistants";
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
  getThreeWeeksWindowIso,
  getSchedulePublishStatusForDate,
  hasGeneratedScheduleForDate,
  resolveSchoolDayStatusByIsoDate,
  SlotEntryMetadata,
} from "../../utils/scheduleMatrixUtils";

interface WeekMatrixViewProps {
  weekStart: number;
  onSelectDay: (offset: number) => void;
  onSelectAssistant: (id: EntityId) => void;
}

export default function WeekMatrixView({
  weekStart,
  onSelectDay,
  onSelectAssistant,
}: WeekMatrixViewProps) {
  const weekOffsets = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart + i),
    [weekStart]
  );

  const weekWindow = useMemo(() => getThreeWeeksWindowIso(weekStart), [weekStart]);

  const { data: assistants = [] } = useAssistantsList();
  const { data: schedules = [] } = useSchedulesList({
    start_date: weekWindow.startIso,
    end_date: weekWindow.endIso,
    per_page: 200,
  });
  const { data: absencesRes } = useAbsencesList({
    start_date: weekWindow.startIso,
    end_date: weekWindow.endIso,
    per_page: 200,
  });
  const { data: calendarDays = [] } = useOperatingCalendar(
    weekWindow.startIso,
    weekWindow.endIso
  );
  const { data: operatingRules = [] } = useOperatingRules();
  const { data: operatingExceptions = [] } = useOperatingExceptions();
  const { data: holidays = [] } = useHolidaysList();

  const operatingSources = useMemo(
    () => ({
      calendarDays,
      operatingRules,
      operatingExceptions,
      holidays,
    }),
    [calendarDays, operatingRules, operatingExceptions, holidays]
  );

  const activeAssistants = useMemo(
    () =>
      assistants.filter(
        (a) => !a.deleted_at && (a.active ?? a.is_active ?? true)
      ),
    [assistants]
  );

  const dayDataByOffset = useMemo(() => {
    const map: Record<
      number,
      {
        matrix: Record<EntityId, BlockState[]>;
        slotMetaByAssistant: Record<EntityId, Record<number, SlotEntryMetadata>>;
      }
    > = {};
    weekOffsets.forEach((offset) => {
      const info = getDateInfo(offset);
      const status = resolveSchoolDayStatusByIsoDate(
        info.isoDate,
        operatingSources
      );
      const res = buildDayMatrixFromApi({
        isoDate: info.isoDate,
        isOpen: status.isOpen,
        assistants: activeAssistants,
        schedules,
        absences: absencesRes?.data || [],
      });
      map[offset] = res;
    });
    return map;
  }, [weekOffsets, operatingSources, activeAssistants, schedules, absencesRes]);

  return (
    <TooltipProvider delayDuration={60}>
      <Card className="overflow-hidden border-border bg-card shadow-xs">
        {/* Legend */}
        <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-4 flex-wrap">
          {(
            [
              "collection",
              "work",
              "surveillance",
              "cleaning",
              "delivery",
              "lunch",
              "absent",
            ] as BlockState[]
          ).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded-sm ${BLOCK_STYLES[s].bg} flex items-center justify-center`}
              >
                {BLOCK_STYLES[s].locked && (
                  <Lock size={6} className="text-white/70" />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {BLOCK_STYLES[s].label}
              </span>
            </div>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground hidden sm:block">
            Clique num dia para vista diária · Clique num nome para horário detalhado
          </span>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: 740 }}>
            {/* Day column headers */}
            <div className="flex border-b border-border bg-muted/10">
              <div className="w-40 flex-shrink-0 border-r border-border px-3 py-2 text-xs text-muted-foreground font-medium">
                Assistente
              </div>
              {weekOffsets.map((offset) => {
                const info = getDateInfo(offset);
                const status = resolveSchoolDayStatusByIsoDate(
                  info.isoDate,
                  operatingSources
                );
                const isToday = offset === 0;
                const isClosed = !status.isOpen;
                const hasGenerated =
                  !isClosed &&
                  hasGeneratedScheduleForDate(info.isoDate, schedules);
                const pubInfo = !isClosed
                  ? getSchedulePublishStatusForDate(info.isoDate, schedules)
                  : null;
                const hoursLabel =
                  !isClosed && status.openingTime && status.closingTime
                    ? `${status.openingTime.slice(0, 5)}–${status.closingTime.slice(0, 5)}`
                    : null;

                const tooltipText = isClosed
                  ? status.title || "Encerrado"
                  : pubInfo?.isDraft
                  ? `Horário em rascunho (não publicado) · Funcionamento: ${hoursLabel || ""}`
                  : pubInfo?.isPublished
                  ? `Horário publicado · Funcionamento: ${hoursLabel || ""}`
                  : hoursLabel
                  ? `Horário de funcionamento: ${hoursLabel}`
                  : null;

                return (
                  <ActionTooltip key={offset} content={tooltipText}>
                    <button
                      type="button"
                      onClick={() => onSelectDay(offset)}
                      className={`w-full px-2 py-2 text-center border-r border-border/50 last:border-0 transition-colors cursor-pointer ${
                        isClosed
                          ? "bg-muted/15 hover:bg-muted/30"
                          : "hover:bg-primary/5"
                      } ${isToday ? "bg-primary/10" : ""}`}
                    >
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-wide ${
                        isToday
                          ? "text-primary"
                          : isClosed
                          ? "text-muted-foreground/60"
                          : "text-muted-foreground"
                      }`}
                    >
                      {info.dayShort}
                    </p>
                    <p
                      className={`text-xs font-mono mt-0.5 ${
                        isToday
                          ? "text-primary font-bold"
                          : isClosed
                          ? "text-muted-foreground/60"
                          : "text-foreground"
                      }`}
                    >
                      {info.dateStr}
                    </p>
                    {hoursLabel && (
                      <p className="text-[9px] font-mono text-muted-foreground/75 mt-0.5">
                        {hoursLabel}
                      </p>
                    )}
                    {isClosed ? (
                      <span
                        className={`inline-block mt-0.5 text-[9px] font-semibold px-1 py-0.2 rounded truncate max-w-[95px] ${
                          status.reasonType === "exception"
                            ? "text-destructive bg-destructive/10 border border-destructive/20"
                            : status.reasonType === "holiday"
                            ? "text-[#D97706] bg-[#D97706]/10 border border-[#D97706]/20"
                            : "text-muted-foreground/60"
                        }`}
                        title={status.title}
                      >
                        {status.closedLabel || (status.reasonType === "exception" ? "Exceção" : "Encerrado")}
                      </span>
                    ) : !hasGenerated ? (
                      <span className="inline-block mt-0.5 text-[9px] font-medium text-[#D97706]">
                        Não gerada
                      </span>
                    ) : pubInfo ? (
                      pubInfo.isPublished ? (
                        <span className="inline-block mt-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Publicada
                        </span>
                      ) : (
                        <span className="inline-block mt-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                          Rascunho
                        </span>
                      )
                    ) : null}
                  </button>
                </ActionTooltip>
              );
              })}
            </div>

            {/* Assistant rows */}
            {activeAssistants.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Sem assistentes ativos nesta escola.
              </div>
            ) : (
              activeAssistants.map((assistant) => (
                <div
                  key={assistant.id}
                  className="flex border-b border-border/50 last:border-b-0 hover:bg-muted/10 transition-colors"
                >
                  <button
                    type="button"
                    className="w-40 flex-shrink-0 px-3 py-1.5 border-r border-border flex items-center gap-2 hover:bg-primary/5 transition-colors text-left"
                    onClick={() => onSelectAssistant(assistant.id)}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-primary font-mono">
                        {assistant.initials}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground hover:text-primary truncate transition-colors">
                        {assistant.name.split(" ")[0]}{" "}
                        {assistant.name.split(" ").slice(-1)[0]?.[0]
                          ? `${assistant.name.split(" ").slice(-1)[0][0]}.`
                          : ""}
                      </p>
                      {assistant.exception && (
                        <p className="text-[9px] text-[#D97706] truncate">
                          {assistant.exception}
                        </p>
                      )}
                    </div>
                  </button>
                  {weekOffsets.map((offset) => {
                    const dayData = dayDataByOffset[offset];
                    const matrix = dayData?.matrix || {};
                    const slots = matrix[assistant.id] || Array(96).fill("off");
                    const meta = dayData?.slotMetaByAssistant?.[assistant.id];
                    const info = getDateInfo(offset);
                    const status = resolveSchoolDayStatusByIsoDate(
                      info.isoDate,
                      operatingSources
                    );
                    const isClosed = !status.isOpen;
                    const isToday = offset === 0;
                    const dayViewStart = status.viewStartSlot;
                    const dayViewEnd = status.viewEndSlot;
                    const dayViewSlots = Math.max(1, dayViewEnd - dayViewStart);

                    return (
                      <div
                        key={offset}
                        onClick={() => onSelectDay(offset)}
                        className={`flex-1 h-10 border-r border-border/50 last:border-0 overflow-hidden transition-colors cursor-pointer ${
                          isClosed
                            ? "bg-muted/15 hover:bg-muted/30"
                            : "hover:bg-muted/20"
                        } ${isToday ? "ring-1 ring-inset ring-primary/30" : ""}`}
                      >
                        <div className="relative w-full h-full">
                          {isToday && (
                            <div className="absolute inset-0 bg-primary/5" />
                          )}
                          {isClosed && (
                            <div
                              className="w-full h-full flex items-center justify-center px-1 text-center"
                              title={status.title}
                            >
                              <span
                                className={`text-[10px] font-medium truncate max-w-full px-1.5 py-0.5 rounded ${
                                  status.reasonType === "exception"
                                    ? "text-destructive/80 bg-destructive/5 border border-destructive/15"
                                    : status.reasonType === "holiday"
                                    ? "text-[#D97706]/80 bg-[#D97706]/5 border border-[#D97706]/15"
                                    : "text-muted-foreground/40"
                                }`}
                              >
                                {status.closedLabel || (status.reasonType === "exception" ? "Exceção" : "Encerrado")}
                              </span>
                            </div>
                          )}
                          {slotsToBlocks(slots, meta).map((b) => {
                            const cs = Math.max(b.start, dayViewStart);
                            const ce = Math.min(
                              b.start + b.count,
                              dayViewEnd
                            );
                            if (b.state === "off" || ce <= cs) return null;

                            const styleConfig = BLOCK_STYLES[b.state];
                            const displayLabel = b.activityName || styleConfig.label;
                            const isLocked = b.isLocked ?? styleConfig.locked;
                            const startTimeStr = TIME_SLOTS[b.start] ?? "";
                            const endTimeStr =
                              TIME_SLOTS[Math.min(b.start + b.count, 95)] ??
                              "24:00";
                            const durationStr = formatDurationSlots(b.count);

                            const radiusClass =
                              b.hasPrevAdjacent && b.hasNextAdjacent
                                ? "rounded-none"
                                : b.hasPrevAdjacent
                                ? "rounded-l-none rounded-r-md"
                                : b.hasNextAdjacent
                                ? "rounded-l-md rounded-r-none"
                                : "rounded-md";

                            const separatorClass = b.hasPrevAdjacent
                              ? "border-l border-card/85"
                              : "";

                            return (
                              <Tooltip key={b.start}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`absolute inset-y-1.5 ${radiusClass} ${separatorClass} ${
                                      b.activityColor ? "" : styleConfig.bg
                                    } hover:brightness-110 hover:z-10 overflow-hidden transition-all`}
                                    style={{
                                      left: `${
                                        ((cs - dayViewStart) / dayViewSlots) *
                                        100
                                      }%`,
                                      width: `${
                                        ((ce - cs) / dayViewSlots) * 100
                                      }%`,
                                      ...(b.activityColor
                                        ? { backgroundColor: b.activityColor }
                                        : {}),
                                    }}
                                  >
                                    {isLocked && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <Lock
                                          size={7}
                                          className="text-white/60"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  sideOffset={6}
                                  className="bg-popover text-popover-foreground border border-border shadow-xl px-3 py-2 rounded-xl text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        b.activityColor ? "" : styleConfig.bg
                                      }`}
                                      style={
                                        b.activityColor
                                          ? { backgroundColor: b.activityColor }
                                          : undefined
                                      }
                                    />
                                    <span className="font-semibold text-xs text-foreground">
                                      {displayLabel}
                                    </span>
                                    {b.activityName &&
                                      b.activityName !== styleConfig.label && (
                                        <span className="text-[10px] text-muted-foreground">
                                          ({styleConfig.label})
                                        </span>
                                      )}
                                  </div>
                                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                    {info.dayShort} {info.dateStr} · {startTimeStr}–
                                    {endTimeStr} ({durationStr})
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}
