import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { parseFlexibleDate } from "./DatePicker";

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  hasError?: boolean;
  allowClear?: boolean;
  maxDays?: number;
  selectWeekOnly?: boolean;
  requireEndDate?: boolean;
  isDateDisabled?: (isoDate: string) => boolean;
  align?: "start" | "center" | "end";
  customTriggerLabel?: string;
  customPresets?: Array<{ label: string; start: string; end: string }>;
  onResetDefault?: () => void;
  resetDefaultLabel?: string;
  triggerIcon?: React.ReactNode;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTH_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMondayOfDate(d: Date): Date {
  const copy = new Date(d);
  const dow = copy.getDay(); // 0=Sun
  const diff = (dow + 6) % 7; // days since Mon
  copy.setDate(copy.getDate() - diff);
  copy.setHours(12, 0, 0, 0);
  return copy;
}

function getSundayOfDate(d: Date): Date {
  const mon = getMondayOfDate(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(12, 0, 0, 0);
  return sun;
}

function daysDiff(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0;
  const s = parseFlexibleDate(startIso);
  const e = parseFlexibleDate(endIso);
  if (!s || !e) return 0;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function DateRangePicker({
  value,
  onChange,
  className = "",
  placeholder = "Selecionar intervalo...",
  minDate,
  maxDate,
  disabled = false,
  hasError = false,
  allowClear = true,
  maxDays,
  selectWeekOnly = false,
  requireEndDate = false,
  isDateDisabled: customIsDateDisabled,
  align = "start",
  customTriggerLabel,
  customPresets,
  onResetDefault,
  resetDefaultLabel = "Repor Padrão",
  triggerIcon,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");

  // Local draft selection inside popover
  const [draftStart, setDraftStart] = useState<string>(value.startDate || "");
  const [draftEnd, setDraftEnd] = useState<string>(value.endDate || "");
  const [hoveredIso, setHoveredIso] = useState<string | null>(null);

  // Sync draft when prop value changes
  useEffect(() => {
    setDraftStart(value.startDate || "");
    setDraftEnd(value.endDate || "");
  }, [value.startDate, value.endDate]);

  const today = new Date();
  const initialBaseDate = parseFlexibleDate(value.startDate) || today;
  const [viewYear, setViewYear] = useState(initialBaseDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialBaseDate.getMonth());

  // Reset view on open
  useEffect(() => {
    if (open) {
      setDraftStart(value.startDate || "");
      setDraftEnd(value.endDate || "");
      setHoveredIso(null);
      setViewMode("days");
      const base = parseFlexibleDate(value.startDate) || today;
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
  }, [open, value.startDate, value.endDate]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const firstDowMon = (firstDow + 6) % 7; // 0=Mon...6=Sun

  const decadeStart = Math.floor(viewYear / 12) * 12;
  const yearsList = useMemo(
    () => Array.from({ length: 12 }, (_, i) => decadeStart + i),
    [decadeStart]
  );

  const minYear = minDate ? parseInt(minDate.split("-")[0], 10) : undefined;
  const maxYear = maxDate ? parseInt(maxDate.split("-")[0], 10) : undefined;
  const minMonth = minDate && minYear === viewYear ? parseInt(minDate.split("-")[1], 10) - 1 : undefined;
  const maxMonth = maxDate && maxYear === viewYear ? parseInt(maxDate.split("-")[1], 10) - 1 : undefined;

  function isYearDisabled(yr: number): boolean {
    if (minYear !== undefined && yr < minYear) return true;
    if (maxYear !== undefined && yr > maxYear) return true;
    return false;
  }

  function isMonthDisabled(mo: number): boolean {
    if (minMonth !== undefined && mo < minMonth) return true;
    if (maxMonth !== undefined && mo > maxMonth) return true;
    return false;
  }

  function checkDateDisabled(isoDate: string): boolean {
    if (minDate && isoDate < minDate) return true;
    if (maxDate && isoDate > maxDate) return true;
    if (customIsDateDisabled && customIsDateDisabled(isoDate)) return true;
    return false;
  }

  function prevMonth() {
    if (minYear !== undefined && minMonth !== undefined) {
      if (viewYear < minYear || (viewYear === minYear && viewMonth <= minMonth)) {
        return;
      }
    }
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // Handle Day Click
  function handleDayClick(iso: string) {
    if (checkDateDisabled(iso)) return;

    if (selectWeekOnly) {
      const d = parseFlexibleDate(iso);
      if (!d) return;
      const monIso = toIso(getMondayOfDate(d));
      const sunIso = toIso(getSundayOfDate(d));

      if (!draftStart || (draftStart && draftEnd)) {
        // First click: select starting week
        setDraftStart(monIso);
        setDraftEnd("");
      } else {
        // Second click: select ending week
        if (monIso < draftStart) {
          const currentStartD = parseFlexibleDate(draftStart);
          const currentStartSun = currentStartD
            ? toIso(getSundayOfDate(currentStartD))
            : draftStart;
          setDraftStart(monIso);
          setDraftEnd(currentStartSun);
        } else {
          setDraftEnd(sunIso);
        }
      }
      return;
    }

    // Normal Range selection
    if (!draftStart || (draftStart && draftEnd)) {
      // First click: reset and pick start
      setDraftStart(iso);
      setDraftEnd("");
    } else if (draftStart && !draftEnd) {
      // Second click: pick end
      if (iso < draftStart) {
        setDraftStart(iso);
        setDraftEnd(draftStart);
      } else {
        setDraftEnd(iso);
      }
    }
  }

  // Handle Hover for Range preview
  function handleDayHover(iso: string) {
    if (selectWeekOnly || (draftStart && !draftEnd)) {
      setHoveredIso(iso);
    }
  }

  // Compute prospective range for week mode
  const hoveredWeekRange = useMemo(() => {
    if (!selectWeekOnly || !hoveredIso) return null;
    const d = parseFlexibleDate(hoveredIso);
    if (!d) return null;
    const hMon = toIso(getMondayOfDate(d));
    const hSun = toIso(getSundayOfDate(d));

    if (draftStart && !draftEnd) {
      const startD = parseFlexibleDate(draftStart);
      const startSun = startD ? toIso(getSundayOfDate(startD)) : draftStart;
      const minIso = draftStart < hMon ? draftStart : hMon;
      const maxIso = draftStart < hMon ? hSun : startSun;
      return { start: minIso, end: maxIso };
    }

    return {
      start: hMon,
      end: hSun,
    };
  }, [selectWeekOnly, hoveredIso, draftStart, draftEnd]);

  // Check if a day is within selected or hovered range
  function getDayRangeStatus(iso: string): {
    isStart: boolean;
    isEnd: boolean;
    isInRange: boolean;
    isHoveredWeek: boolean;
  } {
    if (selectWeekOnly) {
      const isStart = draftStart === iso;
      const isEnd = draftEnd === iso;
      let isInRange = false;
      let isHoveredWeek = false;

      if (draftStart && draftEnd) {
        isInRange = draftStart <= iso && iso <= draftEnd;
      } else if (draftStart && !draftEnd && hoveredWeekRange) {
        isInRange = hoveredWeekRange.start <= iso && iso <= hoveredWeekRange.end;
      } else if (!draftStart && hoveredWeekRange) {
        isHoveredWeek = hoveredWeekRange.start <= iso && iso <= hoveredWeekRange.end;
      }

      return { isStart, isEnd, isInRange, isHoveredWeek };
    }

    const isStart = draftStart === iso;
    const isEnd = draftEnd === iso;
    let isInRange = false;

    if (draftStart && draftEnd) {
      isInRange = draftStart <= iso && iso <= draftEnd;
    } else if (draftStart && !draftEnd && hoveredIso) {
      const minIso = draftStart < hoveredIso ? draftStart : hoveredIso;
      const maxIso = draftStart < hoveredIso ? hoveredIso : draftStart;
      isInRange = minIso <= iso && iso <= maxIso;
    }

    return { isStart, isEnd, isInRange, isHoveredWeek: false };
  }

  // Presets definition
  const presets = useMemo(() => {
    const rawList = (() => {
      if (customPresets) return customPresets;
      const t = new Date();
      const todayIso = toIso(t);
      if (selectWeekOnly) {
        const thisMon = toIso(getMondayOfDate(t));
        const thisSun = toIso(getSundayOfDate(t));
        const nextMonDate = new Date(t);
        nextMonDate.setDate(t.getDate() + 7);
        const nextMon = toIso(getMondayOfDate(nextMonDate));
        const nextSun = toIso(getSundayOfDate(nextMonDate));
        const next2SunDate = new Date(t);
        next2SunDate.setDate(t.getDate() + 13);
        const next2Sun = toIso(getSundayOfDate(next2SunDate));
        const lastMonDate = new Date(t);
        lastMonDate.setDate(t.getDate() - 7);
        const lastMon = toIso(getMondayOfDate(lastMonDate));
        const lastSun = toIso(getSundayOfDate(lastMonDate));
        return [
          { label: "Esta Semana", start: thisMon, end: thisSun },
          { label: "Próxima Semana", start: nextMon, end: nextSun },
          { label: "Próximas 2 Semanas", start: thisMon, end: next2Sun },
          { label: "Semana Passada", start: lastMon, end: lastSun },
        ];
      }
      const thisMon = toIso(getMondayOfDate(t));
      const thisSun = toIso(getSundayOfDate(t));
      const lastMonDate = new Date(t);
      lastMonDate.setDate(t.getDate() - 7);
      const lastMon = toIso(getMondayOfDate(lastMonDate));
      const lastSun = toIso(getSundayOfDate(lastMonDate));
      const firstDayMonth = toIso(new Date(t.getFullYear(), t.getMonth(), 1));
      const lastDayMonth = toIso(new Date(t.getFullYear(), t.getMonth() + 1, 0));
      const firstDayLastMonth = toIso(new Date(t.getFullYear(), t.getMonth() - 1, 1));
      const lastDayLastMonth = toIso(new Date(t.getFullYear(), t.getMonth(), 0));
      return [
        { label: "Hoje", start: todayIso, end: todayIso },
        { label: "Esta Semana", start: thisMon, end: thisSun },
        { label: "Semana Passada", start: lastMon, end: lastSun },
        { label: "Este Mês", start: firstDayMonth, end: lastDayMonth },
        { label: "Mês Passado", start: firstDayLastMonth, end: lastDayLastMonth },
      ];
    })();

    return rawList
      .filter((p) => {
        if (minDate && p.end < minDate) return false;
        if (maxDate && p.start > maxDate) return false;
        return true;
      })
      .map((p) => {
        if (minDate && p.start < minDate) {
          return { ...p, start: minDate };
        }
        return p;
      });
  }, [selectWeekOnly, customPresets, minDate, maxDate]);

  const selectedCount = draftStart && draftEnd ? daysDiff(draftStart, draftEnd) : 0;
  const isMaxDaysExceeded = Boolean(maxDays && selectedCount > maxDays);

  function handleApply() {
    if (!draftStart) return;
    if (requireEndDate && !draftEnd) return;
    let finalEnd = draftEnd;
    if (!finalEnd) {
      if (selectWeekOnly) {
        const d = parseFlexibleDate(draftStart);
        finalEnd = d ? toIso(getSundayOfDate(d)) : draftStart;
      } else {
        finalEnd = draftStart;
      }
    }
    if (maxDays && daysDiff(draftStart, finalEnd) > maxDays) return;
    onChange({ startDate: draftStart, endDate: finalEnd });
    setOpen(false);
  }

  function handleClear() {
    setDraftStart("");
    setDraftEnd("");
    onChange({ startDate: "", endDate: "" });
    setOpen(false);
  }

  // Label for trigger
  const triggerLabel = useMemo(() => {
    if (customTriggerLabel) {
      return customTriggerLabel;
    }
    if (value.startDate && value.endDate) {
      if (value.startDate === value.endDate) {
        return value.startDate;
      }
      return `${value.startDate}  —  ${value.endDate}`;
    }
    if (value.startDate) {
      if (requireEndDate && !value.endDate) {
        return `${value.startDate}  —  (selecionar fim)`;
      }
      return `Desde ${value.startDate}`;
    }
    return placeholder;
  }, [value.startDate, value.endDate, customTriggerLabel, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs text-left transition-colors bg-card
            ${hasError ? "border-destructive ring-1 ring-destructive/30" : "border-border hover:border-border/80"}
            ${disabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "cursor-pointer"}
            ${open ? "border-primary ring-1 ring-primary/30" : ""}
            ${className}`}
        >
          {triggerIcon ?? <Calendar size={13} className="text-muted-foreground flex-shrink-0" />}
          <span
            className={
              value.startDate ? "font-mono font-medium" : "text-muted-foreground"
            }
          >
            {triggerLabel}
          </span>
          {allowClear && (value.startDate || value.endDate) && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  handleClear();
                }
              }}
              className="ml-auto p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Limpar intervalo"
            >
              <X size={12} />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-[360px] sm:w-[500px] p-0 bg-card border border-border rounded-2xl shadow-2xl ring-1 ring-black/5 z-[100] overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row">
          {/* Sidebar de Presets Rápidos */}
          <div className="w-full sm:w-36 p-3 bg-muted/30 border-b sm:border-b-0 sm:border-r border-border flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible shrink-0">
            <span className="hidden sm:block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-1">
              {selectWeekOnly ? "Semanas" : "Atalhos"}
            </span>
            {presets.map((p) => {
              const isCurrent = draftStart === p.start && draftEnd === p.end;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setDraftStart(p.start);
                    setDraftEnd(p.end);
                    const base = parseFlexibleDate(p.start);
                    if (base) {
                      setViewYear(base.getFullYear());
                      setViewMonth(base.getMonth());
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs text-left font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isCurrent
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}

            {selectWeekOnly && (
              <div className="hidden sm:block mt-auto p-2 bg-primary/5 rounded-lg border border-primary/20 text-[10px] text-muted-foreground leading-tight">
                Selecione as semanas pretendidas (Seg. a Dom.).
              </div>
            )}
          </div>

          {/* Área Principal do Calendário */}
          <div className="flex-1 p-3.5">
            {/* Header: Mês / Ano com Navegação */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                disabled={
                  (viewMode === "days" && minYear !== undefined && minMonth !== undefined && (viewYear < minYear || (viewYear === minYear && viewMonth <= minMonth))) ||
                  (viewMode === "months" && minYear !== undefined && viewYear <= minYear) ||
                  (viewMode === "years" && minYear !== undefined && decadeStart <= minYear)
                }
                onClick={() => {
                  if (viewMode === "days") prevMonth();
                  else if (viewMode === "months") setViewYear((y) => y - 1);
                  else setViewYear((y) => y - 12);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                title="Anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "months" ? "days" : "months")}
                  className={`px-2 py-1 rounded-md transition-colors hover:bg-muted cursor-pointer ${
                    viewMode === "months" ? "bg-muted text-primary font-bold" : "text-foreground"
                  }`}
                  title="Selecionar mês"
                >
                  {MONTH_NAMES[viewMonth]}
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "years" ? "days" : "years")}
                  className={`px-2 py-1 rounded-md transition-colors hover:bg-muted cursor-pointer ${
                    viewMode === "years" ? "bg-muted text-primary font-bold" : "text-foreground"
                  }`}
                  title="Selecionar ano"
                >
                  {viewYear}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (viewMode === "days") nextMonth();
                  else if (viewMode === "months") setViewYear((y) => y + 1);
                  else setViewYear((y) => y + 12);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Seguinte"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 1. Vista de Grade de Meses (3x4) */}
            {viewMode === "months" && (
              <div className="grid grid-cols-3 gap-1.5 py-2">
                {MONTH_SHORT.map((name, idx) => {
                  const isSelected = viewMonth === idx;
                  const isCurrent =
                    today.getFullYear() === viewYear && today.getMonth() === idx;
                  const disabled = isMonthDisabled(idx);
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setViewMonth(idx);
                        setViewMode("days");
                      }}
                      className={`py-2 px-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : isCurrent
                          ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                          : "text-foreground hover:bg-muted"
                      } ${disabled ? "opacity-30 cursor-not-allowed pointer-events-none" : ""}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Vista de Grade de Anos (3x4 - década) */}
            {viewMode === "years" && (
              <div className="grid grid-cols-3 gap-1.5 py-2">
                {yearsList.map((yr) => {
                  const isSelected = viewYear === yr;
                  const isCurrent = today.getFullYear() === yr;
                  const disabled = isYearDisabled(yr);
                  return (
                    <button
                      key={yr}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setViewYear(yr);
                        setViewMode("months");
                      }}
                      className={`py-2 px-1 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : isCurrent
                          ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                          : "text-foreground hover:bg-muted"
                      } ${disabled ? "opacity-30 cursor-not-allowed pointer-events-none" : ""}`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. Vista de Dias do Calendário */}
            {viewMode === "days" && (
              <>
                <div className="grid grid-cols-7 mb-1">
                  {DAY_LABELS.map((d) => (
                    <div
                      key={d}
                      className="text-center text-[9px] font-semibold text-muted-foreground uppercase py-1"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">
                  {Array.from({ length: firstDowMon }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-7" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayPadded = String(day).padStart(2, "0");
                    const mPadded = String(viewMonth + 1).padStart(2, "0");
                    const iso = `${viewYear}-${mPadded}-${dayPadded}`;

                    const isDisabled = checkDateDisabled(iso);
                    const { isStart, isEnd, isInRange, isHoveredWeek } =
                      getDayRangeStatus(iso);

                    const isToday =
                      today.getFullYear() === viewYear &&
                      today.getMonth() === viewMonth &&
                      today.getDate() === day;

                    return (
                      <div
                        key={iso}
                        className={`h-7 relative flex items-center justify-center ${
                          isInRange && !isStart && !isEnd ? "bg-primary/10" : ""
                        } ${isStart ? "rounded-l-lg bg-primary/10" : ""} ${
                          isEnd ? "rounded-r-lg bg-primary/10" : ""
                        }`}
                      >
                        <button
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleDayClick(iso)}
                          onMouseEnter={() => handleDayHover(iso)}
                          className={`w-7 h-7 text-xs rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                            isStart || isEnd
                              ? "bg-primary text-primary-foreground font-bold shadow-xs z-10"
                              : isInRange
                              ? "text-primary font-medium hover:bg-primary/20"
                              : isHoveredWeek
                              ? "bg-primary/15 text-primary font-semibold"
                              : isToday
                              ? "border border-primary text-primary font-semibold hover:bg-primary/10"
                              : "text-foreground hover:bg-muted"
                          } ${isDisabled ? "opacity-30 cursor-not-allowed pointer-events-none" : ""}`}
                        >
                          {day}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Barra Inferior com Inputs de Data, Ações e Repor Padrão */}
        <div className="p-3 bg-muted/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card shrink-0 whitespace-nowrap">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground select-none">
                Início
              </span>
              <span className="font-mono font-medium text-foreground whitespace-nowrap">
                {draftStart || "—"}
              </span>
            </div>
            <span className="text-muted-foreground shrink-0 select-none">—</span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border shrink-0 whitespace-nowrap transition-colors ${
              requireEndDate && draftStart && !draftEnd
                ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-border bg-card text-foreground"
            }`}>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground select-none">
                Fim
              </span>
              <span className="font-mono font-medium whitespace-nowrap">
                {draftEnd ||
                  (selectWeekOnly && draftStart
                    ? toIso(getSundayOfDate(parseFlexibleDate(draftStart) || new Date()))
                    : requireEndDate && draftStart
                    ? "Selecione o fim"
                    : "—")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            {isMaxDaysExceeded && (
              <span className="text-[10px] text-destructive flex items-center gap-1 font-medium whitespace-nowrap shrink-0">
                <AlertCircle size={12} /> Máx. {maxDays} dias
              </span>
            )}

            {onResetDefault && (
              <button
                type="button"
                onClick={() => {
                  onResetDefault();
                  setOpen(false);
                }}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <RotateCcw size={11} />
                {resetDefaultLabel}
              </button>
            )}

            {allowClear && !onResetDefault && (
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                Limpar
              </button>
            )}

            {requireEndDate && draftStart && !draftEnd && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium whitespace-nowrap shrink-0">
                <AlertCircle size={12} /> Selecione o fim (ou clique no mesmo dia para 1 dia)
              </span>
            )}

            <button
              type="button"
              disabled={!draftStart || (requireEndDate && !draftEnd) || isMaxDaysExceeded}
              onClick={handleApply}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Check size={13} />
              Aplicar
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
