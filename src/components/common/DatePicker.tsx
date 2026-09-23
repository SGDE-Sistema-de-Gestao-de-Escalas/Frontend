import React, { useState, useEffect, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}

export default function DatePicker({
  value,
  onChange,
  className = "",
  placeholder = "AAAA-MM-DD",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const parsed = value ? new Date(value + "T12:00:00") : null;
  const today = new Date();
  const [viewYear, setViewYear] = useState(
    parsed?.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    parsed?.getMonth() ?? today.getMonth()
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
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

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (!open && parsed) {
            setViewYear(parsed.getFullYear());
            setViewMonth(parsed.getMonth());
          }
          setOpen((v) => !v);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border bg-input-background font-mono focus:outline-none focus:ring-1 focus:ring-ring text-left hover:border-accent/40 transition-colors"
      >
        <Calendar size={13} className="text-muted-foreground flex-shrink-0" />
        <span
          className={
            displayValue ? "text-foreground" : "text-muted-foreground/50"
          }
        >
          {displayValue || placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 bg-card border border-border rounded-xl shadow-xl p-3 w-64">
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
              const isSelected = value === iso;
              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`w-full aspect-square flex items-center justify-center text-[11px] font-mono rounded-lg transition-colors
                    ${
                      isSelected
                        ? "bg-accent text-white font-bold"
                        : isToday
                        ? "bg-accent/10 text-accent font-semibold"
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
              onClick={() => {
                const d = today;
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                onChange(`${d.getFullYear()}-${mm}-${dd}`);
                setOpen(false);
              }}
              className="text-[10px] text-accent hover:text-accent/80 font-medium transition-colors"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

