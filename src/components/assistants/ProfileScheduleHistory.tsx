import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Coffee, Lock, UserX } from "lucide-react";
import { PROFILE_MONTHS, TIME_SLOTS } from "../../api/mockData";
import type { BlockState } from "../../types";
import { BLOCK_STYLES } from "../dashboard/blockStyles";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

function generateWeekSchedule(weekOffset: number): Record<string, BlockState[]> {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const patterns: Record<string, BlockState[]> = {};
  days.forEach((day, di) => {
    const row: BlockState[] = Array(96).fill("off");
    if (di >= 5) {
      patterns[day] = row;
      return;
    }
    if (weekOffset === -1 && di === 2) {
      for (let i = 0; i < 96; i++) row[i] = "absent";
      patterns[day] = row;
      return;
    }
    const startSlot = 40; // 10:00
    const endSlot = 68; // 17:00
    const lunchStart = 52; // 13:00
    const lunchEnd = 56; // 14:00
    for (let i = startSlot; i < endSlot; i++) {
      if (i >= lunchStart && i < lunchEnd) row[i] = "lunch";
      else row[i] = "work";
    }
    patterns[day] = row;
  });
  return patterns;
}

function summariseDay(slots: BlockState[]) {
  const counts: Record<string, number> = {
    work: 0,
    surveillance: 0,
    lunch: 0,
    absent: 0,
    off: 0,
  };
  slots.forEach((s) => {
    if (s in counts) counts[s]++;
  });
  return counts;
}

const WEEK_OFFSETS: Record<number, string> = {
  0: "Semana atual (27 Jan – 02 Fev)",
  "-1": "Semana anterior (20 Jan – 26 Jan)",
  "-2": "Semana de 13 Jan – 19 Jan",
  "-3": "Semana de 06 Jan – 12 Jan",
};

export default function ProfileScheduleHistory() {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthIdx, setMonthIdx] = useState(3); // Jan 2026 = index 3
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const weekData = generateWeekSchedule(weekOffset);
  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const weekDates: Record<string, string> = {
    Seg:
      weekOffset === 0
        ? "27 Jan"
        : weekOffset === -1
        ? "20 Jan"
        : weekOffset === -2
        ? "13 Jan"
        : "06 Jan",
    Ter:
      weekOffset === 0
        ? "28 Jan"
        : weekOffset === -1
        ? "21 Jan"
        : weekOffset === -2
        ? "14 Jan"
        : "07 Jan",
    Qua:
      weekOffset === 0
        ? "29 Jan"
        : weekOffset === -1
        ? "22 Jan"
        : weekOffset === -2
        ? "15 Jan"
        : "08 Jan",
    Qui:
      weekOffset === 0
        ? "30 Jan"
        : weekOffset === -1
        ? "23 Jan"
        : weekOffset === -2
        ? "16 Jan"
        : "09 Jan",
    Sex:
      weekOffset === 0
        ? "31 Jan"
        : weekOffset === -1
        ? "24 Jan"
        : weekOffset === -2
        ? "17 Jan"
        : "10 Jan",
    Sáb:
      weekOffset === 0
        ? "01 Fev"
        : weekOffset === -1
        ? "25 Jan"
        : weekOffset === -2
        ? "18 Jan"
        : "11 Jan",
    Dom:
      weekOffset === 0
        ? "02 Fev"
        : weekOffset === -1
        ? "26 Jan"
        : weekOffset === -2
        ? "19 Jan"
        : "12 Jan",
  };

  const currentMonth = PROFILE_MONTHS[monthIdx];

  function getDaySlots(dayNum: number): BlockState[] {
    const dow = (currentMonth.offset + dayNum - 1) % 7;
    const isWeekend = dow === 0 || dow === 6;
    const row: BlockState[] = Array(96).fill("off");
    if (isWeekend) return row;
    if (currentMonth.sickDay && dayNum === currentMonth.sickDay) {
      row.fill("absent");
      return row;
    }
    const startSlot = 40;
    const endSlot = 68;
    const lunchStart = 52;
    const lunchEnd = 56;
    for (let i = startSlot; i < endSlot; i++) {
      if (i >= lunchStart && i < lunchEnd) row[i] = "lunch";
      else row[i] = "work";
    }
    return row;
  }

  const selectedDaySlots = selectedDay ? getDaySlots(selectedDay) : null;

  function groupSlots(slots: BlockState[]) {
    const groups: { state: BlockState; start: number; end: number }[] = [];
    let cur: { state: BlockState; start: number; end: number } | null = null;
    slots.forEach((s, i) => {
      if (s === "off") {
        if (cur) {
          groups.push(cur);
          cur = null;
        }
        return;
      }
      if (cur && cur.state === s) {
        cur.end = i;
      } else {
        if (cur) groups.push(cur);
        cur = { state: s, start: i, end: i };
      }
    });
    if (cur) groups.push(cur);
    return groups;
  }

  const HOUR_TICKS = [24, 32, 40, 48, 56, 64, 72, 80, 84];

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
              disabled={weekOffset <= -3}
              onClick={() => setWeekOffset((p) => p - 1)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-medium text-foreground font-mono">
              {WEEK_OFFSETS[weekOffset] ?? `Semana ${weekOffset}`}
            </span>
            <button
              type="button"
              disabled={weekOffset >= 0}
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
              disabled={monthIdx <= 0}
              onClick={() => {
                setMonthIdx((p) => p - 1);
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
              disabled={monthIdx >= PROFILE_MONTHS.length - 1}
              onClick={() => {
                setMonthIdx((p) => p + 1);
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
            {weekDays.map((day) => {
              const slots = weekData[day];
              const groups = groupSlots(slots);
              const isWeekend = day === "Sáb" || day === "Dom";
              const isAbsent = slots.some((s) => s === "absent");

              return (
                <div key={day} className="flex items-center gap-4 text-xs">
                  <div className="w-16 flex-shrink-0">
                    <span className="font-semibold text-foreground">{day}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">
                      {weekDates[day]}
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
                        Ausente — Falta médica
                      </div>
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
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <div
                key={i}
                className="py-1 font-semibold text-muted-foreground text-[10px]"
              >
                {d}
              </div>
            ))}
            {Array.from({ length: currentMonth.offset }, (_, i) => (
              <div key={`blank-${i}`} className="h-10" />
            ))}
            {Array.from({ length: currentMonth.days }, (_, i) => {
              const dayNum = i + 1;
              const dow = (currentMonth.offset + i) % 7;
              const isWeekend = dow === 0 || dow === 6;
              const isSick = currentMonth.sickDay === dayNum;
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
                  {!isWeekend && (
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
              <div className="flex gap-2">
                {groupSlots(selectedDaySlots).map((g, gi) => (
                  <Badge key={gi} variant="outline" className="text-xs">
                    {TIME_SLOTS[g.start]}–{TIME_SLOTS[g.end + 1] || "24:00"}:{" "}
                    {BLOCK_STYLES[g.state].label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

