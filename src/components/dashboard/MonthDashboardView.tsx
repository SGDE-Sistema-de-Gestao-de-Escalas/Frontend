import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DASHBOARD_MONTHS, getDayCoverage } from "../../api/mockData";
import { Card } from "../ui/card";

interface MonthDashboardViewProps {
  monthOffset: number;
  onSelectDay: (offset: number) => void;
  onChangeMonth: (delta: number) => void;
}

export default function MonthDashboardView({
  monthOffset,
  onSelectDay,
  onChangeMonth,
}: MonthDashboardViewProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const month =
    DASHBOARD_MONTHS[
      Math.max(0, Math.min(monthOffset, DASHBOARD_MONTHS.length - 1))
    ];

  const coverageByDay = Array.from({ length: month.days }, (_, i) => {
    const offset = month.firstOffset + i;
    return getDayCoverage(offset);
  });

  function coverageColor(active: number, isWeekend: boolean) {
    if (isWeekend) return "bg-muted/20";
    if (active >= 10) return "bg-[#0E7C59]/15";
    if (active >= 8) return "bg-[#D97706]/15";
    return "bg-destructive/15";
  }

  function coverageDot(active: number, isWeekend: boolean) {
    if (isWeekend) return "";
    if (active >= 10) return "bg-[#0E7C59]";
    if (active >= 8) return "bg-[#D97706]";
    return "bg-destructive";
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <Card className="px-4 py-3 flex items-center gap-6 border-border bg-card flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">
          Cobertura:
        </span>
        {[
          { dot: "bg-[#0E7C59]", label: "≥ 10 assistentes" },
          { dot: "bg-[#D97706]", label: "8 – 9 assistentes" },
          { dot: "bg-destructive", label: "< 8 assistentes" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${l.dot}`} />
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </div>
        ))}
        <span className="ml-auto text-xs text-muted-foreground hidden sm:block">
          Clique num dia para ver a matriz completa
        </span>
      </Card>

      <Card className="overflow-hidden border-border bg-card">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            type="button"
            onClick={() => onChangeMonth(-1)}
            disabled={monthOffset === 0}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-foreground">
            {month.name}
          </span>
          <button
            type="button"
            onClick={() => onChangeMonth(1)}
            disabled={monthOffset >= DASHBOARD_MONTHS.length - 1}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* DOW headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/20">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
            <div
              key={d}
              className="text-center py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/50 last:border-0"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: month.firstDow }, (_, i) => (
            <div
              key={`pre-${i}`}
              className="h-20 border-r border-b border-border/30 bg-muted/5"
            />
          ))}
          {Array.from({ length: month.days }, (_, i) => {
            const dayNum = i + 1;
            const offset = month.firstOffset + i;
            const cov = coverageByDay[i];
            const isToday = offset === 0;
            const isSunCol = (month.firstDow + i) % 7 === 6;
            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => !cov.isWeekend && onSelectDay(offset)}
                onMouseEnter={() => setHoveredDay(dayNum)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`h-20 p-2 text-left border-r border-b border-border/30 transition-colors flex flex-col ${
                  cov.isWeekend
                    ? "cursor-default bg-muted/10"
                    : `cursor-pointer ${coverageColor(
                        cov.active,
                        false
                      )} hover:brightness-95`
                } ${isToday ? "ring-2 ring-inset ring-primary" : ""} ${
                  isSunCol ? "border-r-0" : ""
                }`}
              >
                <div
                  className={`text-xs font-mono mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-primary text-primary-foreground font-bold"
                      : cov.isWeekend
                      ? "text-muted-foreground/40"
                      : "text-foreground font-medium"
                  }`}
                >
                  {dayNum}
                </div>
                {!cov.isWeekend && (
                  <>
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${coverageDot(
                          cov.active,
                          false
                        )}`}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {cov.active}/12
                      </span>
                    </div>
                    {/* Mini coverage bar */}
                    <div className="mt-1 h-1 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cov.active >= 10
                            ? "bg-[#0E7C59]"
                            : cov.active >= 8
                            ? "bg-[#D97706]"
                            : "bg-destructive"
                        }`}
                        style={{ width: `${(cov.active / 12) * 100}%` }}
                      />
                    </div>
                  </>
                )}
              </button>
            );
          })}
          {(() => {
            const total = month.firstDow + month.days;
            const rem = total % 7;
            if (rem === 0) return null;
            return Array.from({ length: 7 - rem }, (_, i) => (
              <div
                key={`post-${i}`}
                className="h-20 border-b border-border/30 bg-muted/5"
              />
            ));
          })()}
        </div>
      </Card>
    </div>
  );
}

