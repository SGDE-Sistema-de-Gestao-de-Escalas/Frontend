import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "../ui/card";
import { useAssistantsList } from "../../hooks/api/useAssistants";
import { useSchedulesList } from "../../hooks/api/useSchedules";
import {
  useOperatingCalendar,
  useOperatingExceptions,
  useOperatingRules,
} from "../../hooks/api/useOperatingHours";
import { useHolidaysList } from "../../hooks/api/useHolidays";
import {
  getDateInfo,
  getRealMonthsRange,
  hasGeneratedScheduleForDate,
  resolveSchoolDayStatusByIsoDate,
} from "../../utils/scheduleMatrixUtils";

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
  const [, setHoveredDay] = useState<number | null>(null);
  const monthsList = useMemo(() => getRealMonthsRange(3, 6), []);
  const clampedIdx = Math.max(0, Math.min(monthOffset, monthsList.length - 1));
  const month = monthsList[clampedIdx];

  const { data: assistants = [] } = useAssistantsList();
  const { data: schedules = [] } = useSchedulesList({
    start_date: month.startIso,
    end_date: month.endIso,
  });
  const { data: calendarDays = [] } = useOperatingCalendar(
    month.startIso,
    month.endIso
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

  const totalAssistants = useMemo(
    () =>
      Math.max(
        1,
        assistants.filter(
          (a) => !a.deleted_at && (a.active ?? a.is_active ?? true)
        ).length
      ),
    [assistants]
  );

  const coverageByDay = useMemo(() => {
    return Array.from({ length: month.days }, (_, i) => {
      const offset = month.firstOffset + i;
      const info = getDateInfo(offset);
      const status = resolveSchoolDayStatusByIsoDate(
        info.isoDate,
        operatingSources
      );
      if (!status.isOpen) {
        return { active: 0, isClosed: true, hasGenerated: false };
      }

      const hasGenerated = hasGeneratedScheduleForDate(info.isoDate, schedules);
      const activeAssistantIds = new Set<string>();
      schedules.forEach((sc) => {
        const hasEntriesOnDate = (sc.entries || []).some(
          (e) => e.date?.slice(0, 10) === info.isoDate
        );
        if (hasEntriesOnDate) {
          activeAssistantIds.add(String(sc.assistant_id));
        }
      });

      return {
        active: activeAssistantIds.size,
        isClosed: false,
        hasGenerated,
      };
    });
  }, [month, operatingSources, schedules]);

  function coverageColor(
    active: number,
    isClosed: boolean,
    hasGenerated: boolean
  ) {
    if (isClosed) return "bg-muted/20";
    if (!hasGenerated) return "bg-card hover:bg-muted/30";
    if (active >= Math.ceil(totalAssistants * 0.8)) return "bg-[#0E7C59]/15";
    if (active >= Math.ceil(totalAssistants * 0.5)) return "bg-[#D97706]/15";
    return "bg-destructive/15";
  }

  function coverageDot(
    active: number,
    isClosed: boolean,
    hasGenerated: boolean
  ) {
    if (isClosed || !hasGenerated) return "bg-muted-foreground/40";
    if (active >= Math.ceil(totalAssistants * 0.8)) return "bg-[#0E7C59]";
    if (active >= Math.ceil(totalAssistants * 0.5)) return "bg-[#D97706]";
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
          { dot: "bg-[#0E7C59]", label: "Cobertura normal (≥ 80%)" },
          { dot: "bg-[#D97706]", label: "Cobertura parcial (50% – 79%)" },
          { dot: "bg-destructive", label: "Abaixo de 50%" },
          { dot: "bg-muted-foreground/40", label: "Escala ainda não gerada" },
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
            disabled={clampedIdx === 0}
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
            disabled={clampedIdx >= monthsList.length - 1}
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
                onClick={() => !cov.isClosed && onSelectDay(offset)}
                onMouseEnter={() => setHoveredDay(dayNum)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`h-20 p-2 text-left border-r border-b border-border/30 transition-colors flex flex-col ${
                  cov.isClosed
                    ? "cursor-default bg-muted/10"
                    : `cursor-pointer ${coverageColor(
                        cov.active,
                        false,
                        cov.hasGenerated
                      )} hover:brightness-95`
                } ${isToday ? "ring-2 ring-inset ring-primary" : ""} ${
                  isSunCol ? "border-r-0" : ""
                }`}
              >
                <div
                  className={`text-xs font-mono mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-primary text-primary-foreground font-bold"
                      : cov.isClosed
                      ? "text-muted-foreground/40"
                      : "text-foreground font-medium"
                  }`}
                >
                  {dayNum}
                </div>
                {!cov.isClosed &&
                  (cov.hasGenerated ? (
                    <>
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${coverageDot(
                            cov.active,
                            false,
                            true
                          )}`}
                        />
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {cov.active}/{totalAssistants}
                        </span>
                      </div>
                      <div className="mt-1 h-1 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cov.active >= Math.ceil(totalAssistants * 0.8)
                              ? "bg-[#0E7C59]"
                              : cov.active >= Math.ceil(totalAssistants * 0.5)
                              ? "bg-[#D97706]"
                              : "bg-destructive"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (cov.active / totalAssistants) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="text-[10px] font-medium text-muted-foreground/70 mt-auto">
                      Escala não gerada
                    </span>
                  ))}
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
