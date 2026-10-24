import React, { useMemo, useState, useEffect } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  Send,
  Users,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import ActionTooltip from "../common/ActionTooltip";
import { usePublishSchedules } from "../../hooks/api/useSchedules";
import { useSchool } from "../../context/SchoolContext";
import type { BackendScheduleResource } from "../../api/services/schedules.service";
import type { BackendAbsenceResource } from "../../api/services/absences.service";
import type { AssistantTemporaryAssignmentApi } from "../../api/services/assistantTemporaryAssignments.service";
import type { Assistant } from "../../types";
import {
  getAllDraftDaysFromSchedules,
  DraftDaySummary,
  resolveAssistantShiftBounds,
  TIME_SLOTS,
  AssistantScheduleProfileApi,
  AssistantExceptionApi,
} from "../../utils/scheduleMatrixUtils";
import { useAllAssistantSchedules } from "../../hooks/api/useAssistantSchedules";
import { useAllAssistantExceptions } from "../../hooks/api/useAssistantExceptions";

interface PublishSchedulesModalProps {
  open: boolean;
  onClose: () => void;
  schedules: BackendScheduleResource[];
  assistants?: Assistant[];
  absences?: BackendAbsenceResource[];
  temporaryAssignments?: AssistantTemporaryAssignmentApi[];
  selectedSchoolId?: string | number;
  initialSelectedDate?: string;
  onSuccess?: () => void;
  profilesByAssistant?: Record<string, AssistantScheduleProfileApi[]>;
  exceptionsByAssistant?: Record<string, AssistantExceptionApi[]>;
}

interface DraftWeekGroup {
  weekKey: string;
  weekNumber: number;
  label: string;
  rangeStr: string;
  days: DraftDaySummary[];
  assistantsCount: number;
  entriesCount: number;
}

interface AssistantDaySchedule {
  assistantId: string;
  assistantName: string;
  initials: string;
  shiftStart: string;
  shiftEnd: string;
  isTemporaryTransfer?: boolean;
  originSchoolName?: string | null;
  entries: {
    id: string;
    activityName: string;
    activityColor?: string | null;
    startTime: string;
    endTime: string;
    isLocked: boolean;
    isFallback: boolean;
  }[];
  hasNoSchedule?: boolean;
  absenceReason?: string | null;
}

function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const parts = t.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function getIsoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function groupDraftDaysByWeek(days: DraftDaySummary[]): DraftWeekGroup[] {
  const map = new Map<string, DraftWeekGroup>();

  days.forEach((daySummary) => {
    const d = new Date(daySummary.isoDate + "T00:00:00");
    const dayOfWeek = d.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diffToMon);
    const fri = new Date(mon);
    fri.setDate(mon.getDate() + 4);

    const weekKey = mon.toISOString().slice(0, 10);
    const weekNumber = getIsoWeekNumber(mon);

    if (!map.has(weekKey)) {
      const monthShort = mon.toLocaleDateString("pt-PT", { month: "short" });
      const rangeStr = `${mon.getDate()} a ${fri.getDate()} ${monthShort}`;
      map.set(weekKey, {
        weekKey,
        weekNumber,
        label: `Semana ${weekNumber} · ${rangeStr}`,
        rangeStr,
        days: [],
        assistantsCount: 0,
        entriesCount: 0,
      });
    }

    const group = map.get(weekKey)!;
    group.days.push(daySummary);
    group.assistantsCount = Math.max(group.assistantsCount, daySummary.assistantsCount);
    group.entriesCount += daySummary.entriesCount;
  });

  return Array.from(map.values());
}

function getDayScheduleDetails(
  isoDate: string,
  schedules: BackendScheduleResource[],
  assistantsList: Assistant[] = [],
  absences: BackendAbsenceResource[] = [],
  temporaryAssignments: AssistantTemporaryAssignmentApi[] = [],
  selectedSchoolId?: string | number,
  profilesByAssistant?: Record<string, AssistantScheduleProfileApi[]>,
  exceptionsByAssistant?: Record<string, AssistantExceptionApi[]>
): {
  assistants: AssistantDaySchedule[];
  totalEntries: number;
} {
  const assistantsMap = new Map<string, AssistantDaySchedule>();
  let totalEntries = 0;

  // Agrupar todas as entradas por assistente para esta data
  const entriesByAssistant = new Map<string, any[]>();
  const scheduleMetaByAssistant = new Map<string, BackendScheduleResource>();

  schedules.forEach((sc) => {
    const dayEntries = (sc.entries || []).filter(
      (e) => e.date?.slice(0, 10) === isoDate
    );
    if (dayEntries.length === 0) return;
    const aId = String(sc.assistant_id);
    if (!scheduleMetaByAssistant.has(aId)) {
      scheduleMetaByAssistant.set(aId, sc);
    }
    const existing = entriesByAssistant.get(aId) || [];
    entriesByAssistant.set(aId, [...existing, ...dayEntries]);
  });

  entriesByAssistant.forEach((dayEntries, aId) => {
    const sc = scheduleMetaByAssistant.get(aId);
    const sortedEntries = [...dayEntries].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    );

    const shiftStart = sortedEntries[0].start_time.slice(0, 5);
    const shiftEnd = sortedEntries[sortedEntries.length - 1].end_time.slice(0, 5);

    const matchedAssistant = assistantsList.find(
      (a) => String(a.id) === aId
    );

    const assistantName =
      matchedAssistant?.name ||
      sc?.assistant_name ||
      `Assistente #${aId.slice(0, 6)}`;

    const initials =
      matchedAssistant?.initials ||
      assistantName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const entriesWithLunch: AssistantDaySchedule["entries"] = [];

    for (let idx = 0; idx < sortedEntries.length; idx++) {
      const e = sortedEntries[idx];
      const actName =
        e.activity_name || (e.is_fallback ? "Apoio Turmas/escola" : "Atividade");
      const isLunchAct =
        actName.toLowerCase().includes("almoço") ||
        actName.toLowerCase().includes("almoco") ||
        actName.toLowerCase().includes("pausa");

      entriesWithLunch.push({
        id: String(e.id),
        activityName: actName,
        activityColor: e.activity_color || (isLunchAct ? "#F97316" : "#3B82F6"),
        startTime: e.start_time.slice(0, 5),
        endTime: e.end_time.slice(0, 5),
        isLocked: Boolean(e.is_locked),
        isFallback: Boolean(e.is_fallback),
      });

      if (idx < sortedEntries.length - 1) {
        const next = sortedEntries[idx + 1];
        const gapStart = e.end_time.slice(0, 5);
        const gapEnd = next.start_time.slice(0, 5);
        const gapStartMin = parseTimeToMinutes(gapStart);
        const gapEndMin = parseTimeToMinutes(gapEnd);
        const gapDuration = gapEndMin - gapStartMin;

        if (
          gapDuration >= 30 &&
          gapDuration <= 120 &&
          gapStartMin >= 11 * 60 &&
          gapEndMin <= 16 * 60
        ) {
          entriesWithLunch.push({
            id: `lunch-${aId}-${gapStart}`,
            activityName: "Pausa Almoço",
            activityColor: "#F97316",
            startTime: gapStart,
            endTime: gapEnd,
            isLocked: false,
            isFallback: false,
          });
        }
      }
    }

    const isTemporaryTransfer = Boolean(
      sc?.is_temporary_transfer || matchedAssistant?.is_temporary_transfer
    );
    const originSchoolName =
      sc?.origin_school_name || matchedAssistant?.origin_school_name || null;

    assistantsMap.set(aId, {
      assistantId: aId,
      assistantName,
      initials,
      shiftStart,
      shiftEnd,
      isTemporaryTransfer,
      originSchoolName,
      entries: entriesWithLunch,
    });

    totalEntries += dayEntries.length;
  });

  // Incluir também assistentes que não tenham tarefas registadas nesta data para que a sua situação fique visível no preview
  assistantsList.forEach((ast) => {
    const aId = String(ast.id);
    if (assistantsMap.has(aId)) return;

    // Se é assistente transferido para fora da escola hoje, não o mostramos aqui
    const isTransferredOutToday = temporaryAssignments.some((tr) => {
      if (String(tr.assistant_id) !== aId) return false;
      if (selectedSchoolId && String(tr.origin_school_id) !== String(selectedSchoolId)) return false;
      const from = (tr.valid_from || "").slice(0, 10);
      const until = (tr.valid_until || tr.valid_from || "").slice(0, 10);
      return from <= isoDate && isoDate <= until;
    });
    if (isTransferredOutToday) return;

    // Se é assistente recebido por transferência temporária:
    // Só deve ser exibido se a transferência estiver ativa para esta escola nesta data
    if (ast.is_temporary_transfer) {
      const isTransferredHereToday = temporaryAssignments.some((tr) => {
        if (String(tr.assistant_id) !== aId) return false;
        if (selectedSchoolId && String(tr.destination_school_id) !== String(selectedSchoolId)) return false;
        const from = (tr.valid_from || "").slice(0, 10);
        const until = (tr.valid_until || tr.valid_from || "").slice(0, 10);
        return from <= isoDate && isoDate <= until;
      });
      if (!isTransferredHereToday) return;
    }

    // Verificar se tem ausência registada
    const matchedAbsence = absences.find((abs) => {
      if (String(abs.assistant_id) !== aId) return false;
      const from = (abs.valid_from || abs.start_date || "").slice(0, 10);
      const until = (abs.valid_until || abs.end_date || from).slice(0, 10);
      return from <= isoDate && isoDate <= until;
    });

    const sc = schedules.find((s) => String(s.assistant_id) === aId);
    let shiftStart = sc?.shift_start ? sc.shift_start.slice(0, 5) : "";
    let shiftEnd = sc?.shift_end ? sc.shift_end.slice(0, 5) : "";

    const aProfiles = profilesByAssistant?.[aId] || [];
    const aExceptions = exceptionsByAssistant?.[aId] || [];
    const hasConfiguredShift = aProfiles.length > 0 || aExceptions.length > 0;

    // Apenas inferir horário contratual se o assistente tiver efetivamente um perfil ou exceção configurados na escola
    if ((!shiftStart || !shiftEnd) && hasConfiguredShift) {
      const dow = new Date(isoDate).getDay();
      const bounds = resolveAssistantShiftBounds({
        assistantId: aId,
        isoDate,
        dow,
        viewStartSlot: 30, // 07:30
        viewEndSlot: 76,   // 19:00
        profiles: aProfiles,
        exceptions: aExceptions,
        schedulesList: schedules,
        absences,
      });
      if (bounds.startSlot !== null && bounds.endSlot !== null) {
        if (!shiftStart && TIME_SLOTS[bounds.startSlot]) {
          shiftStart = TIME_SLOTS[bounds.startSlot];
        }
        if (!shiftEnd && TIME_SLOTS[bounds.endSlot]) {
          shiftEnd = TIME_SLOTS[bounds.endSlot];
        }
      }
    }

    const initials =
      ast.initials ||
      ast.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    assistantsMap.set(aId, {
      assistantId: aId,
      assistantName: ast.name,
      initials,
      shiftStart,
      shiftEnd,
      isTemporaryTransfer: Boolean(ast.is_temporary_transfer),
      originSchoolName: ast.origin_school_name || null,
      entries: [],
      hasNoSchedule: true,
      absenceReason: matchedAbsence
        ? (matchedAbsence.absence_type?.name || "Ausência")
        : null,
    });
  });

  const assistants = Array.from(assistantsMap.values()).sort((a, b) => {
    // Residentes primeiro, depois transferidos; dentro de cada grupo, por nome
    if (Boolean(a.isTemporaryTransfer) !== Boolean(b.isTemporaryTransfer)) {
      return a.isTemporaryTransfer ? 1 : -1;
    }
    return a.assistantName.localeCompare(b.assistantName);
  });

  return { assistants, totalEntries };
}

function validateDayForPublish(
  isoDate: string,
  schedules: BackendScheduleResource[],
  assistants: Assistant[] = [],
  absences: BackendAbsenceResource[] = [],
  temporaryAssignments: AssistantTemporaryAssignmentApi[] = [],
  selectedSchoolId?: string | number
): {
  canPublish: boolean;
  isPast: boolean;
  isIncomplete: boolean;
  reason: string | null;
} {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isPast = isoDate < todayIso;

  if (isPast) {
    return {
      canPublish: false,
      isPast: true,
      isIncomplete: false,
      reason: "Não é permitido publicar escalas de dias passados.",
    };
  }

  // Obter todas as entradas deste dia em todas as escalas da escola
  const allDayEntries = schedules.flatMap((sc) =>
    (sc.entries || [])
      .filter((e) => e.date?.slice(0, 10) === isoDate)
      .map((e) => ({ ...e, assistantId: String(sc.assistant_id) }))
  );

  if (allDayEntries.length === 0) {
    return {
      canPublish: false,
      isPast: false,
      isIncomplete: true,
      reason: "Não existem tarefas ou horários atribuídos neste dia.",
    };
  }

  const gapReasons: string[] = [];

  // 1. Verificar assistentes residentes ativos que não têm qualquer horário atribuído neste dia
  const assistantsWithEntries = new Set(allDayEntries.map((e) => e.assistantId));
  const missingAssistants = assistants.filter((ast) => {
    if (assistantsWithEntries.has(String(ast.id))) return false;

    // Se é assistente recebido por transferência temporária (ast.is_temporary_transfer):
    // Só deve ser esperado se tiver uma transferência ativa para esta escola nesta data específica!
    if (ast.is_temporary_transfer) {
      const isTransferredHereToday = temporaryAssignments.some((tr) => {
        if (String(tr.assistant_id) !== String(ast.id)) return false;
        if (selectedSchoolId && String(tr.destination_school_id) !== String(selectedSchoolId)) return false;
        const from = (tr.valid_from || "").slice(0, 10);
        const until = (tr.valid_until || tr.valid_from || "").slice(0, 10);
        return from <= isoDate && isoDate <= until;
      });
      if (!isTransferredHereToday) return false;
    }

    // Se é assistente residente cedido a outra escola nesta data, não é esperado nesta escola
    const isTransferredOutToday = temporaryAssignments.some((tr) => {
      if (String(tr.assistant_id) !== String(ast.id)) return false;
      if (selectedSchoolId && String(tr.origin_school_id) !== String(selectedSchoolId)) return false;
      const from = (tr.valid_from || "").slice(0, 10);
      const until = (tr.valid_until || tr.valid_from || "").slice(0, 10);
      return from <= isoDate && isoDate <= until;
    });
    if (isTransferredOutToday) return false;

    // Verificar se tem ausência registada para a data
    const isAbsent = absences.some((abs) => {
      if (String(abs.assistant_id) !== String(ast.id)) return false;
      const from = (abs.valid_from || abs.start_date || "").slice(0, 10);
      const until = (abs.valid_until || abs.end_date || from).slice(0, 10);
      return from <= isoDate && isoDate <= until;
    });
    return !isAbsent;
  });

  if (missingAssistants.length > 0) {
    const names = missingAssistants.map((a) => a.name).slice(0, 2).join(", ");
    gapReasons.push(
      `${missingAssistants.length} assistente${missingAssistants.length > 1 ? "s" : ""} sem horário (${names}${missingAssistants.length > 2 ? "..." : ""})`
    );
  }

  // 2. Verificar cada assistente com tarefas se tem espaços por preencher ou turno incompleto
  assistantsWithEntries.forEach((astId) => {
    const ast = assistants.find((a) => String(a.id) === astId);
    const astName = ast?.name || `Assistente #${astId.slice(0, 6)}`;
    const astEntries = allDayEntries.filter((e) => e.assistantId === astId);
    const sorted = [...astEntries].sort((a, b) => a.start_time.localeCompare(b.start_time));

    let lunchCount = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const curEnd = sorted[i].end_time.slice(0, 5);
      const nextStart = sorted[i + 1].start_time.slice(0, 5);
      if (nextStart > curEnd) {
        const gapStartM = parseTimeToMinutes(curEnd);
        const gapEndM = parseTimeToMinutes(nextStart);
        const gapDur = gapEndM - gapStartM;
        const isLunchWindow = gapDur >= 30 && gapDur <= 120 && gapStartM >= 11 * 60 && gapEndM <= 16 * 60;
        if (isLunchWindow && lunchCount === 0) {
          lunchCount++;
        } else {
          gapReasons.push(`${astName} (${curEnd}–${nextStart})`);
        }
      }
    }

    let totalWorkMin = 0;
    sorted.forEach((e) => {
      totalWorkMin += parseTimeToMinutes(e.end_time) - parseTimeToMinutes(e.start_time);
    });

    // Apenas assistentes residentes têm obrigatoriedade de turno normal >= 4h; transferidos podem vir para apoios pontuais
    if (!ast?.is_temporary_transfer && sorted.length > 0 && totalWorkMin < 4 * 60) {
      gapReasons.push(`${astName} (apenas ${Math.floor(totalWorkMin / 60)}h atribuídas)`);
    }
  });

  if (gapReasons.length > 0) {
    return {
      canPublish: false,
      isPast: false,
      isIncomplete: true,
      reason: `Horário incompleto: ${gapReasons.slice(0, 2).join("; ")}${gapReasons.length > 2 ? ` (+ ${gapReasons.length - 2})` : ""}.`,
    };
  }

  return {
    canPublish: true,
    isPast: false,
    isIncomplete: false,
    reason: null,
  };
}

export default function PublishSchedulesModal({
  open,
  onClose,
  schedules,
  assistants = [],
  absences = [],
  temporaryAssignments = [],
  selectedSchoolId,
  initialSelectedDate,
  onSuccess,
  profilesByAssistant: profilesByAssistantProp,
  exceptionsByAssistant: exceptionsByAssistantProp,
}: PublishSchedulesModalProps) {
  const { data: allAssistantSchedules = [] } = useAllAssistantSchedules();
  const { data: allAssistantExceptions = [] } = useAllAssistantExceptions();

  const computedProfilesByAssistant = useMemo(() => {
    if (profilesByAssistantProp) return profilesByAssistantProp;
    const map: Record<string, AssistantScheduleProfileApi[]> = {};
    assistants.forEach((a) => {
      map[String(a.id)] = [];
    });
    allAssistantSchedules.forEach((p) => {
      const aid = String(p.assistant_id);
      if (!map[aid]) map[aid] = [];
      map[aid].push(p);
    });
    return map;
  }, [profilesByAssistantProp, assistants, allAssistantSchedules]);

  const computedExceptionsByAssistant = useMemo(() => {
    if (exceptionsByAssistantProp) return exceptionsByAssistantProp;
    const map: Record<string, AssistantExceptionApi[]> = {};
    assistants.forEach((a) => {
      map[String(a.id)] = [];
    });
    allAssistantExceptions.forEach((e) => {
      const aid = String(e.assistant_id);
      if (!map[aid]) map[aid] = [];
      map[aid].push(e);
    });
    return map;
  }, [exceptionsByAssistantProp, assistants, allAssistantExceptions]);
  const { selectedSchool } = useSchool();
  const publishMutation = usePublishSchedules();

  const draftDays = useMemo(
    () => getAllDraftDaysFromSchedules(schedules),
    [schedules]
  );

  const weekGroups = useMemo(
    () => groupDraftDaysByWeek(draftDays),
    [draftDays]
  );

  const validationsByDate = useMemo(() => {
    const map: Record<string, ReturnType<typeof validateDayForPublish>> = {};
    draftDays.forEach((d) => {
      map[d.isoDate] = validateDayForPublish(
        d.isoDate,
        schedules,
        assistants,
        absences,
        temporaryAssignments,
        selectedSchoolId
      );
    });
    return map;
  }, [draftDays, schedules, assistants, absences, temporaryAssignments, selectedSchoolId]);

  const publishableDates = useMemo(
    () =>
      draftDays
        .filter((d) => validationsByDate[d.isoDate]?.canPublish)
        .map((d) => d.isoDate),
    [draftDays, validationsByDate]
  );

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"weeks" | "list">("weeks");

  const isSingleDayMode = Boolean(
    initialSelectedDate && draftDays.some((d) => d.isoDate === initialSelectedDate)
  );

  // Inicializar seleção quando a modal abre
  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      if (initialSelectedDate && draftDays.some((d) => d.isoDate === initialSelectedDate)) {
        if (validationsByDate[initialSelectedDate]?.canPublish) {
          setSelectedDates([initialSelectedDate]);
        } else {
          setSelectedDates([]);
        }
        setPreviewDate(initialSelectedDate);
      } else {
        setSelectedDates(publishableDates);
        setPreviewDate(null);
      }
    }
  }, [open, initialSelectedDate, draftDays, publishableDates, validationsByDate]);

  const allSelected =
    publishableDates.length > 0 &&
    publishableDates.every((d) => selectedDates.includes(d));

  function toggleAll() {
    if (allSelected) {
      setSelectedDates([]);
    } else {
      setSelectedDates(publishableDates);
    }
  }

  function toggleDate(isoDate: string) {
    if (!validationsByDate[isoDate]?.canPublish) return;
    setSelectedDates((prev) =>
      prev.includes(isoDate)
        ? prev.filter((d) => d !== isoDate)
        : [...prev, isoDate].sort()
    );
  }

  function toggleWeek(days: DraftDaySummary[]) {
    const weekPublishableDates = days
      .filter((d) => validationsByDate[d.isoDate]?.canPublish)
      .map((d) => d.isoDate);
    if (weekPublishableDates.length === 0) return;

    const allWeekSelected = weekPublishableDates.every((iso) =>
      selectedDates.includes(iso)
    );
    if (allWeekSelected) {
      setSelectedDates((prev) =>
        prev.filter((iso) => !weekPublishableDates.includes(iso))
      );
    } else {
      setSelectedDates((prev) =>
        Array.from(new Set([...prev, ...weekPublishableDates])).sort()
      );
    }
  }

  function selectThisWeek() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const currentWeekKey = mon.toISOString().slice(0, 10);
    const currentGroup = weekGroups.find((w) => w.weekKey === currentWeekKey);
    if (currentGroup) {
      setSelectedDates(currentGroup.days.filter((d) => validationsByDate[d.isoDate]?.canPublish).map((d) => d.isoDate));
    } else if (weekGroups.length > 0) {
      setSelectedDates(weekGroups[0].days.filter((d) => validationsByDate[d.isoDate]?.canPublish).map((d) => d.isoDate));
    }
  }

  function selectNextWeek() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToNextMon = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMon = new Date(now);
    nextMon.setDate(now.getDate() + diffToNextMon);
    const nextWeekKey = nextMon.toISOString().slice(0, 10);
    const nextGroup = weekGroups.find((w) => w.weekKey === nextWeekKey);
    if (nextGroup) {
      setSelectedDates(nextGroup.days.filter((d) => validationsByDate[d.isoDate]?.canPublish).map((d) => d.isoDate));
    } else if (weekGroups.length > 1) {
      setSelectedDates(weekGroups[1].days.filter((d) => validationsByDate[d.isoDate]?.canPublish).map((d) => d.isoDate));
    }
  }

  function selectOnly(isoDate: string) {
    if (validationsByDate[isoDate]?.canPublish) {
      setSelectedDates([isoDate]);
    }
  }

  // Detalhes da pré-visualização do dia selecionado
  const previewDetails = useMemo(() => {
    if (!previewDate) return null;
    return getDayScheduleDetails(
      previewDate,
      schedules,
      assistants,
      absences,
      temporaryAssignments,
      selectedSchoolId,
      computedProfilesByAssistant,
      computedExceptionsByAssistant
    );
  }, [
    previewDate,
    schedules,
    assistants,
    absences,
    temporaryAssignments,
    selectedSchoolId,
    computedProfilesByAssistant,
    computedExceptionsByAssistant,
  ]);

  const previewSummary = useMemo(() => {
    if (!previewDate) return null;
    return draftDays.find((d) => d.isoDate === previewDate) || null;
  }, [previewDate, draftDays]);

  const currentPreviewIndex = useMemo(() => {
    if (!previewDate) return -1;
    return draftDays.findIndex((d) => d.isoDate === previewDate);
  }, [previewDate, draftDays]);

  const prevDayIso = currentPreviewIndex > 0 ? draftDays[currentPreviewIndex - 1].isoDate : null;
  const nextDayIso =
    currentPreviewIndex >= 0 && currentPreviewIndex < draftDays.length - 1
      ? draftDays[currentPreviewIndex + 1].isoDate
      : null;

  // Régua de horários e limites dinâmicos para a timeline do dia
  const timelineRange = useMemo(() => {
    if (!previewDetails || previewDetails.assistants.length === 0) {
      return {
        startHour: 7,
        endHour: 19,
        minM: 7 * 60,
        maxM: 19 * 60,
        totalMinutes: 12 * 60,
        hours: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      };
    }

    let minMinutes = 7 * 60; // 07:00 base
    let maxMinutes = 19 * 60; // 19:00 base

    previewDetails.assistants.forEach((ast) => {
      if (ast.shiftStart) {
        const sm = parseTimeToMinutes(ast.shiftStart);
        if (sm < minMinutes) minMinutes = Math.floor(sm / 60) * 60;
      }
      if (ast.shiftEnd) {
        const em = parseTimeToMinutes(ast.shiftEnd);
        if (em > maxMinutes) maxMinutes = Math.ceil(em / 60) * 60;
      }
      ast.entries.forEach((e) => {
        const sm = parseTimeToMinutes(e.startTime);
        const em = parseTimeToMinutes(e.endTime);
        if (sm < minMinutes) minMinutes = Math.floor(sm / 60) * 60;
        if (em > maxMinutes) maxMinutes = Math.ceil(em / 60) * 60;
      });
    });

    if (maxMinutes - minMinutes < 8 * 60) {
      maxMinutes = minMinutes + 8 * 60;
    }

    const startHour = Math.floor(minMinutes / 60);
    const endHour = Math.ceil(maxMinutes / 60);
    const totalMinutes = (endHour - startHour) * 60;
    const hours = Array.from(
      { length: endHour - startHour + 1 },
      (_, i) => startHour + i
    );

    return {
      startHour,
      endHour,
      minM: startHour * 60,
      maxM: endHour * 60,
      totalMinutes,
      hours,
    };
  }, [previewDetails]);

  // Lista de atividades únicas presentes no dia para a legenda
  const dayActivities = useMemo(() => {
    if (!previewDetails) return [];
    const map = new Map<string, { name: string; color: string }>();
    previewDetails.assistants.forEach((ast) => {
      ast.entries.forEach((e) => {
        if (!map.has(e.activityName)) {
          map.set(e.activityName, {
            name: e.activityName,
            color: e.activityColor || "#3B82F6",
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [previewDetails]);

  async function handleConfirmPublish() {
    const validSelected = selectedDates.filter((iso) => validationsByDate[iso]?.canPublish);
    if (validSelected.length === 0) {
      setErrorMessage("Nenhum dia válido e completo selecionado para publicação.");
      return;
    }
    setErrorMessage(null);

    try {
      const sorted = [...validSelected].sort();
      const minDate = sorted[0];
      const maxDate = sorted[sorted.length - 1];

      await publishMutation.mutateAsync({
        start_date: minDate,
        end_date: maxDate,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message ||
          "Ocorreu um erro ao tentar publicar as escalas selecionadas."
      );
    }
  }

  const isPublishing = publishMutation.isPending;

  function renderAssistantPreviewRow(ast: AssistantDaySchedule) {
    const hasEntries = ast.entries.length > 0;
    const isUnscheduled = !hasEntries;

    return (
      <div
        key={ast.assistantId}
        className={`flex items-center transition-colors group ${
          isUnscheduled
            ? "bg-muted/5 hover:bg-muted/10"
            : "hover:bg-muted/15"
        }`}
      >
        {/* Coluna do Assistente */}
        <div className={`w-48 sm:w-56 px-3 py-2.5 border-r border-border/60 flex items-center gap-2.5 flex-shrink-0 ${
          isUnscheduled ? "bg-card/40 group-hover:bg-card" : "bg-card/60 group-hover:bg-card"
        }`}>
          <div className={`w-7 h-7 rounded-full font-bold text-[10px] flex items-center justify-center flex-shrink-0 ${
            ast.absenceReason
              ? "bg-destructive/15 text-destructive ring-1 ring-destructive/30"
              : isUnscheduled && !ast.shiftStart
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40"
              : "bg-primary/10 text-primary"
          }`}>
            {ast.initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {ast.assistantName}
            </p>
            {ast.absenceReason ? (
              <p className="text-[10px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                <AlertTriangle size={9} className="flex-shrink-0 text-destructive" />
                <span className="truncate">Ausência: {ast.absenceReason}</span>
              </p>
            ) : ast.shiftStart && ast.shiftEnd ? (
              <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock size={9} className="text-primary/70 flex-shrink-0" />
                <span>Turno {ast.shiftStart}–{ast.shiftEnd}</span>
              </p>
            ) : (
              <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                <AlertTriangle size={9} className="flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Sem horário atribuído</span>
              </p>
            )}
          </div>
        </div>

        {/* Coluna da Linha do Tempo / Escala */}
        <div className="relative flex-1 h-11 px-0 flex items-center bg-muted/5">
          {/* Linhas verticais guia de cada hora */}
          {timelineRange.hours.map((hour) => {
            const leftPct =
              ((hour - timelineRange.startHour) /
                (timelineRange.endHour - timelineRange.startHour)) *
              100;
            return (
              <div
                key={hour}
                className="absolute top-0 bottom-0 border-l border-dashed border-border/25 pointer-events-none"
                style={{ left: `${leftPct}%` }}
              />
            );
          })}

          {/* Sombra do Turno Total do Assistente */}
          {ast.shiftStart && ast.shiftEnd && (
            <div
              className="absolute top-1.5 bottom-1.5 rounded-lg bg-primary/[0.04] border border-primary/15 pointer-events-none"
              style={{
                left: `${Math.max(
                  0,
                  ((parseTimeToMinutes(ast.shiftStart) -
                    timelineRange.minM) /
                    timelineRange.totalMinutes) *
                    100
                )}%`,
                width: `${Math.min(
                  100,
                  ((parseTimeToMinutes(ast.shiftEnd) -
                    parseTimeToMinutes(ast.shiftStart)) /
                    timelineRange.totalMinutes) *
                    100
                )}%`,
              }}
            />
          )}

          {/* Faixa de Ausência se existir */}
          {ast.absenceReason && (
            <div
              className="absolute top-2 bottom-2 rounded-md bg-destructive/15 border border-destructive/30 text-destructive flex items-center px-2 z-10"
              style={{
                left: `${Math.max(
                  0,
                  ((parseTimeToMinutes(ast.shiftStart || "08:00") -
                    timelineRange.minM) /
                    timelineRange.totalMinutes) *
                    100
                )}%`,
                width: `${Math.min(
                  100,
                  ((parseTimeToMinutes(ast.shiftEnd || "17:00") -
                    parseTimeToMinutes(ast.shiftStart || "08:00")) /
                    timelineRange.totalMinutes) *
                    100
                )}%`,
              }}
            >
              <span className="text-[11px] font-medium truncate">
                {ast.absenceReason}
              </span>
            </div>
          )}

          {/* Cápsulas de Atividades */}
          {ast.entries.map((ent, i) => {
            const entStartMin = parseTimeToMinutes(ent.startTime);
            const entEndMin = parseTimeToMinutes(ent.endTime);
            const leftPct = Math.max(
              0,
              ((entStartMin - timelineRange.minM) /
                timelineRange.totalMinutes) *
                100
            );
            const widthPct = Math.max(
              1,
              Math.min(
                100 - leftPct,
                ((entEndMin - entStartMin) /
                  timelineRange.totalMinutes) *
                  100
              )
            );

            const prevEnt = i > 0 ? ast.entries[i - 1] : null;
            const nextEnt = i < ast.entries.length - 1 ? ast.entries[i + 1] : null;
            const hasPrevAdjacent = !!prevEnt && prevEnt.endTime === ent.startTime;
            const hasNextAdjacent = !!nextEnt && nextEnt.startTime === ent.endTime;

            const radiusClass =
              hasPrevAdjacent && hasNextAdjacent
                ? "rounded-none"
                : hasPrevAdjacent
                ? "rounded-l-none rounded-r-md"
                : hasNextAdjacent
                ? "rounded-l-md rounded-r-none"
                : "rounded-md";

            const separatorClass = hasPrevAdjacent
              ? "border-l-[1.5px] border-card/90"
              : "";

            const durationMin = entEndMin - entStartMin;
            const durationStr =
              durationMin >= 60
                ? `${Math.floor(durationMin / 60)}h${
                    durationMin % 60 > 0 ? ` ${durationMin % 60}m` : ""
                  }`
                : `${durationMin}m`;

            return (
              <Tooltip key={ent.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`absolute top-2 bottom-2 ${radiusClass} ${separatorClass} text-white shadow-2xs overflow-hidden flex items-center px-2 gap-1.5 cursor-pointer hover:brightness-110 hover:z-20 transition-all z-10`}
                    style={{
                      left: `${leftPct}%`,
                      width: `calc(${widthPct}% - ${hasPrevAdjacent ? 0 : 1}px)`,
                      backgroundColor: ent.activityColor || "#3B82F6",
                    }}
                  >
                    <span className="text-[11px] font-semibold leading-none truncate drop-shadow-2xs">
                      {ent.activityName}
                    </span>
                    {widthPct >= 14 && (
                      <span className="ml-auto text-[9px] font-mono bg-black/20 px-1 py-0.5 rounded text-white/90 flex-shrink-0">
                        {ent.startTime}–{ent.endTime}
                      </span>
                    )}
                    {ent.isLocked && (
                      <Lock
                        size={9}
                        className={`${
                          widthPct >= 14 ? "" : "ml-auto"
                        } text-white/70 flex-shrink-0`}
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  className="bg-popover text-popover-foreground border border-border shadow-xl px-3.5 py-2.5 rounded-xl text-left min-w-[190px]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: ent.activityColor || "#3B82F6" }}
                      />
                      <span className="font-semibold text-xs text-foreground">
                        {ent.activityName}
                      </span>
                    </div>
                    {ent.isLocked && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        <Lock size={9} />
                        Fixo
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-border/60 space-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      {ast.assistantName}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {ent.startTime} – {ent.endTime}{" "}
                      <span className="text-foreground/80 font-semibold">
                        ({durationStr})
                      </span>
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !isPublishing && onClose()}>
      <DialogContent className="max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
        {/* Header com ícone padronizado */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Send size={18} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
                Publicar Escalas de Assistentes
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {selectedSchool ? `${selectedSchool.name} · ` : ""}
                {isSingleDayMode && previewSummary
                  ? `A publicar a escala de ${previewSummary.dayName}, ${previewSummary.dateStr}`
                  : "Selecione os dias em rascunho que pretende publicar e tornar visíveis às equipas."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body com lista/semanas de dias ou pré-visualização */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Mensagem de Erro Inline caso falhe */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-center justify-between gap-3 text-xs animate-in fade-in-50">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-1 rounded hover:bg-destructive/20 text-destructive transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {draftDays.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2 border border-dashed border-border rounded-xl bg-muted/10">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Sem Escalas em Rascunho
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Não existem dias com escalas pendentes de publicação no período carregado. Todos os horários existentes já estão publicados ou ainda não foram gerados.
              </p>
            </div>
          ) : previewDate && previewDetails ? (
            /* ========================================================= */
            /* PAINEL DE PRÉ-VISUALIZAÇÃO DA ESCALA (TIMELINE MATRIX)    */
            /* ========================================================= */
            <div className="space-y-3.5 animate-in fade-in-50">
              {/* Barra de Controlo Unificada e Coesa */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                {/* Lado Esquerdo: Voltar + Título do Dia + Badge + Estatísticas */}
                <div className="flex items-center gap-3 min-w-0">
                  {!isSingleDayMode && (
                    <button
                      type="button"
                      onClick={() => setPreviewDate(null)}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs flex-shrink-0"
                    >
                      <ArrowLeft size={13} />
                      <span>Voltar</span>
                    </button>
                  )}

                  {!isSingleDayMode && (
                    <div className="h-6 w-px bg-border flex-shrink-0 hidden sm:block" />
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-foreground capitalize">
                        {previewSummary?.dayName}, {previewSummary?.dateStr}
                      </h3>
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold py-0.5"
                      >
                        <Clock size={10} className="mr-1" />
                        Rascunho
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {previewDetails.assistants.length}{" "}
                      {previewDetails.assistants.length === 1 ? "assistente escalado" : "assistentes escalados"} ·{" "}
                      {previewDetails.totalEntries} tarefas na escala
                    </p>
                  </div>
                </div>

                {/* Lado Direito: Navegação entre Dias + Toggle de Seleção */}
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  {!isSingleDayMode && draftDays.length > 1 && (
                    <div className="flex items-center border border-border rounded-lg bg-card p-0.5 shadow-2xs">
                      <ActionTooltip content="Dia anterior">
                        <button
                          type="button"
                          disabled={!prevDayIso}
                          onClick={() => prevDayIso && setPreviewDate(prevDayIso)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronLeft size={14} />
                        </button>
                      </ActionTooltip>
                      <span className="text-[11px] font-mono text-muted-foreground px-2 select-none">
                        {currentPreviewIndex + 1} / {draftDays.length}
                      </span>
                      <ActionTooltip content="Próximo dia">
                        <button
                          type="button"
                          disabled={!nextDayIso}
                          onClick={() => nextDayIso && setPreviewDate(nextDayIso)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </ActionTooltip>
                    </div>
                  )}

                  <ActionTooltip
                    content={
                      !validationsByDate[previewDate]?.canPublish
                        ? validationsByDate[previewDate]?.reason
                        : null
                    }
                  >
                    <button
                      type="button"
                      disabled={!validationsByDate[previewDate]?.canPublish}
                      onClick={() => toggleDate(previewDate)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs ${
                        !validationsByDate[previewDate]?.canPublish
                          ? "opacity-50 cursor-not-allowed border-border text-muted-foreground bg-muted/20"
                          : selectedDates.includes(previewDate)
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20 cursor-pointer"
                          : "border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
                      }`}
                    >
                      <Checkbox
                        checked={selectedDates.includes(previewDate)}
                        disabled={!validationsByDate[previewDate]?.canPublish}
                        onCheckedChange={() => toggleDate(previewDate)}
                      />
                      <span>Incluir na Publicação</span>
                    </button>
                  </ActionTooltip>
                </div>
              </div>

              {!validationsByDate[previewDate]?.canPublish && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-xs">
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">
                      {validationsByDate[previewDate]?.isPast ? "Dia Passado" : "Escala Incompleta"} — Não Publicável
                    </p>
                    <p className="text-[11px] text-destructive/90 mt-0.5">
                      {validationsByDate[previewDate]?.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Escala em Linha do Tempo Estilo Dashboard (Gantt Matrix) */}
              {previewDetails.assistants.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-card">
                  Nenhum turno ou tarefa registada para este dia.
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="border border-border rounded-xl bg-card overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <div className="min-w-[700px]">
                        {/* Régua Superior de Horas */}
                        <div className="flex items-center border-b border-border bg-muted/40">
                          <div className="w-48 sm:w-56 px-3 py-2 text-[11px] font-semibold text-muted-foreground border-r border-border/60 uppercase tracking-wider flex-shrink-0">
                            Assistente & Turno
                          </div>
                          <div className="relative flex-1 h-8">
                            {timelineRange.hours.map((hour, idx) => {
                              const leftPct =
                                ((hour - timelineRange.startHour) /
                                  (timelineRange.endHour - timelineRange.startHour)) *
                                100;
                              return (
                                <div
                                  key={hour}
                                  className="absolute top-0 bottom-0 flex flex-col justify-between"
                                  style={{
                                    left: `${leftPct}%`,
                                    transform:
                                      idx === 0
                                        ? "none"
                                        : idx === timelineRange.hours.length - 1
                                        ? "translateX(-100%)"
                                        : "translateX(-50%)",
                                  }}
                                >
                                  <span className="text-[10px] font-mono font-medium text-muted-foreground pt-1.5 px-1">
                                    {String(hour).padStart(2, "0")}h
                                  </span>
                                  <div className="w-px h-1.5 bg-border mx-auto" />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Linhas de Cada Assistente */}
                        <div className="divide-y divide-border/50 max-h-[380px] overflow-y-auto">
                          {previewDetails.assistants
                            .filter((a) => !a.isTemporaryTransfer)
                            .map(renderAssistantPreviewRow)}

                          {previewDetails.assistants.some((a) => a.isTemporaryTransfer) && (
                            <>
                              <div className="px-3 py-1.5 bg-blue-500/10 border-y border-blue-500/25 flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                  <ArrowDownLeft size={12} className="text-blue-600 dark:text-blue-400" />
                                  Assistentes Recebidos por Transferência Temporária (
                                  {
                                    previewDetails.assistants.filter((a) => a.isTemporaryTransfer).length
                                  }
                                  )
                                </span>
                              </div>
                              {previewDetails.assistants
                                .filter((a) => a.isTemporaryTransfer)
                                .map(renderAssistantPreviewRow)}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Legenda de Cores de Atividades presentes na escala deste dia */}
                  {dayActivities.length > 0 && (
                    <div className="flex items-center gap-3 flex-wrap px-1 pt-1 text-xs text-muted-foreground">
                      <span className="text-[11px] font-semibold text-foreground">Legenda:</span>
                      {dayActivities.map((act) => (
                        <div key={act.name} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0 shadow-2xs"
                            style={{ backgroundColor: act.color }}
                          />
                          <span className="text-[11px]">{act.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* LISTA GERAL / GRELHA SEMANAL DE DIAS EM RASCUNHO          */
            /* ========================================================= */
            <>
              {/* Barra de Seleção Rápida e Alternador de Vista */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none mr-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                    />
                    <span>
                      Todos ({draftDays.length})
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {weekGroups.length > 0 && (
                      <button
                        type="button"
                        onClick={selectThisWeek}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
                      >
                        Esta Semana
                      </button>
                    )}
                    {weekGroups.length > 1 && (
                      <button
                        type="button"
                        onClick={selectNextWeek}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
                      >
                        Próxima Semana
                      </button>
                    )}
                    {initialSelectedDate &&
                      draftDays.some((d) => d.isoDate === initialSelectedDate) && (
                        <button
                          type="button"
                          onClick={() => selectOnly(initialSelectedDate)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
                        >
                          Apenas Hoje
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={() => setSelectedDates([])}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                {/* Alternador de Vista: Semanas vs Lista */}
                <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60 self-start sm:self-auto">
                  <ActionTooltip content="Vista por Semanas (Compacta)">
                    <button
                      type="button"
                      onClick={() => setViewMode("weeks")}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewMode === "weeks"
                          ? "bg-card text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LayoutGrid size={12} />
                      <span>Semanas</span>
                    </button>
                  </ActionTooltip>
                  <ActionTooltip content="Vista em Lista Detalhada">
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewMode === "list"
                          ? "bg-card text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <List size={12} />
                      <span>Lista</span>
                    </button>
                  </ActionTooltip>
                </div>
              </div>

              {/* Conteúdo Principal: Vista Espaçosa e Organizada por Semanas */}
              {viewMode === "weeks" ? (
                <div className="space-y-3.5">
                  {weekGroups.map((week) => {
                    const weekIsoDates = week.days.map((d) => d.isoDate);
                    const selectedCount = weekIsoDates.filter((iso) =>
                      selectedDates.includes(iso)
                    ).length;
                    const allWeekSelected =
                      week.days.length > 0 && selectedCount === week.days.length;

                    return (
                      <div
                        key={week.weekKey}
                        className="rounded-xl border border-border bg-card p-3 space-y-2.5 transition-all shadow-2xs"
                      >
                        {/* Cabeçalho da Semana */}
                        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <Checkbox
                              checked={allWeekSelected}
                              onCheckedChange={() => toggleWeek(week.days)}
                            />
                            <div>
                              <span className="text-xs font-semibold text-foreground">
                                {week.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground ml-2 hidden sm:inline">
                                ({week.days.length} {week.days.length === 1 ? "dia" : "dias"} · {week.assistantsCount} assistentes)
                              </span>
                            </div>
                          </label>

                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0.5 px-2 font-mono gap-1 ${
                              selectedCount === week.days.length
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : selectedCount > 0
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            <Clock size={10} />
                            {selectedCount}/{week.days.length} selecionados
                          </Badge>
                        </div>

                        {/* Grelha de Cartões de Dias Espaçosa e Clara */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                          {week.days.map((d) => {
                            const isChecked = selectedDates.includes(d.isoDate);
                            const dayNum = d.isoDate.split("-")[2];
                            const val = validationsByDate[d.isoDate];
                            const canPublish = val?.canPublish ?? false;
                            return (
                              <div
                                key={d.isoDate}
                                className={`group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all ${
                                  isChecked
                                    ? "border-emerald-500/50 bg-emerald-500/[0.08] ring-1 ring-emerald-500/30 shadow-2xs"
                                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/20"
                                }`}
                              >
                                {/* Top: Checkbox + Dia e Número */}
                                <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-border/40">
                                  <ActionTooltip content={!canPublish ? val?.reason : null}>
                                    <label
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!canPublish) {
                                          e.preventDefault();
                                          return;
                                        }
                                      }}
                                      className={`flex items-center gap-2 select-none min-w-0 ${
                                        canPublish
                                          ? "cursor-pointer"
                                          : "cursor-not-allowed opacity-50"
                                      }`}
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        disabled={!canPublish}
                                        onCheckedChange={() => canPublish && toggleDate(d.isoDate)}
                                      />
                                      <div className="min-w-0 flex items-baseline gap-1">
                                        <span className="text-xs font-bold text-foreground capitalize">
                                          {d.dayShort}
                                        </span>
                                        <span className="font-mono text-xs font-semibold text-muted-foreground">
                                          {dayNum}
                                        </span>
                                      </div>
                                    </label>
                                  </ActionTooltip>

                                  {!canPublish && (
                                    <ActionTooltip content={val?.reason || "Não publicável"}>
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] py-0 px-1.5 cursor-help ${
                                          val?.isPast
                                            ? "bg-muted text-muted-foreground border-border"
                                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                        }`}
                                      >
                                        {val?.isPast ? "Passado" : "Incompleto"}
                                      </Badge>
                                    </ActionTooltip>
                                  )}
                                </div>

                                {/* Middle: Contagens */}
                                <div className="py-2.5 space-y-1">
                                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                                    <Users size={11} className="text-muted-foreground/70 flex-shrink-0" />
                                    <span>{d.assistantsCount} func. escalados</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/80 pl-4 font-mono truncate">
                                    {d.entriesCount} tarefas
                                  </p>
                                </div>

                                {/* Bottom: Botão Dedicado de Pré-visualização */}
                                <button
                                  type="button"
                                  onClick={() => setPreviewDate(d.isoDate)}
                                  className="w-full mt-1 py-1.5 px-2 rounded-lg border border-border bg-muted/40 hover:bg-primary hover:text-primary-foreground hover:border-transparent text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs text-foreground"
                                >
                                  <Eye size={12} />
                                  <span>Pré-visualizar</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Conteúdo Alternativo: Vista em Lista Detalhada */
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {draftDays.map((d) => {
                    const isChecked = selectedDates.includes(d.isoDate);
                    const val = validationsByDate[d.isoDate];
                    const canPublish = val?.canPublish ?? false;
                    return (
                      <div
                        key={d.isoDate}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isChecked
                            ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                            : !canPublish
                            ? "border-border/60 bg-muted/10 opacity-75"
                            : "border-border bg-card hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ActionTooltip content={!canPublish ? val?.reason : null}>
                            <div className={canPublish ? "" : "cursor-not-allowed"}>
                              <Checkbox
                                checked={isChecked}
                                disabled={!canPublish}
                                onCheckedChange={() => canPublish && toggleDate(d.isoDate)}
                              />
                            </div>
                          </ActionTooltip>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                              <span className="capitalize">{d.dayName}</span>
                              <span className="font-mono text-muted-foreground font-normal">
                                ({d.dateStr})
                              </span>
                              {!canPublish && (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] py-0 px-1.5 ${
                                    val?.isPast
                                      ? "bg-muted text-muted-foreground border-border"
                                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                  }`}
                                >
                                  {val?.isPast ? "Passado" : "Incompleto"}
                                </Badge>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Users size={11} />
                              <span>
                                {d.assistantsCount} {d.assistantsCount === 1 ? "assistente" : "assistentes"}
                              </span>
                              <span>·</span>
                              <span>{d.entriesCount} tarefas distribuídas</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDate(d.isoDate)}
                            className="px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-primary hover:text-primary-foreground hover:border-transparent text-foreground text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye size={12} />
                            <span>Pré-visualizar</span>
                          </button>

                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 py-0.5 flex-shrink-0"
                          >
                            <Clock size={10} />
                            Rascunho
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Caixa Informativa de Confirmação */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={14} />
                  O que acontece ao publicar?
                </p>
                <p className="leading-relaxed text-[11px]">
                  Os horários selecionados deixam de estar em modo rascunho e passam ao estado <strong>Publicada</strong>. Os assistentes operacionais poderão consultar de imediato os seus turnos e tarefas na sua área pessoal.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Padronizado da Plataforma */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/10 flex items-center justify-between w-full">
          <div>
            {previewDate && !isSingleDayMode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewDate(null)}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Voltar à lista</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPublishing}
              className="cursor-pointer"
            >
              Cancelar
            </Button>

            {draftDays.length > 0 && (
              <Button
                type="button"
                size="sm"
                disabled={selectedDates.length === 0 || isPublishing}
                onClick={handleConfirmPublish}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    A publicar...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Publicar {selectedDates.length} {selectedDates.length === 1 ? "Dia" : "Dias"}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
