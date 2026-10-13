import React, { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  minDate?: string; // Formato YYYY-MM-DD
  maxDate?: string; // Formato YYYY-MM-DD
  disabled?: boolean;
  hasError?: boolean;
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
    mar: 2,
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

export default function DatePicker({
  value,
  onChange,
  className = "",
  placeholder = "AAAA-MM-DD",
  minDate,
  maxDate,
  disabled = false,
  hasError = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

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

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const firstDowMon = (firstDow + 6) % 7; // 0=Mon...6=Sun

  const monthNames = [
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
  const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  function isDateDisabled(isoDate: string): boolean {
    if (minDate && isoDate < minDate) return true;
    if (maxDate && isoDate > maxDate) return true;
    return false;
  }

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const iso = `${viewYear}-${mm}-${dd}`;
    if (isDateDisabled(iso)) return;
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

  const displayValue = parsed
    ? parsed.toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!open && parsed) {
              setViewYear(parsed.getFullYear());
              setViewMonth(parsed.getMonth());
            }
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border bg-input-background font-mono focus:outline-none focus:ring-1 text-left hover:border-accent/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            hasError ? "!border-destructive focus:!ring-destructive" : "border-border focus:ring-ring"
          } ${className}`}
        >
          <Calendar size={13} className="text-muted-foreground flex-shrink-0" />
          <span
            className={
              displayValue ? "text-foreground" : "text-muted-foreground/50"
            }
          >
            {displayValue || placeholder}
          </span>
          {value && !disabled && (
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
            >
              <X size={12} />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-64 p-3 bg-card border border-border rounded-xl shadow-2xl ring-1 ring-black/5 z-[100]"
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft size={14} className="text-muted-foreground" />
          </button>
          <span className="text-xs font-semibold text-foreground">
            {monthNames[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {dayLabels.map((d) => (
            <div
              key={d}
              className="text-center text-[9px] font-semibold text-muted-foreground uppercase py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: firstDowMon }).map((_, i) => (
            <div key={`pre-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const mm = String(viewMonth + 1).padStart(2, "0");
            const dd = String(day).padStart(2, "0");
            const iso = `${viewYear}-${mm}-${dd}`;
            const isSelected = parsed
              ? parsed.getFullYear() === viewYear &&
                parsed.getMonth() === viewMonth &&
                parsed.getDate() === day
              : value === iso;
            const isToday =
              today.getFullYear() === viewYear &&
              today.getMonth() === viewMonth &&
              today.getDate() === day;
            const isDisabled = isDateDisabled(iso);

            return (
              <button
                key={day}
                type="button"
                disabled={isDisabled}
                onClick={() => selectDay(day)}
                className={`w-full aspect-square flex items-center justify-center text-[11px] font-mono rounded-lg transition-colors
                  ${
                    isDisabled
                      ? "opacity-25 cursor-not-allowed text-muted-foreground line-through"
                      : isSelected
                      ? "bg-accent text-white font-bold"
                      : isToday
                      ? "bg-accent/10 text-accent font-semibold hover:bg-accent/20"
                      : "text-foreground hover:bg-muted"
                  }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-2.5 pt-2 border-t border-border flex justify-between">
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar
          </button>
          <button
            type="button"
            disabled={isDateDisabled(todayIso)}
            onClick={() => {
              if (!isDateDisabled(todayIso)) {
                onChange(todayIso);
                setOpen(false);
              }
            }}
            className="text-[10px] text-accent hover:text-accent/80 font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Hoje
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

