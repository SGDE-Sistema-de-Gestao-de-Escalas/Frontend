import React, { useState } from "react";
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
  generateDayMatrix,
  getDateInfo,
  TIME_SLOTS,
} from "../../api/mockData";
import {
  BLOCK_STYLES,
  slotsToBlocks,
  VIEW_START,
  VIEW_END,
  VIEW_SLOTS,
} from "../dashboard/blockStyles";
import { Badge } from "../ui/badge";

export const STAFF_MONTH_MONTHS = [
  { label: "Janeiro 2026", days: 31, firstDow: 2, firstOffset: -26 },
  { label: "Fevereiro 2026", days: 28, firstDow: 5, firstOffset: 5 },
];

export function staffBlocksForDay(dayOffset: number) {
  const matrix = generateDayMatrix(dayOffset);
  const slots = matrix[6] || Array(96).fill("off"); // Fábio Lopes = assistant id 6
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
  return { slots, groups };
}

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

export function StaffDayView({ dayOffset }: { dayOffset: number }) {
  const info = getDateInfo(dayOffset);
  const { groups } = staffBlocksForDay(dayOffset);
  const isWeekend = info.dow >= 5;
  const isToday = dayOffset === 0;
  const entryGroup = groups.find((g) => g.state !== "off");
  const lastGroup = [...groups].reverse().find((g) => g.state !== "off");

  return (
    <div className="pt-4">
      {isToday && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full"
              style={{ width: "45%" }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            4h 00min restantes
          </span>
        </div>
      )}
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
              { label: "Carga", value: "6h" },
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
              <p className="text-sm text-muted-foreground text-center py-4">
                Sem blocos activos
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
  const offsets = Array.from({ length: 7 }, (_, i) => weekStart + i);
  return (
    <div className="pt-2 pb-4 space-y-2">
      {offsets.map((offset) => {
        const info = getDateInfo(offset);
        const isToday = offset === 0;
        const isWeekend = info.dow >= 5;
        const { slots } = staffBlocksForDay(offset);
        const hasWork = slots.some((s) => s !== "off");
        const hasAbsent = slots.every((s) => s === "absent");
        return (
          <button
            key={offset}
            type="button"
            onClick={() => !isWeekend && onSelectDay(offset)}
            className={`w-full text-left rounded-xl border p-3 transition-colors
              ${
                isToday
                  ? "border-accent bg-accent/5"
                  : isWeekend
                  ? "border-border bg-muted/20 opacity-50"
                  : "border-border bg-card hover:border-accent/40 hover:bg-accent/3"
              }
              ${isWeekend ? "cursor-default" : "cursor-pointer"}
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
              {!isWeekend && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {hasAbsent ? "Ausência" : hasWork ? "6h" : "Folga"}
                </span>
              )}
            </div>
            {!isWeekend && (
              <div className="relative h-4 rounded-sm overflow-hidden bg-muted/30">
                {slotsToBlocks(slots).map((b) => {
                  const cs = Math.max(b.start, VIEW_START);
                  const ce = Math.min(b.start + b.count, VIEW_END);
                  if (b.state === "off" || ce <= cs) return null;
                  return (
                    <div
                      key={b.start}
                      className={`absolute inset-y-1 rounded-md ${
                        BLOCK_STYLES[b.state]?.bg
                      } opacity-75 overflow-hidden`}
                      style={{
                        left: `${((cs - VIEW_START) / VIEW_SLOTS) * 100}%`,
                        width: `${((ce - cs) / VIEW_SLOTS) * 100}%`,
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
  const month =
    STAFF_MONTH_MONTHS[
      Math.max(0, Math.min(monthOffset, STAFF_MONTH_MONTHS.length - 1))
    ];
  return (
    <div className="pt-2 pb-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onChangeMonth(-1)}
          disabled={monthOffset === 0}
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
          disabled={monthOffset >= STAFF_MONTH_MONTHS.length - 1}
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
          const { slots } = staffBlocksForDay(offset);
          const hasWork = !isWeekend && slots.some((s) => s !== "off");
          const hasAbsent = !isWeekend && slots.every((s) => s === "absent");
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
  const [viewMode, setViewMode] = useState<StaffViewMode>("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const info = getDateInfo(dayOffset);

  function prevNav() {
    if (viewMode === "day") setDayOffset((d) => Math.max(d - 1, -7));
    if (viewMode === "week") setWeekStart((w) => Math.max(w - 7, -7));
    if (viewMode === "month") setMonthOffset((m) => Math.max(m - 1, 0));
  }
  function nextNav() {
    if (viewMode === "day") setDayOffset((d) => Math.min(d + 1, 35));
    if (viewMode === "week") setWeekStart((w) => Math.min(w + 7, 28));
    if (viewMode === "month")
      setMonthOffset((m) =>
        Math.min(m + 1, STAFF_MONTH_MONTHS.length - 1)
      );
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
              Math.max(0, Math.min(m + d, STAFF_MONTH_MONTHS.length - 1))
            )
          }
        />
      )}
    </div>
  );
}

