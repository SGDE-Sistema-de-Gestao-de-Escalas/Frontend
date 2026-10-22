import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
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
  Lock,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserX,
} from "lucide-react";
import {
  assistants as ASSISTANTS,
  buildPlannedAssistantRow,
  generateDayMatrix,
  getAssistantShiftBounds,
  getDateInfo,
  getSchoolDayStatus,
  isAssistantAbsentOnDay,
  TIME_SLOTS,
  VIEW_START,
  VIEW_END,
  VIEW_SLOTS,
} from "../../api/mockData";
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
import CustomSelect from "../common/CustomSelect";
import { notify } from "../common/FeedbackNotification";
import {
  BLOCK_STYLES,
  formatDurationSlots,
  HOUR_LABELS,
  slotsToBlocks,
} from "./blockStyles";

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

const DAY_RULES_CATALOG: DayRuleConfig[] = [
  {
    id: "R-ACOLH",
    title: "Vigilância Portaria Manhã",
    state: "surveillance",
    startSlot: 28, // 07:00
    endSlot: 32, // 08:00
    min: 2,
    type: "mandatory",
    daysOfWeek: [0, 1, 2, 3, 4],
    priorityNames: ["1º Elena R.", "2º Bruno M.", "3º Fábio L."],
  },
  {
    id: "R-RECOLHA",
    title: "Recolha de Alunos",
    state: "collection",
    startSlot: 28, // 07:00
    endSlot: 32, // 08:00
    min: 1,
    type: "mandatory",
    daysOfWeek: [0, 1, 2, 3, 4],
    priorityNames: ["1º Daniel C.", "2º Kátia R."],
  },
  {
    id: "R-RECREIO",
    title: "Vigilância Intervalo Manhã",
    state: "surveillance",
    startSlot: 40, // 10:00
    endSlot: 44, // 11:00
    min: 2,
    type: "mandatory",
    daysOfWeek: [0, 1, 2, 3, 4],
    priorityNames: ["1º Graça N.", "2º João A.", "3º Fábio L."],
  },
  {
    id: "R-ENTREGA",
    title: "Entrega de Alunos",
    state: "delivery",
    startSlot: 40, // 10:00
    endSlot: 44, // 11:00
    min: 1,
    type: "mandatory",
    daysOfWeek: [0, 2, 4], // Seg, Qua, Sex
    priorityNames: ["1º Inês P.", "2º Carla S."],
  },
  {
    id: "R-LIMP-TARDE",
    title: "Limpeza Pavilhão / Salas",
    state: "cleaning",
    startSlot: 64, // 16:00
    endSlot: 68, // 17:00
    min: 1,
    type: "optional",
    daysOfWeek: [0, 1, 2, 3, 4],
    priorityNames: ["1º Carla S.", "2º Hugo M.", "3º Luís S."],
  },
];

interface MatrixGridProps {
  onSelectAssistant?: (id: EntityId) => void;
  matrix?: ScheduleMatrix;
  dayOffset?: number;
  onChangeDayOffset?: (offset: number) => void;
  dateLabel?: string;
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
}: MatrixGridProps) {
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

  const [paintType, setPaintType] = useState<BlockState>("work");
  const [focusActiveActivity, setFocusActiveActivity] = useState(true);
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(
    null
  );
  const [isPainting, setIsPainting] = useState(false);
  const [paintAid, setPaintAid] = useState<EntityId | null>(null);

  // Modals: Copy Schedule & Finish Validation
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceOffset, setCopySourceOffset] = useState<number>(0);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const dayInfo = getDateInfo(dayOffset);
  const schoolStatus = getSchoolDayStatus(dayOffset);
  const isPastDay = dayOffset < 0;
  const canEditCurrentDay = editMode && schoolStatus.isOpen && !isPastDay;

  // Base matrix for any dayOffset (taking into account already saved changes)
  function getCommittedMatrixForDay(offset: number): ScheduleMatrix {
    if (savedMatricesByDay[offset]) {
      return savedMatricesByDay[offset];
    }
    return generateDayMatrix(offset);
  }

  const baseDayMatrix = useMemo(
    () => getCommittedMatrixForDay(dayOffset),
    [savedMatricesByDay, dayOffset]
  );

  const effectiveMatrix: ScheduleMatrix = useMemo(() => {
    if (editMode && draftMatricesByDay[dayOffset]) {
      return draftMatricesByDay[dayOffset];
    }
    return baseDayMatrix;
  }, [editMode, draftMatricesByDay, dayOffset, baseDayMatrix]);

  // Active rules established for a given day of week
  function getRulesForDow(dow: number): DayRuleConfig[] {
    if (dow >= 5) return [];
    return DAY_RULES_CATALOG.filter((r) => r.daysOfWeek.includes(dow));
  }

  const rulesForToday = useMemo(
    () => (schoolStatus.isOpen ? getRulesForDow(dayInfo.dow) : []),
    [schoolStatus.isOpen, dayInfo.dow]
  );

  // Activities that apply to this day
  const availablePaintTypes = useMemo(() => {
    const ruleStates = new Set<BlockState>();
    rulesForToday.forEach((r) => ruleStates.add(r.state));
    const ordered: BlockState[] = ["work"];
    (
      ["surveillance", "collection", "delivery", "cleaning"] as BlockState[]
    ).forEach((s) => {
      if (ruleStates.has(s)) ordered.push(s);
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

  // Handle copying a schedule from `copySourceOffset` onto current `dayOffset`
  function handleConfirmCopySchedule() {
    if (!canEditCurrentDay) return;
    const sourceMatrix =
      draftMatricesByDay[copySourceOffset] ??
      getCommittedMatrixForDay(copySourceOffset);

    // Build full planned rows from the source day (even if someone was absent on source day, take their planned tasks)
    const sourceFullPlanned: ScheduleMatrix = {};
    const nextTargetDraft: ScheduleMatrix = {};

    ASSISTANTS.forEach((a) => {
      const sourceRow = sourceMatrix[a.id] || [];
      const wasSourceAllAbsent = sourceRow.every(
        (s) => s === "off" || s === "absent"
      );
      const effectiveSourceTasks = wasSourceAllAbsent
        ? buildPlannedAssistantRow(a.id)
        : [...sourceRow];

      sourceFullPlanned[a.id] = effectiveSourceTasks;

      // On the target day: if assistant is absent on target day, keep them absent in matrix (and show their copied tasks in the disabled bottom section!)
      const targetAbsent = isAssistantAbsentOnDay(a.id, dayOffset);
      if (targetAbsent.absent) {
        const bounds = getAssistantShiftBounds(a.id);
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
      [dayOffset]: nextTargetDraft,
    }));
    setCopiedFromByDay((prev) => ({
      ...prev,
      [dayOffset]: {
        sourceOffset: copySourceOffset,
        sourcePlannedMatrix: sourceFullPlanned,
      },
    }));
    setShowCopyModal(false);

    const srcInfo = getDateInfo(copySourceOffset);
    notify.success(
      `Escala de ${srcInfo.dayName} (${srcInfo.dateStr}) copiada para ${dayInfo.dayName} (${dayInfo.dateStr}).`,
      "Escala Copiada"
    );
  }

  // Split assistants into Working vs. Absent Today (at the bottom, disabled)
  const { workingAssistants, absentAssistants } = useMemo(() => {
    const working: typeof ASSISTANTS = [];
    const copiedInfo = copiedFromByDay[dayOffset];

    const absent: {
      assistant: (typeof ASSISTANTS)[0];
      reason: string;
      plannedRow: BlockState[];
      shiftBounds: ReturnType<typeof getAssistantShiftBounds>;
      copiedFromLabel?: string;
    }[] = [];

    ASSISTANTS.forEach((a) => {
      const absInfo = isAssistantAbsentOnDay(a.id, dayOffset);
      if (absInfo.absent) {
        const copiedRow = copiedInfo?.sourcePlannedMatrix?.[a.id];
        const srcDateInfo =
          copiedInfo !== undefined
            ? getDateInfo(copiedInfo.sourceOffset)
            : null;

        absent.push({
          assistant: a,
          reason: absInfo.reason || "Ausência Registada",
          plannedRow: copiedRow ?? buildPlannedAssistantRow(a.id),
          shiftBounds: getAssistantShiftBounds(a.id),
          copiedFromLabel: srcDateInfo
            ? `${srcDateInfo.dayShort} ${srcDateInfo.dateStr}`
            : undefined,
        });
      } else {
        working.push(a);
      }
    });

    return { workingAssistants: working, absentAssistants: absent };
  }, [dayOffset, copiedFromByDay]);

  // Evaluate rules & warnings for any given dayOffset + matrix
  function evaluateDaySchedule(targetOffset: number, mat: ScheduleMatrix) {
    const info = getDateInfo(targetOffset);
    const rules = getRulesForDow(info.dow);
    const workingOnDay = ASSISTANTS.filter(
      (a) => !isAssistantAbsentOnDay(a.id, targetOffset).absent
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
      const bounds = getAssistantShiftBounds(a.id);
      const outOfBoundsSlots: number[] = [];
      let lunchSlotsCount = 0;
      let activeWorkSlots = 0;

      for (let s = 0; s < row.length; s++) {
        const st = row[s];
        if (st !== "off" && st !== "absent") {
          activeWorkSlots++;
          if (s < bounds.startSlot || s >= bounds.endSlot) {
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
        const shiftStr = `${TIME_SLOTS[bounds.startSlot]}–${
          TIME_SLOTS[bounds.endSlot]
        }`;
        warnings.push({
          id: `oob-${a.id}`,
          severity: "warning",
          title: `Fora do horário do turno: ${a.name}`,
          detail: `Tem ${formatDurationSlots(
            outOfBoundsSlots.length
          )} (${firstOut}–${lastOut}) pintados fora do seu horário (${shiftStr}).`,
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

    return { ruleEvaluations: evaluations, liveWarnings: warnings };
  }

  const { ruleEvaluations, liveWarnings } = useMemo(
    () => evaluateDaySchedule(dayOffset, effectiveMatrix),
    [dayOffset, effectiveMatrix]
  );

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

        ASSISTANTS.forEach((a) => {
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
  }, [draftMatricesByDay, savedMatricesByDay, copiedFromByDay]);

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

  // Open days list for the "Copiar Escala" picker
  const copyableOpenDays = useMemo(() => {
    const list: { offset: number; label: string; isPast: boolean }[] = [];
    for (let off = -7; off <= 21; off++) {
      if (off === dayOffset) continue;
      const st = getSchoolDayStatus(off);
      if (!st.isOpen) continue;
      const inf = getDateInfo(off);
      list.push({
        offset: off,
        label: `${inf.dayName}, ${inf.dateStr}${off === 0 ? " (Hoje)" : ""}`,
        isPast: off < 0,
      });
    }
    return list;
  }, [dayOffset]);

  // Is activity spotlight active?
  const isSpotlightActive =
    editMode && focusActiveActivity && paintType !== "off";

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
                {isPastDay && (
                  <Badge
                    variant="outline"
                    className="text-[#D97706] border-[#D97706]/30 bg-[#D97706]/10 text-[10px]"
                  >
                    Dia Passado · Apenas Consulta
                  </Badge>
                )}
                {!schoolStatus.isOpen && (
                  <Badge
                    variant="outline"
                    className="text-muted-foreground border-border bg-muted/50 text-[10px]"
                  >
                    Encerrado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {dateLabel ?? `${dayInfo.dayName}, ${dayInfo.dateStr}`}
              </p>
            </div>

            {/* Day navigation inside Edit Mode so Admin can browse days */}
            {editMode && onChangeDayOffset && (
              <div className="flex items-center border border-primary/30 rounded-lg overflow-hidden bg-primary/5 ml-1">
                <button
                  type="button"
                  onClick={() => onChangeDayOffset(dayOffset - 1)}
                  className="px-2 py-1 hover:bg-primary/15 transition-colors border-r border-primary/20 text-primary"
                  title="Dia anterior"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="px-2.5 py-1 text-[11px] font-mono font-semibold text-primary flex items-center gap-1.5">
                  <Calendar size={11} />
                  {dayInfo.dayShort}, {dayInfo.dateStr}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeDayOffset(dayOffset + 1)}
                  className="px-2 py-1 hover:bg-primary/15 transition-colors border-l border-primary/20 text-primary"
                  title="Dia seguinte"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {!editMode &&
              schoolStatus.isOpen &&
              (
                [
                  "work",
                  "surveillance",
                  "cleaning",
                  "collection",
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

            {/* Copy Schedule button inside Edit Mode */}
            {canEditCurrentDay && (
              <button
                type="button"
                onClick={() => {
                  const defaultSrc =
                    copyableOpenDays.find((d) => d.offset === dayOffset - 1)
                      ?.offset ??
                    copyableOpenDays[0]?.offset ??
                    0;
                  setCopySourceOffset(defaultSrc);
                  setShowCopyModal(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-colors"
              >
                <Copy size={11} />
                Copiar Escala de Outro Dia
              </button>
            )}

            {editMode && draftMatricesByDay[dayOffset] && (
              <button
                type="button"
                onClick={() => discardDayDraft(dayOffset)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw size={11} />
                Repor Dia
              </button>
            )}

            {(schoolStatus.isOpen || editMode) && (
              <button
                type="button"
                disabled={!editMode && isPastDay}
                onClick={handleClickFinishButton}
                title={
                  !editMode && isPastDay
                    ? "Não é possível editar escalas de dias passados"
                    : undefined
                }
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
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* CASE 1: SCHOOL IS CLOSED TODAY (Weekend, Holiday, or School Exception) */}
        {/* Show ONLY the closed message without any assistant rows!            */}
        {/* =================================================================== */}
        {!schoolStatus.isOpen ? (
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
        ) : (
          /* =================================================================== */
          /* CASE 2: SCHOOL IS OPEN TODAY                                        */
          /* =================================================================== */
          <>
            {/* Past day read-only notice inside Edit Mode */}
            {editMode && isPastDay && (
              <div className="px-4 py-2.5 bg-[#FEF9EC] dark:bg-amber-950/30 border-b border-[#D97706]/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#D97706] font-medium">
                  <Eye size={14} />
                  <span>
                    Está a visualizar um <strong>dia passado</strong> (
                    {dayInfo.dayName}, {dayInfo.dateStr}). Dias passados estão
                    bloqueados para alteração, mas pode consultar o horário.
                  </span>
                </div>
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
                  <div className="lg:col-span-7 p-3.5 space-y-2">
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
                  <div className="lg:col-span-5 p-3.5 space-y-2 bg-card/50">
                    <div className="flex items-center justify-between">
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
                          Todas as regras obrigatórias estão cumpridas e nenhum
                          assistente tem blocos fora do seu horário de turno.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
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
              <div className="min-w-[920px]">
                {/* Hour header — 06h to 20h */}
                <div className="flex border-b border-border bg-muted/30">
                  <div className="w-44 flex-shrink-0 px-3 py-2 text-xs text-muted-foreground font-medium border-r border-border">
                    Assistente / Turno do Dia
                  </div>
                  <div className="flex flex-1 relative">
                    {HOUR_LABELS.slice(6, 21).map((h, i) => (
                      <div
                        key={i}
                        className="flex-none border-r border-border/50 text-center last:border-r-0"
                        style={{ width: `calc(100% / 15)` }}
                      >
                        <span className="text-[10px] font-mono text-muted-foreground px-1 py-1.5 block font-medium">
                          {h}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 1. WORKING ASSISTANTS ROWS */}
                {workingAssistants.map((assistant) => {
                  const rowSlots = effectiveMatrix[assistant.id] || [];
                  const bounds = getAssistantShiftBounds(assistant.id);
                  const shiftRangeStr = `${TIME_SLOTS[bounds.startSlot]}–${
                    TIME_SLOTS[bounds.endSlot]
                  }`;
                  const blocks = slotsToBlocks(rowSlots);

                  const hasOutOfBoundsPaint = rowSlots.some(
                    (st, sIdx) =>
                      st !== "off" &&
                      st !== "absent" &&
                      (sIdx < bounds.startSlot || sIdx >= bounds.endSlot)
                  );

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
                          onSelectAssistant?.(assistant.id)
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
                              <AlertTriangle
                                size={11}
                                className="text-[#D97706] flex-shrink-0"
                                title="Tem blocos pintados fora do seu horário de turno"
                              />
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

                      {/* Timeline Row (Works in both Normal View and Edit Mode using smooth rounded capsules!) */}
                      <div
                        className={`relative flex-1 ${
                          canEditCurrentDay
                            ? "h-14 bg-muted/20 select-none"
                            : "h-11 bg-muted/10"
                        }`}
                      >
                        {/* Background subtle hour gridlines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {Array.from({ length: 15 }, (_, hi) => (
                            <div
                              key={hi}
                              className="flex-none h-full border-r border-border/35 last:border-r-0"
                              style={{ width: `calc(100% / 15)` }}
                            />
                          ))}
                        </div>

                        {/* In Edit Mode: Shift Background Container Frame with generous padding around the inner capsule bars */}
                        {canEditCurrentDay && (
                          <div
                            className="absolute inset-y-1 bg-primary/6 border-2 border-dashed border-primary/40 rounded-xl pointer-events-none z-0"
                            style={{
                              left: `${
                                ((Math.max(bounds.startSlot, VIEW_START) -
                                  VIEW_START) /
                                  VIEW_SLOTS) *
                                100
                              }%`,
                              width: `${
                                ((Math.min(bounds.endSlot, VIEW_END) -
                                  Math.max(bounds.startSlot, VIEW_START)) /
                                  VIEW_SLOTS) *
                                100
                              }%`,
                            }}
                          >
                            <span className="absolute -top-0.5 left-2 px-1 bg-card text-[8px] font-mono font-semibold text-primary rounded">
                              Horário {shiftRangeStr}
                            </span>
                          </div>
                        )}

                        {/* Highlighted Rule Window (if Admin clicked a rule card above) */}
                        {canEditCurrentDay && highlightedRule && (
                          <div
                            className="absolute inset-y-0 bg-primary/12 border-x-2 border-primary pointer-events-none z-10"
                            style={{
                              left: `${
                                ((highlightedRule.startSlot - VIEW_START) /
                                  VIEW_SLOTS) *
                                100
                              }%`,
                              width: `${
                                ((highlightedRule.endSlot -
                                  highlightedRule.startSlot) /
                                  VIEW_SLOTS) *
                                100
                              }%`,
                            }}
                          />
                        )}

                        {/* Smooth Merged Capsule Activity Bars (with 4px inner margin inside the Shift Frame in Edit Mode so they never poke out!) */}
                        {blocks.map((b, bi) => {
                          const clipStart = Math.max(b.start, VIEW_START);
                          const clipEnd = Math.min(
                            b.start + b.count,
                            VIEW_END
                          );
                          if (b.state === "off" || clipEnd <= clipStart)
                            return null;

                          const visibleSlots = clipEnd - clipStart;
                          const styleConfig = BLOCK_STYLES[b.state];
                          const startTimeStr = TIME_SLOTS[b.start] ?? "";
                          const endTimeStr =
                            TIME_SLOTS[Math.min(b.start + b.count, 95)] ??
                            "24:00";
                          const durationStr = formatDurationSlots(b.count);

                          // Check if any part of this block is outside the assistant's shift
                          const isBlockOutOfShift =
                            b.start < bounds.startSlot ||
                            b.start + b.count > bounds.endSlot;

                          // Spotlight opacity logic when an activity is selected in Edit Mode
                          const isMatchesSpotlight = b.state === paintType;
                          const spotlightClass = isSpotlightActive
                            ? isMatchesSpotlight
                              ? "opacity-100 ring-2 ring-white/80 shadow-sm z-10"
                              : "opacity-30"
                            : "opacity-95 hover:opacity-100";

                          // Capsule corners: rounded on outer ends, straight where adjacent activities touch
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

                          const showFullLabel = visibleSlots >= 5;
                          const showShortIcon =
                            visibleSlots >= 2 && visibleSlots < 5;
                          const showDurationChip = visibleSlots >= 10;

                          const leftPct =
                            ((clipStart - VIEW_START) / VIEW_SLOTS) * 100;
                          const widthPct =
                            ((clipEnd - clipStart) / VIEW_SLOTS) * 100;

                          // In Edit Mode, inset the outer left/right edges by 4px so the capsule sits cleanly inside the dashed shift border!
                          const padLeftPx =
                            canEditCurrentDay && !b.hasPrevAdjacent ? 4 : 0;
                          const padRightPx =
                            canEditCurrentDay && !b.hasNextAdjacent ? 4 : 0;

                          const barElement = (
                            <div
                              key={bi}
                              onClick={() =>
                                !canEditCurrentDay &&
                                onSelectAssistant?.(assistant.id)
                              }
                              className={`absolute ${
                                canEditCurrentDay
                                  ? "inset-y-3 pointer-events-none"
                                  : "inset-y-1.5 cursor-pointer hover:brightness-110 hover:z-10 hover:ring-2 hover:ring-white/40"
                              } ${radiusClass} ${separatorClass} ${
                                styleConfig.bg
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
                              }}
                            >
                              {showFullLabel && (
                                <>
                                  <span className="flex-shrink-0 opacity-90">
                                    {styleConfig.icon}
                                  </span>
                                  <span className="text-[11px] font-semibold leading-none tracking-tight truncate drop-shadow-2xs">
                                    {styleConfig.label}
                                  </span>
                                  {showDurationChip && (
                                    <span className="ml-auto text-[9px] font-mono bg-black/15 px-1.5 py-0.5 rounded text-white/90 flex-shrink-0">
                                      {durationStr}
                                    </span>
                                  )}
                                  {styleConfig.locked && (
                                    <Lock
                                      size={10}
                                      className={`${
                                        showDurationChip ? "" : "ml-auto"
                                      } flex-shrink-0 text-white/80`}
                                    />
                                  )}
                                </>
                              )}

                              {showShortIcon && (
                                <div className="w-full flex items-center justify-center gap-0.5">
                                  <span className="opacity-95">
                                    {styleConfig.icon}
                                  </span>
                                  {styleConfig.locked && (
                                    <Lock size={8} className="text-white/80" />
                                  )}
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
                                      className={`w-2.5 h-2.5 rounded-full ${styleConfig.bg}`}
                                    />
                                    <span className="font-semibold text-xs text-foreground">
                                      {styleConfig.label}
                                    </span>
                                  </div>
                                  {styleConfig.locked && (
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
                            {Array.from({ length: VIEW_SLOTS }, (_, i) => {
                              const slot = VIEW_START + i;
                              const state = rowSlots[slot];
                              const isInsideShift =
                                slot >= bounds.startSlot &&
                                slot < bounds.endSlot;
                              const nextTime =
                                TIME_SLOTS[Math.min(slot + 1, 95)] ?? "24:00";

                              return (
                                <Tooltip key={slot}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="flex-none h-full cursor-crosshair group/slot flex items-center justify-center px-[1px]"
                                      style={{
                                        width: `${(1 / VIEW_SLOTS) * 100}%`,
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

                {/* 2. ABSENT ASSISTANTS SECTION (AT THE BOTTOM, DISABLED, SHOWING PLANNED OR COPIED TASKS) */}
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
                        const plannedBlocks = slotsToBlocks(plannedRow);

                        return (
                          <div
                            key={assistant.id}
                            className="flex border-b border-border/40 last:border-b-0 bg-muted/20 opacity-75 select-none"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                !canEditCurrentDay &&
                                onSelectAssistant?.(assistant.id)
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

                            {/* Timeline showing ONLY their planned/copied shift hours and tasks */}
                            <div className="relative flex-1 h-11 bg-muted/25 cursor-not-allowed">
                              {/* Background subtle hour gridlines */}
                              <div className="absolute inset-0 flex pointer-events-none">
                                {Array.from({ length: 15 }, (_, hi) => (
                                  <div
                                    key={hi}
                                    className="flex-none h-full border-r border-border/30 last:border-r-0"
                                    style={{ width: `calc(100% / 15)` }}
                                  />
                                ))}
                              </div>

                              {plannedBlocks.map((b, bi) => {
                                const clipStart = Math.max(b.start, VIEW_START);
                                const clipEnd = Math.min(
                                  b.start + b.count,
                                  VIEW_END
                                );
                                if (b.state === "off" || clipEnd <= clipStart)
                                  return null;

                                const visibleSlots = clipEnd - clipStart;
                                const styleConfig = BLOCK_STYLES[b.state];
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
                                            ((clipStart - VIEW_START) /
                                              VIEW_SLOTS) *
                                            100
                                          }%`,
                                          width: `${
                                            ((clipEnd - clipStart) /
                                              VIEW_SLOTS) *
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
                                              {styleConfig.label}
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
                                          Teria a cargo: {styleConfig.label}
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
          </>
        )}
      </Card>

      {/* ===================================================================== */}
      {/* MODAL 1: COPIAR ESCALA DE OUTRO DIA                                   */}
      {/* ===================================================================== */}
      <Dialog open={showCopyModal} onOpenChange={setShowCopyModal}>
        <DialogContent className="w-full max-w-md p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10">
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Copy size={15} className="text-primary" />
              Copiar Escala de Outro Dia
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Copia as tarefas e horários de outra data para{" "}
              <strong className="text-foreground">
                {dayInfo.dayName}, {dayInfo.dateStr}
              </strong>
            </p>
          </DialogHeader>

          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Seleciona a data de origem a copiar
              </label>
              <CustomSelect
                value={String(copySourceOffset)}
                onValueChange={(val) => setCopySourceOffset(Number(val))}
                options={copyableOpenDays.map((item) => ({
                  value: String(item.offset),
                  label: `${item.label}${item.isPast ? " · Dia Passado" : ""}`,
                }))}
              />
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
              Os assistentes que estão <strong>com falta</strong> em{" "}
              <span className="text-foreground font-medium">
                {dayInfo.dayName}, {dayInfo.dateStr}
              </span>{" "}
              continuarão desativados (<em>disabled</em>) no fim da lista, mas
              mostrarão as tarefas que tinham atribuídas na escala copiada para
              facilitar a redistribuição.
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
              onClick={handleConfirmCopySchedule}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              <Copy size={12} />
              Copiar Escala
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

                    <button
                      type="button"
                      onClick={() => discardDayDraft(item.offset)}
                      className="text-[11px] text-destructive hover:underline flex items-center gap-1"
                      title="Anular alterações feitas neste dia"
                    >
                      <Trash2 size={11} />
                      Descartar este dia
                    </button>
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
    </TooltipProvider>
  );
}
