import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useSchool } from "../../context/SchoolContext";
import { Badge } from "../ui/badge";
import DateRangePicker, { type DateRange } from "../common/DateRangePicker";
import ActionTooltip from "../common/ActionTooltip";
import AlertBanner from "./AlertBanner";
import MatrixGrid from "./MatrixGrid";
import MonthDashboardView from "./MonthDashboardView";
import RecalculateModal from "./RecalculateModal";
import WeekMatrixView from "./WeekMatrixView";
import { usePendingRecalculations } from "../../hooks/api/useSchedules";
import { useDashboardBootstrap } from "../../hooks/api/useDashboardBootstrap";
import type { GenerateScheduleResponse } from "../../api/services/schedules.service";
import type { EntityId } from "../../types";
import {
  getDateInfo,
  getIsoDateFromOffset,
  getOffsetFromIsoDate,
  getRealMonthsRange,
  getThreeWeeksWindowIso,
  getCurrentMonthFullWindowIso,
} from "../../utils/scheduleMatrixUtils";

export type DashViewMode = "day" | "week" | "month";

interface DashboardSectionProps {
  onSelectAssistant: (id: EntityId, offset?: number) => void;
  currentSchoolId?: EntityId;
}

function SyncIndicator({
  isFetching,
  dataUpdatedAt,
  onRefresh,
}: {
  isFetching: boolean;
  dataUpdatedAt: number;
  onRefresh: () => void;
}) {
  const [timeAgoText, setTimeAgoText] = useState("agora mesmo");

  useEffect(() => {
    function updateText() {
      if (!dataUpdatedAt) {
        setTimeAgoText("agora");
        return;
      }
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000));
      if (elapsedSeconds < 15) {
        setTimeAgoText("agora mesmo");
      } else if (elapsedSeconds < 60) {
        setTimeAgoText(`há ${elapsedSeconds}s`);
      } else {
        const mins = Math.floor(elapsedSeconds / 60);
        setTimeAgoText(`há ${mins} min`);
      }
    }

    updateText();
    const interval = setInterval(updateText, 5_000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  return (
    <ActionTooltip content="Sincronização em segundo plano ativa (a cada 2 min). Clique para atualizar agora.">
      <button
        type="button"
        onClick={onRefresh}
        disabled={isFetching}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors cursor-pointer disabled:opacity-70"
      >
        <RefreshCw
          size={12}
          className={isFetching ? "animate-spin text-primary" : "text-muted-foreground"}
        />
        <span className="hidden sm:inline">
          {isFetching ? "A sincronizar..." : `Sincronizado ${timeAgoText}`}
        </span>
      </button>
    </ActionTooltip>
  );
}

export default function DashboardSection({
  onSelectAssistant,
  currentSchoolId: propSchoolId,
}: DashboardSectionProps) {
  const { selectedSchoolId } = useSchool();
  const currentSchoolId = propSchoolId ?? selectedSchoolId ?? undefined;

  const monthsList = useMemo(() => getRealMonthsRange(3, 6), []);

  const initialMonthWindow = useMemo(() => getCurrentMonthFullWindowIso(), []);
  const defaultStartIso = initialMonthWindow.startIso;
  const defaultEndIso = initialMonthWindow.endIso;

  const [queryStartDate, setQueryStartDate] = useState<string>(defaultStartIso);
  const [queryEndDate, setQueryEndDate] = useState<string>(defaultEndIso);

  const [viewMode, setViewMode] = useState<DashViewMode>("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(0);
  // index 3 corresponds to the current month when monthsBefore = 3
  const [monthOffset, setMonthOffset] = useState(3);
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [recalcDates, setRecalcDates] = useState<{ start?: string; end?: string }>({});
  const [lastGenerationResult, setLastGenerationResult] =
    useState<GenerateScheduleResponse | null>(null);

  const { data: pendingRecalculations } = usePendingRecalculations();

  const {
    isFetching: isSyncing,
    dataUpdatedAt,
    refetch: refetchBootstrap,
  } = useDashboardBootstrap(queryStartDate, queryEndDate);

  // Limpar resultados de geração e modais ao mudar de escola
  useEffect(() => {
    setLastGenerationResult(null);
    setShowRecalcModal(false);
  }, [currentSchoolId, queryStartDate, queryEndDate]);

  const isCustomDateRange =
    queryStartDate !== defaultStartIso || queryEndDate !== defaultEndIso;

  const activeDashboardDate = useMemo(() => {
    if (viewMode === "week") {
      return getIsoDateFromOffset(weekStart);
    }
    return getIsoDateFromOffset(dayOffset);
  }, [viewMode, dayOffset, weekStart]);

  // Se o utilizador navegar nos dias ou semanas para fora do intervalo carregado,
  // expande automaticamente o intervalo do backend para incluir a nova data
  useEffect(() => {
    if (!activeDashboardDate) return;
    if (activeDashboardDate < queryStartDate) {
      const d = new Date(activeDashboardDate + "T00:00:00");
      const dow = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - dow - 7);
      const pad = (n: number) => String(n).padStart(2, "0");
      setQueryStartDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    } else if (activeDashboardDate > queryEndDate) {
      const d = new Date(activeDashboardDate + "T00:00:00");
      const dow = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() + (6 - dow) + 7);
      const pad = (n: number) => String(n).padStart(2, "0");
      setQueryEndDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    }
  }, [activeDashboardDate, queryStartDate, queryEndDate]);

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

  const dashboardPresets = useMemo(() => {
    const t = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const dow = (t.getDay() + 6) % 7;
    const thisMon = new Date(t);
    thisMon.setDate(t.getDate() - dow);
    const thisSun = new Date(thisMon);
    thisSun.setDate(thisMon.getDate() + 6);

    const firstDayMonth = new Date(t.getFullYear(), t.getMonth(), 1);
    const lastDayMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0);

    return [
      { label: "Este Mês Completo", start: defaultStartIso, end: defaultEndIso },
      { label: "Hoje", start: toIso(t), end: toIso(t) },
      { label: "Esta Semana", start: toIso(thisMon), end: toIso(thisSun) },
      { label: "Este Mês", start: toIso(firstDayMonth), end: toIso(lastDayMonth) },
    ];
  }, [defaultStartIso, defaultEndIso]);

  function handleDateRangeChange(range: DateRange) {
    if (!range.startDate || !range.endDate) return;
    setQueryStartDate(range.startDate);
    setQueryEndDate(range.endDate);

    const currentIso = getIsoDateFromOffset(dayOffset);
    if (currentIso < range.startDate || currentIso > range.endDate) {
      const nextOffset = getOffsetFromIsoDate(range.startDate);
      setDayOffset(nextOffset);
      setWeekStart(Math.floor(nextOffset / 7) * 7);
    }
  }

  function handleResetDateRange() {
    setQueryStartDate(defaultStartIso);
    setQueryEndDate(defaultEndIso);
    const currentIso = getIsoDateFromOffset(dayOffset);
    if (currentIso < defaultStartIso || currentIso > defaultEndIso) {
      setDayOffset(0);
      setWeekStart(0);
    }
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
          {/* Indicador discreto de Sincronização em segundo plano */}
          <SyncIndicator
            isFetching={isSyncing}
            dataUpdatedAt={dataUpdatedAt}
            onRefresh={() => refetchBootstrap()}
          />

          {/* Date Range Filter (Pedir ao Backend Entre Datas) */}
          <ActionTooltip content="Definir intervalo de datas a consultar no servidor (padrão: ±1 mês)">
            <DateRangePicker
              value={{ startDate: queryStartDate, endDate: queryEndDate }}
              onChange={handleDateRangeChange}
              customTriggerLabel={
                isCustomDateRange
                  ? `${queryStartDate} → ${queryEndDate}`
                  : "Intervalo: Mês Atual"
              }
              customPresets={dashboardPresets}
              onResetDefault={handleResetDateRange}
              resetDefaultLabel="Repor Mês Atual"
              allowClear={false}
              align="end"
              triggerIcon={
                <CalendarRange
                  size={13}
                  className={isCustomDateRange ? "text-primary" : "text-muted-foreground"}
                />
              }
              className={
                isCustomDateRange
                  ? "border-primary/40 bg-primary/8 text-primary font-medium"
                  : "border-border bg-card text-muted-foreground hover:text-foreground font-medium"
              }
            />
          </ActionTooltip>

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
            onClick={() => {
              setRecalcDates({
                start: activeDashboardDate,
                end: activeDashboardDate,
              });
              setShowRecalcModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs"
          >
            <RefreshCw size={14} />
            Recalcular
          </button>
        </div>
      </div>

      {/* Alert banner when real conflicts exist or pending recalculations exist */}
      <AlertBanner
        onRecalculate={(affectedDates) => {
          if (affectedDates && affectedDates.length > 0) {
            setRecalcDates({
              start: affectedDates[0],
              end: affectedDates[affectedDates.length - 1],
            });
          } else {
            setRecalcDates({
              start: activeDashboardDate,
              end: activeDashboardDate,
            });
          }
          setShowRecalcModal(true);
        }}
        conflicts={lastGenerationResult?.conflicts}
        pendingRecalculations={pendingRecalculations}
        hasGeneratedClean={
          lastGenerationResult !== null &&
          lastGenerationResult.conflicts.length === 0
        }
      />

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
          onRequestRecalculate={() => {
            setRecalcDates({
              start: activeDashboardDate,
              end: activeDashboardDate,
            });
            setShowRecalcModal(true);
          }}
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
        onClose={() => {
          setShowRecalcModal(false);
          setRecalcDates({});
        }}
        currentSchoolId={currentSchoolId}
        initialStartDate={recalcDates.start || activeDashboardDate}
        initialEndDate={recalcDates.end || activeDashboardDate}
        onGenerated={(result) => {
          setLastGenerationResult(result);
          if (recalcDates.start && recalcDates.start < queryStartDate) {
            setQueryStartDate(recalcDates.start);
          }
          if (recalcDates.end && recalcDates.end > queryEndDate) {
            setQueryEndDate(recalcDates.end);
          }
        }}
      />
    </div>
  );
}
