import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Eye,
  Lock,
  UserX,
} from "lucide-react";
import type { BlockState, StaffViewMode } from "../../types";
import {
  BLOCK_STYLES,
  formatDurationSlots,
  groupSlotsFn,
  slotsToBlocks,
  TIME_SLOTS,
  VIEW_START,
  VIEW_END,
  VIEW_SLOTS,
} from "../dashboard/blockStyles";
import { Badge } from "../ui/badge";
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

const STAFF_BLOCK_COLORS: Record<BlockState, string> = {
  work: "bg-accent/10 border-l-accent text-accent",
  surveillance: "bg-[#7C3AED]/10 border-l-[#7C3AED] text-[#7C3AED]",
  lunch: "bg-[#D97706]/10 border-l-[#D97706] text-[#D97706]",
  absent: "bg-destructive/10 border-l-destructive text-destructive",
  off: "bg-muted border-l-border text-muted-foreground",
  cleaning: "bg-[#06B6D4]/10 border-l-[#06B6D4] text-[#06B6D4]",
  collection: "bg-[#EC4899]/10 border-l-[#EC4899] text-[#EC4899]",
  delivery: "bg-[#10B981]/10 border-l-[#10B981] text-[#10B981]",
};

const STAFF_BLOCK_ICONS: Record<BlockState, React.ReactNode> = {
  work: <Clock size={16} />,
  surveillance: <Eye size={16} />,
  lunch: <Coffee size={16} />,
  absent: <UserX size={16} />,
  off: null,
  cleaning: null,
  collection: null,
  delivery: null,
};

function useStaffDayBlocks(dayOffset: number) {
  const { user } = useAuth();
  const info = getDateInfo(dayOffset);
  const assistantId = user.assistant_id ?? user.id ?? "staff";

  const { data: schedules = [] } = useSchedulesList({
    start_date: info.isoDate,
    end_date: info.isoDate,
    assistant_id: user.assistant_id ?? undefined,
  });

  const { data: absencesRes } = useAbsencesList({
    start_date: info.isoDate,
    end_date: info.isoDate,
    assistant_id: user.assistant_id ?? undefined,
    per_page: 50,
  });

  return useMemo(() => {
    const dummyAssistant = {
      id: assistantId,
      name: user.name || "Assistente",
      initials: user.initials || "AO",
    };

    // Caso o endpoint devolva todas as escalas da escola ou apenas a do assistente:
    const effectiveSchedules =
      user.assistant_id || schedules.length === 0
        ? schedules
        : [schedules[0]];

    const targetId =
      user.assistant_id ??
      effectiveSchedules[0]?.assistant_id ??
      dummyAssistant.id;

    const { matrix } = buildDayMatrixFromApi({
      isoDate: info.isoDate,
      isOpen: info.dow < 5,
      assistants: [{ ...dummyAssistant, id: targetId }],
      schedules: effectiveSchedules,
      absences: absencesRes?.data || [],
    });

    const slots = matrix[targetId] || Array(96).fill("off");
    const groups = groupSlotsFn(slots);
    return { slots, groups };
  }, [info.isoDate, info.dow, assistantId, user, schedules, absencesRes]);
}

export function StaffDayView({ dayOffset }: { dayOffset: number }) {
  const info = getDateInfo(dayOffset);
  const { slots, groups } = useStaffDayBlocks(dayOffset);
  const isWeekend = info.dow >= 5;
  const entryGroup = groups.find((g) => g.state !== "off");
  const lastGroup = [...groups].reverse().find((g) => g.state !== "off");
  const activeWorkSlots = slots.filter(
    (s) => s !== "off" && s !== "lunch" && s !== "absent"
  ).length;
  const workloadLabel =
    activeWorkSlots > 0 ? formatDurationSlots(activeWorkSlots) : "—";

  return (
    <div className="pt-4">
      {isWeekend ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🌿</p>
          <p className="text-sm font-medium text-foreground">Dia de Folga</p>
          <p className="text-xs text-muted-foreground mt-1">{info.dayName}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              {
                label: "Entrada",
                value: entryGroup ? TIME_SLOTS[entryGroup.start] : "—",
              },
              {
                label: "Saída",
                value: lastGroup
                  ? TIME_SLOTS[lastGroup.end + 1] || "24:00"
                  : "—",
              },
              { label: "Carga", value: workloadLabel },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-card border border-border rounded-xl p-3 text-center"
              >
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-base font-mono font-semibold text-foreground mt-0.5">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                A escala ainda não foi gerada para este dia
              </p>
            ) : (
              groups.map((block, i) => {
                const startTime = TIME_SLOTS[block.start];
                const endTime = TIME_SLOTS[block.end + 1] || "24:00";
                const dMin = (block.end - block.start + 1) * 15;
                const dStr =
                  dMin >= 60
                    ? `${Math.floor(dMin / 60)}h${
                        dMin % 60 > 0 ? ` ${dMin % 60}min` : ""
                      }`
                    : `${dMin}min`;
                return (
                  <div
                    key={i}
                    className={`border-l-4 rounded-r-xl px-4 py-3 ${
                      STAFF_BLOCK_COLORS[block.state]
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {STAFF_BLOCK_ICONS[block.state]}
                        <span className="text-sm font-semibold">
                          {BLOCK_STYLES[block.state]?.label || block.state}
                        </span>
                      </div>
                      <span className="text-xs font-mono opacity-70">
                        {dStr}
                      </span>
                    </div>
                    <p className="text-xs font-mono mt-1 opacity-60">
                      {startTime} – {endTime}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

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
    <div className="pt-2 pb-4 space-y-2">
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
        const { matrix } = buildDayMatrixFromApi({
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
        const activeSlots = slots.filter(
          (s) => s !== "off" && s !== "lunch" && s !== "absent"
        ).length;
        const hasWork = activeSlots > 0;
        const hasAbsent = slots.some((s) => s === "absent");
        return (
          <button
            key={offset}
            type="button"
            onClick={() => !isClosed && onSelectDay(offset)}
            className={`w-full text-left rounded-xl border p-3 transition-colors
              ${
                isToday
                  ? "border-accent bg-accent/5"
                  : isClosed
                  ? "border-border bg-muted/20 opacity-50"
                  : "border-border bg-card hover:border-accent/40 hover:bg-accent/3"
              }
              ${isClosed ? "cursor-default" : "cursor-pointer"}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold ${
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
                {isToday && <Badge variant="default">Hoje</Badge>}
              </div>
              {!isClosed ? (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {hasAbsent
                    ? "Ausência"
                    : hasWork
                    ? formatDurationSlots(activeSlots)
                    : "Sem escala"}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {status.closedLabel || "Encerrada"}
                </span>
              )}
            </div>
            {!isClosed && (
              <div className="relative h-4 rounded-sm overflow-hidden bg-muted/30">
                {slotsToBlocks(slots).map((b) => {
                  const cs = Math.max(b.start, dayViewStart);
                  const ce = Math.min(b.start + b.count, dayViewEnd);
                  if (b.state === "off" || ce <= cs) return null;
                  return (
                    <div
                      key={b.start}
                      className={`absolute inset-y-1 rounded-md ${
                        BLOCK_STYLES[b.state]?.bg
                      } opacity-75 overflow-hidden`}
                      style={{
                        left: `${((cs - dayViewStart) / dayViewSlots) * 100}%`,
                        width: `${((ce - cs) / dayViewSlots) * 100}%`,
                      }}
                    >
                      {BLOCK_STYLES[b.state]?.locked && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Lock size={6} className="text-white/50" />
                        </div>
                      )}
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

  return (
    <div className="pt-2 pb-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onChangeMonth(-1)}
          disabled={clampedIdx === 0}
          className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {month.label}
        </span>
        <button
          type="button"
          onClick={() => onChangeMonth(1)}
          disabled={clampedIdx >= monthsList.length - 1}
          className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      {/* DOW headers */}
      <div className="grid grid-cols-7 mb-1">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-semibold text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: month.firstDow }, (_, i) => (
          <div key={`pre-${i}`} />
        ))}
        {Array.from({ length: month.days }, (_, i) => {
          const dayNum = i + 1;
          const offset = month.firstOffset + i;
          const dow = (month.firstDow + i) % 7;
          const isWeekend = dow >= 5;
          const isToday = offset === 0;
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
              onClick={() => !isWeekend && onSelectDay(offset)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-mono transition-colors
                ${
                  isToday
                    ? "bg-accent text-white font-bold ring-2 ring-accent"
                    : ""
                }
                ${!isToday && hasAbsent ? "bg-[#C8291A]/15 text-[#C8291A]" : ""}
                ${
                  !isToday && hasWork
                    ? "bg-[#1A56DB]/10 text-[#1A56DB] hover:bg-[#1A56DB]/20"
                    : ""
                }
                ${
                  !isToday && !hasWork && !hasAbsent
                    ? isWeekend
                      ? "text-muted-foreground/30 cursor-default"
                      : "text-muted-foreground hover:bg-muted cursor-pointer"
                    : ""
                }
              `}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
        {[
          { color: "bg-[#1A56DB]/20", label: "Trabalhado" },
          { color: "bg-[#C8291A]/15", label: "Ausência" },
          { color: "bg-muted/50", label: "Folga" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${l.color}`} />
            <span className="text-[10px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StaffScheduleSection() {
  const monthsList = useMemo(() => getRealMonthsRange(1, 2), []);
  const [viewMode, setViewMode] = useState<StaffViewMode>("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(0);
  // index 1 = current month when monthsBefore = 1
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
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-2 pb-3 border-b border-border mb-4">
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
                Calendário
              </h1>
            )}
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {(["day", "week", "month"] as StaffViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === m
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {m === "day" ? "Dia" : m === "week" ? "Sem" : "Mês"}
              </button>
            ))}
          </div>
        </div>
        {/* Day/week nav */}
        {viewMode !== "month" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevNav}
              className="p-1.5 rounded border border-border hover:bg-muted transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="flex-1 text-center">
              {viewMode === "day" && (
                <button
                  type="button"
                  onClick={() => navToDay(0)}
                  className="text-xs text-accent font-medium"
                >
                  Hoje
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
              className="p-1.5 rounded border border-border hover:bg-muted transition-colors"
            >
              <ChevronRight size={14} />
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
