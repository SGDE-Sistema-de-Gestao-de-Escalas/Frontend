import React, { useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import {
  DASHBOARD_MONTHS,
  generateDayMatrix,
  getDateInfo,
  SCHEDULE_MATRIX,
} from "../../api/mockData";
import { useSchool } from "../../context/SchoolContext";
import AlertBanner from "./AlertBanner";
import MatrixGrid from "./MatrixGrid";
import MonthDashboardView from "./MonthDashboardView";
import RecalculateModal from "./RecalculateModal";
import WeekMatrixView from "./WeekMatrixView";

export type DashViewMode = "day" | "week" | "month";

interface DashboardSectionProps {
  onSelectAssistant: (id: number) => void;
  currentSchoolId?: number;
}

export default function DashboardSection({
  onSelectAssistant,
  currentSchoolId: propSchoolId,
}: DashboardSectionProps) {
  const { selectedSchoolId } = useSchool();
  const currentSchoolId = propSchoolId ?? selectedSchoolId;

  const [viewMode, setViewMode] = useState<DashViewMode>("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [showRecalcModal, setShowRecalcModal] = useState(false);

  function switchView(mode: DashViewMode) {
    if (mode === "week") setWeekStart(Math.floor(dayOffset / 7) * 7);
    if (mode === "day" && viewMode === "week") setDayOffset(weekStart);
    setViewMode(mode);
  }

  function navLabel() {
    if (viewMode === "day") return getDateInfo(dayOffset);
    if (viewMode === "week") {
      const start = getDateInfo(weekStart);
      const end = getDateInfo(weekStart + 6);
      return {
        dayName: `${start.dateStr} – ${end.dateStr}`,
        dateStr: "",
        dayShort: "",
        monthLabel: "",
        day: 0,
        dow: 0,
      };
    }
    return {
      dayName: DASHBOARD_MONTHS[monthOffset]?.name || "",
      dateStr: "",
      dayShort: "",
      monthLabel: "",
      day: 0,
      dow: 0,
    };
  }

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
        Math.min(m + 1, DASHBOARD_MONTHS.length - 1)
      );
  }

  const label = navLabel();
  const matrix =
    viewMode === "day" ? generateDayMatrix(dayOffset) : SCHEDULE_MATRIX;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Matriz de Escalas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {viewMode === "day" && `${label.dayName}, ${label.dateStr}`}
            {viewMode === "week" && label.dayName}
            {viewMode === "month" && label.dayName}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
            {(["day", "week", "month"] as DashViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchView(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === m
                    ? "bg-card shadow-xs text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "day" ? "Dia" : m === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden bg-card">
            <button
              type="button"
              onClick={prevNav}
              className="px-2.5 py-1.5 hover:bg-muted transition-colors border-r border-border text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setDayOffset(0);
                setWeekStart(0);
                setMonthOffset(0);
              }}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={nextNav}
              className="px-2.5 py-1.5 hover:bg-muted transition-colors border-l border-border text-muted-foreground hover:text-foreground"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowRecalcModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
          >
            <RefreshCw size={14} />
            Recalcular
          </button>
        </div>
      </div>

      {/* Alert banner only on day view */}
      {viewMode === "day" && (
        <AlertBanner onRecalculate={() => setShowRecalcModal(true)} />
      )}

      {/* Views */}
      {viewMode === "day" && (
        <MatrixGrid
          matrix={matrix}
          onSelectAssistant={onSelectAssistant}
          dateLabel={`${label.dayName}, ${label.dateStr} · blocos de 15 min`}
        />
      )}
      {viewMode === "week" && (
        <WeekMatrixView
          weekStart={weekStart}
          onSelectDay={(offset) => {
            setDayOffset(offset);
            switchView("day");
          }}
          onSelectAssistant={onSelectAssistant}
        />
      )}
      {viewMode === "month" && (
        <MonthDashboardView
          monthOffset={monthOffset}
          onSelectDay={(offset) => {
            setDayOffset(offset);
            switchView("day");
          }}
          onChangeMonth={(delta) =>
            setMonthOffset((m) =>
              Math.max(0, Math.min(m + delta, DASHBOARD_MONTHS.length - 1))
            )
          }
        />
      )}

      <RecalculateModal
        open={showRecalcModal}
        onClose={() => setShowRecalcModal(false)}
        currentSchoolId={currentSchoolId}
      />
    </div>
  );
}

