import React, { useMemo } from "react";
import { Eye, Loader2, Lock, UserX } from "lucide-react";
import type { BlockState, EntityId } from "../../types";
import { Badge } from "../ui/badge";
import { Sheet, SheetContent } from "../ui/sheet";
import { BLOCK_STYLES, formatDurationSlots, slotsToBlocks, TIME_SLOTS } from "./blockStyles";
import { useAssistantsList } from "../../hooks/api/useAssistants";
import { useSchedulesList } from "../../hooks/api/useSchedules";
import { useAbsencesList } from "../../hooks/api/useAbsences";
import {
  useOperatingCalendar,
  useOperatingExceptions,
  useOperatingRules,
} from "../../hooks/api/useOperatingHours";
import { useHolidaysList } from "../../hooks/api/useHolidays";
import {
  buildDayMatrixFromApi,
  getDateInfo,
  hasGeneratedScheduleForDate,
  resolveSchoolDayStatusByIsoDate,
} from "../../utils/scheduleMatrixUtils";
import type { LunchBlockApi } from "../../api/services/schedules.service";

interface AssistantDayModalProps {
  assistantId: EntityId | null;
  dayOffset?: number;
  lunchBlocksByDate?: Record<string, Record<string, LunchBlockApi>>;
  onClose: () => void;
  onViewProfile: () => void;
  onMarkAbsence: (assistantName: string) => void;
}

export default function AssistantDayModal({
  assistantId,
  dayOffset = 0,
  lunchBlocksByDate,
  onClose,
  onViewProfile,
  onMarkAbsence,
}: AssistantDayModalProps) {
  const dayInfo = getDateInfo(dayOffset);

  const { data: assistants = [] } = useAssistantsList();
  const { data: schedules = [], isLoading: isLoadingSchedules } = useSchedulesList({
    start_date: dayInfo.isoDate,
    end_date: dayInfo.isoDate,
  });
  const { data: absencesRes } = useAbsencesList({
    start_date: dayInfo.isoDate,
    end_date: dayInfo.isoDate,
    per_page: 100,
  });
  const { data: calendarDays = [] } = useOperatingCalendar(
    dayInfo.isoDate,
    dayInfo.isoDate
  );
  const { data: operatingRules = [] } = useOperatingRules();
  const { data: operatingExceptions = [] } = useOperatingExceptions();
  const { data: holidays = [] } = useHolidaysList();

  const operatingSources = useMemo(
    () => ({
      calendarDays,
      operatingRules,
      operatingExceptions,
      holidays,
    }),
    [calendarDays, operatingRules, operatingExceptions, holidays]
  );

  const schoolStatus = useMemo(
    () => resolveSchoolDayStatusByIsoDate(dayInfo.isoDate, operatingSources),
    [dayInfo.isoDate, operatingSources]
  );

  if (assistantId === null) return null;

  const assistant = assistants.find((a) => String(a.id) === String(assistantId));
  if (!assistant) return null;

  const hasScheduleGenerated = hasGeneratedScheduleForDate(
    dayInfo.isoDate,
    schedules
  );

  const { matrix, slotMetaByAssistant } = buildDayMatrixFromApi({
    isoDate: dayInfo.isoDate,
    isOpen: schoolStatus.isOpen,
    assistants: [assistant],
    schedules,
    absences: absencesRes?.data || [],
    lunchBlocksForDate: lunchBlocksByDate?.[dayInfo.isoDate],
  });

  const slots = matrix[assistant.id] || Array(96).fill("off");
  const meta = slotMetaByAssistant[assistant.id] || {};
  const blocks = slotsToBlocks(slots, meta).filter((b) => b.state !== "off");

  const colorMap: Record<BlockState, string> = {
    work: "border-l-[#6366F1] bg-[#6366F1]/8",
    surveillance: "border-l-[#A855F7] bg-[#A855F7]/8",
    lunch: "border-l-[#F59E0B] bg-[#F59E0B]/8",
    absent: "border-l-destructive bg-destructive/8",
    off: "border-l-border bg-muted/10",
    cleaning: "border-l-[#06B6D4] bg-[#06B6D4]/8",
    collection: "border-l-[#EC4899] bg-[#EC4899]/8",
    delivery: "border-l-[#10B981] bg-[#10B981]/8",
  };

  const textMap: Record<BlockState, string> = {
    work: "text-[#6366F1]",
    surveillance: "text-[#A855F7]",
    lunch: "text-[#F59E0B]",
    absent: "text-destructive",
    off: "text-muted-foreground",
    cleaning: "text-[#06B6D4]",
    collection: "text-[#EC4899]",
    delivery: "text-[#10B981]",
  };

  const summary = {
    work: 0,
    surveillance: 0,
    cleaning: 0,
    collection: 0,
    delivery: 0,
    lunch: 0,
  };
  slots.forEach((s) => {
    if (s in summary) summary[s as keyof typeof summary]++;
  });

  const toH = (n: number) => {
    const mins = n * 15;
    return `${Math.floor(mins / 60)}h${
      mins % 60 ? String(mins % 60).padStart(2, "0") : ""
    }`;
  };

  return (
    <Sheet open={assistantId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-80 sm:w-96 p-0 border-l border-border bg-card shadow-2xl flex flex-col h-full"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start gap-3 bg-muted/10">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary font-mono">
              {assistant.initials}
            </span>
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="font-semibold text-foreground text-sm truncate">
              {assistant.name}
            </h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {dayInfo.dateStr} ({dayInfo.dayName}) · Horário do dia
            </p>
            {assistant.exception && (
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className="text-[#D97706] border-[#D97706]/30 bg-[#D97706]/10 text-[10px]"
                >
                  {assistant.exception}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 py-3 border-b border-border grid grid-cols-3 gap-2 bg-card">
          {[
            {
              label: "Trabalho",
              value: toH(
                summary.work +
                  summary.cleaning +
                  summary.collection +
                  summary.delivery
              ),
              color: "text-[#6366F1]",
            },
            {
              label: "Vigilância",
              value: toH(summary.surveillance),
              color: "text-[#A855F7]",
            },
            {
              label: "Pausa",
              value: toH(summary.lunch),
              color: "text-[#F59E0B]",
            },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-sm font-mono font-semibold ${s.color}`}>
                {s.value}
              </p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {isLoadingSchedules ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
              <Loader2 size={22} className="animate-spin text-primary" />
              <p className="text-xs">A carregar tarefas do dia...</p>
            </div>
          ) : !schoolStatus.isOpen ? (
            <div className="text-center py-12 px-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {schoolStatus.title}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {schoolStatus.detail}
              </p>
            </div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-1.5 text-muted-foreground">
              <p className="text-sm font-medium text-foreground">
                {!hasScheduleGenerated
                  ? "A escala ainda não foi gerada para este dia"
                  : "Sem tarefas atribuídas neste dia"}
              </p>
              <p className="text-xs text-muted-foreground">
                {!hasScheduleGenerated
                  ? `Ainda não existem tarefas geradas para ${dayInfo.dayName}, ${dayInfo.dateStr}.`
                  : "O assistente não tem atividades nem vigilâncias escaladas para este dia."}
              </p>
            </div>
          ) : (
            blocks.map((block, i) => {
              const startTime = TIME_SLOTS[block.start];
              const endTime =
                TIME_SLOTS[Math.min(block.start + block.count, 95)] || "24:00";
              const durationStr = formatDurationSlots(block.count);
              const styleConfig = BLOCK_STYLES[block.state];
              const activityLabel = block.activityName || styleConfig.label;

              return (
                <div
                  key={`${block.start}-${i}`}
                  className={`border-l-4 rounded-r-lg px-3.5 py-2.5 transition-all shadow-2xs ${
                    block.state === "lunch"
                      ? "border-l-[#F59E0B] bg-[#F59E0B]/8"
                      : block.state === "absent"
                      ? "border-l-destructive bg-destructive/8"
                      : colorMap[block.state] || "border-l-primary bg-primary/5"
                  }`}
                  style={
                    block.activityColor
                      ? { borderLeftColor: block.activityColor }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="text-xs font-semibold truncate"
                        style={
                          block.activityColor
                            ? { color: block.activityColor }
                            : undefined
                        }
                      >
                        {activityLabel}
                      </span>
                      {block.isFallback && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-medium">
                          Base
                        </span>
                      )}
                      {block.isLocked && (
                        <Lock
                          size={11}
                          className="text-muted-foreground shrink-0"
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0 font-medium">
                      {durationStr}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-muted-foreground">
                    <span>
                      {startTime} – {endTime}
                    </span>
                    <span className="uppercase text-[9px] tracking-wide text-muted-foreground/80 font-sans">
                      {styleConfig.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border space-y-2 bg-muted/10">
          <button
            type="button"
            onClick={() => {
              onClose();
              onMarkAbsence(assistant.name);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium hover:bg-destructive/20 transition-colors cursor-pointer"
          >
            <UserX size={14} />
            Marcar Falta
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewProfile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Eye size={14} />
            Ver Perfil Completo
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
