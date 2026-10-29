import { useState, useEffect, useMemo, useRef } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  Building2,
  Calendar,
  CalendarClock,
  CalendarOff,
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
  UserX,
  ChevronDown,
  FileSpreadsheet,
  Printer,
  UserCheck,
  Utensils,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import PrintScheduleModal, {
  exportDailyScheduleToCsv,
  PrintableAssistantSchedule,
  PrintableAbsentAssistant,
} from "./PrintScheduleModal";
import type { Assistant, BlockState, EntityId, ScheduleMatrix } from "../../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
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
  type MergedScheduleBlockMeta,
} from "./blockStyles";
import { useSchool } from "../../context/SchoolContext";
import { useDashboardBootstrap } from "../../hooks/api/useDashboardBootstrap";
import { useSaveScheduleDays } from "../../hooks/api/useSchedules";
import type {
  AssistantScheduleProfileApi,
  AssistantExceptionApi,
} from "../../types/assistantSchedule.types";
import type {
  LunchBlockApi,
  SaveScheduleDayPayload,
  SaveScheduleDayEntryPayload,
} from "../../api/services/schedules.service";
import PublishSchedulesModal from "./PublishSchedulesModal";
import {
  buildDayMatrixFromApi,
  buildTimelineHourSegments,
  checkAssistantAbsenceOnDate,
  getAllDraftDaysFromSchedules,
  getDateInfo,
  getIsoDateFromOffset,
  getOffsetFromIsoDate,
  getMondayOffsetFromDayOffset,
  getThreeWeeksWindowIso,
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
  type: "mandatory" | "optional" | "fallback";
  daysOfWeek: number[]; // 0 = Seg ... 4 = Sex
  priorityNames: string[];
  isFallback?: boolean;
}

interface MatrixGridProps {
  onSelectAssistant?: (
    id: EntityId,
    offset?: number,
    daySlots?: BlockState[],
    slotMeta?: Record<number, SlotEntryMetadata>
  ) => void;
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

function areRowsEqual(r1?: BlockState[], r2?: BlockState[]): boolean {
  if (!r1 || !r2) return r1 === r2;
  if (r1.length !== r2.length) return false;
  for (let i = 0; i < r1.length; i++) {
    if (r1[i] !== r2[i]) return false;
  }
  return true;
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
  const { selectedSchoolId, selectedSchool, agrupamento } = useSchool();
  const [editMode, setEditMode] = useState(false);
  // Persisted/confirmed schedules per dayOffset
  const [savedMatricesByDay, setSavedMatricesByDay] = useState<
    Record<number, ScheduleMatrix>
  >({});
  // Draft schedules while in editMode per dayOffset
  const [draftMatricesByDay, setDraftMatricesByDay] = useState<
    Record<number, ScheduleMatrix>
  >({});
  const [draftSlotMetaByDay, setDraftSlotMetaByDay] = useState<
    Record<number, Record<EntityId, Record<number, MergedScheduleBlockMeta>>>
  >({});
  // Track if a day's schedule was copied from another day (also stores the full copied rows so absent assistants show their copied tasks!)
  const [copiedFromByDay, setCopiedFromByDay] = useState<
    Record<number, { sourceOffset: number; sourcePlannedMatrix: ScheduleMatrix }>
  >({});

  // Baseline das matrizes do servidor no momento em que a edição/rascunho começou (para deteção cirúrgica de conflitos)
  const baselineMatricesRef = useRef<Record<number, ScheduleMatrix>>({});
  // Conflitos detetados entre o servidor e rascunhos locais ativos
  const [conflictsByDay, setConflictsByDay] = useState<
    Record<number, { assistantNames: string[]; freshServerMatrix: ScheduleMatrix }>
  >({});

  // Resetar estados de edição e rascunhos quando o admin troca de escola
  useEffect(() => {
    setDraftMatricesByDay({});
    setDraftSlotMetaByDay({});
    setSavedMatricesByDay({});
    setCopiedFromByDay({});
    setConflictsByDay({});
    baselineMatricesRef.current = {};
    setEditMode(false);
    setIsPainting(false);
    setPaintAid(null);
    setActiveTool("paint");
    setHoveredLockTarget(null);
  }, [selectedSchoolId]);

  type EditTool = "paint" | "lock" | "eraser" | "lunch";
  const [activeTool, setActiveTool] = useState<EditTool>("paint");
  const [hoveredLockTarget, setHoveredLockTarget] = useState<{ aid: EntityId; slot: number } | null>(null);
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
  const [showDiscardConfirmModal, setShowDiscardConfirmModal] = useState(false);
  const saveDaysMutation = useSaveScheduleDays();

  function handleRequestCancelEditMode() {
    if (modifiedDaysSummary.length > 0) {
      setShowDiscardConfirmModal(true);
    } else {
      setDraftMatricesByDay({});
      setDraftSlotMetaByDay({});
      setCopiedFromByDay({});
      setConflictsByDay({});
      baselineMatricesRef.current = {};
      setEditMode(false);
      setIsPainting(false);
      setPaintAid(null);
    }
  }
    const [printModalState, setPrintModalState] = useState<{
    open: boolean;
    initialDocModel?: "wall" | "individual" | "monthly";
  }>({
    open: false,
    initialDocModel: "wall",
  });

const [publishModalState, setPublishModalState] = useState<{
    open: boolean;
    preselectedDate?: string;
  }>({ open: false });

  const todayIso = useMemo(() => getIsoDateFromOffset(0), []);
  const dayInfo = getDateInfo(dayOffset);

  // Segunda-feira de referência da semana do dia ativo (Segunda=0 ... Domingo=6)
  const currentWeekMondayOffset = getMondayOffsetFromDayOffset(dayOffset);

  // Janela de 3 semanas (Semana Anterior, Semana Atual, Semana Seguinte - 21 dias contínuos).
  // Ancorada à Segunda-feira: enquanto o utilizador navegar entre dias da MESMA semana,
  // o mondayOffset não muda e a janela permanece fixa (ZERO pedidos HTTP à rede).
  const currentWeekWindow = useMemo(() => {
    return getThreeWeeksWindowIso(dayOffset);
  }, [currentWeekMondayOffset]);

  // Se o utilizador tiver definido um intervalo personalizado no filtro do cabeçalho,
  // esse intervalo tem prioridade. Caso contrário, usa a janela de 3 semanas.
  const effectiveRangeStartIso = useMemo(() => {
    if (queryStartDate && queryEndDate) return queryStartDate;
    let start = currentWeekWindow.startIso;
    if (copyPickerIsoDate && copyPickerIsoDate < start) {
      start = copyPickerIsoDate;
    }
    return start;
  }, [queryStartDate, queryEndDate, currentWeekWindow.startIso, copyPickerIsoDate]);

  const effectiveRangeEndIso = useMemo(() => {
    if (queryStartDate && queryEndDate) return queryEndDate;
    let end = currentWeekWindow.endIso;
    if (copyPickerIsoDate && copyPickerIsoDate > end) {
      end = copyPickerIsoDate;
    }
    return end;
  }, [queryStartDate, queryEndDate, currentWeekWindow.endIso, copyPickerIsoDate]);

  // Carregamento consolidado de arranque: 1 único pedido HTTP que traz todo o estado de uma só vez
  const { data: bootstrapData, isLoading: isBootstrapLoading } = useDashboardBootstrap(
    effectiveRangeStartIso,
    effectiveRangeEndIso
  );

  const assistantsList = bootstrapData?.assistants?.data || [];
  const schedulesList = bootstrapData?.schedules || [];
  const absencesRes = bootstrapData?.absences;
  const scheduleRules = bootstrapData?.schedule_rules || [];
  const rawActivityTypes = bootstrapData?.activity_types || [];
  const activityTypes = useMemo(() => {
    return rawActivityTypes.filter(
      (at) => !at.school_id || String(at.school_id) === String(selectedSchoolId)
    );
  }, [rawActivityTypes, selectedSchoolId]);
  const calendarDays = bootstrapData?.operating_calendar || [];
  const operatingRules = bootstrapData?.operating_rules || [];
  const operatingExceptions = bootstrapData?.operating_exceptions || [];
  const holidays = bootstrapData?.holidays || [];
  const temporaryAssignments = bootstrapData?.temporary_assignments || [];

  const isDayLoading = isBootstrapLoading && assistantsList.length === 0;

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

  const activeAssistants = useMemo(() => {
    const list: Assistant[] = assistantsList.filter(
      (a) => !a.deleted_at && (a.active ?? a.is_active ?? true)
    );
    const existingIds = new Set(list.map((a) => String(a.id)));

    // 1. Procurar nas transferências temporárias ativas para esta escola (incoming)
    temporaryAssignments.forEach((tr) => {
      if (
        String(tr.destination_school_id) === String(selectedSchoolId) &&
        !existingIds.has(String(tr.assistant_id))
      ) {
        existingIds.add(String(tr.assistant_id));
        const asstUser = tr.assistant?.user;
        const fullName = asstUser
          ? `${asstUser.first_name} ${asstUser.last_name}`.trim()
          : `Assistente #${tr.assistant_id.slice(0, 6)}`;
        list.push({
          id: tr.assistant_id,
          name: fullName,
          initials: fullName
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
          school_id: selectedSchoolId,
          is_temporary_transfer: true,
          origin_school_id: tr.origin_school_id,
          origin_school_name: tr.origin_school?.name || "Outra Escola",
          active: true,
          is_active: true,
        });
      }
    });

    // 2. Procurar em escalas geradas para esta escola de assistentes externos
    schedulesList.forEach((sc) => {
      if (
        String(sc.school_id) === String(selectedSchoolId) &&
        !existingIds.has(String(sc.assistant_id))
      ) {
        existingIds.add(String(sc.assistant_id));
        const fullName =
          sc.assistant_name || `Assistente #${sc.assistant_id.slice(0, 6)}`;
        list.push({
          id: sc.assistant_id,
          name: fullName,
          initials: fullName
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
          school_id: selectedSchoolId,
          is_temporary_transfer: true,
          origin_school_id: sc.origin_school_id,
          origin_school_name: sc.origin_school_name || "Outra Escola",
          active: true,
          is_active: true,
        });
      }
    });

    return list;
  }, [assistantsList, temporaryAssignments, schedulesList, selectedSchoolId]);

  // Perfis de horário e exceções vêm diretamente incorporados na lista de assistentes
  const profilesByAssistant = useMemo(() => {
    const map: Record<string, AssistantScheduleProfileApi[]> = {};
    activeAssistants.forEach((a) => {
      map[String(a.id)] = (a as any).schedule_profiles || [];
    });
    return map;
  }, [activeAssistants]);

  const exceptionsByAssistant = useMemo(() => {
    const map: Record<string, AssistantExceptionApi[]> = {};
    activeAssistants.forEach((a) => {
      map[String(a.id)] = (a as any).assistant_exceptions || [];
    });
    return map;
  }, [activeAssistants]);

  const dayRulesCatalog: DayRuleConfig[] = useMemo(() => {
    const rules: DayRuleConfig[] = scheduleRules.map((rule) => {
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
        isFallback: false,
      };
    });

    // Adiciona exatamente UMA atividade de Fallback (ex: Apoio Escola) para estar disponível na lista de regras para pintar
    const fallbackActivities = activityTypes.filter(
      (at) =>
        Boolean(at.is_fallback) ||
        (at.is_fallback as any) === 1 ||
        (at.is_fallback as any) === "1"
    );

    const primaryFallback =
      fallbackActivities[0] ||
      activityTypes.find(
        (at) =>
          at.name?.toLowerCase().includes("apoio escola") ||
          at.name?.toLowerCase().includes("apoio geral") ||
          at.name?.toLowerCase().includes("apoio turmas")
      ) ||
      null;

    rules.push({
      id: primaryFallback ? `fallback-${primaryFallback.id}` : "fallback-default",
      title: primaryFallback?.name || "Apoio Escola",
      state: primaryFallback ? mapActivityToBlockState(primaryFallback.name, true) : "work",
      startSlot: 24,
      endSlot: 84,
      min: 0,
      type: "fallback",
      daysOfWeek: [0, 1, 2, 3, 4],
      priorityNames: ["Todos os Assistentes"],
      isFallback: true,
    });

    return rules;
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

  const effectiveSlotMetaByAssistant = useMemo(() => {
    const draftDayMeta = draftSlotMetaByDay[dayOffset];
    if (!draftDayMeta) return slotMetaByAssistant;

    const merged: Record<EntityId, Record<number, MergedScheduleBlockMeta>> = {};
    activeAssistants.forEach((a) => {
      merged[a.id] = {
        ...(slotMetaByAssistant[a.id] || {}),
        ...(draftDayMeta[a.id] || {}),
      };
    });
    return merged;
  }, [activeAssistants, slotMetaByAssistant, draftSlotMetaByDay, dayOffset]);

  const dayLegendItems = useMemo(() => {
    const items: { key: string; name: string; color: string }[] = [];
    const seenNames = new Set<string>();

    activityTypes
      .filter((at) => at.active !== false)
      .forEach((at) => {
        const normName = at.name.trim().toLowerCase();
        if (seenNames.has(normName)) return;
        seenNames.add(normName);

        const isLunchSurveillance =
          normName.includes("vigilância almoço") ||
          normName.includes("vigilancia almoco");
        const color =
          isLunchSurveillance && (at.color === "#EF4444" || !at.color)
            ? "#A855F7"
            : at.color || "#3B82F6";
        items.push({
          key: `act-${at.id}`,
          name: at.name,
          color,
        });
      });

    if (slotMetaByAssistant) {
      Object.values(slotMetaByAssistant).forEach((metaRow) => {
        if (!metaRow) return;
        Object.values(metaRow).forEach((meta) => {
          if (!meta?.activityName) return;
          const normName = meta.activityName.trim().toLowerCase();
          if (!seenNames.has(normName)) {
            seenNames.add(normName);
            const isLunchSurveillance =
              normName.includes("vigilância almoço") ||
              normName.includes("vigilancia almoco");
            const color =
              isLunchSurveillance && (meta.activityColor === "#EF4444" || !meta.activityColor)
                ? "#A855F7"
                : meta.activityColor || "#3B82F6";
            items.push({
              key: `meta-${meta.activityName}`,
              name: meta.activityName,
              color,
            });
          }
        });
      });
    }

    if (items.length === 0) {
      items.push(
        { key: "acolhimento", name: "Acolhimento", color: "#F59E0B" },
        { key: "apoio-turmas", name: "Apoio Turmas/escola", color: "#3B82F6" },
        { key: "intervalo", name: "Intervalo", color: "#10B981" },
        { key: "vigilancia-almoco", name: "Vigilância almoço", color: "#A855F7" },
        { key: "limpeza", name: "Limpeza", color: "#8B5CF6" },
        { key: "entrega", name: "Entrega de alunos", color: "#14B8A6" }
      );
    }

    if (
      !seenNames.has("pausa almoço") &&
      !seenNames.has("pausa almoco") &&
      !seenNames.has("almoço") &&
      !seenNames.has("almoco")
    ) {
      seenNames.add("pausa almoço");
      items.push({
        key: "system-lunch",
        name: "Pausa Almoço",
        color: "#F97316",
      });
    }
    if (
      !seenNames.has("falta / ausência") &&
      !seenNames.has("falta") &&
      !seenNames.has("ausência") &&
      !seenNames.has("ausencia")
    ) {
      seenNames.add("falta / ausência");
      items.push({
        key: "system-absent",
        name: "Falta / Ausência",
        color: "#EF4444",
      });
    }

    return items;
  }, [activityTypes, slotMetaByAssistant]);

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

  // Resolução de conflitos de sincronização
  function resolveConflictKeepDraft(offset: number) {
    const conflict = conflictsByDay[offset];
    if (conflict?.freshServerMatrix) {
      baselineMatricesRef.current[offset] = cloneMatrix(conflict.freshServerMatrix);
    }
    setConflictsByDay((prev) => {
      const copy = { ...prev };
      delete copy[offset];
      return copy;
    });
    notify.info(
      "Rascunho mantido. As suas alterações locais prevalecerão ao gravar.",
      "Rascunho Preservado"
    );
  }

  function resolveConflictUseServer(offset: number) {
    delete baselineMatricesRef.current[offset];
    discardDayDraft(offset);
    setConflictsByDay((prev) => {
      const copy = { ...prev };
      delete copy[offset];
      return copy;
    });
    notify.info(
      "Grelha atualizada com os dados mais recentes do servidor.",
      "Sincronização Concluída"
    );
  }

  // Deteção cirúrgica de conflitos entre o servidor (heartbeat periódico) e rascunhos locais
  useEffect(() => {
    if (!bootstrapData) return;

    setDraftMatricesByDay((prevDrafts) => {
      const draftOffsets = Object.keys(prevDrafts).map(Number);
      if (draftOffsets.length === 0) return prevDrafts;

      let draftsChanged = false;
      const nextDrafts = { ...prevDrafts };

      draftOffsets.forEach((offset) => {
        const baseline = baselineMatricesRef.current[offset];
        if (!baseline) return;

        const currentDraft = prevDrafts[offset];
        if (!currentDraft) return;

        const info = getDateInfo(offset);
        const status = getStatusForIsoDate(info.isoDate);
        const { matrix: freshServerMatrix } = buildDayMatrixFromApi({
          isoDate: info.isoDate,
          isOpen: status.isOpen,
          assistants: activeAssistants,
          schedules: bootstrapData.schedules || [],
          absences: bootstrapData.absences?.data || [],
          lunchBlocksForDate: lunchBlocksByDate[info.isoDate],
          profilesByAssistant,
          exceptionsByAssistant,
        });

        const collidingAssistants: string[] = [];

        activeAssistants.forEach((ast) => {
          const aid = ast.id;
          const draftRow = currentDraft[aid];
          const baseRow = baseline[aid];
          const serverRow = freshServerMatrix[aid];

          const userEdited = !areRowsEqual(draftRow, baseRow);
          const serverChanged = !areRowsEqual(serverRow, baseRow);

          if (serverChanged) {
            if (userEdited) {
              collidingAssistants.push(ast.name);
            } else {
              // Aplicação cirúrgica e silenciosa: o utilizador não mexeu neste assistente
              if (!draftsChanged) {
                nextDrafts[offset] = cloneMatrix(nextDrafts[offset]);
              }
              nextDrafts[offset][aid] = [...(serverRow || Array(96).fill("off"))];
              baseline[aid] = [...(serverRow || Array(96).fill("off"))];
              draftsChanged = true;
            }
          }
        });

        if (collidingAssistants.length > 0) {
          setConflictsByDay((prev) => ({
            ...prev,
            [offset]: { assistantNames: collidingAssistants, freshServerMatrix },
          }));
        } else {
          setConflictsByDay((prev) => {
            if (!prev[offset]) return prev;
            const copy = { ...prev };
            delete copy[offset];
            return copy;
          });
        }
      });

      return draftsChanged ? nextDrafts : prevDrafts;
    });
  }, [bootstrapData, activeAssistants]);

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
  const dayActivities = useMemo(() => {
    const ruleStates = new Set<BlockState>();
    rulesForToday.forEach((r) => ruleStates.add(r.state));
    const ordered: BlockState[] = [];
    (
      ["collection", "work", "surveillance", "cleaning", "delivery"] as BlockState[]
    ).forEach((s) => {
      if (ruleStates.has(s) || s === "work" || s === "collection") ordered.push(s);
    });
    ordered.push("lunch");
    return ordered;
  }, [rulesForToday]);

  const availablePaintTypes = useMemo(() => {
    return [...dayActivities, "lunch" as BlockState, "off" as BlockState];
  }, [dayActivities]);

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

    function toggleBlockLockAtSlot(aid: EntityId, targetSlot: number) {
    if (!canEditCurrentDay) return;
    if (!baselineMatricesRef.current[dayOffset]) {
      baselineMatricesRef.current[dayOffset] = cloneMatrix(baseDayMatrix);
    }

    const currentMatrix = draftMatricesByDay[dayOffset] ?? baseDayMatrix;
    const assistantSlots = currentMatrix[aid] ?? Array(96).fill("off");
    const currentSlotState = assistantSlots[targetSlot];

    if (!currentSlotState || currentSlotState === "off") {
      return;
    }

    const assistantMeta = {
      ...(slotMetaByAssistant[aid] ?? {}),
      ...(draftSlotMetaByDay[dayOffset]?.[aid] ?? {}),
    };

    const blocks = slotsToBlocks(assistantSlots, assistantMeta);
    const targetBlock = blocks.find(
      (b) => targetSlot >= b.start && targetSlot < b.start + b.count
    );

    if (!targetBlock) return;

    const newIsLocked = !Boolean(targetBlock.isLocked);

    setDraftMatricesByDay((prev) => {
      const curDay = prev[dayOffset] ?? baseDayMatrix;
      return {
        ...prev,
        [dayOffset]: cloneMatrix(curDay),
      };
    });

    setDraftSlotMetaByDay((prev) => {
      const dayMeta = { ...(prev[dayOffset] ?? {}) };
      const curAssistantMeta = { ...(dayMeta[aid] ?? slotMetaByAssistant[aid] ?? {}) };

      for (let s = targetBlock.start; s < targetBlock.start + targetBlock.count; s++) {
        const existingSlot = curAssistantMeta[s] ?? slotMetaByAssistant[aid]?.[s] ?? {};
        curAssistantMeta[s] = {
          ...existingSlot,
          isLocked: newIsLocked,
        };
      }

      dayMeta[aid] = curAssistantMeta;
      return {
        ...prev,
        [dayOffset]: dayMeta,
      };
    });


  }

function paintSlot(aid: EntityId, slot: number) {
    if (!canEditCurrentDay) return;
    if (!baselineMatricesRef.current[dayOffset]) {
      baselineMatricesRef.current[dayOffset] = cloneMatrix(baseDayMatrix);
    }
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

    setDraftSlotMetaByDay((prev) => {
      const dayMeta = { ...(prev[dayOffset] ?? {}) };
      const assistantMeta = { ...(dayMeta[aid] ?? slotMetaByAssistant[aid] ?? {}) };

      if (paintType === "off") {
        delete assistantMeta[slot];
      } else if (paintType === "lunch") {
        assistantMeta[slot] = {
          activityName: "Pausa Almoço",
          activityColor: "#F97316",
          activityTypeId: null,
          ruleId: null,
          isFallback: false,
        };
      } else {
        const activeRule = highlightedRuleId
          ? dayRulesCatalog.find(
              (r) => r.id === highlightedRuleId && r.state === paintType
            )
          : null;

        const defaultLabel = BLOCK_STYLES[paintType]?.label;
        const matchedAct = activeRule
          ? (activeRule.isFallback
              ? activityTypes.find((at) => at.is_fallback || at.name.toLowerCase() === activeRule.title.toLowerCase())
              : activityTypes.find((at) => at.name.toLowerCase() === activeRule.title.toLowerCase()))
          : activityTypes.find(
              (at) =>
                at.name.toLowerCase() === defaultLabel?.toLowerCase() ||
                mapActivityToBlockState(at.name, at.is_fallback) === paintType
            );

        const isFallbackAct = Boolean(activeRule?.isFallback || matchedAct?.is_fallback || paintType === "work");
        assistantMeta[slot] = {
          activityName: activeRule?.title || matchedAct?.name || (isFallbackAct ? "Apoio Escola" : defaultLabel) || "Atividade",
          activityColor: matchedAct?.color || (isFallbackAct ? "#3B82F6" : undefined),
          activityTypeId: matchedAct?.id || null,
          ruleId: activeRule?.isFallback ? null : (activeRule?.id ? String(activeRule.id) : null),
          isFallback: isFallbackAct,
        };
      }

      dayMeta[aid] = assistantMeta;
      return {
        ...prev,
        [dayOffset]: dayMeta,
      };
    });
  }

  function discardDayDraft(offsetToDiscard: number) {
    delete baselineMatricesRef.current[offsetToDiscard];
    setConflictsByDay((prev) => {
      if (!prev[offsetToDiscard]) return prev;
      const copy = { ...prev };
      delete copy[offsetToDiscard];
      return copy;
    });
    setDraftMatricesByDay((prev) => {
      const copy = { ...prev };
      delete copy[offsetToDiscard];
      return copy;
    });
    setDraftSlotMetaByDay((prev) => {
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
      const targetFixedBounds = fixedShiftBoundsByAssistant[a.id];
      const isTargetShiftCovered =
        targetAbsent.absent &&
        targetFixedBounds &&
        targetAbsent.startSlot !== undefined &&
        targetAbsent.endSlot !== undefined &&
        targetAbsent.startSlot <= targetFixedBounds.startSlot &&
        targetAbsent.endSlot >= targetFixedBounds.endSlot;

      if (targetAbsent.absent && (targetAbsent.isFullDay || isTargetShiftCovered)) {
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

    if (!baselineMatricesRef.current[targetOffset]) {
      baselineMatricesRef.current[targetOffset] = cloneMatrix(getCommittedMatrixForDay(targetOffset));
    }

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
      isTransfer?: boolean;
      transferDestName?: string;
    }[] = [];

    activeAssistants.forEach((a) => {
      // 1. Se for um assistente externo cedido (transferência de entrada),
      // só deve constar neste dia se tiver transferência ativa hoje ou tarefas geradas hoje
      if (a.is_temporary_transfer) {
        const hasTransferToday = temporaryAssignments.some(
          (tr) =>
            String(tr.assistant_id) === String(a.id) &&
            String(tr.destination_school_id) === String(selectedSchoolId) &&
            tr.valid_from <= dayInfo.isoDate &&
            (!tr.valid_until || tr.valid_until >= dayInfo.isoDate)
        );
        const hasEntriesToday = (schedulesList || []).some(
          (sc) =>
            String(sc.assistant_id) === String(a.id) &&
            String(sc.school_id) === String(selectedSchoolId) &&
            (sc.entries || []).some(
              (e) => e.date?.slice(0, 10) === dayInfo.isoDate
            )
        );

        if (!hasTransferToday && !hasEntriesToday) {
          return;
        }
      }

      // 2. Se for um assistente desta escola mas tiver transferência de saída hoje para outra escola:
      const outgoingTransfer = temporaryAssignments.find(
        (tr) =>
          String(tr.assistant_id) === String(a.id) &&
          String(tr.origin_school_id) === String(selectedSchoolId) &&
          tr.valid_from <= dayInfo.isoDate &&
          (!tr.valid_until || tr.valid_until >= dayInfo.isoDate)
      );

      if (outgoingTransfer) {
        const destName =
          outgoingTransfer.destination_school?.name || "outra escola";
        const reason = `Transferido(a) temporariamente para ${destName}`;
        const fixedBounds = fixedShiftBoundsByAssistant[a.id];
        const resolvedBounds: AssistantResolvedShiftBounds =
          fixedBounds ||
          getShiftBoundsFromRow(
            baseDayMatrix[a.id] || Array(96).fill("off"),
            viewStartSlot,
            viewEndSlot
          );

        absent.push({
          assistant: {
            ...a,
            destination_school_name: destName,
          },
          reason,
          isTransfer: true,
          transferDestName: destName,
          plannedRow: Array(96).fill("off"),
          shiftBounds: resolvedBounds,
        });
        return;
      }

      // 3. Verificação normal de faltas/ausências
      const absInfo = checkAssistantAbsenceOnDate(
        a,
        dayInfo.isoDate,
        absencesRes?.data || []
      );
      const fixedBounds = fixedShiftBoundsByAssistant[a.id];
      const isShiftCovered =
        absInfo.absent &&
        fixedBounds &&
        absInfo.startSlot !== undefined &&
        absInfo.endSlot !== undefined &&
        absInfo.startSlot <= fixedBounds.startSlot &&
        absInfo.endSlot >= fixedBounds.endSlot;

      if (absInfo.absent && (absInfo.isFullDay || isShiftCovered)) {
        const copiedRow = copiedInfo?.sourcePlannedMatrix?.[a.id];
        const fixedBounds = fixedShiftBoundsByAssistant[a.id];
        const fallbackRow = baseDayMatrix[a.id] || Array(96).fill("off");
        const resolvedBounds: AssistantResolvedShiftBounds =
          fixedBounds ||
          getShiftBoundsFromRow(
            fallbackRow,
            viewStartSlot,
            viewEndSlot
          );

        let plannedRow = copiedRow ?? fallbackRow;
        // Para falta de dia inteiro sem cópia explícita, a linha reflete estritamente o turno do assistente
        if (!copiedRow && absInfo.isFullDay) {
          const row = Array(96).fill("off") as BlockState[];
          const bStart = resolvedBounds.startSlot;
          const bEnd = resolvedBounds.endSlot;
          for (let i = bStart; i < bEnd && i < 96; i++) {
            row[i] = "absent";
          }
          plannedRow = row;
        }

        const srcDateInfo =
          copiedInfo !== undefined
            ? getDateInfo(copiedInfo.sourceOffset)
            : null;

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
    temporaryAssignments,
    selectedSchoolId,
    schedulesList,
  ]);

  const { regularAssistants, transferredAssistants } = useMemo(() => {
    const regular = workingAssistants.filter((a) => !a.is_temporary_transfer);
    const transferred = workingAssistants.filter((a) => a.is_temporary_transfer);
    return { regularAssistants: regular, transferredAssistants: transferred };
  }, [workingAssistants]);

  // Evaluate rules & warnings for any given dayOffset + matrix
  function evaluateDaySchedule(targetOffset: number, mat: ScheduleMatrix) {
    const info = getDateInfo(targetOffset);
    const targetStatus = getStatusForIsoDate(info.isoDate);
    const rules = getRulesForDow(info.dow);
    const workingOnDay = activeAssistants.filter((a) => {
      // 1. Assistente externo cedido temporariamente a esta escola
      if (a.is_temporary_transfer) {
        const hasTransfer = temporaryAssignments.some(
          (tr) =>
            String(tr.assistant_id) === String(a.id) &&
            String(tr.destination_school_id) === String(selectedSchoolId) &&
            tr.valid_from <= info.isoDate &&
            (!tr.valid_until || tr.valid_until >= info.isoDate)
        );
        const hasEntries = (schedulesList || []).some(
          (sc) =>
            String(sc.assistant_id) === String(a.id) &&
            String(sc.school_id) === String(selectedSchoolId) &&
            (sc.entries || []).some((e) => e.date?.slice(0, 10) === info.isoDate)
        );
        if (!hasTransfer && !hasEntries) return false;
      }

      // 2. Assistente desta escola com transferência de saída hoje para outra escola
      const isTransferredOut = temporaryAssignments.some(
        (tr) =>
          String(tr.assistant_id) === String(a.id) &&
          String(tr.origin_school_id) === String(selectedSchoolId) &&
          tr.valid_from <= info.isoDate &&
          (!tr.valid_until || tr.valid_until >= info.isoDate)
      );
      if (isTransferredOut) return false;

      // 3. Ausência de dia completo (ou turno completo coberto pela ausência)
      const absInfo = checkAssistantAbsenceOnDate(
        a,
        info.isoDate,
        absencesRes?.data || []
      );
      const fixedBounds = fixedShiftBoundsByAssistant[a.id];
      const isShiftCovered =
        absInfo.absent &&
        fixedBounds &&
        absInfo.startSlot !== undefined &&
        absInfo.endSlot !== undefined &&
        absInfo.startSlot <= fixedBounds.startSlot &&
        absInfo.endSlot >= fixedBounds.endSlot;

      if (absInfo.absent && (absInfo.isFullDay || isShiftCovered)) {
        return false;
      }

      return true;
    });

    const evaluations = rules.map((rule) => {
      let minAssignedInWindow = Infinity;
      let totalAssignedAnySlot = 0;
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

      if (rule.isFallback) {
        workingOnDay.forEach((a) => {
          const row = mat[a.id] || [];
          if (row.some((st) => st === rule.state)) {
            totalAssignedAnySlot++;
          }
        });
      }

      return {
        ...rule,
        assigned: rule.isFallback ? totalAssignedAnySlot : minAssignedInWindow,
        isMet: rule.isFallback ? true : minAssignedInWindow >= rule.min,
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
      if (!ev.isFallback && !ev.isMet) {
        const rangeStr = `${TIME_SLOTS[ev.startSlot]}–${TIME_SLOTS[ev.endSlot]}`;
        warnings.push({
          id: `rule-${ev.id}`,
          severity: ev.type === "mandatory" ? "critical" : "info",
          title:
            ev.type === "mandatory"
              ? `Regra Obrigatória abaixo do mínimo: ${ev.title}`
              : `Regra Facultativa por preencher: ${ev.title}`,
          detail: `Horário ${rangeStr}: ${ev.assigned}/${ev.min} assistentes com «${ev.title}».`,
        });
      }
    });

    workingOnDay.forEach((a) => {
      const row = mat[a.id] || [];
      const fixedBounds =
        targetOffset === dayOffset
          ? fixedShiftBoundsByAssistant[a.id]
          : resolveAssistantShiftBounds({
              assistantId: a.id,
              isoDate: info.isoDate,
              dow: info.dow,
              viewStartSlot: targetStatus.viewStartSlot,
              viewEndSlot: targetStatus.viewEndSlot,
              profiles: profilesByAssistant[String(a.id)],
              exceptions: exceptionsByAssistant[String(a.id)],
              baseDayRow: baseDayMatrix[a.id],
              schedulesList,
              lunchBlocksForDate: lunchBlocksByDate[info.isoDate],
              absences: absencesRes?.data || [],
            });

      const shiftStartSlot = fixedBounds?.startSlot;
      const shiftEndSlot = fixedBounds?.endSlot;
      const outOfShiftSlots: number[] = [];
      const outOfBoundsSlots: number[] = [];
      let lunchSlotsCount = 0;
      let activeWorkSlots = 0;

      let actualWorkSlots = 0;
      let currentContinuousWork = 0;
      let maxContinuousWork = 0;
      let currentContinuousStart = -1;
      let maxContStart = -1;
      let maxContEnd = -1;
      const lunchRanges: Array<{ start: number; end: number }> = [];
      let currentLunchStart: number | null = null;

      for (let s = 0; s < row.length; s++) {
        const st = row[s];
        if (st === "lunch") {
          lunchSlotsCount++;
          if (currentLunchStart === null) currentLunchStart = s;
        } else if (currentLunchStart !== null) {
          lunchRanges.push({ start: currentLunchStart, end: s });
          currentLunchStart = null;
        }

        const isActualWork = st !== "off" && st !== "absent" && st !== "lunch";
        if (isActualWork) {
          actualWorkSlots++;
          activeWorkSlots++;
          if (currentContinuousWork === 0) {
            currentContinuousStart = s;
          }
          currentContinuousWork++;
          if (currentContinuousWork > maxContinuousWork) {
            maxContinuousWork = currentContinuousWork;
            maxContStart = currentContinuousStart;
            maxContEnd = s + 1;
          }

          if (
            s < targetStatus.viewStartSlot ||
            s >= targetStatus.viewEndSlot
          ) {
            outOfBoundsSlots.push(s);
          }
          if (
            shiftStartSlot !== null &&
            shiftEndSlot !== null &&
            shiftStartSlot !== undefined &&
            shiftEndSlot !== undefined &&
            shiftEndSlot > shiftStartSlot
          ) {
            if (s < shiftStartSlot || s >= shiftEndSlot) {
              outOfShiftSlots.push(s);
            }
          }
        } else {
          currentContinuousWork = 0;
          currentContinuousStart = -1;
        }
      }

      if (currentLunchStart !== null) {
        lunchRanges.push({ start: currentLunchStart, end: row.length });
      }

      if (outOfShiftSlots.length > 0) {
        const firstOut = TIME_SLOTS[outOfShiftSlots[0]];
        const lastOut =
          TIME_SLOTS[
            Math.min(outOfShiftSlots[outOfShiftSlots.length - 1] + 1, 95)
          ];
        const shiftStr =
          shiftStartSlot !== undefined && shiftEndSlot !== undefined
            ? `${TIME_SLOTS[shiftStartSlot]}–${TIME_SLOTS[shiftEndSlot]}`
            : "";
        warnings.push({
          id: `out-of-shift-${a.id}`,
          severity: "critical",
          title: `Atividades fora do horário do assistente: ${a.name}`,
          detail: `Tem ${formatDurationSlots(
            outOfShiftSlots.length
          )} (${firstOut}–${lastOut}) marcados fora do seu turno habitual (${shiftStr}).`,
        });
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

      // Validação Legal (Artigo 213.º do Código do Trabalho):
      // 1. Limite máximo de 5 horas consecutivas de trabalho contínuo sem intervalo de descanso (20 slots = 5h)
      if (maxContinuousWork > 20) {
        const firstCont = TIME_SLOTS[maxContStart] ?? "00:00";
        const lastCont = TIME_SLOTS[Math.min(maxContEnd, 95)] ?? "24:00";
        warnings.push({
          id: `consecutive-work-${a.id}`,
          severity: "warning",
          title: `Mais de 5 horas seguidas sem pausa: ${a.name}`,
          detail: `Trabalha ${formatDurationSlots(
            maxContinuousWork
          )} consecutivas (${firstCont}–${lastCont}) sem intervalo de descanso (limite legal: 5h).`,
        });
      }

      // 2. Obrigatoriedade de pausa de almoço:
      // Apenas se a jornada de trabalho contínua ultrapassar 5h ou totalizar mais de 5h sem ausência no período de refeição
      const absInfoForLunch = checkAssistantAbsenceOnDate(a, info.isoDate, absencesRes?.data || []);
      const assistantLunchStart = fixedBounds?.lunchStartSlot ?? targetStatus.lunchStartSlot;
      const assistantLunchEnd = fixedBounds?.lunchEndSlot ?? targetStatus.lunchEndSlot;
      const absenceCoversLunch =
        absInfoForLunch.absent &&
        absInfoForLunch.startSlot !== undefined &&
        absInfoForLunch.endSlot !== undefined &&
        assistantLunchStart !== null &&
        assistantLunchStart !== undefined &&
        assistantLunchEnd !== null &&
        assistantLunchEnd !== undefined &&
        Math.min(assistantLunchEnd, absInfoForLunch.endSlot) > Math.max(assistantLunchStart, absInfoForLunch.startSlot);

      if (!absenceCoversLunch && actualWorkSlots > 20 && lunchSlotsCount < 2) {
        warnings.push({
          id: `lunch-${a.id}`,
          severity: "warning",
          title: `Pausa de almoço insuficiente: ${a.name}`,
          detail: `Com ${formatDurationSlots(
            actualWorkSlots
          )} de trabalho no dia, tem apenas ${formatDurationSlots(
            lunchSlotsCount
          )} de Pausa de Almoço marcada (mínimo legal: 1h).`,
        });
      }

      // 3. Pausa de almoço fora da janela de funcionamento da escola ou do turno do assistente
      if (
        assistantLunchStart !== null &&
        assistantLunchStart !== undefined &&
        assistantLunchEnd !== null &&
        assistantLunchEnd !== undefined
      ) {
        const typicalStart = Math.max(0, assistantLunchStart - 2);
        const typicalEnd = Math.min(96, assistantLunchEnd + 2);

        lunchRanges.forEach((lr, lIdx) => {
          if (lr.start < typicalStart || lr.end > typicalEnd) {
            const lsStr = TIME_SLOTS[lr.start] ?? "00:00";
            const leStr = TIME_SLOTS[Math.min(lr.end, 95)] ?? "24:00";
            const expectedStr = `${TIME_SLOTS[assistantLunchStart]}–${TIME_SLOTS[assistantLunchEnd]}`;
            warnings.push({
              id: `lunch-odd-${a.id}-${lIdx}`,
              severity: "warning",
              title: `Pausa de almoço em horário atípico: ${a.name}`,
              detail: `Pausa de almoço marcada das ${lsStr} às ${leStr}. O intervalo previsto para refeição é de ${expectedStr}.`,
            });
          }
        });
      }
    });

    // 4. Detetar espaços em branco / horário incompleto para assistentes escalados
    workingOnDay.forEach((a) => {
      const row = mat[a.id] || [];
      const fixedBounds = fixedShiftBoundsByAssistant[a.id];
      const bounds = getShiftBoundsFromRow(
        row,
        targetStatus.viewStartSlot,
        targetStatus.viewEndSlot
      );

      const rawStartSlot = fixedBounds?.startSlot ?? bounds.startSlot;
      const rawEndSlot = fixedBounds?.endSlot ?? bounds.endSlot;

      if (rawStartSlot !== null && rawEndSlot !== null && rawEndSlot > rawStartSlot) {
        const startSlot = Math.max(rawStartSlot, targetStatus.viewStartSlot);
        const endSlot = Math.min(rawEndSlot, targetStatus.viewEndSlot);

        if (endSlot > startSlot) {
          const gapSlots: number[] = [];
          for (let s = startSlot; s < endSlot; s++) {
          if (row[s] === "off") {
            gapSlots.push(s);
          }
        }

        if (gapSlots.length > 0) {
          warnings.push({
            id: `unfilled-slots-${a.id}`,
            severity: "warning",
            title: `Espaços por preencher: ${a.name}`,
            detail: `Tem ${formatDurationSlots(gapSlots.length)} sem tarefas atribuídas no turno (${TIME_SLOTS[startSlot]}–${TIME_SLOTS[endSlot]}).`,
          });
        }
      }
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

  const selectedRuleEval = useMemo(
    () => ruleEvaluations.find((r) => r.id === highlightedRuleId) ?? null,
    [ruleEvaluations, highlightedRuleId]
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

        // Contabilizar alterações de bloqueio (isLocked) no rascunho
        const draftDayMeta = draftSlotMetaByDay[offset];
        const baseDayMeta = slotMetaByAssistant;
        let lockChangesCount = 0;
        if (draftDayMeta) {
          activeAssistants.forEach((a) => {
            const aMeta = draftDayMeta[a.id];
            if (aMeta) {
              Object.keys(aMeta).forEach((slotStr) => {
                const s = Number(slotStr);
                const draftIsLocked = Boolean(aMeta[s]?.isLocked);
                const baseIsLocked = Boolean(baseDayMeta[a.id]?.[s]?.isLocked);
                if (draftIsLocked !== baseIsLocked) {
                  lockChangesCount++;
                }
              });
            }
          });
        }

        const evalResult = evaluateDaySchedule(offset, draft);
        const copiedMeta = copiedFromByDay[offset];
        const copiedFromInfo = copiedMeta
          ? getDateInfo(copiedMeta.sourceOffset)
          : null;

        return {
          offset,
          info: getDateInfo(offset),
          changedAssistantsCount: changedAssistantsCount || (lockChangesCount > 0 ? 1 : 0),
          changedSlotsCount: changedSlotsCount + lockChangesCount,
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

  const hasAnyIncompleteWarnings = useMemo(
    () =>
      modifiedDaysSummary.some((item) =>
        item.warnings.some((w) => w.id.startsWith("unfilled-slots-"))
      ),
    [modifiedDaysSummary]
  );

  useEffect(() => {
    if (!editMode || modifiedDaysSummary.length === 0) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editMode, modifiedDaysSummary.length]);

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

  async function handleConfirmSaveAllEdits() {
    const offsets = Object.keys(draftMatricesByDay).map(Number);
    if (offsets.length === 0) return;

    const daysToSave: SaveScheduleDayPayload[] = offsets.map((offset) => {
      const date = getIsoDateFromOffset(offset);
      const matrix = draftMatricesByDay[offset];
      const entries: SaveScheduleDayEntryPayload[] = [];

      activeAssistants.forEach((a) => {
        const slots = matrix[a.id] || [];
        const draftDayMeta = draftSlotMetaByDay[offset];
        const meta = {
          ...(slotMetaByAssistant[a.id] || {}),
          ...(draftDayMeta?.[a.id] || {}),
        };
        const blocks = slotsToBlocks(slots, meta).filter(
          (b) => b.state !== "off" && b.state !== "lunch" && b.state !== "absent"
        );

        blocks.forEach((b) => {
          const actName = b.activityName || BLOCK_STYLES[b.state]?.label || "Atividade";
          const matchedAct = activityTypes.find(
            (at) => at.name.toLowerCase() === actName.toLowerCase()
          );

          entries.push({
            assistant_id: String(a.id),
            activity_type_id: b.meta?.activityTypeId || matchedAct?.id || null,
            activity_name: actName,
            schedule_rule_id: b.meta?.ruleId || null,
            start_time: TIME_SLOTS[b.start],
            end_time: TIME_SLOTS[Math.min(b.start + b.count, 95)] || "24:00",
            is_locked: Boolean(b.isLocked),
          });
        });
      });

      return { date, entries };
    });

    try {
      await saveDaysMutation.mutateAsync({ days: daysToSave });

      setSavedMatricesByDay((prev) => ({
        ...prev,
        ...draftMatricesByDay,
      }));
      setDraftMatricesByDay({});
      setDraftSlotMetaByDay({});
      setConflictsByDay({});
      baselineMatricesRef.current = {};
      setShowFinishModal(false);
      setEditMode(false);
      setIsPainting(false);
      setPaintAid(null);

      if (hasAnyIncompleteWarnings) {
        notify.warning(
          `Escala guardada como rascunho para ${daysToSave.length} ${
            daysToSave.length === 1 ? "dia" : "dias"
          }. Atenção: ainda existem períodos por preencher que devem ser concluídos antes de publicar.`,
          "Rascunho Guardado"
        );
      } else {
        notify.success(
          `Alterações guardadas como Rascunho para ${daysToSave.length} ${
            daysToSave.length === 1 ? "dia" : "dias"
          }. Lembre-se de publicar a escala novamente para que entre em vigor.`,
          "Rascunho Guardado"
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Ocorreu um erro ao guardar as escalas.";
      notify.error(msg, "Erro ao Gravar");
    }
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

  const printableWorkingAssistants: PrintableAssistantSchedule[] = useMemo(() => {
    return workingAssistants.map((assistant) => {
      const rowSlots = effectiveMatrix[assistant.id] || [];
      const shiftBounds: AssistantResolvedShiftBounds =
        fixedShiftBoundsByAssistant[assistant.id] ||
        getShiftBoundsFromRow(
          rowSlots,
          viewStartSlot,
          viewEndSlot
        );
      const blocks = slotsToBlocks(rowSlots, effectiveSlotMetaByAssistant[assistant.id]);
      return {
        assistant,
        shiftBounds,
        blocks,
      };
    });
  }, [workingAssistants, fixedShiftBoundsByAssistant, effectiveMatrix, effectiveSlotMetaByAssistant, viewStartSlot, viewEndSlot]);

  const printableAbsentAssistants: PrintableAbsentAssistant[] = useMemo(() => {
    return absentAssistants.map((item) => ({
      assistant: item.assistant,
      reason: item.reason,
      isTransfer: item.isTransfer,
      transferDestName: item.transferDestName,
      shiftBounds: item.shiftBounds,
    }));
  }, [absentAssistants]);

  async function handleExportDayCsv() {
    try {
      await schedulesService.downloadExport({
        start_date: dayInfo.isoDate,
        end_date: dayInfo.isoDate,
        format: "csv",
        model: "wall",
      });
      notify.success(
        "Ficheiro CSV da escala diária descarregado com sucesso.",
        "Escala Exportada"
      );
    } catch (err: any) {
      const backendMsg = err?.backendMessage || err?.response?.data?.message;
      if (backendMsg) {
        notify.warning(backendMsg, "Escala Não Publicada");
        return;
      }
      notify.error(
        "Não foi possível exportar o ficheiro CSV.",
        "Erro na Exportação"
      );
    }
  }

  function renderWorkingAssistantRow(assistant: (typeof activeAssistants)[0]) {

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
                  const blocks = slotsToBlocks(rowSlots, effectiveSlotMetaByAssistant[assistant.id]);

                  const hasOutOfBoundsPaint = rowSlots.some(
                    (st, sIdx) =>
                      st !== "off" &&
                      st !== "absent" &&
                      (sIdx < viewStartSlot || sIdx >= viewEndSlot)
                  );

                  const hasOutOfShiftPaint = rowSlots.some(
                    (st, sIdx) =>
                      st !== "off" &&
                      st !== "absent" &&
                      (sIdx < shiftBounds.startSlot || sIdx >= shiftBounds.endSlot)
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
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            assistant.is_temporary_transfer
                              ? "bg-blue-500/15 group-hover/name:bg-blue-500/25 text-blue-700 dark:text-blue-300"
                              : "bg-primary/10 group-hover/name:bg-primary/20 text-primary"
                          }`}
                        >
                          <span className="text-[10px] font-bold font-mono">
                            {assistant.initials}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <p className="text-xs font-medium text-foreground group-hover/name:text-primary truncate transition-colors">
                              {assistant.name.split(" ")[0]}{" "}
                              {assistant.name.split(" ").slice(-1)[0]?.[0]
                                ? `${
                                    assistant.name.split(" ").slice(-1)[0][0]
                                  }.`
                                : ""}
                            </p>
                            {assistant.is_temporary_transfer && (
                              <ActionTooltip
                                content={`Transferência temporária de ${
                                  assistant.origin_school_name || "outra escola"
                                }`}
                              >
                                <span className="inline-flex items-center text-blue-600 dark:text-blue-400 shrink-0">
                                  <ArrowDownLeft size={11} />
                                </span>
                              </ActionTooltip>
                            )}
                            {hasOutOfShiftPaint && (
                              <ActionTooltip content={`Tem atividades marcadas fora do horário contratual do assistente (${shiftRangeStr})`}>
                                <span className="inline-flex items-center">
                                  <AlertTriangle
                                    size={11}
                                    className="text-destructive flex-shrink-0"
                                  />
                                </span>
                              </ActionTooltip>
                            )}
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
                            {assistant.is_temporary_transfer && assistant.origin_school_name
                              ? ` · De: ${assistant.origin_school_name}`
                              : assistant.exception
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
                          !highlightedRule.isFallback &&
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

                          const isBlockOutsideAssistantShift =
                            b.state !== "absent" &&
                            (b.start < shiftBounds.startSlot ||
                              b.start + b.count > shiftBounds.endSlot);

                          const isBlockOutOfSchoolHours =
                            b.start < viewStartSlot ||
                            b.start + b.count > viewEndSlot;

                          const isHoveredByLockTool =
                            activeTool === "lock" &&
                            hoveredLockTarget !== null &&
                            hoveredLockTarget.aid === assistant.id &&
                            hoveredLockTarget.slot >= b.start &&
                            hoveredLockTarget.slot < b.start + b.count;

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
                                (b.activityColor === "#EF4444" && (b.activityName?.toLowerCase().includes("vigilância almoço") || b.activityName?.toLowerCase().includes("vigilancia almoco")) ? "#A855F7" : b.activityColor) ? "" : styleConfig.bg
                              } ${spotlightClass} ${
                                isHoveredByLockTool
                                  ? "ring-2 ring-amber-400 ring-offset-1 shadow-lg brightness-110 z-30"
                                  : isBlockOutsideAssistantShift && canEditCurrentDay
                                  ? "ring-2 ring-destructive ring-offset-1 z-10"
                                  : isBlockOutOfSchoolHours && canEditCurrentDay
                                  ? "ring-2 ring-[#D97706]"
                                  : isLocked && canEditCurrentDay
                                  ? "ring-2 ring-amber-400 ring-offset-1"
                                  : ""
                              } text-white shadow-2xs overflow-hidden transition-all flex items-center px-2 gap-1.5 text-left`}
                              style={{
                                left: `calc(${leftPct}% + ${padLeftPx}px)`,
                                width: `calc(${widthPct}% - ${
                                  padLeftPx + padRightPx
                                }px)`,
                                ...(b.activityColor
                                  ? { backgroundColor: (b.activityColor === "#EF4444" && (b.activityName?.toLowerCase().includes("vigilância almoço") || b.activityName?.toLowerCase().includes("vigilancia almoco")) ? "#A855F7" : b.activityColor) }
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
                                      size={12}
                                      className={`${
                                        showDurationChip ? "" : "ml-auto"
                                      } flex-shrink-0 text-amber-200 fill-amber-300/40`}
                                    />
                                  )}
                                </>
                              )}

                              {!showLabel && isLocked && (
                                <div className="w-full flex items-center justify-center">
                                  <Lock size={12} className="text-amber-200 fill-amber-300/40" />
                                </div>
                              )}

                              {/* Overlay de destaque do bloco completo no modo Bloquear Tarefa */}
                              {isHoveredByLockTool && (
                                <div className="absolute inset-0 bg-amber-500/35 backdrop-blur-[0.5px] border-2 border-amber-400 rounded-[inherit] flex items-center justify-center gap-1.5 text-amber-100 font-bold text-xs pointer-events-none z-30 animate-in fade-in-50">
                                  <Lock size={12} className="text-amber-200 fill-amber-300/40 animate-pulse" />
                                  <span className="drop-shadow-sm truncate">
                                    {isLocked ? "Desbloquear Tarefa" : "Bloquear Tarefa"}
                                  </span>
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
                                        (b.activityColor === "#EF4444" && (b.activityName?.toLowerCase().includes("vigilância almoço") || b.activityName?.toLowerCase().includes("vigilancia almoco")) ? "#A855F7" : b.activityColor) ? "" : styleConfig.bg
                                      }`}
                                      style={
                                        b.activityColor
                                          ? { backgroundColor: (b.activityColor === "#EF4444" && (b.activityName?.toLowerCase().includes("vigilância almoço") || b.activityName?.toLowerCase().includes("vigilancia almoco")) ? "#A855F7" : b.activityColor) }
                                          : undefined
                                      }
                                    />
                                    <span className="font-semibold text-xs text-foreground">
                                      {displayLabel}
                                    </span>
                                  </div>
                                  {isLocked && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      <Lock size={12} />
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
                                      className={`flex-none h-full ${activeTool === "lock" ? "cursor-pointer" : "cursor-crosshair"} group/slot flex items-center justify-center px-[1px]`}
                                      style={{
                                        width: `${(1 / viewSlotsCount) * 100}%`,
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (activeTool === "lock") {
                                          toggleBlockLockAtSlot(assistant.id, slot);
                                          return;
                                        }
                                        setIsPainting(true);
                                        setPaintAid(assistant.id);
                                        paintSlot(assistant.id, slot);
                                      }}
                                      onMouseEnter={() => {
                                        if (activeTool === "lock") {
                                          setHoveredLockTarget({ aid: assistant.id, slot });
                                          return;
                                        }
                                        if (
                                          isPainting &&
                                          paintAid === assistant.id
                                        ) {
                                          paintSlot(assistant.id, slot);
                                        }
                                      }}
                                      onMouseLeave={() => {
                                        if (activeTool === "lock") {
                                          setHoveredLockTarget((prev) =>
                                            prev?.aid === assistant.id && prev?.slot === slot ? null : prev
                                          );
                                        }
                                      }}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        toggleBlockLockAtSlot(assistant.id, slot);
                                      }}
                                    >
                                      {/* Hover brush preview pill (apenas no modo pintura/borracha; no modo lock o bloco inteiro ilumina-se) */}
                                      {activeTool !== "lock" && (
                                        <div
                                          className={`w-full h-8 rounded-sm opacity-0 group-hover/slot:opacity-45 transition-opacity ${
                                            paintType === "off"
                                              ? "bg-destructive/50 border border-destructive"
                                              : BLOCK_STYLES[paintType].bg
                                          }`}
                                        />
                                      )}
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
  }

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

          <div className="flex items-center gap-2 flex-wrap">
            {/* GRUPO 1: FERRAMENTAS DE HORÁRIO, IMPRESSÃO E EXPORTAÇÃO */}
            {!isDayLoading &&
              !editMode &&
              schoolStatus.isOpen &&
              (hasScheduleForCurrentDay || canEditCurrentDay) && (
                <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-2xs">
                  {/* Botão Copiar Horário */}
                  <ActionTooltip
                    content={
                      isPastDay
                        ? "Copiar a escala deste dia para um dia futuro"
                        : "Copiar horário entre dias"
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openCopyScheduleModal(
                          isPastDay ? "to_future" : "from_other"
                        )
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>
                        {isPastDay ? "Copiar para Futuro" : "Copiar Horário"}
                      </span>
                    </button>
                  </ActionTooltip>

                  <div className="h-4 w-[1px] bg-border mx-0.5" />

                  {/* Botão Imprimir / Exportar */}
                  <button
                    type="button"
                    onClick={() =>
                      setPrintModalState({
                        open: true,
                        initialDocModel: "wall",
                      })
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  >
                    <Printer size={12} />
                    <span>Imprimir / Exportar</span>
                  </button>
                </div>
              )}

            {/* GRUPO 2: PUBLICAÇÃO (Button Group com Dropdown) */}
            {!isDayLoading && !editMode && schoolStatus.isOpen && (
              <>
                {publishStatus.isDraft ? (
                  // Caso A: Dia atual está em rascunho -> Split Button
                  <div className="inline-flex rounded-lg shadow-xs overflow-hidden border border-primary bg-primary text-primary-foreground">
                    <ActionTooltip content="Publicar a escala deste dia para ficar visível aos assistentes">
                      <button
                        type="button"
                        onClick={() =>
                          setPublishModalState({
                            open: true,
                            preselectedDate: dayInfo.isoDate,
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold hover:brightness-110 transition-all cursor-pointer"
                      >
                        <Send size={11} />
                        Publicar Dia
                      </button>
                    </ActionTooltip>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="px-1.5 py-1.5 border-l border-primary-foreground/20 hover:brightness-110 transition-all cursor-pointer flex items-center justify-center"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 p-1.5">
                        <DropdownMenuItem
                          onClick={() =>
                            setPublishModalState({
                              open: true,
                              preselectedDate: dayInfo.isoDate,
                            })
                          }
                          className="flex items-center gap-2.5 text-xs py-2 px-2.5 cursor-pointer rounded-lg"
                        >
                          <Send size={13} className="shrink-0 text-muted-foreground group-focus/dropdown-item:text-foreground group-hover/dropdown-item:text-foreground transition-colors" />
                          <div>
                            <div className="font-semibold text-foreground">Publicar Este Dia</div>
                            <div className="text-[10px] text-muted-foreground">{dayInfo.dayShort}, {dayInfo.dateStr}</div>
                          </div>
                        </DropdownMenuItem>
                        {allDraftDays.length > 0 && (
                          <DropdownMenuItem
                            onClick={() =>
                              setPublishModalState({
                                open: true,
                                preselectedDate: undefined,
                              })
                            }
                            className="flex items-center gap-2.5 text-xs py-2 px-2.5 cursor-pointer rounded-lg"
                          >
                            <Calendar size={13} className="shrink-0 text-muted-foreground group-focus/dropdown-item:text-foreground group-hover/dropdown-item:text-foreground transition-colors" />
                            <div>
                              <div className="font-semibold text-foreground">Publicar Vários Dias em Rascunho...</div>
                              <div className="text-[10px] text-muted-foreground">{allDraftDays.length} {allDraftDays.length === 1 ? "dia pendente" : "dias pendentes"}</div>
                            </div>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : allDraftDays.length > 0 ? (
                  // Caso B: Dia atual já publicado ou sem escala, mas há outros dias em rascunho
                  <ActionTooltip content="Abrir modal para selecionar e publicar vários dias em rascunho">
                    <button
                      type="button"
                      onClick={() =>
                        setPublishModalState({
                          open: true,
                          preselectedDate: undefined,
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card text-foreground hover:bg-muted hover:border-primary/40 transition-colors cursor-pointer"
                    >
                      <Send size={11} />
                      Publicar Escalas ({allDraftDays.length})
                    </button>
                  </ActionTooltip>
                ) : null}
              </>
            )}

            {/* GRUPO 3: MODO DE EDIÇÃO */}
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

            {editMode && (
              <ActionTooltip
                content={
                  modifiedDaysSummary.length > 0
                    ? "Sair do modo de edição (pede confirmação para descartar alterações)"
                    : "Sair do modo de edição"
                }
              >
                <button
                  type="button"
                  onClick={handleRequestCancelEditMode}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <X size={11} />
                  Cancelar
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
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  <Edit2 size={11} />
                  {editMode
                    ? modifiedDaysSummary.length > 0
                      ? `Sair da Edição (${modifiedDaysSummary.length} ${
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
            {/* Conflict Detection Banner */}
            {conflictsByDay[dayOffset] && (
              <div className="px-4 py-3 bg-[#FEF3C7] dark:bg-amber-950/40 border-b border-amber-500/40 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Conflito de Sincronização Detetado
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      Foram detetadas alterações no servidor que colidem com as suas edições em curso
                      {conflictsByDay[dayOffset].assistantNames.length > 0 &&
                        ` (${conflictsByDay[dayOffset].assistantNames.join(", ")})`}
                      .
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => resolveConflictKeepDraft(dayOffset)}
                    className="px-2.5 py-1.5 rounded-md border border-amber-500/40 bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
                  >
                    Manter Rascunho
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveConflictUseServer(dayOffset)}
                    className="px-2.5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Atualizar com Dados do Servidor
                  </button>
                </div>
              </div>
            )}

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

            {/* EDIT MODE WORKSPACE: Painel de Regras do Dia + Toolbar colada ao Mapa */}
            {canEditCurrentDay && (
              <div className="border-b border-border bg-muted/15 divide-y divide-border/60">
                {/* 1. Day Rules & Live Engine Feedback Panel */}
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

                        const timeRangeStr = rule.isFallback
                          ? null
                          : `${TIME_SLOTS[rule.startSlot]}–${TIME_SLOTS[rule.endSlot]}`;

                        return (
                          <button
                            key={rule.id}
                            type="button"
                            onClick={() => {
                              setActiveTool("paint");
                              setPaintType(rule.state);
                              setHighlightedRuleId(
                                isRuleSelected ? null : rule.id
                              );
                            }}
                            className={`px-3 py-2 rounded-xl border text-left transition-all flex flex-col justify-center gap-1 ${
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
                            {/* Linha 1: Nome da regra + Horário à frente + Tipo + Contador */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                    BLOCK_STYLES[rule.state].bg
                                  }`}
                                />
                                <span className="text-xs font-semibold text-foreground truncate">
                                  {rule.title}
                                </span>
                                {timeRangeStr && (
                                  <span className="text-[11px] font-mono font-medium text-muted-foreground/80 flex-shrink-0">
                                    {timeRangeStr}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span
                                  className={`uppercase tracking-wider font-semibold text-[9px] ${
                                    rule.isFallback
                                      ? "text-muted-foreground"
                                      : rule.type === "mandatory"
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {rule.isFallback
                                    ? "Fallback"
                                    : rule.type === "mandatory"
                                    ? "Obrigatória"
                                    : "Facultativa"}
                                </span>

                                {rule.isFallback ? (
                                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                                    {rule.assigned}
                                  </span>
                                ) : (
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
                                )}
                              </div>
                            </div>

                            {/* Linha 2: Fila / Preenchimento */}
                            <p className="text-[10px] text-muted-foreground truncate">
                              {rule.isFallback
                                ? "Atividade padrão de preenchimento flexível"
                                : `Fila: ${rule.priorityNames.join(" · ")}`}
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
              

                {/* 2. TOOLBAR COLADA AO MAPA: Ferramentas + Destacar Atividade */}
                <div className="px-4 py-2 border-t border-border bg-card/75 backdrop-blur-xs flex items-center justify-between gap-3 flex-wrap">
                  {/* Lado Esquerdo: Ações, Bloqueio, Limpeza e Destacar */}
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    {/* Indicador de Pintura da Regra Selecionada */}
                    {activeTool === "lunch" ? (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-xs font-semibold text-orange-600 dark:text-orange-400 shadow-2xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                        <span>Pintar: Pausa de Almoço</span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTool("paint");
                            setPaintType("work");
                          }}
                          className="ml-1 text-orange-600/70 hover:text-orange-600 cursor-pointer p-0.5 rounded hover:bg-orange-500/20"
                          title="Desmarcar pausa de almoço"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : selectedRuleEval ? (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-xs font-semibold text-primary shadow-2xs">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            BLOCK_STYLES[selectedRuleEval.state]?.bg || "bg-primary"
                          }`}
                        />
                        <span className="truncate max-w-[200px] sm:max-w-[280px]">
                          Pintar: {selectedRuleEval.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setHighlightedRuleId(null);
                            setPaintType("work");
                          }}
                          className="ml-1 text-primary/70 hover:text-primary cursor-pointer p-0.5 rounded hover:bg-primary/20"
                          title="Desmarcar regra"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground select-none">
                        <span className="w-2 h-2 rounded-full bg-primary/50" />
                        <span>Clica numa regra acima para pintar</span>
                      </div>
                    )}

                    {/* Separador vertical */}
                    <div className="h-5 w-[1px] bg-border hidden sm:block" />

                    {/* Botão Pausa de Almoço */}
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTool === "lunch") {
                          setActiveTool("paint");
                          setPaintType("work");
                        } else {
                          setActiveTool("lunch");
                          setPaintType("lunch");
                          setHighlightedRuleId(null);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTool === "lunch"
                          ? "bg-orange-500 text-white font-semibold shadow-xs ring-2 ring-orange-500/40"
                          : "border border-border bg-background text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500/40 hover:bg-orange-500/10"
                      }`}
                      title="Pintar intervalo de pausa de almoço na grelha"
                    >
                      <Utensils size={12} />
                      <span>Pausa de Almoço</span>
                    </button>

                    {/* Botão Bloquear Tarefa */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool(activeTool === "lock" ? "paint" : "lock");
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTool === "lock"
                          ? "bg-amber-600 text-white font-semibold shadow-xs ring-2 ring-amber-500/40"
                          : "border border-border bg-background text-muted-foreground hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/10"
                      }`}
                      title="Clica numa tarefa no mapa para a fixar com cadeado"
                    >
                      <Lock size={12} />
                      <span>Bloquear Tarefa</span>
                    </button>

                    {/* Botão Limpar Bloco */}
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTool === "eraser") {
                          setActiveTool("paint");
                          setPaintType("work");
                        } else {
                          setActiveTool("eraser");
                          setPaintType("off");
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activeTool === "eraser"
                          ? "bg-foreground text-background font-semibold shadow-xs"
                          : "border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      title="Apagar tarefas na grelha"
                    >
                      <Eraser size={12} />
                      <span>Limpar Bloco</span>
                    </button>

                    {/* Botão Destacar Atividade (imediatamente à beira das ferramentas) */}
                    <button
                      type="button"
                      onClick={() => setFocusActiveActivity(!focusActiveActivity)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        focusActiveActivity
                          ? "bg-primary/10 border-primary/40 text-primary font-semibold shadow-2xs"
                          : "border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      title="Realça a atividade selecionada e esbate as outras no mapa"
                    >
                      <Sparkles
                        size={12}
                        className={
                          focusActiveActivity ? "text-primary" : "text-muted-foreground"
                        }
                      />
                      <span>Destacar Atividade</span>
                      <span
                        className={`ml-0.5 text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                          focusActiveActivity
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {focusActiveActivity ? "ON" : "OFF"}
                      </span>
                    </button>
                  </div>

                  {/* Dica Contextual à Direita */}
                  {activeTool === "lunch" && (
                    <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 font-medium animate-in fade-in-50">
                      <Utensils size={12} className="shrink-0" />
                      <span>Arrasta ou clica na grelha para pintar a Pausa de Almoço</span>
                    </div>
                  )}
                  {activeTool === "lock" && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium animate-in fade-in-50">
                      <Lock size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Passa o rato e clica numa tarefa para a trancar</span>
                    </div>
                  )}
                  {activeTool === "eraser" && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive font-medium animate-in fade-in-50">
                      <Eraser size={12} className="shrink-0" />
                      <span>Arrasta o rato na grelha para apagar tarefas</span>
                    </div>
                  )}
                </div>
              </div>
            )}            <div className="overflow-x-auto">
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

                {/* 1. REGULAR RESIDENT ASSISTANTS */}
                {regularAssistants.map(renderWorkingAssistantRow)}

                {/* 2. TRANSFERRED-IN ASSISTANTS SECTION */}
                {transferredAssistants.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 bg-blue-500/10 border-b border-blue-500/25 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <ArrowDownLeft size={12} className="text-blue-600 dark:text-blue-400" />
                        Assistentes Recebidos por Transferência Temporária ({transferredAssistants.length})
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Reforço inter-escolar · Alocados temporariamente a esta escola
                      </span>
                    </div>
                    {transferredAssistants.map(renderWorkingAssistantRow)}
                  </>
                )}

                {/* 3. ABSENT ASSISTANTS SECTION */}
                {absentAssistants.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 bg-muted/30 border-b border-border/60 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <UserX size={11} className="text-destructive" />
                        Assistentes Ausentes / Cedidos Hoje ({absentAssistants.length}) — Horário Previsto
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Linhas desativadas (disabled) · Faltas e transferências inter-escolares
                      </span>
                    </div>

                    {absentAssistants.map(
                      ({
                        assistant,
                        reason,
                        plannedRow,
                        shiftBounds,
                        copiedFromLabel,
                        isTransfer,
                        transferDestName,
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
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isTransfer ? "bg-blue-500/15" : "bg-destructive/15"}`}>
                                <span className={`text-[10px] font-bold font-mono ${isTransfer ? "text-blue-700 dark:text-blue-300" : "text-destructive"}`}>
                                  {assistant.initials}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <p className={`text-xs font-medium truncate ${isTransfer ? "text-foreground" : "text-muted-foreground line-through"}`}>
                                    {assistant.name.split(" ")[0]}{" "}
                                    {assistant.name.split(" ").slice(-1)[0]?.[0]
                                      ? `${
                                          assistant.name
                                            .split(" ")
                                            .slice(-1)[0][0]
                                        }.`
                                      : ""}
                                  </p>
                                  {isTransfer ? (
                                    <span className="text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                      Transferência
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-semibold uppercase px-1 py-0.2 rounded bg-destructive/15 text-destructive">
                                      Falta
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[9px] font-mono truncate ${isTransfer ? "text-blue-700 dark:text-blue-300" : "text-destructive/80"}`}>
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
                                isTransfer ? (
                                  <div
                                    className="absolute inset-y-1 bg-blue-500/10 border border-dashed border-blue-500/40 rounded-lg flex items-center justify-center px-3 pointer-events-none"
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
                                  >
                                    <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 truncate">
                                      Cedência temporária para {transferDestName || "outra escola"}
                                    </span>
                                  </div>
                                ) : (
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
                                )
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

            
            {/* Legenda das Atividades (modo de visualização) */}
            {!editMode && schoolStatus.isOpen && hasScheduleForCurrentDay && (
              <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between flex-wrap gap-4 text-xs animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <Info size={14} className="text-primary" />
                  <span>Legenda de Atividades:</span>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-xs">
                  {dayLegendItems.map((item) => (
                    <div key={item.key} className="flex items-center gap-1.5">
                      <div
                        className="w-3.5 h-3.5 rounded-sm shadow-2xs flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-foreground/90 font-medium">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
        <DialogContent className="w-full max-w-lg p-0 overflow-visible rounded-xl border border-border bg-card shadow-2xl">
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

          <DialogFooter className="px-6 py-4 border-t border-border bg-card flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCopyModal(false)}
              className="cursor-pointer text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!copyPickerIsoDate || !copyPickerStatus?.isOpen}
              onClick={handleConfirmCopySchedule}
              className="cursor-pointer text-xs"
            >
              {copyDirection === "to_future"
                ? "Copiar para Dia Selecionado"
                : "Copiar para Este Dia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL 2: VALIDAÇÃO E CONFIRMAÇÃO AO CONCLUIR EDIÇÃO                   */}
      {/* ===================================================================== */}
      <Dialog open={showFinishModal} onOpenChange={setShowFinishModal}>
        <DialogContent className="w-full max-w-2xl p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/10">
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary" />
              Confirmar e Guardar Alterações de Escala
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Revê os dias que vão ser alterados antes de guardar para garantir
              que não modificaste outro dia sem querer.
            </p>
          </DialogHeader>

          <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
            {/* Aviso Obrigatório: Escala Ficará em Rascunho e Terá de ser Novamente Publicada */}
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle
                size={16}
                className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
              />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  Aviso: O horário ficará como Rascunho (Draft)
                </p>
                <p className="leading-relaxed opacity-90">
                  Ao confirmar e guardar as alterações efetuadas, a escala dos dias modificados passará para o estado de <strong>Rascunho</strong> e deixará de estar em vigor. Terá de ser <strong>novamente publicada</strong> para que as novas alterações fiquem visíveis para as equipas.
                </p>
              </div>
            </div>

            {hasAnyIncompleteWarnings && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">
                    Horário com períodos por preencher
                  </p>
                  <p className="leading-relaxed opacity-90">
                    Existem assistentes com espaços em branco sem atividades atribuídas no turno. Como este horário é gravado em modo <strong>Rascunho</strong>, podes guardar agora e continuar a preencher mais tarde.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <em>Nota: A publicação só será permitida quando todos os turnos estiverem completos.</em>
                  </p>
                </div>
              </div>
            )}

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
                        className="text-[11px] text-destructive hover:underline cursor-pointer"
                      >
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

          <DialogFooter className="px-6 py-4 border-t border-border bg-card flex items-center justify-between gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraftMatricesByDay({});
                setDraftSlotMetaByDay({});
                setCopiedFromByDay({});
                setConflictsByDay({});
                baselineMatricesRef.current = {};
                setShowFinishModal(false);
                setEditMode(false);
              }}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive whitespace-nowrap cursor-pointer text-xs"
            >
              Descartar Tudo e Sair
            </Button>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFinishModal(false)}
                className="whitespace-nowrap cursor-pointer text-xs"
              >
                Continuar a Editar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmSaveAllEdits}
                disabled={modifiedDaysSummary.length === 0 || saveDaysMutation.isPending}
                className="whitespace-nowrap cursor-pointer text-xs"
              >
                {saveDaysMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin mr-1.5" />
                    A gravar...
                  </>
                ) : hasAnyIncompleteWarnings ? (
                  `Guardar Rascunho Mesmo Assim (${modifiedDaysSummary.length})`
                ) : (
                  `Guardar Rascunho e Sair (${modifiedDaysSummary.length})`
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação para Descartar Alterações ao Cancelar Edição */}
      <Dialog
        open={showDiscardConfirmModal}
        onOpenChange={setShowDiscardConfirmModal}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-5 py-4 border-b border-border bg-destructive/5">
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive" />
              Descartar alterações da escala?
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Fizeste alterações manuais em {modifiedDaysSummary.length}{" "}
              {modifiedDaysSummary.length === 1 ? "dia" : "dias"}. Se saíres sem
              concluir a edição, todas as alterações pendentes serão perdidas.
            </p>
          </DialogHeader>
          <DialogFooter className="px-6 py-4 border-t border-border bg-card flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDiscardConfirmModal(false)}
              className="cursor-pointer text-xs"
            >
              Continuar a Editar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setDraftMatricesByDay({});
                setDraftSlotMetaByDay({});
                setCopiedFromByDay({});
                setConflictsByDay({});
                baselineMatricesRef.current = {};
                setShowDiscardConfirmModal(false);
                setEditMode(false);
                setIsPainting(false);
                setPaintAid(null);
                notify.info("Alterações descartadas.", "Edição Cancelada");
              }}
              className="cursor-pointer text-xs"
            >
              Descartar e Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Publicação de Escalas (Rascunho -> Publicada) */}
      <PrintScheduleModal
        open={printModalState.open}
        onClose={() => setPrintModalState((prev) => ({ ...prev, open: false }))}
        initialDocModel={printModalState.initialDocModel}
        schoolName={selectedSchool?.name || "Escola"}
        agrupamentoName={agrupamento?.name || "Agrupamento de Escolas"}
        dateInfo={{
          dateStr: dayInfo.dateStr,
          dayName: dayInfo.dayName,
          isoDate: dayInfo.isoDate,
        }}
        operatingWindowStr={operatingWindowStr}
        workingAssistants={printableWorkingAssistants}
        absentAssistants={printableAbsentAssistants}
        activeAssistants={activeAssistants}
        schedulesList={schedulesList}
        absences={absencesRes?.data || []}
        operatingSources={operatingSources}
        profilesByAssistant={profilesByAssistant}
        exceptionsByAssistant={exceptionsByAssistant}
        lunchBlocksByDate={lunchBlocksByDate}
      />

      <PublishSchedulesModal
        open={publishModalState.open}
        onClose={() => setPublishModalState({ open: false })}
        schedules={schedulesList}
        assistants={activeAssistants}
        absences={absencesRes?.data || []}
        temporaryAssignments={temporaryAssignments}
        selectedSchoolId={selectedSchoolId}
        initialSelectedDate={publishModalState.preselectedDate}
        profilesByAssistant={profilesByAssistant}
        exceptionsByAssistant={exceptionsByAssistant}
        operatingSources={operatingSources}
      />
    </TooltipProvider>
  );
}
