import React, { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import ActionTooltip from "./ActionTooltip";

export interface DatePickerPreset {
  label: string;
  value: string; // Formato YYYY-MM-DD
}

export type DatePickerScopeMode = "day" | "week" | "month";

export interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  minDate?: string; // Formato YYYY-MM-DD
  maxDate?: string; // Formato YYYY-MM-DD
  disabled?: boolean;
  hasError?: boolean;
  allowClear?: boolean;
  isDateDisabled?: (isoDate: string) => boolean;
  getDayTooltip?: (isoDate: string) => string | undefined;
  presets?: DatePickerPreset[];
  customTriggerLabel?: string;
  align?: "start" | "center" | "end";
  selectMonthOnly?: boolean;
  scopeMode?: DatePickerScopeMode;
  onScopeModeChange?: (mode: DatePickerScopeMode) => void;
  allowedScopeModes?: DatePickerScopeMode[];
  selectedWeekStart?: string; // YYYY-MM-DD
  selectedWeekEnd?: string;   // YYYY-MM-DD
}

export function parseFlexibleDate(value: string | null | undefined): Date | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // 1. ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    const date = new Date(y, m, d, 12, 0, 0);
    if (!isNaN(date.getTime())) return date;
  }

  // 2. Format DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    const date = new Date(y, m, d, 12, 0, 0);
    if (!isNaN(date.getTime())) return date;
  }

  // 3. Portuguese / text dates: "DD Mmm YYYY" or "YYYY-Mmm-DD" (e.g. "03 Mar 2026", "01 Set 2025")
  const ptMonths: Record<string, number> = {
    jan: 0,
    fev: 1,
    mar: 3 - 1,
    abr: 3,
    mai: 4,
    may: 4,
    jun: 5,
    jul: 6,
    ago: 7,
    aug: 7,
    set: 8,
    sep: 8,
    out: 9,
    oct: 9,
    nov: 10,
    dez: 11,
    dec: 11,
  };

  const ptMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-zçÇáÁéÉíÍóÓúÚ]+)\s+(\d{4})/);
  if (ptMatch) {
    const d = parseInt(ptMatch[1], 10);
    const mStr = ptMatch[2]
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .slice(0, 3);
    const y = parseInt(ptMatch[3], 10);
    if (mStr in ptMonths) {
      const date = new Date(y, ptMonths[mStr], d, 12, 0, 0);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // Reverse "YYYY-Mmm-DD"
  const revPtMatch = trimmed.match(/^(\d{4})[\-\s]+([A-Za-zçÇáÁéÉíÍóÓúÚ]+)[\-\s]+(\d{1,2})/);
  if (revPtMatch) {
    const y = parseInt(revPtMatch[1], 10);
    const mStr = revPtMatch[2]
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .slice(0, 3);
    const d = parseInt(revPtMatch[3], 10);
    if (mStr in ptMonths) {
      const date = new Date(y, ptMonths[mStr], d, 12, 0, 0);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // 4. Fallback standard Date parsing
  const std = new Date(trimmed);
  if (!isNaN(std.getTime())) {
    return std;
  }

  return null;
}

export function formatToIsoDate(value: string | null | undefined): string {
  const d = parseFlexibleDate(value);
  if (!d) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
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

export default function DatePicker({
  value,
  onChange,
  className = "",
  placeholder = "AAAA-MM-DD",
  minDate,
  maxDate,
  disabled = false,
  hasError = false,
  allowClear = true,
  isDateDisabled: customIsDateDisabled,
  getDayTooltip,
  presets,
  customTriggerLabel,
  align = "start",
  selectMonthOnly = false,
  scopeMode,
  onScopeModeChange,
  allowedScopeModes,
  selectedWeekStart,
  selectedWeekEnd,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">(
    selectMonthOnly || scopeMode === "month" ? "months" : "days"
  );
  const [hoveredWeekRow, setHoveredWeekRow] = useState<number | null>(null);

  const parsed = parseFlexibleDate(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState(
    parsed ? parsed.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    parsed ? parsed.getMonth() : today.getMonth()
  );

  useEffect(() => {
    const p = parseFlexibleDate(value);
    if (p) {
      setViewYear(p.getFullYear());
      setViewMonth(p.getMonth());
    }
  }, [value]);

  // Reset viewMode whenever popover opens
  useEffect(() => {
    if (open) {
      setViewMode(selectMonthOnly || scopeMode === "month" ? "months" : "days");
      const p = parseFlexibleDate(value);
      if (p) {
        setViewYear(p.getFullYear());
        setViewMonth(p.getMonth());
      }
    }
  }, [open, value, selectMonthOnly, scopeMode]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const firstDowMon = (firstDow + 6) % 7; // 0=Mon...6=Sun

  const minYear = minDate ? parseInt(minDate.split("-")[0], 10) : undefined;
  const maxYear = maxDate ? parseInt(maxDate.split("-")[0], 10) : undefined;
  const minMonth = minDate && minYear === viewYear ? parseInt(minDate.split("-")[1], 10) - 1 : undefined;
  const maxMonth = maxDate && maxYear === viewYear ? parseInt(maxDate.split("-")[1], 10) - 1 : undefined;

  function isYearDisabled(yr: number): boolean {
    if (minYear !== undefined && yr < minYear) return true;
    if (maxYear !== undefined && yr > maxYear) return true;
    return false;
  }

  function isMonthDisabled(idx: number): boolean {
    if (minMonth !== undefined && idx < minMonth) return true;
    if (maxMonth !== undefined && idx > maxMonth) return true;
    return false;
  }

  // Decades navigation for Year grid
  const decadeStart = Math.floor(viewYear / 12) * 12;
  const yearsList = useMemo(
    () => Array.from({ length: 12 }, (_, i) => decadeStart + i),
    [decadeStart]
  );

  function checkDateDisabled(isoDate: string): boolean {
    if (minDate && isoDate < minDate) return true;
    if (maxDate && isoDate > maxDate) return true;
    if (customIsDateDisabled && customIsDateDisabled(isoDate)) return true;
    return false;
  }

  function selectDay(day: number) {
    if (scopeMode === "week") {
      const clickedDate = new Date(viewYear, viewMonth, day);
      const dow = (clickedDate.getDay() + 6) % 7; // 0=Mon
      const mon = new Date(clickedDate);
      mon.setDate(mon.getDate() - dow);
      const mm = String(mon.getMonth() + 1).padStart(2, "0");
      const dd = String(mon.getDate()).padStart(2, "0");
      const monIso = `${mon.getFullYear()}-${mm}-${dd}`;
      if (checkDateDisabled(monIso)) return;
      onChange(monIso);
      setOpen(false);
      return;
    }

    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const iso = `${viewYear}-${mm}-${dd}`;
    if (checkDateDisabled(iso)) return;
    onChange(iso);
    setOpen(false);
  }

  function prevMonth() {
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

  const todayIso = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-colors bg-card
            ${hasError ? "border-destructive ring-1 ring-destructive/30" : "border-border hover:border-border/80"}
            ${disabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "cursor-pointer"}
            ${open ? "border-primary ring-1 ring-primary/30" : ""}
            ${className}`}
        >
          <Calendar size={13} className="text-muted-foreground flex-shrink-0" />
          <span className={customTriggerLabel || parsed ? "text-foreground font-medium" : "text-muted-foreground"}>
            {customTriggerLabel || (parsed ? formatToIsoDate(value) : placeholder)}
          </span>
          {allowClear && (parsed || customTriggerLabel) && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="ml-auto p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Limpar data"
            >
              <X size={12} />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-72 p-3 bg-card border border-border rounded-xl shadow-2xl ring-1 ring-black/5 z-[100]"
      >
        {/* Seletor de Escopo de Visão (Dia / Semana / Mês) */}
        {allowedScopeModes && allowedScopeModes.length > 1 && (
          <div className="flex items-center bg-muted rounded-lg p-0.5 mb-2.5 border border-border/50">
            {allowedScopeModes.map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => {
                  onScopeModeChange?.(scope);
                  if (scope === "month") {
                    setViewMode("months");
                  } else {
                    setViewMode("days");
                  }
                }}
                className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  (scopeMode ?? "day") === scope
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {scope === "day" ? "Dia" : scope === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        )}

        {/* Atalhos Rápidos de Seleção (se fornecidos) */}
        {presets && presets.length > 0 && (
          <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-border/50 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-0.5">
              Atalhos:
            </span>
            {presets.map((p) => {
              const isSelected = value === p.value;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    onChange(p.value);
                    setOpen(false);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                      : "border-border bg-muted/40 hover:bg-muted text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Header com Navegação Interativa de Mês e Ano */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
          <button
            type="button"
            onClick={() => {
              if (viewMode === "years") setViewYear((y) => y - 12);
              else if (viewMode === "months") setViewYear((y) => y - 1);
              else prevMonth();
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Anterior"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="flex items-center gap-1">
            {/* Botão Seletor de Mês */}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "months" ? "days" : "months")}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === "months"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-foreground hover:bg-muted"
              }`}
              title="Selecionar mês"
            >
              <span>{MONTH_NAMES[viewMonth]}</span>
              <ChevronDown
                size={11}
                className={`transition-transform duration-200 ${
                  viewMode === "months" ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Botão Seletor de Ano */}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "years" ? "days" : "years")}
              className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === "years"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-foreground hover:bg-muted"
              }`}
              title="Selecionar ano"
            >
              <span>{viewMode === "years" ? `${decadeStart}–${decadeStart + 11}` : viewYear}</span>
              <ChevronDown
                size={11}
                className={`transition-transform duration-200 ${
                  viewMode === "years" ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (viewMode === "years") setViewYear((y) => y + 12);
              else if (viewMode === "months") setViewYear((y) => y + 1);
              else nextMonth();
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Seguinte"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* 1. Vista de Seleção de Meses (Grelha 3x4) */}
        {viewMode === "months" && (
          <div className="grid grid-cols-3 gap-1.5 py-1">
            {MONTH_SHORT.map((mShort, idx) => {
              const isSelected = viewMonth === idx;
              const isCurrentMonth = today.getMonth() === idx && today.getFullYear() === viewYear;
              const disabledMonth = isMonthDisabled(idx);
              return (
                <button
                  key={mShort}
                  type="button"
                  disabled={disabledMonth}
                  onClick={() => {
                    if (disabledMonth) return;
                    setViewMonth(idx);
                    if (selectMonthOnly) {
                      const mm = String(idx + 1).padStart(2, "0");
                      onChange(`${viewYear}-${mm}-01`);
                      setOpen(false);
                    } else {
                      setViewMode("days");
                    }
                  }}
                  className={`py-2 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    disabledMonth
                      ? "opacity-30 pointer-events-none cursor-not-allowed"
                      : isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : isCurrentMonth
                      ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {mShort}
                </button>
              );
            })}
          </div>
        )}

        {/* 2. Vista de Seleção de Anos (Grelha 3x4 com navegação de década) */}
        {viewMode === "years" && (
          <div className="grid grid-cols-3 gap-1.5 py-1">
            {yearsList.map((yr) => {
              const isSelected = viewYear === yr;
              const isCurrentYear = today.getFullYear() === yr;
              const disabledYear = isYearDisabled(yr);
              return (
                <button
                  key={yr}
                  type="button"
                  disabled={disabledYear}
                  onClick={() => {
                    if (disabledYear) return;
                    setViewYear(yr);
                    setViewMode("months");
                  }}
                  className={`py-2 px-1 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer ${
                    disabledYear
                      ? "opacity-30 pointer-events-none cursor-not-allowed"
                      : isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : isCurrentYear
                      ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {yr}
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Vista Padrão de Dias */}
        {viewMode === "days" && (
          <>
            {/* Cabeçalho dos dias da semana */}
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

            {/* Grelha do calendário */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {Array.from({ length: firstDowMon }).map((_, i) => (
                <div key={`pre-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const mm = String(viewMonth + 1).padStart(2, "0");
                const dd = String(day).padStart(2, "0");
                const iso = `${viewYear}-${mm}-${dd}`;
                const weekRowIndex = Math.floor((firstDowMon + i) / 7);
                const isInSelectedWeek =
                  scopeMode === "week" &&
                  Boolean(selectedWeekStart && selectedWeekEnd && iso >= selectedWeekStart && iso <= selectedWeekEnd);
                const isHoveredWeek =
                  scopeMode === "week" && hoveredWeekRow === weekRowIndex;
                const isSelected =
                  scopeMode === "week"
                    ? isInSelectedWeek
                    : parsed
                    ? parsed.getFullYear() === viewYear &&
                      parsed.getMonth() === viewMonth &&
                      parsed.getDate() === day
                    : value === iso;
                const isToday =
                  today.getFullYear() === viewYear &&
                  today.getMonth() === viewMonth &&
                  today.getDate() === day;
                const isDisabled = checkDateDisabled(iso);
                const dayTooltip = getDayTooltip?.(iso);

                const btn = (
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => selectDay(day)}
                    onMouseEnter={() => {
                      if (scopeMode === "week") setHoveredWeekRow(weekRowIndex);
                    }}
                    onMouseLeave={() => {
                      if (scopeMode === "week") setHoveredWeekRow(null);
                    }}
                    className={`w-full aspect-square flex items-center justify-center text-[11px] font-mono rounded-lg transition-colors
                      ${
                        isDisabled
                          ? "opacity-25 cursor-not-allowed text-muted-foreground line-through"
                          : isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : isHoveredWeek
                          ? "bg-primary/20 text-primary font-semibold"
                          : isToday
                          ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                          : "text-foreground hover:bg-muted cursor-pointer"
                      }`}
                  >
                    {day}
                  </button>
                );

                return dayTooltip ? (
                  <ActionTooltip key={day} content={dayTooltip}>
                    {btn}
                  </ActionTooltip>
                ) : (
                  <React.Fragment key={day}>{btn}</React.Fragment>
                );
              })}
            </div>
          </>
        )}

        {/* Rodapé */}
        <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between">
          {allowClear ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Limpar
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            disabled={checkDateDisabled(todayIso)}
            onClick={() => {
              if (!checkDateDisabled(todayIso)) {
                if (scopeMode === "week") {
                  const dow = (today.getDay() + 6) % 7;
                  const mon = new Date(today);
                  mon.setDate(mon.getDate() - dow);
                  const mm = String(mon.getMonth() + 1).padStart(2, "0");
                  const dd = String(mon.getDate()).padStart(2, "0");
                  onChange(`${mon.getFullYear()}-${mm}-${dd}`);
                } else if (scopeMode === "month") {
                  const mm = String(today.getMonth() + 1).padStart(2, "0");
                  onChange(`${today.getFullYear()}-${mm}-01`);
                } else {
                  onChange(todayIso);
                }
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                setViewMode(scopeMode === "month" ? "months" : "days");
                setOpen(false);
              }
            }}
            className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            Hoje
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
