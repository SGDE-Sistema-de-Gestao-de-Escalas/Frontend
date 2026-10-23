import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CalendarClock,
  CalendarOff,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Edit2,
  Eraser,
  Eye,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Send,
  Trash2,
  UserX,
} from "lucide-react";
import type { BlockState, EntityId, ScheduleMatrix } from "../../types";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import ActionTooltip from "../common/ActionTooltip";
import DatePicker from "../common/DatePicker";
import { notify } from "../common/FeedbackNotification";
import {
  BLOCK_STYLES,
  formatDurationSlots,
  slotsToBlocks,
  TIME_SLOTS,
} from "./blockStyles";
import { useQueries } from "@tanstack/react-query";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";
import { useAssistantsList } from "../../hooks/api/useAssistants";
import { useSchedulesList } from "../../hooks/api/useSchedules";
import { useAbsencesList } from "../../hooks/api/useAbsences";
import { useScheduleRulesList } from "../../hooks/api/useScheduleRules";
import { useActivityTypesList } from "../../hooks/api/useActivityTypes";
import {
  useOperatingCalendar,
  useOperatingExceptions,
  useOperatingRules,
} from "../../hooks/api/useOperatingHours";
import { useHolidaysList } from "../../hooks/api/useHolidays";
import assistantSchedulesService from "../../api/services/assistantSchedules.service";
import assistantExceptionsService from "../../api/services/assistantExceptions.service";
import { ASSISTANT_SCHEDULES_KEY } from "../../hooks/api/useAssistantSchedules";
import { ASSISTANT_EXCEPTIONS_KEY } from "../../hooks/api/useAssistantExceptions";
import type {
  AssistantScheduleProfileApi,
  AssistantExceptionApi,
} from "../../types/assistantSchedule.types";
import type { LunchBlockApi } from "../../api/services/schedules.service";
import PublishSchedulesModal from "./PublishSchedulesModal";
import {
  buildDayMatrixFromApi,
  buildTimelineHourSegments,
  checkAssistantAbsenceOnDate,
  getAllDraftDaysFromSchedules,
  getDateInfo,
  getIsoDateFromOffset,
  getOffsetFromIsoDate,
  getSchedulePublishStatusForDate,
  getShiftBoundsFromRow,
  hasGeneratedScheduleForDate,
  mapActivityToBlockState,
  resolveAssistantShiftBounds,
  resolveSchoolDayStatusByIsoDate,
  timeToSlotIndex,
  SlotEntryMetadata,
  AssistantResolvedShiftBounds,
} from "../../utils/scheduleMatrixUtils";

interface DayRuleConfig {
  id: string;
  title: string;
  state: BlockState;
  startSlot: number;
  endSlot: number;
  min: number;
  type: "mandatory" | "optional";
  daysOfWeek: number[]; // 0 = Seg ... 4 = Sex
  priorityNames: string[];
}

interface MatrixGridProps {
  onSelectAssistant?: (id: EntityId, offset?: number) => void;
  matrix?: ScheduleMatrix;
  dayOffset?: number;
  onChangeDayOffset?: (offset: number) => void;
  dateLabel?: string;
  lunchBlocksByDate?: Record<string, Record<string, LunchBlockApi>>;
  queryStartDate?: string;
  queryEndDate?: string;
  onRequestRecalculate?: () => void;
}

function cloneMatrix(m: ScheduleMatrix): ScheduleMatrix {
  const c: ScheduleMatrix = {};
  Object.entries(m).forEach(([k, v]) => {
    c[k] = [...v];
  });
  return c;
}

export default function MatrixGrid({
  onSelectAssistant,
  dayOffset = 0,
  onChangeDayOffset,
  dateLabel,
  lunchBlocksByDate = {},
  queryStartDate,
  queryEndDate,
  onRequestRecalculate,
}: MatrixGridProps) {
  const { selectedSchoolId } = useSchool();
  const [editMode, setEditMode] = useState(false);
  // Persisted/confirmed schedules per dayOffset
  const [savedMatricesByDay, setSavedMatricesByDay] = useState<
    Record<number, ScheduleMatrix>
  >({});
  // Draft schedules while in editMode per dayOffset
  const [draftMatricesByDay, setDraftMatricesByDay] = useState<
    Record<number, ScheduleMatrix>
  >({});
  // Track if a day's schedule was copied from another day (also stores the full copied rows so absent assistants show their copied tasks!)
  const [copiedFromByDay, setCopiedFromByDay] = useState<
    Record<number, { sourceOffset: number; sourcePlannedMatrix: ScheduleMatrix }>
  >({});

  // Resetar estados de edição e rascunhos quando o admin troca de escola
  useEffect(() => {
    setDraftMatricesByDay({});
    setSavedMatricesByDay({});
    setCopiedFromByDay({});
    setEditMode(false);
    setIsPainting(false);
    setPaintAid(null);
  }, [selectedSchoolId]);

  const [paintType, setPaintType] = useState<BlockState>("work");
  const [focusActiveActivity, setFocusActiveActivity] = useState(true);
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(
    null
  );
  const [isPainting, setIsPainting] = useState(false);
  const [paintAid, setPaintAid] = useState<EntityId | null>(null);

  // Modals: Copy Schedule & Finish Validation
  const [showCopyModal, setShowCopyModal] = useState(false);
  // "to_future" = copy current day's schedule (even if past!) to a chosen future date
  // "from_other" = copy another day's schedule (past or future) into current day
  const [copyDirection, setCopyDirection] = useState<"to_future" | "from_other">(
    "to_future"
  );
  const [copyPickerIsoDate, setCopyPickerIsoDate] = useState<string>("");
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [publishModalState, setPublishModalState] = useState<{
    open: boolean;
    preselectedDate?: string;
  }>({ open: false });

  const todayIso = useMemo(() => getIsoDateFromOffset(0), []);
  const dayInfo = getDateInfo(dayOffset);

  // Ensure the query window covers the user's selected queryStartDate..queryEndDate AND the current dayOffset / copyPickerIsoDate
  const effectiveRangeStartIso = useMemo(() => {
    const defaultStart = queryStartDate || getIsoDateFromOffset(-30);
    const candidates = [defaultStart, getIsoDateFromOffset(dayOffset - 7)];
    if (copyPickerIsoDate) candidates.push(copyPickerIsoDate);
    return candidates.sort()[0];
  }, [queryStartDate, dayOffset, copyPickerIsoDate]);

  const effectiveRangeEndIso = useMemo(() => {
    const defaultEnd = queryEndDate || getIsoDateFromOffset(30);
    const candidates = [defaultEnd, getIsoDateFromOffset(dayOffset + 14)];
    if (copyPickerIsoDate) candidates.push(copyPickerIsoDate);
    return candidates.sort()[candidates.length - 1];
  }, [queryEndDate, dayOffset, copyPickerIsoDate]);

  const { data: assistantsList = [], isLoading: isLoadingAssistants } =
    useAssistantsList();
  const { data: schedulesList = [], isLoading: isLoadingSchedules } =
    useSchedulesList({
      start_date: effectiveRangeStartIso,
      end_date: effectiveRangeEndIso,
    });
  const { data: absencesRes, isLoading: isLoadingAbsences } = useAbsencesList({
    start_date: effectiveRangeStartIso,
    end_date: effectiveRangeEndIso,
    per_page: 200,
  });
  const { data: scheduleRules = [] } = useScheduleRulesList();
  const { data: activityTypes = [] } = useActivityTypesList();
  const { data: calendarDays = [], isLoading: isLoadingCalendar } =
    useOperatingCalendar(effectiveRangeStartIso, effectiveRangeEndIso);
  const { data: operatingRules = [], isLoading: isLoadingOperatingRules } =
    useOperatingRules();
  const {
    data: operatingExceptions = [],
    isLoading: isLoadingOperatingExceptions,
  } = useOperatingExceptions();
  const { data: holidays = [], isLoading: isLoadingHolidays } =
    useHolidaysList();

  const isOperatingLoading =
    isLoadingCalendar ||
    isLoadingOperatingRules ||
    isLoadingOperatingExceptions ||
    isLoadingHolidays;

  const isDayLoading =
    isOperatingLoading ||
    isLoadingSchedules ||
    isLoadingAssistants ||
    isLoadingAbsences;

  const operatingSources = useMemo(
    () => ({
      calendarDays,
      operatingRules,
      operatingExceptions,
      holidays,
    }),
    [calendarDays, operatingRules, operatingExceptions, holidays]
  );

  function getStatusForIsoDate(isoDate: string) {
    return resolveSchoolDayStatusByIsoDate(isoDate, operatingSources);
  }

  const activeAssistants = useMemo(
    () =>
      assistantsList.filter(
        (a) => !a.deleted_at && (a.active ?? a.is_active ?? true)
      ),
    [assistantsList]
  );

  // Queries para perfis de horário contratual e exceções de cada assistente ativo com escopo da escola
  const assistantScheduleQueries = useQueries({
    queries: activeAssistants.map((a) => ({
      queryKey: schoolScopedKey("assistant-schedules", selectedSchoolId, String(a.id)),
      queryFn: () => assistantSchedulesService.getAll(String(a.id)),
      enabled: !!selectedSchoolId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const assistantExceptionQueries = useQueries({
    queries: activeAssistants.map((a) => ({
      queryKey: schoolScopedKey("assistant-exceptions", selectedSchoolId, String(a.id)),
      queryFn: () => assistantExceptionsService.getAll(String(a.id)),
      enabled: !!selectedSchoolId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const profilesByAssistant = useMemo(() => {
    const map: Record<string, AssistantScheduleProfileApi[]> = {};
    activeAssistants.forEach((a, idx) => {
      map[String(a.id)] = assistantScheduleQueries[idx]?.data || [];
    });
    return map;
  }, [activeAssistants, assistantScheduleQueries]);

  const exceptionsByAssistant = useMemo(() => {
    const map: Record<string, AssistantExceptionApi[]> = {};
    activeAssistants.forEach((a, idx) => {
      map[String(a.id)] = assistantExceptionQueries[idx]?.data || [];
    });
    return map;
  }, [activeAssistants, assistantExceptionQueries]);

  const dayRulesCatalog: DayRuleConfig[] = useMemo(() => {
    return scheduleRules.map((rule) => {
      const actType = activityTypes.find(
        (at) => String(at.id) === String(rule.activity_type_id)
      );
      const actName = actType?.name || "Regra de Cobertura";
      return {
        id: String(rule.id),
        title: actName,
        state: mapActivityToBlockState(actName, actType?.is_fallback),
        startSlot: timeToSlotIndex(rule.period_start),
        endSlot: timeToSlotIndex(rule.period_end),
        min: rule.min,
        type: rule.type,
        daysOfWeek: rule.days_of_week || [],
        priorityNames: (rule.assistants || [])
          .sort((a, b) => a.priority - b.priority)
          .map((a) => `${a.priority}º ${a.name.split(" ")[0]}`),
      };
    });
  }, [scheduleRules, activityTypes]);

  const schoolStatus = getStatusForIsoDate(dayInfo.isoDate);
  const isPastDay = dayOffset < 0;
  const canEditCurrentDay = editMode && schoolStatus.isOpen && !isPastDay;

  // Dynamic Operating Window for the current day (taking into account fixed schedule, valid_from/valid_until versions, and exceptions)
  const viewStartSlot = schoolStatus.viewStartSlot;
  const viewEndSlot = schoolStatus.viewEndSlot;
  const viewSlotsCount = Math.max(1, viewEndSlot - viewStartSlot);
  const hourSegments = useMemo(
    () => buildTimelineHourSegments(viewStartSlot, viewEndSlot),
    [viewStartSlot, viewEndSlot]
  );

  // Check if a schedule exists for a given offset (from API, saved locally, or draft)
  function checkHasScheduleForOffset(offset: number): boolean {
    if (draftMatricesByDay[offset] || savedMatricesByDay[offset]) return true;
    const info = getDateInfo(offset);
    return hasGeneratedScheduleForDate(info.isoDate, schedulesList);
  }

  const hasScheduleForCurrentDay = useMemo(
    () => checkHasScheduleForOffset(dayOffset),
    [dayOffset, draftMatricesByDay, savedMatricesByDay, schedulesList]
  );

  const publishStatus = useMemo(
    () => getSchedulePublishStatusForDate(dayInfo.isoDate, schedulesList),
    [dayInfo.isoDate, schedulesList]
  );

  const allDraftDays = useMemo(
    () => getAllDraftDaysFromSchedules(schedulesList),
    [schedulesList]
  );

  const currentDayApiData = useMemo(() => {
    const info = getDateInfo(dayOffset);
    const status = getStatusForIsoDate(info.isoDate);
    return buildDayMatrixFromApi({
      isoDate: info.isoDate,
      isOpen: status.isOpen,
      assistants: activeAssistants,
      schedules: schedulesList,
      absences: absencesRes?.data || [],
      lunchBlocksForDate: lunchBlocksByDate[info.isoDate],
      profilesByAssistant,
      exceptionsByAssistant,
    });
  }, [
    dayOffset,
    operatingSources,
    activeAssistants,
    schedulesList,
    absencesRes,
    lunchBlocksByDate,
    profilesByAssistant,
    exceptionsByAssistant,
  ]);

  const slotMetaByAssistant = currentDayApiData.slotMetaByAssistant;

  function buildApiMatrixForOffset(offset: number): ScheduleMatrix {
    if (offset === dayOffset) {
      return currentDayApiData.matrix;
    }
    const info = getDateInfo(offset);
    const status = getStatusForIsoDate(info.isoDate);
    const { matrix } = buildDayMatrixFromApi({
      isoDate: info.isoDate,
      isOpen: status.isOpen,
      assistants: activeAssistants,
      schedules: schedulesList,
      absences: absencesRes?.data || [],
      lunchBlocksForDate: lunchBlocksByDate[info.isoDate],
      profilesByAssistant,
      exceptionsByAssistant,
    });
    return matrix;
  }

  // Base matrix for any dayOffset (taking into account already saved changes)
  function getCommittedMatrixForDay(offset: number): ScheduleMatrix {
    if (savedMatricesByDay[offset]) {
      return savedMatricesByDay[offset];
    }
    return buildApiMatrixForOffset(offset);
  }

  const baseDayMatrix = useMemo(
    () => (savedMatricesByDay[dayOffset] ? savedMatricesByDay[dayOffset] : currentDayApiData.matrix),
    [savedMatricesByDay, dayOffset, currentDayApiData]
  );

  // Limites de horário fixos de cada assistente para a data atual (independentemente das tarefas pintadas em rascunho)
  const fixedShiftBoundsByAssistant = useMemo(() => {
    const map: Record<EntityId, ReturnType<typeof resolveAssistantShiftBounds>> = {};
    const copiedInfo = copiedFromByDay[dayOffset];

    activeAssistants.forEach((assistant) => {
      const bounds = resolveAssistantShiftBounds({
        assistantId: assistant.id,
        isoDate: dayInfo.isoDate,
        dow: dayInfo.dow,
        viewStartSlot,
        viewEndSlot,
        profiles: profilesByAssistant[String(assistant.id)],
        exceptions: exceptionsByAssistant[String(assistant.id)],
        copiedSourceRow: copiedInfo?.sourcePlannedMatrix?.[assistant.id],
        baseDayRow: baseDayMatrix[assistant.id],
        schedulesList,
        lunchBlocksForDate: lunchBlocksByDate[dayInfo.isoDate],
        absences: absencesRes?.data || [],
      });
      map[assistant.id] = bounds;
    });

    return map;
  }, [
    activeAssistants,
    dayInfo.isoDate,
    dayInfo.dow,
    viewStartSlot,
    viewEndSlot,
    profilesByAssistant,
    exceptionsByAssistant,
    copiedFromByDay,
    dayOffset,
    baseDayMatrix,
    schedulesList,
    lunchBlocksByDate,
    absencesRes,
  ]);

  const effectiveMatrix: ScheduleMatrix = useMemo(() => {
    if (editMode && draftMatricesByDay[dayOffset]) {
      return draftMatricesByDay[dayOffset];
    }
    return baseDayMatrix;
  }, [editMode, draftMatricesByDay, dayOffset, baseDayMatrix]);

  // Active rules established for a given day of week
  function getRulesForDow(dow: number): DayRuleConfig[] {
    if (dow >= 5) return [];
    return dayRulesCatalog.filter((r) => r.daysOfWeek.includes(dow));
  }

  const rulesForToday = useMemo(
    () => (schoolStatus.isOpen ? getRulesForDow(dayInfo.dow) : []),
    [schoolStatus.isOpen, dayInfo.dow, dayRulesCatalog]
  );

  // Activities that apply to this day
  const availablePaintTypes = useMemo(() => {
    const ruleStates = new Set<BlockState>();
    rulesForToday.forEach((r) => ruleStates.add(r.state));
    const ordered: BlockState[] = [];
    (
      ["collection", "work", "surveillance", "cleaning", "delivery"] as BlockState[]
    ).forEach((s) => {
      if (ruleStates.has(s) || s === "work" || s === "collection") ordered.push(s);
    });
    ordered.push("lunch", "off");
    return ordered;
  }, [rulesForToday]);

  useEffect(() => {
    if (!availablePaintTypes.includes(paintType)) {
      setPaintType("work");
    }
  }, [availablePaintTypes, paintType]);

  useEffect(() => {
    const stop = () => {
      setIsPainting(false);
      setPaintAid(null);
    };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  function paintSlot(aid: EntityId, slot: number) {
    if (!canEditCurrentDay) return;
    setDraftMatricesByDay((prev) => {
      const currentDayMat = prev[dayOffset] ?? baseDayMatrix;
      const nextDayMat = cloneMatrix(currentDayMat);
      if (!nextDayMat[aid]) {
        nextDayMat[aid] = Array(96).fill("off");
      }
      nextDayMat[aid][slot] = paintType;
      return {
        ...prev,
        [dayOffset]: nextDayMat,
      };
    });
  }

  function discardDayDraft(offsetToDiscard: number) {
    setDraftMatricesByDay((prev) => {
      const copy = { ...prev };
      delete copy[offsetToDiscard];
      return copy;
    });
    setCopiedFromByDay((prev) => {
      const copy = { ...prev };
      delete copy[offsetToDiscard];
      return copy;
    });
  }

  // Find next open future day for default picker value
  function findNextOpenFutureIso(excludeIso: string): string {
    for (let off = Math.max(0, dayOffset + 1); off <= 120; off++) {
      const iso = getIsoDateFromOffset(off);
      if (iso !== excludeIso && getStatusForIsoDate(iso).isOpen) {
        return iso;
      }
    }
    return getIsoDateFromOffset(1);
  }

  function findPreviousOpenIso(excludeIso: string): string {
    for (let off = dayOffset - 1; off >= -90; off--) {
      const iso = getIsoDateFromOffset(off);
      if (iso !== excludeIso && getStatusForIsoDate(iso).isOpen) {
        return iso;
      }
    }
    return getIsoDateFromOffset(-1);
  }

  function openCopyScheduleModal(preferredDirection?: "to_future" | "from_other") {
    const dir =
      preferredDirection ??
      (isPastDay || !editMode ? "to_future" : "from_other");
    setCopyDirection(dir);
    if (dir === "to_future") {
      setCopyPickerIsoDate(findNextOpenFutureIso(dayInfo.isoDate));
    } else {
      setCopyPickerIsoDate(findPreviousOpenIso(dayInfo.isoDate));
    }
    setShowCopyModal(true);
  }

  // Handle copying a schedule between sourceOffset and targetOffset
  function handleConfirmCopySchedule() {
    if (!copyPickerIsoDate) return;
    const pickedOffset = getOffsetFromIsoDate(copyPickerIsoDate);

    const sourceOffset =
      copyDirection === "to_future" ? dayOffset : pickedOffset;
    const targetOffset =
      copyDirection === "to_future" ? pickedOffset : dayOffset;

    const targetInfo = getDateInfo(targetOffset);
    const targetStatus = getStatusForIsoDate(targetInfo.isoDate);

    if (targetOffset < 0) {
      notify.error(
        "Não é possível copiar uma escala para um dia no passado.",
        "Data de Destino Inválida"
      );
      return;
    }

    if (!targetStatus.isOpen) {
      notify.error(
        "A escola encontra-se encerrada na data de destino selecionada.",
        "Escola Encerrada"
      );
      return;
    }

    const sourceMatrix =
      draftMatricesByDay[sourceOffset] ??
      getCommittedMatrixForDay(sourceOffset);

    const sourceFullPlanned: ScheduleMatrix = {};
    const nextTargetDraft: ScheduleMatrix = {};

    activeAssistants.forEach((a) => {
      const sourceRow = sourceMatrix[a.id] || Array(96).fill("off");
      const effectiveSourceTasks = [...sourceRow];

      sourceFullPlanned[a.id] = effectiveSourceTasks;

      const targetAbsent = checkAssistantAbsenceOnDate(
        a,
        targetInfo.isoDate,
        absencesRes?.data || []
      );
      if (targetAbsent.absent && targetAbsent.isFullDay) {
        const bounds = getShiftBoundsFromRow(
          effectiveSourceTasks,
          targetStatus.viewStartSlot,
          targetStatus.viewEndSlot
        );
        const absRow: BlockState[] = Array(96).fill("off");
        for (let i = bounds.startSlot; i < bounds.endSlot; i++) {
          absRow[i] = "absent";
        }
        nextTargetDraft[a.id] = absRow;
      } else {
        nextTargetDraft[a.id] = [...effectiveSourceTasks];
      }
    });

    setDraftMatricesByDay((prev) => ({
      ...prev,
      [targetOffset]: nextTargetDraft,
    }));
    setCopiedFromByDay((prev) => ({
      ...prev,
      [targetOffset]: {
        sourceOffset,
        sourcePlannedMatrix: sourceFullPlanned,
      },
    }));
    setShowCopyModal(false);

    // Ensure Edit Mode is enabled and navigate to targetOffset if copying to a future day
    setEditMode(true);
    if (targetOffset !== dayOffset && onChangeDayOffset) {
      onChangeDayOffset(targetOffset);
    }

    const srcInfo = getDateInfo(sourceOffset);
    notify.success(
      `Horário de ${srcInfo.dayName} (${srcInfo.dateStr}) copiado para ${targetInfo.dayName} (${targetInfo.dateStr}). Revê e clica em "Concluir Edição" para guardar.`,
      "Horário Copiado"
    );
  }

  // Split assistants into Working vs. Absent Today (at the bottom, disabled)
  const { workingAssistants, absentAssistants } = useMemo(() => {
    const working: typeof activeAssistants = [];
    const copiedInfo = copiedFromByDay[dayOffset];

    const absent: {
      assistant: (typeof activeAssistants)[0];
      reason: string;
      plannedRow: BlockState[];
      shiftBounds: AssistantResolvedShiftBounds;
      copiedFromLabel?: string;
    }[] = [];

    activeAssistants.forEach((a) => {
      const absInfo = checkAssistantAbsenceOnDate(
        a,
        dayInfo.isoDate,
        absencesRes?.data || []
      );
      if (absInfo.absent && absInfo.isFullDay) {
        const copiedRow = copiedInfo?.sourcePlannedMatrix?.[a.id];
        const fallbackRow = baseDayMatrix[a.id] || Array(96).fill("off");
        const plannedRow = copiedRow ?? fallbackRow;
        const srcDateInfo =
          copiedInfo !== undefined
            ? getDateInfo(copiedInfo.sourceOffset)
            : null;

        const fixedBounds = fixedShiftBoundsByAssistant[a.id];
        const resolvedBounds: AssistantResolvedShiftBounds =
          fixedBounds ||
          getShiftBoundsFromRow(
            plannedRow,
            viewStartSlot,
            viewEndSlot
          );

        absent.push({
          assistant: a,
          reason: absInfo.reason || "Ausência Registada",
          plannedRow,
          shiftBounds: resolvedBounds,
          copiedFromLabel: srcDateInfo
            ? `${srcDateInfo.dayShort} ${srcDateInfo.dateStr}`
            : undefined,
        });
      } else {
        working.push(a);
      }
    });

    return { workingAssistants: working, absentAssistants: absent };
  }, [
    activeAssistants,
    dayOffset,
    dayInfo.isoDate,
    absencesRes,
    copiedFromByDay,
    baseDayMatrix,
    fixedShiftBoundsByAssistant,
    viewStartSlot,
    viewEndSlot,
  ]);

  // Evaluate rules & warnings for any given dayOffset + matrix
  function evaluateDaySchedule(targetOffset: number, mat: ScheduleMatrix) {
    const info = getDateInfo(targetOffset);
    const targetStatus = getStatusForIsoDate(info.isoDate);
    const rules = getRulesForDow(info.dow);
    const workingOnDay = activeAssistants.filter(
      (a) =>
        !checkAssistantAbsenceOnDate(a, info.isoDate, absencesRes?.data || [])
          .absent
    );

    const evaluations = rules.map((rule) => {
      let minAssignedInWindow = Infinity;
      const assignedNamesSet = new Set<string>();

      for (let s = rule.startSlot; s < rule.endSlot; s++) {
        let countAtSlot = 0;
        workingOnDay.forEach((a) => {
          const st = mat[a.id]?.[s];
          if (st === rule.state) {
            countAtSlot++;
            assignedNamesSet.add(a.name.split(" ")[0]);
          }
        });
        if (countAtSlot < minAssignedInWindow) {
          minAssignedInWindow = countAtSlot;
        }
      }
      if (minAssignedInWindow === Infinity) minAssignedInWindow = 0;

      return {
        ...rule,
        assigned: minAssignedInWindow,
        isMet: minAssignedInWindow >= rule.min,
        assignedNames: Array.from(assignedNamesSet),
      };
    });

    const warnings: {
      id: string;
      severity: "critical" | "warning" | "info";
      title: string;
      detail: string;
    }[] = [];

    evaluations.forEach((ev) => {
      if (!ev.isMet) {
        const rangeStr = `${TIME_SLOTS[ev.startSlot]}–${TIME_SLOTS[ev.endSlot]}`;
        warnings.push({
          id: `rule-${ev.id}`,
          severity: ev.type === "mandatory" ? "critical" : "info",
          title:
            ev.type === "mandatory"
              ? `Regra Obrigatória abaixo do mínimo: ${ev.title}`
              : `Regra Facultativa por preencher: ${ev.title}`,
          detail: `Horário ${rangeStr}: ${ev.assigned}/${ev.min} assistentes com «${
            BLOCK_STYLES[ev.state].label
          }».`,
        });
      }
    });

    workingOnDay.forEach((a) => {
      const row = mat[a.id] || [];
      const bounds = getShiftBoundsFromRow(
        row,
        targetStatus.viewStartSlot,
        targetStatus.viewEndSlot
      );
      const outOfBoundsSlots: number[] = [];
      let lunchSlotsCount = 0;
      let activeWorkSlots = 0;

      for (let s = 0; s < row.length; s++) {
        const st = row[s];
        if (st !== "off" && st !== "absent") {
          activeWorkSlots++;
          if (
            s < targetStatus.viewStartSlot ||
            s >= targetStatus.viewEndSlot
          ) {
            outOfBoundsSlots.push(s);
          }
        }
        if (st === "lunch") {
          lunchSlotsCount++;
        }
      }

      if (outOfBoundsSlots.length > 0) {
        const firstOut = TIME_SLOTS[outOfBoundsSlots[0]];
        const lastOut =
          TIME_SLOTS[
            Math.min(outOfBoundsSlots[outOfBoundsSlots.length - 1] + 1, 95)
          ];
        const openStr = `${TIME_SLOTS[targetStatus.viewStartSlot]}–${
          TIME_SLOTS[targetStatus.viewEndSlot] ?? "24:00"
        }`;
        warnings.push({
          id: `oob-${a.id}`,
          severity: "warning",
          title: `Fora do horário de funcionamento: ${a.name}`,
          detail: `Tem ${formatDurationSlots(
            outOfBoundsSlots.length
          )} (${firstOut}–${lastOut}) pintados fora do horário de funcionamento da escola (${openStr}).`,
        });
      }

      if (activeWorkSlots >= 20 && lunchSlotsCount < 2) {
        warnings.push({
          id: `lunch-${a.id}`,
          severity: "warning",
          title: `Pausa de almoço insuficiente: ${a.name}`,
          detail: `Tem apenas ${formatDurationSlots(
            lunchSlotsCount
          )} de Pausa de Almoço marcada neste dia.`,
        });
      }
    });

    // 3. Ausências previstas (faltas parciais ou registadas) e aviso de sobreposição
    activeAssistants.forEach((a) => {
      const absInfo = checkAssistantAbsenceOnDate(
        a,
        info.isoDate,
        absencesRes?.data || []
      );
      if (absInfo.absent) {
        const aStart = Math.max(absInfo.startSlot ?? 0, targetStatus.viewStartSlot);
        const aEnd = Math.min(absInfo.endSlot ?? 96, targetStatus.viewEndSlot);
        const row = mat[a.id] || [];
        let conflictSlots = 0;

        for (let s = aStart; s < aEnd && s < row.length; s++) {
          if (row[s] !== "off" && row[s] !== "absent") {
            conflictSlots++;
          }
        }

        const absTimeStr = `${TIME_SLOTS[absInfo.startSlot ?? 0]}–${
          TIME_SLOTS[absInfo.endSlot ?? 96]
        }`;

        if (conflictSlots > 0) {
          warnings.push({
            id: `absence-conflict-${a.id}`,
            severity: "warning",
            title: `Atividade atribuída durante falta prevista: ${a.name}`,
            detail: `Tem ausência registada (${absInfo.reason}) das ${absTimeStr}, mas tem ${formatDurationSlots(
              conflictSlots
            )} com atividades atribuídas.`,
          });
        } else {
          warnings.push({
            id: `absence-info-${a.id}`,
            severity: "info",
            title: `Ausência registada: ${a.name}`,
            detail: `Tem ausência prevista das ${absTimeStr} (${absInfo.reason}).`,
          });
        }
      }
    });

    return { ruleEvaluations: evaluations, liveWarnings: warnings };
  }

  const { ruleEvaluations, liveWarnings } = useMemo(
    () => evaluateDaySchedule(dayOffset, effectiveMatrix),
    [
      dayOffset,
      effectiveMatrix,
      activeAssistants,
      dayRulesCatalog,
      absencesRes,
      operatingSources,
    ]
  );

  // Altura sincronizada do painel de regras para ajustar o scroll dos avisos em tempo real
  const rulesPanelRef = useRef<HTMLDivElement>(null);
  const [rulesPanelHeight, setRulesPanelHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!rulesPanelRef.current) return;
    const updateHeight = () => {
      if (rulesPanelRef.current) {
        setRulesPanelHeight(rulesPanelRef.current.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(rulesPanelRef.current);
    return () => ro.disconnect();
  }, [ruleEvaluations.length, dayOffset]);

  const highlightedRule = useMemo(
    () => rulesForToday.find((r) => r.id === highlightedRuleId) ?? null,
    [rulesForToday, highlightedRuleId]
  );

  // Compute summary of all modified days in draftMatricesByDay for the Finish Confirmation Modal
  const modifiedDaysSummary = useMemo(() => {
    const offsets = Object.keys(draftMatricesByDay)
      .map(Number)
      .sort((a, b) => a - b);

    return offsets
      .map((offset) => {
        const draft = draftMatricesByDay[offset];
        const base = getCommittedMatrixForDay(offset);
        let changedAssistantsCount = 0;
        let changedSlotsCount = 0;

        activeAssistants.forEach((a) => {
          const dRow = draft[a.id] || [];
          const bRow = base[a.id] || [];
          let diff = false;
          for (let i = 0; i < 96; i++) {
            if (dRow[i] !== bRow[i]) {
              diff = true;
              changedSlotsCount++;
            }
          }
          if (diff) changedAssistantsCount++;
        });

        const evalResult = evaluateDaySchedule(offset, draft);
        const copiedMeta = copiedFromByDay[offset];
        const copiedFromInfo = copiedMeta
          ? getDateInfo(copiedMeta.sourceOffset)
          : null;

        return {
          offset,
          info: getDateInfo(offset),
          changedAssistantsCount,
          changedSlotsCount,
          warnings: evalResult.liveWarnings,
          copiedFromLabel: copiedFromInfo
            ? `${copiedFromInfo.dayName}, ${copiedFromInfo.dateStr}`
            : null,
        };
      })
      .filter((item) => item.changedSlotsCount > 0 || item.copiedFromLabel);
  }, [
    draftMatricesByDay,
    savedMatricesByDay,
    copiedFromByDay,
    activeAssistants,
  ]);

  function handleClickFinishButton() {
    if (!editMode) {
      setEditMode(true);
      return;
    }
    if (modifiedDaysSummary.length === 0) {
      setEditMode(false);
      setIsPainting(false);
      setPaintAid(null);
      return;
    }
    setShowFinishModal(true);
  }

  function handleConfirmSaveAllEdits() {
    setSavedMatricesByDay((prev) => ({
      ...prev,
      ...draftMatricesByDay,
    }));
    setDraftMatricesByDay({});
    setShowFinishModal(false);
    setEditMode(false);
    setIsPainting(false);
    setPaintAid(null);
    notify.success(
      `Alterações guardadas para ${modifiedDaysSummary.length} ${
        modifiedDaysSummary.length === 1 ? "dia" : "dias"
      }.`,
      "Escala Atualizada"
    );
  }

  // Is activity spotlight active?
  const isSpotlightActive =
    editMode && focusActiveActivity && paintType !== "off";

  const copyPickerStatus = copyPickerIsoDate
    ? getStatusForIsoDate(copyPickerIsoDate)
    : null;
  const copyPickerDateInfo = copyPickerIsoDate
    ? getDateInfo(getOffsetFromIsoDate(copyPickerIsoDate))
    : null;

  const operatingWindowStr = `${TIME_SLOTS[viewStartSlot] ?? "06:00"}–${
    TIME_SLOTS[viewEndSlot] ?? "21:00"
  }`;

  return (
    <TooltipProvider delayDuration={60}>
      <Card className="overflow-hidden border-border bg-card shadow-xs">
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">
                  {editMode
                    ? "Editor Interativo de Escala Diária"
                    : "Matriz Diária"}
                </h3>
                {editMode && (
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                    Modo de Edição
                  </Badge>
                )}
                {isDayLoading ? (
                  <Badge
                    variant="outline"
                    className="bg-muted text-muted-foreground border-border text-[10px] gap-1"
                  >
                    <Loader2 size={10} className="animate-spin text-primary" />
                    A carregar...
                  </Badge>
                ) : (
                  <>
                    {isPastDay && (
                      <Badge
                        variant="outline"
                        className="text-[#D97706] border-[#D97706]/30 bg-[#D97706]/10 text-[10px]"
                      >
                        Dia Passado · Apenas Consulta
                      </Badge>
                    )}
                    {schoolStatus.isOpen &&
                      !hasScheduleForCurrentDay &&
                      !editMode && (
                        <Badge
                          variant="outline"
                          className="text-[#D97706] border-[#D97706]/30 bg-[#D97706]/10 text-[10px]"
                        >
                          Escala Não Gerada
                        </Badge>
                      )}
                    {schoolStatus.isOpen && hasScheduleForCurrentDay && (
                      publishStatus.isPublished ? (
                        <ActionTooltip
                          content={
                            publishStatus.publishedAt
                              ? `Escala publicada em ${new Date(publishStatus.publishedAt).toLocaleString()}`
                              : "Escala publicada e visível para os assistentes"
                          }
                        >
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-medium cursor-default"
                          >
                            <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                            Publicada
                          </Badge>
                        </ActionTooltip>
                      ) : (
                        <ActionTooltip content="Esta escala está em modo rascunho. Os assistentes não a podem ver até ser publicada.">
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 font-medium cursor-default"
                          >
                            <Clock size={11} className="text-amber-600 dark:text-amber-400" />
                            Rascunho
                          </Badge>
                        </ActionTooltip>
                      )
                    )}
                    {!schoolStatus.isOpen && (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground border-border bg-muted/50 text-[10px]"
                      >
                        Encerrado
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {dateLabel ?? `${dayInfo.dayName}, ${dayInfo.dateStr}`}
                {isDayLoading ? (
                  " · A verificar regras e escalas..."
                ) : schoolStatus.isOpen ? (
                  ` · Funcionamento: ${operatingWindowStr}${
                    schoolStatus.scheduleSourceLabel
                      ? ` (${schoolStatus.scheduleSourceLabel})`
                      : ""
                  }`
                ) : (
                  ""
                )}
              </p>
            </div>

            {/* Day navigation inside Edit Mode so Admin can browse days */}
            {editMode && onChangeDayOffset && (
              <div className="flex items-center border border-primary/30 rounded-lg overflow-hidden bg-primary/5 ml-1">
                <ActionTooltip content="Dia anterior">
                  <button
                    type="button"
                    onClick={() => onChangeDayOffset(dayOffset - 1)}
                    className="px-2 py-1 hover:bg-primary/15 transition-colors border-r border-primary/20 text-primary cursor-pointer"
                  >
                    <ChevronLeft size={13} />
                  </button>
                </ActionTooltip>
                <span className="px-2.5 py-1 text-[11px] font-mono font-semibold text-primary flex items-center gap-1.5">
                  <Calendar size={11} />
                  {dayInfo.dayShort}, {dayInfo.dateStr}
                </span>
                <ActionTooltip content="Dia seguinte">
                  <button
                    type="button"
                    onClick={() => onChangeDayOffset(dayOffset + 1)}
                    className="px-2 py-1 hover:bg-primary/15 transition-colors border-l border-primary/20 text-primary cursor-pointer"
                  >
                    <ChevronRight size={13} />
                  </button>
                </ActionTooltip>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {!editMode &&
              schoolStatus.isOpen &&
              hasScheduleForCurrentDay &&
              (
                [
                  "collection",
                  "work",
                  "surveillance",
                  "cleaning",
                  "delivery",
                  "lunch",
                  "absent",
                ] as BlockState[]
              ).map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className={`w-3 h-3 rounded-sm ${BLOCK_STYLES[s].bg} flex items-center justify-center shadow-2xs`}
                  >
                    {BLOCK_STYLES[s].locked && (
                      <Lock size={6} className="text-white/80" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {BLOCK_STYLES[s].label}
                  </span>
                </div>
              ))}

            {/* Copy Schedule button */}
            {!isDayLoading &&
              schoolStatus.isOpen &&
              (hasScheduleForCurrentDay || canEditCurrentDay) && (
                <button
                  type="button"
                  onClick={() =>
                    openCopyScheduleModal(
                      isPastDay || !editMode ? "to_future" : "from_other"
                    )
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-colors"
                >
                  <Copy size={11} />
                  {isPastDay || !editMode
                    ? "Copiar Horário para Dia Futuro"
                    : "Copiar Horário"}
                </button>
              )}

            {/* Publicar Este Dia (quando em rascunho) */}
            {!isDayLoading &&
              !editMode &&
              schoolStatus.isOpen &&
              hasScheduleForCurrentDay &&
              publishStatus.isDraft && (
                <ActionTooltip content="Publicar a escala deste dia para ficar visível aos assistentes">
                  <button
                    type="button"
                    onClick={() =>
                      setPublishModalState({
                        open: true,
                        preselectedDate: dayInfo.isoDate,
                      })
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <Send size={11} />
                    Publicar Dia
                  </button>
                </ActionTooltip>
              )}

            {/* Publicar Vários Dias em Rascunho */}
            {!isDayLoading && !editMode && allDraftDays.length > 0 && (
              <ActionTooltip content="Abrir modal para selecionar e publicar vários dias em rascunho">
                <button
                  type="button"
                  onClick={() =>
                    setPublishModalState({
                      open: true,
                      preselectedDate: undefined,
                    })
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 transition-colors cursor-pointer"
                >
                  <Send size={11} />
                  Publicar Escalas ({allDraftDays.length})
                </button>
              </ActionTooltip>
            )}

            {editMode && draftMatricesByDay[dayOffset] && (
              <ActionTooltip content="Anular alterações não guardadas deste dia">
                <button
                  type="button"
                  onClick={() => discardDayDraft(dayOffset)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <RotateCcw size={11} />
                  Repor Dia
                </button>
              </ActionTooltip>
            )}

            {!isDayLoading && (schoolStatus.isOpen || editMode) && (
              <ActionTooltip
                content={
                  !editMode && isPastDay
                    ? "Não é possível editar escalas de dias passados (mas podes copiar este horário para um dia futuro)"
                    : null
                }
              >
                <button
                  type="button"
                  disabled={!editMode && isPastDay}
                  onClick={handleClickFinishButton}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    editMode
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  <Edit2 size={11} />
                  {editMode
                    ? modifiedDaysSummary.length > 0
                      ? `Concluir Edição (${modifiedDaysSummary.length} ${
                          modifiedDaysSummary.length === 1
                            ? "dia alterado"
                            : "dias alterados"
                        })`
                      : "Sair da Edição"
                    : "Editar Escala"}
                </button>
              </ActionTooltip>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* CASE 0: LOADING STATE (F5 / Changing School / Initial Day Fetch)    */}
        {/* =================================================================== */}
        {isDayLoading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center space-y-3 bg-muted/5 min-h-[340px]">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
            <div className="max-w-md space-y-1">
              <h4 className="text-sm font-semibold text-foreground">
                A carregar dados do dia...
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A verificar o estado do estabelecimento e as escalas para{" "}
                {dayInfo.dayName}, {dayInfo.dateStr}.
              </p>
            </div>
          </div>
        ) : !schoolStatus.isOpen ? (
          /* =================================================================== */
          /* CASE 1: SCHOOL IS CLOSED TODAY (Weekend, Holiday, or School Exception) */
          /* =================================================================== */
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-muted/10">
            <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
              {schoolStatus.reasonType === "holiday" ? (
                <Sparkles size={22} className="text-[#D97706]" />
              ) : schoolStatus.reasonType === "exception" ? (
                <Building2 size={22} className="text-destructive" />
              ) : (
                <CalendarOff size={22} className="text-muted-foreground" />
              )}
            </div>
            <div className="max-w-md space-y-1">
              <h4 className="text-base font-semibold text-foreground">
                {schoolStatus.title}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {schoolStatus.detail}
              </p>
            </div>
            {onChangeDayOffset && (
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChangeDayOffset(dayOffset - 1)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <ChevronLeft size={13} />
                  Dia Anterior
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDayOffset(dayOffset + 1)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  Dia Seguinte
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        ) : !hasScheduleForCurrentDay && !editMode ? (
          /* =================================================================== */
          /* CASE 2: SCHOOL IS OPEN, BUT NO SCHEDULE HAS BEEN GENERATED YET      */
          /* =================================================================== */
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-4 bg-muted/10">
            <div className="w-12 h-12 rounded-2xl bg-[#D97706]/10 border border-[#D97706]/25 flex items-center justify-center text-[#D97706]">
              <CalendarClock size={22} />
            </div>
            <div className="max-w-lg space-y-1.5">
              <h4 className="text-base font-semibold text-foreground">
                A escala ainda não foi gerada para este dia
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ainda não existe nenhuma escala gerada para {dayInfo.dayName},{" "}
                {dayInfo.dateStr} (horário da escola: {operatingWindowStr}).
                Podes gerar automaticamente a escala para este período, copiar o
                horário de outro dia ou editar manualmente.
              </p>
            </div>

            {!isPastDay && (
              <div className="pt-1 flex items-center justify-center gap-2.5 flex-wrap">
                {onRequestRecalculate && (
                  <button
                    type="button"
                    onClick={onRequestRecalculate}
                    className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <RefreshCw size={13} />
                    Gerar / Recalcular Escala
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openCopyScheduleModal("from_other")}
                  className="px-3.5 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/15 transition-colors flex items-center gap-1.5"
                >
                  <Copy size={13} />
                  Copiar Horário de Outro Dia
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="px-3.5 py-2 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <Edit2 size={13} />
                  Criar Manualmente
                </button>
              </div>
            )}
          </div>
        ) : (
          /* =================================================================== */
          /* CASE 3: SCHOOL IS OPEN AND SCHEDULE EXISTS (OR IN EDIT MODE)        */
          /* =================================================================== */
          <>
            {/* Past day read-only notice */}
            {isPastDay && (
              <div className="px-4 py-2.5 bg-[#FEF9EC] dark:bg-amber-950/30 border-b border-[#D97706]/30 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-[#D97706] font-medium">
                  <Eye size={14} />
                  <span>
                    Estás a visualizar um <strong>dia passado</strong> (
                    {dayInfo.dayName}, {dayInfo.dateStr}). Podes consultar o
                    horário ou{" "}
                    <strong>copiá-lo para um dia futuro</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCopyScheduleModal("to_future")}
                    className="px-2.5 py-1 rounded-md border border-[#D97706]/40 bg-card text-[#D97706] text-xs font-medium hover:bg-[#D97706]/10 transition-colors flex items-center gap-1.5"
                  >
                    <Copy size={11} />
                    Copiar para Dia Futuro
                  </button>
                  {onChangeDayOffset && (
                    <button
                      type="button"
                      onClick={() => onChangeDayOffset(0)}
                      className="px-2.5 py-1 rounded-md bg-[#D97706] text-white text-xs font-medium hover:opacity-90 transition-opacity flex-shrink-0"
                    >
                      Voltar a Hoje
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* EDIT MODE WORKSPACE: Day Activities Brush + Day Rules & Live Feedback */}
            {canEditCurrentDay && (
              <div className="border-b border-border bg-muted/15 divide-y divide-border/60">
                {/* 1. Day-Filtered Activity Paint Palette */}
                <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">
                    Pintar atividade ({dayInfo.dayName}):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {availablePaintTypes.map((type) => {
                      const isEraser = type === "off";
                      const isSelected = paintType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPaintType(type)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isSelected
                              ? isEraser
                                ? "ring-2 ring-foreground bg-foreground text-background border-transparent font-semibold"
                                : "ring-2 ring-primary ring-offset-1 border-transparent " +
                                  BLOCK_STYLES[type].bg +
                                  " text-white font-semibold shadow-xs"
                              : isSpotlightActive
                              ? "border-border bg-card text-muted-foreground opacity-55 hover:opacity-100 hover:text-foreground"
                              : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40"
                          }`}
                        >
                          {isEraser ? (
                            <Eraser size={11} />
                          ) : (
                            <div
                              className={`w-2.5 h-2.5 rounded-sm ${
                                isSelected
                                  ? "bg-white/30"
                                  : BLOCK_STYLES[type].bg
                              }`}
                            />
                          )}
                          {isEraser ? "Limpar Bloco" : BLOCK_STYLES[type].label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Toggle to highlight active activity vs show all at 100% */}
                  <div className="ml-auto flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 text-xs text-foreground font-medium cursor-pointer select-none">
                      <Checkbox
                        checked={focusActiveActivity}
                        onCheckedChange={(checked) =>
                          setFocusActiveActivity(checked === true)
                        }
                      />
                      <span>Destacar atividade selecionada</span>
                    </label>
                  </div>
                </div>

                {/* 2. Day Rules + Live Engine Feedback Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
                  {/* Left: Rules established for this day */}
                  <div ref={rulesPanelRef} className="lg:col-span-7 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Clock size={12} className="text-primary" />
                        Regras Estabelecidas para {dayInfo.dayName} (
                        {ruleEvaluations.length})
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Clica numa regra para ativar a atividade e destacar o horário
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ruleEvaluations.map((rule) => {
                        const isRuleSelected = highlightedRuleId === rule.id;
                        const matchesPaintActivity =
                          paintType !== "off" && rule.state === paintType;
                        const isDimmedBySpotlight =
                          isSpotlightActive && !matchesPaintActivity;

                        const rangeStr = `${TIME_SLOTS[rule.startSlot]}–${
                          TIME_SLOTS[rule.endSlot]
                        }`;
                        return (
                          <button
                            key={rule.id}
                            type="button"
                            onClick={() => {
                              setPaintType(rule.state);
                              setHighlightedRuleId(
                                isRuleSelected ? null : rule.id
                              );
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                              isRuleSelected
                                ? "border-primary bg-primary/8 ring-2 ring-primary/35 shadow-xs"
                                : matchesPaintActivity
                                ? "border-primary/50 bg-card ring-1 ring-primary/20 shadow-2xs"
                                : "border-border bg-card hover:border-primary/40"
                            } ${
                              isDimmedBySpotlight
                                ? "opacity-40 hover:opacity-85"
                                : "opacity-100"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                    BLOCK_STYLES[rule.state].bg
                                  }`}
                                />
                                <span className="text-xs font-semibold text-foreground truncate">
                                  {rule.title}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0 ${
                                  rule.isMet
                                    ? "bg-[#0E7C59]/15 text-[#0E7C59]"
                                    : rule.type === "mandatory"
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-[#D97706]/15 text-[#D97706]"
                                }`}
                              >
                                {rule.isMet ? (
                                  <CheckCircle2 size={10} />
                                ) : (
                                  <AlertTriangle size={10} />
                                )}
                                {rule.assigned}/{rule.min}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="font-mono font-medium text-foreground/80">
                                {rangeStr} · {BLOCK_STYLES[rule.state].label}
                              </span>
                              <span
                                className={`uppercase tracking-wider font-semibold text-[9px] ${
                                  rule.type === "mandatory"
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {rule.type === "mandatory"
                                  ? "Obrigatória"
                                  : "Facultativa"}
                              </span>
                            </div>

                            <p className="text-[10px] text-muted-foreground truncate">
                              Fila: {rule.priorityNames.join(" · ")}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Live Validation & Warnings Panel */}
                  <div className="lg:col-span-5 p-3.5 space-y-2 bg-card/50 flex flex-col justify-start">
                    <div className="flex items-center justify-between flex-shrink-0">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldAlert size={13} className="text-[#D97706]" />
                        Feedback & Avisos em Tempo Real ({liveWarnings.length})
                      </span>
                      {liveWarnings.length === 0 && (
                        <span className="text-[10px] font-medium text-[#0E7C59] flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          Tudo válido
                        </span>
                      )}
                    </div>

                    {liveWarnings.length === 0 ? (
                      <div className="rounded-xl border border-[#0E7C59]/25 bg-[#0E7C59]/5 p-3 flex items-center gap-2.5">
                        <CheckCircle2
                          size={16}
                          className="text-[#0E7C59] flex-shrink-0"
                        />
                        <p className="text-xs text-muted-foreground">
                          Todas as regras obrigatórias estão cumpridas e todos os
                          blocos estão dentro do horário da escola (
                          {operatingWindowStr}).
                        </p>
                      </div>
                    ) : (
                      <div
                        className="space-y-1.5 overflow-y-auto pr-1.5"
                        style={{
                          maxHeight: rulesPanelHeight
                            ? `${Math.max(220, rulesPanelHeight - 56)}px`
                            : "380px",
                        }}
                      >
                        {liveWarnings.map((w) => (
                          <div
                            key={w.id}
                            className={`rounded-lg border px-2.5 py-2 flex items-start gap-2 ${
                              w.severity === "critical"
                                ? "border-destructive/30 bg-destructive/5 text-destructive"
                                : w.severity === "warning"
                                ? "border-[#D97706]/30 bg-[#D97706]/8 text-[#D97706]"
                                : "border-border bg-muted/30 text-muted-foreground"
                            }`}
                          >
                            {w.severity === "critical" ? (
                              <AlertTriangle
                                size={13}
                                className="mt-0.5 flex-shrink-0 text-destructive"
                              />
                            ) : w.severity === "warning" ? (
                              <AlertTriangle
                                size={13}
                                className="mt-0.5 flex-shrink-0 text-[#D97706]"
                              />
                            ) : (
                              <Info
                                size={13}
                                className="mt-0.5 flex-shrink-0 text-muted-foreground"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-foreground leading-tight">
                                {w.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                                {w.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                {/* Dynamic Hour Header based on the day's Operating Hours */}
                <div className="flex border-b border-border bg-muted/30">
                  <div className="w-44 flex-shrink-0 px-3 py-2 text-xs text-muted-foreground font-medium border-r border-border flex items-center justify-between">
                    <span>Assistente / Turno</span>
                    <span className="text-[10px] font-mono text-primary font-semibold">
                      {operatingWindowStr}
                    </span>
                  </div>
                  <div className="flex flex-1 relative">
                    {hourSegments.map((seg) => (
                      <div
                        key={seg.startSlot}
                        className="flex-none border-r border-border/50 text-center last:border-r-0 overflow-hidden"
                        style={{ width: `${seg.widthPct}%` }}
                      >
                        <span className="text-[10px] font-mono text-muted-foreground px-0.5 py-1.5 block font-medium truncate">
                          {seg.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 1. WORKING ASSISTANTS ROWS */}
                {workingAssistants.map((assistant) => {
                  const rowSlots = effectiveMatrix[assistant.id] || [];
                  const shiftBounds: AssistantResolvedShiftBounds =
                    fixedShiftBoundsByAssistant[assistant.id] ||
                    getShiftBoundsFromRow(
                      rowSlots,
                      viewStartSlot,
                      viewEndSlot
                    );
                  const shiftRangeStr = `${TIME_SLOTS[shiftBounds.startSlot]}–${
                    TIME_SLOTS[shiftBounds.endSlot]
                  }`;
                  const blocks = slotsToBlocks(rowSlots, slotMetaByAssistant[assistant.id]);

                  const hasOutOfBoundsPaint = rowSlots.some(
                    (st, sIdx) =>
                      st !== "off" &&
                      st !== "absent" &&
                      (sIdx < viewStartSlot || sIdx >= viewEndSlot)
                  );

                  const clampedShiftStart = Math.max(
                    shiftBounds.startSlot,
                    viewStartSlot
                  );
                  const clampedShiftEnd = Math.min(shiftBounds.endSlot, viewEndSlot);

                  const clampedLunchStart =
                    shiftBounds.lunchStartSlot !== null &&
                    shiftBounds.lunchStartSlot !== undefined
                      ? Math.max(shiftBounds.lunchStartSlot, viewStartSlot)
                      : 0;
                  const clampedLunchEnd =
                    shiftBounds.lunchEndSlot !== null &&
                    shiftBounds.lunchEndSlot !== undefined
                      ? Math.min(shiftBounds.lunchEndSlot, viewEndSlot)
                      : 0;
                  const hasLunchBounds =
                    shiftBounds.lunchStartSlot !== null &&
                    shiftBounds.lunchEndSlot !== null &&
                    shiftBounds.lunchStartSlot !== undefined &&
                    shiftBounds.lunchEndSlot !== undefined &&
                    shiftBounds.lunchEndSlot > shiftBounds.lunchStartSlot &&
                    clampedLunchEnd > clampedLunchStart;
                  const lunchRangeStr = hasLunchBounds
                    ? `${TIME_SLOTS[shiftBounds.lunchStartSlot!]}-${
                        TIME_SLOTS[shiftBounds.lunchEndSlot!]
                      }`
                    : "";

                  const clampedAbsenceStart =
                    shiftBounds.absenceStartSlot !== null &&
                    shiftBounds.absenceStartSlot !== undefined
                      ? Math.max(shiftBounds.absenceStartSlot, viewStartSlot)
                      : 0;
                  const clampedAbsenceEnd =
                    shiftBounds.absenceEndSlot !== null &&
                    shiftBounds.absenceEndSlot !== undefined
                      ? Math.min(shiftBounds.absenceEndSlot, viewEndSlot)
                      : 0;
                  const hasAbsenceBounds =
                    shiftBounds.absenceStartSlot !== null &&
                    shiftBounds.absenceEndSlot !== null &&
                    shiftBounds.absenceStartSlot !== undefined &&
                    shiftBounds.absenceEndSlot !== undefined &&
                    shiftBounds.absenceEndSlot > shiftBounds.absenceStartSlot &&
                    clampedAbsenceEnd > clampedAbsenceStart;
                  const absenceRangeStr = hasAbsenceBounds
                    ? `${TIME_SLOTS[shiftBounds.absenceStartSlot!]}-${
                        TIME_SLOTS[shiftBounds.absenceEndSlot!]
                      }`
                    : "";

                  return (
                    <div
                      key={assistant.id}
                      className="flex border-b border-border/50 hover:bg-muted/15 transition-colors group"
                    >
                      <button
                        type="button"
                        className="w-44 flex-shrink-0 px-3 py-2 border-r border-border flex items-center gap-2.5 hover:bg-primary/5 transition-colors group/name text-left"
                        onClick={() =>
                          !canEditCurrentDay &&
                          onSelectAssistant?.(assistant.id, dayOffset)
                        }
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 group-hover/name:bg-primary/20 flex items-center justify-center flex-shrink-0 transition-colors">
                          <span className="text-[10px] font-bold text-primary font-mono">
                            {assistant.initials}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-medium text-foreground group-hover/name:text-primary truncate transition-colors">
                              {assistant.name.split(" ")[0]}{" "}
                              {assistant.name.split(" ").slice(-1)[0]?.[0]
                                ? `${
                                    assistant.name.split(" ").slice(-1)[0][0]
                                  }.`
                                : ""}
                            </p>
                            {hasOutOfBoundsPaint && (
                              <ActionTooltip content="Tem blocos pintados fora do horário de funcionamento da escola">
                                <span className="inline-flex items-center">
                                  <AlertTriangle
                                    size={11}
                                    className="text-[#D97706] flex-shrink-0"
                                  />
                                </span>
                              </ActionTooltip>
                            )}
                            {hasAbsenceBounds && (
                              <ActionTooltip
                                content={`Falta prevista registada: ${absenceRangeStr}${
                                  shiftBounds.absenceReason
                                    ? ` (${shiftBounds.absenceReason})`
                                    : ""
                                }`}
                              >
                                <span className="inline-flex items-center">
                                  <UserX
                                    size={11}
                                    className="text-destructive flex-shrink-0"
                                  />
                                </span>
                              </ActionTooltip>
                            )}
                          </div>
                          <p className="text-[9px] font-mono text-muted-foreground/85 truncate">
                            Turno: {shiftRangeStr}
                            {assistant.exception
                              ? ` · ${assistant.exception}`
                              : ""}
                          </p>
                        </div>
                      </button>

                      {/* Timeline Row */}
                      <div
                        className={`relative flex-1 ${
                          canEditCurrentDay
                            ? "h-14 bg-muted/20 select-none"
                            : "h-11 bg-muted/10"
                        }`}
                      >
                        {/* Background dynamic hour gridlines aligned with header */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {hourSegments.map((seg) => (
                            <div
                              key={seg.startSlot}
                              className="flex-none h-full border-r border-border/35 last:border-r-0"
                              style={{ width: `${seg.widthPct}%` }}
                            />
                          ))}
                        </div>

                        {/* In Edit Mode: Shift Background Container Frame (Verde) */}
                        {canEditCurrentDay &&
                          clampedShiftEnd > clampedShiftStart && (
                            <div
                              className="absolute inset-y-1 bg-primary/6 border-2 border-dashed border-primary/45 rounded-xl pointer-events-none z-0"
                              style={{
                                left: `${
                                  ((clampedShiftStart - viewStartSlot) /
                                    viewSlotsCount) *
                                  100
                                }%`,
                                width: `${
                                  ((clampedShiftEnd - clampedShiftStart) /
                                    viewSlotsCount) *
                                  100
                                }%`,
                              }}
                            >
                              <span className="absolute -top-0.5 left-2 px-1 bg-card text-[8px] font-mono font-semibold text-primary rounded shadow-2xs">
                                Horário {shiftRangeStr}
                              </span>
                            </div>
                          )}

                        {/* In Edit Mode: Lunch Break Dashed Frame (Laranja) */}
                        {canEditCurrentDay && hasLunchBounds && (
                          <div
                            className="absolute inset-y-1.5 bg-orange-500/12 border-2 border-dashed border-orange-500/70 rounded-lg pointer-events-none z-0 overflow-hidden"
                            style={{
                              left: `${
                                ((clampedLunchStart - viewStartSlot) /
                                  viewSlotsCount) *
                                100
                              }%`,
                              width: `${
                                ((clampedLunchEnd - clampedLunchStart) /
                                  viewSlotsCount) *
                                100
                              }%`,
                            }}
                          >
                            <span className="absolute -top-0.5 left-1.5 px-1 bg-card text-[8px] font-mono font-semibold text-orange-600 dark:text-orange-400 rounded border border-orange-500/30 shadow-2xs">
                              Almoço {lunchRangeStr}
                            </span>
                          </div>
                        )}

                        {/* In Edit Mode: Scheduled Absence Dashed Frame (Vermelho) */}
                        {canEditCurrentDay && hasAbsenceBounds && (
                          <div
                            className="absolute inset-y-1.5 bg-destructive/12 border-2 border-dashed border-destructive/75 rounded-lg pointer-events-none z-0 overflow-hidden"
                            style={{
                              left: `${
                                ((clampedAbsenceStart - viewStartSlot) /
                                  viewSlotsCount) *
                                100
                              }%`,
                              width: `${
                                ((clampedAbsenceEnd - clampedAbsenceStart) /
                                  viewSlotsCount) *
                                100
                              }%`,
                            }}
                          >
                            <span className="absolute -top-0.5 left-1.5 px-1 bg-card text-[8px] font-mono font-semibold text-destructive rounded border border-destructive/30 shadow-2xs truncate max-w-[90%]">
                              Falta Prevista {absenceRangeStr}
                              {shiftBounds.absenceReason
                                ? ` (${shiftBounds.absenceReason})`
                                : ""}
                            </span>
                          </div>
                        )}

                        {/* Highlighted Rule Window */}
                        {canEditCurrentDay &&
                          highlightedRule &&
                          Math.min(highlightedRule.endSlot, viewEndSlot) >
                            Math.max(
                              highlightedRule.startSlot,
                              viewStartSlot
                            ) && (
                            <div
                              className="absolute inset-y-0 bg-primary/12 border-x-2 border-primary pointer-events-none z-10"
                              style={{
                                left: `${
                                  ((Math.max(
                                    highlightedRule.startSlot,
                                    viewStartSlot
                                  ) -
                                    viewStartSlot) /
                                    viewSlotsCount) *
                                  100
                                }%`,
                                width: `${
                                  ((Math.min(
                                    highlightedRule.endSlot,
                                    viewEndSlot
                                  ) -
                                    Math.max(
                                      highlightedRule.startSlot,
                                      viewStartSlot
                                    )) /
                                    viewSlotsCount) *
                                  100
                                }%`,
                              }}
                            />
                          )}

                        {/* Smooth Merged Capsule Activity Bars */}
                        {blocks.map((b, bi) => {
                          const clipStart = Math.max(b.start, viewStartSlot);
                          const clipEnd = Math.min(
                            b.start + b.count,
                            viewEndSlot
                          );
                          if (b.state === "off" || clipEnd <= clipStart)
                            return null;

                          const visibleSlots = clipEnd - clipStart;
                          const styleConfig = BLOCK_STYLES[b.state];
                          const displayLabel = b.activityName || styleConfig.label;
                          const isLocked = b.isLocked ?? styleConfig.locked;
                          const startTimeStr = TIME_SLOTS[b.start] ?? "";
                          const endTimeStr =
                            TIME_SLOTS[Math.min(b.start + b.count, 95)] ??
                            "24:00";
                          const durationStr = formatDurationSlots(b.count);

                          const isBlockOutOfShift =
                            b.start < viewStartSlot ||
                            b.start + b.count > viewEndSlot;

                          const isMatchesSpotlight = b.state === paintType;
                          const spotlightClass = isSpotlightActive
                            ? isMatchesSpotlight
                              ? "opacity-100 ring-2 ring-white/80 shadow-sm z-10"
                              : "opacity-30"
                            : "opacity-95 hover:opacity-100";

                          const radiusClass =
                            b.hasPrevAdjacent && b.hasNextAdjacent
                              ? "rounded-none"
                              : b.hasPrevAdjacent
                              ? "rounded-l-none rounded-r-lg"
                              : b.hasNextAdjacent
                              ? "rounded-l-lg rounded-r-none"
                              : "rounded-lg";

                          const separatorClass = b.hasPrevAdjacent
                            ? "border-l-[1.5px] border-card/90"
                            : "";

                          const showLabel = visibleSlots >= 2;
                          const showDurationChip = visibleSlots >= 8;

                          const leftPct =
                            ((clipStart - viewStartSlot) / viewSlotsCount) *
                            100;
                          const widthPct =
                            ((clipEnd - clipStart) / viewSlotsCount) * 100;

                          const padLeftPx =
                            canEditCurrentDay && !b.hasPrevAdjacent ? 4 : 0;
                          const padRightPx =
                            canEditCurrentDay && !b.hasNextAdjacent ? 4 : 0;

                          const barElement = (
                            <div
                              key={bi}
                              onClick={() =>
                                !canEditCurrentDay &&
                                onSelectAssistant?.(assistant.id, dayOffset)
                              }
                              className={`absolute ${
                                canEditCurrentDay
                                  ? "inset-y-3 pointer-events-none"
                                  : "inset-y-1.5 cursor-pointer hover:brightness-110 hover:z-10 hover:ring-2 hover:ring-white/40"
                              } ${radiusClass} ${separatorClass} ${
                                b.activityColor ? "" : styleConfig.bg
                              } ${spotlightClass} ${
                                isBlockOutOfShift && canEditCurrentDay
                                  ? "ring-2 ring-[#D97706]"
                                  : ""
                              } text-white shadow-2xs overflow-hidden transition-all flex items-center px-2 gap-1.5 text-left`}
                              style={{
                                left: `calc(${leftPct}% + ${padLeftPx}px)`,
                                width: `calc(${widthPct}% - ${
                                  padLeftPx + padRightPx
                                }px)`,
                                ...(b.activityColor
                                  ? { backgroundColor: b.activityColor }
                                  : {}),
                              }}
                            >
                              {showLabel && (
                                <>
                                  <span className="text-[11px] font-semibold leading-none tracking-tight truncate drop-shadow-2xs">
                                    {displayLabel}
                                  </span>
                                  {showDurationChip && (
                                    <span className="ml-auto text-[9px] font-mono bg-black/15 px-1.5 py-0.5 rounded text-white/90 flex-shrink-0">
                                      {durationStr}
                                    </span>
                                  )}
                                  {isLocked && (
                                    <Lock
                                      size={10}
                                      className={`${
                                        showDurationChip ? "" : "ml-auto"
                                      } flex-shrink-0 text-white/80`}
                                    />
                                  )}
                                </>
                              )}

                              {!showLabel && isLocked && (
                                <div className="w-full flex items-center justify-center">
                                  <Lock size={8} className="text-white/80" />
                                </div>
                              )}
                            </div>
                          );

                          if (canEditCurrentDay) {
                            return barElement;
                          }

                          return (
                            <Tooltip key={bi}>
                              <TooltipTrigger asChild>
                                {barElement}
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                sideOffset={6}
                                className="bg-popover text-popover-foreground border border-border shadow-xl px-3.5 py-2.5 rounded-xl text-left min-w-[190px]"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full ${
                                        b.activityColor ? "" : styleConfig.bg
                                      }`}
                                      style={
                                        b.activityColor
                                          ? { backgroundColor: b.activityColor }
                                          : undefined
                                      }
                                    />
                                    <span className="font-semibold text-xs text-foreground">
                                      {displayLabel}
                                    </span>
                                    {b.activityName &&
                                      b.activityName !== styleConfig.label && (
                                        <span className="text-[10px] text-muted-foreground">
                                          ({styleConfig.label})
                                        </span>
                                      )}
                                  </div>
                                  {isLocked && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      <Lock size={9} />
                                      Fixo
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1.5 pt-1.5 border-t border-border/60 space-y-0.5">
                                  <p className="text-xs font-medium text-foreground">
                                    {assistant.name}
                                  </p>
                                  <p className="text-[11px] font-mono text-muted-foreground">
                                    {startTimeStr} – {endTimeStr}{" "}
                                    <span className="text-foreground/80 font-semibold">
                                      ({durationStr})
                                    </span>
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}

                        {/* Interactive 15-min Paint Overlay in Edit Mode */}
                        {canEditCurrentDay && (
                          <div className="absolute inset-0 flex z-20">
                            {Array.from({ length: viewSlotsCount }, (_, i) => {
                              const slot = viewStartSlot + i;
                              const state = rowSlots[slot];
                              const isInsideShift =
                                slot >= shiftBounds.startSlot &&
                                slot < shiftBounds.endSlot;
                              const nextTime =
                                TIME_SLOTS[Math.min(slot + 1, 95)] ?? "24:00";

                              return (
                                <Tooltip key={slot}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="flex-none h-full cursor-crosshair group/slot flex items-center justify-center px-[1px]"
                                      style={{
                                        width: `${(1 / viewSlotsCount) * 100}%`,
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsPainting(true);
                                        setPaintAid(assistant.id);
                                        paintSlot(assistant.id, slot);
                                      }}
                                      onMouseEnter={() => {
                                        if (
                                          isPainting &&
                                          paintAid === assistant.id
                                        ) {
                                          paintSlot(assistant.id, slot);
                                        }
                                      }}
                                    >
                                      {/* Hover brush preview pill */}
                                      <div
                                        className={`w-full h-8 rounded-sm opacity-0 group-hover/slot:opacity-45 transition-opacity ${
                                          paintType === "off"
                                            ? "bg-destructive/50 border border-destructive"
                                            : BLOCK_STYLES[paintType].bg
                                        }`}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    sideOffset={6}
                                    className="bg-popover text-popover-foreground border border-border shadow-lg px-3 py-2 rounded-lg text-left"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`w-2.5 h-2.5 rounded-full ${
                                          state !== "off"
                                            ? BLOCK_STYLES[state].bg
                                            : "bg-muted-foreground/40"
                                        }`}
                                      />
                                      <span className="font-semibold text-xs text-foreground">
                                        {BLOCK_STYLES[state].label}
                                      </span>
                                      {!isInsideShift && (
                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#D97706]/15 text-[#D97706]">
                                          Fora do Turno ({shiftRangeStr})
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                      {TIME_SLOTS[slot]} – {nextTime} ·{" "}
                                      {assistant.name}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 2. ABSENT ASSISTANTS SECTION */}
                {absentAssistants.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 bg-destructive/5 border-b border-border/60 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                        <UserX size={11} />
                        Assistentes Ausentes Hoje ({absentAssistants.length}) —
                        Horário Previsto e Tarefas a seu Cargo
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Linhas desativadas (disabled) · Tarefas originais/copiadas visíveis para redistribuição
                      </span>
                    </div>

                    {absentAssistants.map(
                      ({
                        assistant,
                        reason,
                        plannedRow,
                        shiftBounds,
                        copiedFromLabel,
                      }) => {
                        const shiftRangeStr = `${
                          TIME_SLOTS[shiftBounds.startSlot]
                        }–${TIME_SLOTS[shiftBounds.endSlot]}`;
                        const plannedBlocks = slotsToBlocks(
                          plannedRow,
                          slotMetaByAssistant[assistant.id]
                        );
                        const clampedAbsStart = Math.max(
                          shiftBounds.startSlot,
                          viewStartSlot
                        );
                        const clampedAbsEnd = Math.min(
                          shiftBounds.endSlot,
                          viewEndSlot
                        );

                        return (
                          <div
                            key={assistant.id}
                            className="flex border-b border-border/40 last:border-b-0 bg-muted/20 opacity-75 select-none"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                !canEditCurrentDay &&
                                onSelectAssistant?.(assistant.id, dayOffset)
                              }
                              disabled={canEditCurrentDay}
                              className="w-44 flex-shrink-0 px-3 py-2 border-r border-border flex items-center gap-2.5 text-left disabled:cursor-not-allowed"
                            >
                              <div className="w-7 h-7 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-destructive font-mono">
                                  {assistant.initials}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <p className="text-xs font-medium text-muted-foreground line-through truncate">
                                    {assistant.name.split(" ")[0]}{" "}
                                    {assistant.name.split(" ").slice(-1)[0]?.[0]
                                      ? `${
                                          assistant.name
                                            .split(" ")
                                            .slice(-1)[0][0]
                                        }.`
                                      : ""}
                                  </p>
                                  <span className="text-[8px] font-semibold uppercase px-1 py-0.2 rounded bg-destructive/15 text-destructive">
                                    Falta
                                  </span>
                                </div>
                                <p className="text-[9px] font-mono text-destructive/80 truncate">
                                  {shiftRangeStr} · {reason}
                                </p>
                                {copiedFromLabel && (
                                  <p className="text-[8px] font-medium text-primary truncate">
                                    Tarefas copiadas de {copiedFromLabel}
                                  </p>
                                )}
                              </div>
                            </button>

                            <div className="relative flex-1 h-11 bg-muted/25 cursor-not-allowed">
                              <div className="absolute inset-0 flex pointer-events-none">
                                {hourSegments.map((seg) => (
                                  <div
                                    key={seg.startSlot}
                                    className="flex-none h-full border-r border-border/30 last:border-r-0"
                                    style={{ width: `${seg.widthPct}%` }}
                                  />
                                ))}
                              </div>

                              {clampedAbsEnd > clampedAbsStart && (
                                <div
                                  className="absolute inset-y-1 bg-destructive/8 border border-dashed border-destructive/30 rounded-lg pointer-events-none"
                                  style={{
                                    left: `${
                                      ((clampedAbsStart - viewStartSlot) /
                                        viewSlotsCount) *
                                      100
                                    }%`,
                                    width: `${
                                      ((clampedAbsEnd - clampedAbsStart) /
                                        viewSlotsCount) *
                                      100
                                    }%`,
                                  }}
                                />
                              )}

                              {plannedBlocks.map((b, bi) => {
                                const clipStart = Math.max(
                                  b.start,
                                  viewStartSlot
                                );
                                const clipEnd = Math.min(
                                  b.start + b.count,
                                  viewEndSlot
                                );
                                if (b.state === "off" || clipEnd <= clipStart)
                                  return null;

                                const visibleSlots = clipEnd - clipStart;
                                const styleConfig = BLOCK_STYLES[b.state];
                                const displayLabel = b.activityName || styleConfig.label;
                                const startTimeStr = TIME_SLOTS[b.start] ?? "";
                                const endTimeStr =
                                  TIME_SLOTS[
                                    Math.min(b.start + b.count, 95)
                                  ] ?? "24:00";
                                const durationStr = formatDurationSlots(
                                  b.count
                                );

                                const isMatchesSpotlight =
                                  b.state === paintType;
                                const spotlightClass = isSpotlightActive
                                  ? isMatchesSpotlight
                                    ? "opacity-85 ring-1 ring-destructive"
                                    : "opacity-25"
                                  : "opacity-45 hover:opacity-75";

                                const radiusClass =
                                  b.hasPrevAdjacent && b.hasNextAdjacent
                                    ? "rounded-none"
                                    : b.hasPrevAdjacent
                                    ? "rounded-l-none rounded-r-lg"
                                    : b.hasNextAdjacent
                                    ? "rounded-l-lg rounded-r-none"
                                    : "rounded-lg";

                                return (
                                  <Tooltip key={bi}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`absolute inset-y-1.5 ${radiusClass} border border-dashed border-destructive/60 ${styleConfig.bg} ${spotlightClass} text-white overflow-hidden flex items-center px-2 gap-1.5 transition-all`}
                                        style={{
                                          left: `${
                                            ((clipStart - viewStartSlot) /
                                              viewSlotsCount) *
                                            100
                                          }%`,
                                          width: `${
                                            ((clipEnd - clipStart) /
                                              viewSlotsCount) *
                                            100
                                          }%`,
                                        }}
                                      >
                                        {visibleSlots >= 4 && (
                                          <>
                                            <UserX
                                              size={10}
                                              className="flex-shrink-0 text-white"
                                            />
                                            <span className="text-[10px] font-medium truncate">
                                              {displayLabel}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      sideOffset={6}
                                      className="bg-popover text-popover-foreground border border-destructive/30 shadow-xl px-3.5 py-2.5 rounded-xl text-left min-w-[210px]"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive">
                                          <UserX size={11} />
                                          Ausente ({reason})
                                        </span>
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                          Turno {shiftRangeStr}
                                        </span>
                                      </div>
                                      <div className="mt-1.5 pt-1.5 border-t border-border/60 space-y-0.5">
                                        <p className="text-xs font-semibold text-foreground">
                                          Teria a cargo: {displayLabel}
                                          {b.activityName &&
                                            b.activityName !== styleConfig.label && (
                                              <span className="text-[10px] text-muted-foreground font-normal ml-1">
                                                ({styleConfig.label})
                                              </span>
                                            )}
                                        </p>
                                        <p className="text-[11px] font-mono text-muted-foreground">
                                          {startTimeStr} – {endTimeStr} (
                                          {durationStr}) · {assistant.name}
                                        </p>
                                        {copiedFromLabel && (
                                          <p className="text-[10px] text-primary font-medium pt-0.5">
                                            Copiado da escala de{" "}
                                            {copiedFromLabel}
                                          </p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Legenda dos elementos visuais da grelha de planeamento (apenas no modo de edição) */}
            {canEditCurrentDay && (
              <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between flex-wrap gap-4 text-xs animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <Info size={14} className="text-primary" />
                  <span>Legenda do Planeamento:</span>
                </div>
                <div className="flex items-center gap-5 flex-wrap text-xs">
                  {/* Tracejado Verde */}
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-3.5 rounded border-2 border-dashed border-primary/60 bg-primary/10 shadow-2xs" />
                    <span className="text-foreground/90 font-medium">Horário Previsto do Assistente</span>
                  </div>

                  {/* Tracejado Laranja */}
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-3.5 rounded border-2 border-dashed border-orange-500/70 bg-orange-500/15 shadow-2xs" />
                    <span className="text-foreground/90 font-medium">Pausa de Almoço Prevista</span>
                  </div>

                  {/* Tracejado Vermelho */}
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-3.5 rounded border-2 border-dashed border-destructive/80 bg-destructive/15 shadow-2xs" />
                    <span className="text-foreground/90 font-medium">Ausência / Falta Registada</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ===================================================================== */}
      {/* MODAL 1: COPIAR HORÁRIO ENTRE DIAS (COM DATEPICKER & DIAS FECHADOS)   */}
      {/* ===================================================================== */}
      <Dialog open={showCopyModal} onOpenChange={setShowCopyModal}>
        <DialogContent className="w-full max-w-md p-0 overflow-visible rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10">
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Copy size={15} className="text-primary" />
              Copiar Horário entre Dias
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Os dias em que a escola está encerrada (horário fixo, futuras
              versões em vigor, feriados ou exceções) estão desativados no
              calendário.
            </p>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {/* Mode Switcher */}
            {!isPastDay && (
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-muted/40 border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setCopyDirection("to_future");
                    setCopyPickerIsoDate(findNextOpenFutureIso(dayInfo.isoDate));
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    copyDirection === "to_future"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Copiar deste dia para outro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCopyDirection("from_other");
                    setCopyPickerIsoDate(findPreviousOpenIso(dayInfo.isoDate));
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    copyDirection === "from_other"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Trazer de outro dia para aqui
                </button>
              </div>
            )}

            {/* Visual Origin -> Target summary */}
            <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/20 border border-border text-xs">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-semibold">
                  Origem
                </span>
                <span className="font-mono font-semibold text-foreground truncate block mt-0.5">
                  {copyDirection === "to_future"
                    ? `${dayInfo.dayShort}, ${dayInfo.dateStr}`
                    : copyPickerDateInfo
                    ? `${copyPickerDateInfo.dayShort}, ${copyPickerDateInfo.dateStr}`
                    : "Selecionar..."}
                </span>
              </div>
              <ArrowRight size={15} className="text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1 text-right">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-semibold">
                  Destino
                </span>
                <span className="font-mono font-semibold text-primary truncate block mt-0.5">
                  {copyDirection === "to_future"
                    ? copyPickerDateInfo
                      ? `${copyPickerDateInfo.dayShort}, ${copyPickerDateInfo.dateStr}`
                      : "Selecionar..."
                    : `${dayInfo.dayShort}, ${dayInfo.dateStr}`}
                </span>
              </div>
            </div>

            {/* DatePicker with closed school days disabled */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {copyDirection === "to_future"
                  ? "Escolher dia de destino (futuro) no calendário *"
                  : "Escolher dia de origem (passado ou futuro) no calendário *"}
              </label>
              <DatePicker
                value={copyPickerIsoDate}
                onChange={(iso) => setCopyPickerIsoDate(iso)}
                allowClear={false}
                minDate={copyDirection === "to_future" ? todayIso : undefined}
                isDateDisabled={(iso) => {
                  if (iso === dayInfo.isoDate) return true;
                  if (copyDirection === "to_future" && iso < todayIso) {
                    return true;
                  }
                  const st = getStatusForIsoDate(iso);
                  return !st.isOpen;
                }}
                getDayTooltip={(iso) => {
                  if (iso === dayInfo.isoDate) {
                    return "Este é o próprio dia selecionado";
                  }
                  if (copyDirection === "to_future" && iso < todayIso) {
                    return "Não é possível copiar um horário para um dia passado";
                  }
                  const st = getStatusForIsoDate(iso);
                  if (!st.isOpen) {
                    return st.title || "Estabelecimento Encerrado";
                  }
                  return st.openingTime && st.closingTime
                    ? `Escola aberta (${st.openingTime.slice(
                        0,
                        5
                      )}–${st.closingTime.slice(0, 5)})`
                    : "Escola aberta";
                }}
              />
              {copyPickerStatus?.isOpen &&
                copyPickerStatus.openingTime &&
                copyPickerStatus.closingTime && (
                  <p className="text-[11px] text-muted-foreground font-mono mt-1.5">
                    Horário de funcionamento nesse dia:{" "}
                    <span className="text-foreground font-semibold">
                      {copyPickerStatus.openingTime.slice(0, 5)} –{" "}
                      {copyPickerStatus.closingTime.slice(0, 5)}
                    </span>
                    {copyPickerStatus.scheduleSourceLabel
                      ? ` (${copyPickerStatus.scheduleSourceLabel})`
                      : ""}
                  </p>
                )}
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
              Os assistentes com <strong>falta registada</strong> no dia de
              destino continuarão desativados (<em>disabled</em>) no fim da
              lista, mas mostrarão as tarefas que tinham atribuídas na escala
              copiada para facilitar a redistribuição.
            </div>
          </div>

          <DialogFooter className="px-5 py-3 border-t border-border bg-muted/5">
            <button
              type="button"
              onClick={() => setShowCopyModal(false)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!copyPickerIsoDate || !copyPickerStatus?.isOpen}
              onClick={handleConfirmCopySchedule}
              className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <Copy size={12} />
              {copyDirection === "to_future"
                ? "Copiar para Dia Selecionado"
                : "Copiar para Este Dia"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL 2: VALIDAÇÃO E CONFIRMAÇÃO AO CONCLUIR EDIÇÃO                   */}
      {/* ===================================================================== */}
      <Dialog open={showFinishModal} onOpenChange={setShowFinishModal}>
        <DialogContent className="w-full max-w-lg p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10">
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary" />
              Confirmar e Validar Alterações de Escala
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Revê os dias que vão ser alterados antes de guardar para garantir
              que não modificaste outro dia sem querer.
            </p>
          </DialogHeader>

          <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
            {modifiedDaysSummary.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Não restam alterações pendentes para guardar.
              </p>
            ) : (
              modifiedDaysSummary.map((item) => (
                <div
                  key={item.offset}
                  className="rounded-xl border border-border bg-muted/10 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        {item.info.dayName}, {item.info.dateStr}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.changedAssistantsCount}{" "}
                        {item.changedAssistantsCount === 1
                          ? "assistente alterado"
                          : "assistentes alterados"}
                      </Badge>
                    </div>

                    <ActionTooltip content="Anular alterações feitas neste dia">
                      <button
                        type="button"
                        onClick={() => discardDayDraft(item.offset)}
                        className="text-[11px] text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={11} />
                        Descartar este dia
                      </button>
                    </ActionTooltip>
                  </div>

                  {item.copiedFromLabel && (
                    <p className="text-[11px] text-primary font-medium">
                      • Escala copiada de {item.copiedFromLabel}
                    </p>
                  )}

                  {item.warnings.length === 0 ? (
                    <p className="text-[11px] text-[#0E7C59] flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Sem avisos de validação neste dia.
                    </p>
                  ) : (
                    <div className="space-y-1 pt-1">
                      {item.warnings.map((w) => (
                        <div
                          key={w.id}
                          className="text-[11px] flex items-start gap-1.5 text-[#D97706]"
                        >
                          <AlertTriangle
                            size={11}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <span>
                            <strong>{w.title}:</strong> {w.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="px-5 py-3 border-t border-border bg-muted/5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftMatricesByDay({});
                setCopiedFromByDay({});
                setShowFinishModal(false);
                setEditMode(false);
              }}
              className="px-3 py-1.5 rounded-lg border border-destructive/30 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              Descartar Tudo e Sair
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Continuar a Editar
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveAllEdits}
                disabled={modifiedDaysSummary.length === 0}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                <Check size={13} />
                Confirmar e Guardar ({modifiedDaysSummary.length})
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Publicação de Escalas (Rascunho -> Publicada) */}
      <PublishSchedulesModal
        open={publishModalState.open}
        onClose={() => setPublishModalState({ open: false })}
        schedules={schedulesList}
        assistants={activeAssistants}
        initialSelectedDate={publishModalState.preselectedDate}
      />
    </TooltipProvider>
  );
}
