import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, UserX } from "lucide-react";
import type { BlockState, EntityId } from "../../types";
import {
  BLOCK_STYLES,
  groupSlotsFn,
  TIME_SLOTS,
} from "../dashboard/blockStyles";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { useSchedulesList } from "../../hooks/api/useSchedules";
import { useAbsencesList } from "../../hooks/api/useAbsences";
import {
  buildDayMatrixFromApi,
  getDateInfo,
  getRealMonthsRange,
} from "../../utils/scheduleMatrixUtils";

interface ProfileScheduleHistoryProps {
  assistantId?: EntityId;
}

export default function ProfileScheduleHistory({
  assistantId,
}: ProfileScheduleHistoryProps) {
  const monthsList = useMemo(() => getRealMonthsRange(3, 2), []);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  // index 3 = current month when monthsBefore = 3
  const [monthIdx, setMonthIdx] = useState(3);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const clampedMonthIdx = Math.max(0, Math.min(monthIdx, monthsList.length - 1));
  const currentMonth = monthsList[clampedMonthIdx];

  // Calculate week start offset aligned to Monday of the selected weekOffset
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

  const { data: schedules = [] } = useSchedulesList({
    start_date: queryStart,
    end_date: queryEnd,
    assistant_id: assistantId,
  });

  const { data: absencesRes } = useAbsencesList({
    start_date: queryStart,
    end_date: queryEnd,
    assistant_id: assistantId,
    per_page: 100,
  });

  const dummyAssistant = useMemo(
    () => ({
      id: assistantId ?? "self",
      name: "Assistente",
      initials: "AO",
    }),
    [assistantId]
  );

  function getSlotsForIsoDate(isoDate: string, isWeekend: boolean): BlockState[] {
    if (!assistantId) return Array(96).fill("off");
    const { matrix } = buildDayMatrixFromApi({
      isoDate,
      isOpen: !isWeekend,
      assistants: [dummyAssistant],
      schedules,
      absences: absencesRes?.data || [],
    });
    return matrix[dummyAssistant.id] || Array(96).fill("off");
  }

  const selectedDayIso = useMemo(() => {
    if (!selectedDay) return null;
    const mm = String(currentMonth.monthIndex + 1).padStart(2, "0");
    const dd = String(selectedDay).padStart(2, "0");
    return `${currentMonth.year}-${mm}-${dd}`;
  }, [selectedDay, currentMonth]);

  const selectedDaySlots = useMemo(() => {
    if (!selectedDay || !selectedDayIso) return null;
    const dow = (currentMonth.firstDow + selectedDay - 1) % 7;
    return getSlotsForIsoDate(selectedDayIso, dow >= 5);
  }, [selectedDay, selectedDayIso, currentMonth, schedules, absencesRes]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
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
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === "month"
                ? "bg-card shadow-xs text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mensal
          </button>
        </div>

        {viewMode === "week" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={weekOffset <= -8}
              onClick={() => setWeekOffset((p) => p - 1)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-medium text-foreground font-mono">
              {weekOffset === 0
                ? `Semana atual (${weekStartInfo.dateStr} – ${weekEndInfo.dateStr})`
                : `${weekStartInfo.dateStr} – ${weekEndInfo.dateStr}`}
            </span>
            <button
              type="button"
              disabled={weekOffset >= 4}
              onClick={() => setWeekOffset((p) => p + 1)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={clampedMonthIdx <= 0}
              onClick={() => {
                setMonthIdx((p) => Math.max(0, p - 1));
                setSelectedDay(null);
              }}
              className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-medium text-foreground">
              {currentMonth.label}
            </span>
            <button
              type="button"
              disabled={clampedMonthIdx >= monthsList.length - 1}
              onClick={() => {
                setMonthIdx((p) => Math.min(monthsList.length - 1, p + 1));
                setSelectedDay(null);
              }}
              className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Week View */}
      {viewMode === "week" && (
        <Card className="p-4 border-border bg-card">
          <div className="space-y-3">
            {weekOffsets.map((offset) => {
              const info = getDateInfo(offset);
              const isWeekend = info.dow >= 5;
              const slots = getSlotsForIsoDate(info.isoDate, isWeekend);
              const groups = groupSlotsFn(slots);
              const isAbsent = slots.some((s) => s === "absent");

              return (
                <div key={offset} className="flex items-center gap-4 text-xs">
                  <div className="w-20 flex-shrink-0">
                    <span className="font-semibold text-foreground">
                      {info.dayShort}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">
                      {info.dateStr}
                    </span>
                  </div>

                  <div className="flex-1 h-7 bg-muted/20 rounded-md relative overflow-hidden flex items-center">
                    {isWeekend ? (
                      <span className="text-[10px] text-muted-foreground/60 px-3">
                        Folga semanal
                      </span>
                    ) : isAbsent ? (
                      <div className="w-full h-full bg-destructive/15 flex items-center px-3 gap-1.5 text-destructive font-semibold text-[10px]">
                        <UserX size={12} />
                        Ausente
                      </div>
                    ) : groups.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground/60 px-3">
                        Sem escala atribuída
                      </span>
                    ) : (
                      groups.map((g, gi) => {
                        const left = ((g.start - 24) / 60) * 100;
                        const width = ((g.end - g.start + 1) / 60) * 100;
                        return (
                          <div
                            key={gi}
                            className={`absolute h-5 rounded ${
                              BLOCK_STYLES[g.state].bg
                            } opacity-90`}
                            style={{
                              left: `${Math.max(0, left)}%`,
                              width: `${Math.min(100, width)}%`,
                            }}
                            title={`${TIME_SLOTS[g.start]}–${
                              TIME_SLOTS[g.end + 1] || "24:00"
                            } · ${BLOCK_STYLES[g.state].label}`}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Month View */}
      {viewMode === "month" && (
        <Card className="p-4 border-border bg-card">
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d, i) => (
              <div
                key={i}
                className="py-1 font-semibold text-muted-foreground text-[10px]"
              >
                {d}
              </div>
            ))}
            {Array.from({ length: currentMonth.firstDow }, (_, i) => (
              <div key={`blank-${i}`} className="h-10" />
            ))}
            {Array.from({ length: currentMonth.days }, (_, i) => {
              const dayNum = i + 1;
              const dow = (currentMonth.firstDow + i) % 7;
              const isWeekend = dow >= 5;
              const mm = String(currentMonth.monthIndex + 1).padStart(2, "0");
              const dd = String(dayNum).padStart(2, "0");
              const dayIso = `${currentMonth.year}-${mm}-${dd}`;
              const daySlots = getSlotsForIsoDate(dayIso, isWeekend);
              const isSick = daySlots.some((s) => s === "absent");
              const hasWork = daySlots.some(
                (s) => s !== "off" && s !== "absent"
              );
              const isSelected = selectedDay === dayNum;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : dayNum)}
                  className={`h-10 rounded-lg flex flex-col items-center justify-center transition-colors relative border ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : isSick
                      ? "border-destructive/30 bg-destructive/10 text-destructive font-semibold"
                      : isWeekend
                      ? "border-transparent text-muted-foreground/40 bg-muted/10 cursor-default"
                      : "border-border/40 hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <span className="text-[11px] font-mono">{dayNum}</span>
                  {!isWeekend && (isSick || hasWork) && (
                    <span
                      className={`w-1 h-1 rounded-full mt-0.5 ${
                        isSick ? "bg-destructive" : "bg-[#0E7C59]"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {selectedDay && selectedDaySlots && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <p className="text-xs font-semibold text-foreground">
                Detalhe de {selectedDay} {currentMonth.label}
              </p>
              <div className="flex gap-2 flex-wrap">
                {groupSlotsFn(selectedDaySlots).length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Sem blocos registados neste dia.
                  </span>
                ) : (
                  groupSlotsFn(selectedDaySlots).map((g, gi) => (
                    <Badge key={gi} variant="outline" className="text-xs">
                      {TIME_SLOTS[g.start]}–{TIME_SLOTS[g.end + 1] || "24:00"}:{" "}
                      {BLOCK_STYLES[g.state].label}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
