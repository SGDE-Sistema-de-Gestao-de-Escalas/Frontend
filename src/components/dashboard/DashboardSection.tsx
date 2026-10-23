import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { useSchool } from "../../context/SchoolContext";
import { Badge } from "../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import DatePicker from "../common/DatePicker";
import ActionTooltip from "../common/ActionTooltip";
import AlertBanner from "./AlertBanner";
import MatrixGrid from "./MatrixGrid";
import MonthDashboardView from "./MonthDashboardView";
import RecalculateModal from "./RecalculateModal";
import WeekMatrixView from "./WeekMatrixView";
import type { GenerateScheduleResponse } from "../../api/services/schedules.service";
import type { EntityId } from "../../types";
import {
  getDateInfo,
  getIsoDateFromOffset,
  getOffsetFromIsoDate,
  getRealMonthsRange,
} from "../../utils/scheduleMatrixUtils";

export type DashViewMode = "day" | "week" | "month";

interface DashboardSectionProps {
  onSelectAssistant: (id: EntityId, offset?: number) => void;
  currentSchoolId?: EntityId;
}

export default function DashboardSection({
  onSelectAssistant,
  currentSchoolId: propSchoolId,
}: DashboardSectionProps) {
  const { selectedSchoolId } = useSchool();
  const currentSchoolId = propSchoolId ?? selectedSchoolId ?? undefined;

  const monthsList = useMemo(() => getRealMonthsRange(3, 6), []);

  const defaultStartIso = useMemo(() => getIsoDateFromOffset(-30), []);
  const defaultEndIso = useMemo(() => getIsoDateFromOffset(30), []);

  const [queryStartDate, setQueryStartDate] = useState<string>(defaultStartIso);
  const [queryEndDate, setQueryEndDate] = useState<string>(defaultEndIso);
  const [rangePopoverOpen, setRangePopoverOpen] = useState(false);

  const [viewMode, setViewMode] = useState<DashViewMode>("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(0);
  // index 3 corresponds to the current month when monthsBefore = 3
  const [monthOffset, setMonthOffset] = useState(3);
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [lastGenerationResult, setLastGenerationResult] =
    useState<GenerateScheduleResponse | null>(null);

  // Limpar resultados de geração e modais ao mudar de escola
  useEffect(() => {
    setLastGenerationResult(null);
    setShowRecalcModal(false);
  }, [currentSchoolId]);

  const isCustomDateRange =
    queryStartDate !== defaultStartIso || queryEndDate !== defaultEndIso;

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
      dayName: monthsList[monthOffset]?.name || "",
      dateStr: "",
      dayShort: "",
      monthLabel: "",
      day: 0,
      dow: 0,
    };
  }

  function prevNav() {
    if (viewMode === "day") setDayOffset((d) => d - 1);
    if (viewMode === "week") setWeekStart((w) => w - 7);
    if (viewMode === "month") setMonthOffset((m) => Math.max(m - 1, 0));
  }

  function nextNav() {
    if (viewMode === "day") setDayOffset((d) => d + 1);
    if (viewMode === "week") setWeekStart((w) => w + 7);
    if (viewMode === "month")
      setMonthOffset((m) => Math.min(m + 1, monthsList.length - 1));
  }

  function handleApplyStartDate(nextStart: string) {
    if (!nextStart) return;
    setQueryStartDate(nextStart);
    if (queryEndDate && nextStart > queryEndDate) {
      setQueryEndDate(nextStart);
    }
    const currentIso = getIsoDateFromOffset(dayOffset);
    if (currentIso < nextStart || (queryEndDate && currentIso > queryEndDate)) {
      const nextOffset = getOffsetFromIsoDate(nextStart);
      setDayOffset(nextOffset);
      setWeekStart(Math.floor(nextOffset / 7) * 7);
    }
  }

  function handleApplyEndDate(nextEnd: string) {
    if (!nextEnd) return;
    setQueryEndDate(nextEnd);
    if (queryStartDate && nextEnd < queryStartDate) {
      setQueryStartDate(nextEnd);
    }
    const currentIso = getIsoDateFromOffset(dayOffset);
    if (currentIso > nextEnd || (queryStartDate && currentIso < queryStartDate)) {
      const nextOffset = getOffsetFromIsoDate(queryStartDate || nextEnd);
      setDayOffset(nextOffset);
      setWeekStart(Math.floor(nextOffset / 7) * 7);
    }
  }

  function handleResetDateRange() {
    setQueryStartDate(defaultStartIso);
    setQueryEndDate(defaultEndIso);
  }

  const label = navLabel();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Matriz de Escalas
            </h1>
            {lastGenerationResult && (
              <Badge
                variant="outline"
                className={
                  lastGenerationResult.conflicts.length === 0
                    ? "bg-[#0E7C59]/10 text-[#0E7C59] border-[#0E7C59]/30 text-xs flex items-center gap-1"
                    : "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30 text-xs"
                }
              >
                {lastGenerationResult.conflicts.length === 0 && (
                  <CheckCircle2 size={11} />
                )}
                {lastGenerationResult.conflicts.length === 0
                  ? `Gerada (${lastGenerationResult.entries_count} blocos)`
                  : `Rascunho (${lastGenerationResult.conflicts.length} défices)`}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {viewMode === "day" && `${label.dayName}, ${label.dateStr}`}
            {viewMode === "week" && label.dayName}
            {viewMode === "month" && label.dayName}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Range Filter (Pedir ao Backend Entre Datas) */}
          <Popover open={rangePopoverOpen} onOpenChange={setRangePopoverOpen}>
            <ActionTooltip content="Definir intervalo de datas a consultar no servidor (padrão: ±1 mês)">
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    isCustomDateRange
                      ? "border-primary/40 bg-primary/8 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CalendarRange size={13} />
                  <span>
                    {isCustomDateRange
                      ? `${queryStartDate} → ${queryEndDate}`
                      : "Intervalo: ±1 Mês"}
                  </span>
                </button>
              </PopoverTrigger>
            </ActionTooltip>
            <PopoverContent
              align="end"
              sideOffset={6}
              className="w-80 p-4 rounded-xl border border-border bg-card shadow-2xl space-y-3 z-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Consultar Escalas Entre Datas
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Por defeito são carregadas as escalas de 1 mês para trás até
                    1 mês para a frente.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Data de Início
                  </label>
                  <DatePicker
                    value={queryStartDate}
                    onChange={handleApplyStartDate}
                    allowClear={false}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Data de Fim
                  </label>
                  <DatePicker
                    value={queryEndDate}
                    onChange={handleApplyEndDate}
                    minDate={queryStartDate}
                    allowClear={false}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleResetDateRange}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={11} />
                  Repor ±1 Mês
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetOffset = getOffsetFromIsoDate(queryStartDate);
                    setDayOffset(targetOffset);
                    setWeekStart(Math.floor(targetOffset / 7) * 7);
                    setRangePopoverOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Ir para Data Inicial
                </button>
              </div>
            </PopoverContent>
          </Popover>

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
                setMonthOffset(3);
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

      {/* Alert banner only on day view when real conflicts exist */}
      {viewMode === "day" && (
        <AlertBanner
          onRecalculate={() => setShowRecalcModal(true)}
          conflicts={lastGenerationResult?.conflicts}
          hasGeneratedClean={
            lastGenerationResult !== null &&
            lastGenerationResult.conflicts.length === 0
          }
        />
      )}

      {/* Views */}
      {viewMode === "day" && (
        <MatrixGrid
          dayOffset={dayOffset}
          onChangeDayOffset={(nextOffset) => setDayOffset(nextOffset)}
          onSelectAssistant={(id, offset) =>
            onSelectAssistant(id, offset ?? dayOffset)
          }
          dateLabel={`${label.dayName}, ${label.dateStr} · blocos de 15 min`}
          lunchBlocksByDate={lastGenerationResult?.lunch_blocks}
          queryStartDate={queryStartDate}
          queryEndDate={queryEndDate}
          onRequestRecalculate={() => setShowRecalcModal(true)}
        />
      )}
      {viewMode === "week" && (
        <WeekMatrixView
          weekStart={weekStart}
          onSelectDay={(offset) => {
            setDayOffset(offset);
            switchView("day");
          }}
          onSelectAssistant={(id) => onSelectAssistant(id, weekStart)}
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
              Math.max(0, Math.min(m + delta, monthsList.length - 1))
            )
          }
        />
      )}

      <RecalculateModal
        open={showRecalcModal}
        onClose={() => setShowRecalcModal(false)}
        currentSchoolId={currentSchoolId}
        onGenerated={(result) => setLastGenerationResult(result)}
      />
    </div>
  );
}
