import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Building2,
  Calendar,
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns2,
  LayoutGrid,
  List,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { BlockState, EntityId, StaffViewMode } from "../../types";
import {
  BLOCK_STYLES,
  formatDurationSlots,
  slotsToBlocks,
  TIME_SLOTS,
  VIEW_START,
  VIEW_END,
} from "../dashboard/blockStyles";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { Button } from "../ui/button";
import DatePicker from "../common/DatePicker";
import DateRangePicker, { type DateRange } from "../common/DateRangePicker";
import { useAuth } from "../../context/AuthContext";
import { useSchedulesList } from "../../hooks/api/useSchedules";
import { useAbsencesList } from "../../hooks/api/useAbsences";
import {
  useOperatingCalendar,
  useOperatingExceptions,
  useOperatingRules,
} from "../../hooks/api/useOperatingHours";
import { useHolidaysList } from "../../hooks/api/useHolidays";
import { useAllAssistantSchedules } from "../../hooks/api/useAssistantSchedules";
import { useAllAssistantExceptions } from "../../hooks/api/useAssistantExceptions";
import {
  buildDayMatrixFromApi,
  getDateInfo,
  getIsoDateFromOffset,
  getMondayOffsetFromDayOffset,
  getOffsetFromIsoDate,
  getRealMonthsRange,
  getSchedulePublishStatusForDate,
  resolveAssistantShiftBounds,
  resolveSchoolDayStatusByIsoDate,
  type AssistantScheduleProfileApi,
  type AssistantExceptionApi,
} from "../../utils/scheduleMatrixUtils";

/**
 * Retorna a cor exata configurada para o bloco/atividade.
 */
export function getBlockDisplayColor(block: {
  state: BlockState;
  activityColor?: string | null;
  activityName?: string;
}): string {
  if (block.activityColor) {
    if (
      block.activityColor === "#EF4444" &&
      (block.activityName?.toLowerCase().includes("vigilância almoço") ||
        block.activityName?.toLowerCase().includes("vigilancia almoco"))
    ) {
      return "#A855F7";
    }
    return block.activityColor;
  }
  switch (block.state) {
    case "work":
      return "#3B82F6";
    case "collection":
      return "#F59E0B";
    case "surveillance":
      return "#A855F7";
    case "lunch":
      return "#F97316";
    case "cleaning":
      return "#8B5CF6";
    case "delivery":
      return "#14B8A6";
    case "absent":
      return "#EF4444";
    case "off":
    default:
      return "transparent";
  }
}

/**
 * Hook com pré-carregamento por intervalo (-7 a +21 dias, idêntico ao Admin)
 * para transições de dia instantâneas e sem qualquer efeito de ecrã em branco/flicker.
 */
function useStaffScheduleData(
  dayOffset: number,
  targetAssistantId?: EntityId,
  targetAssistantName?: string,
  targetSchoolId?: EntityId
) {
  const { user } = useAuth();
  const info = getDateInfo(dayOffset);
  const effectiveAssistantId = targetAssistantId ?? user.assistant_id ?? user.id ?? "staff";
  const effectiveSchoolId = targetSchoolId ?? user.school_id;
  const effectiveName = targetAssistantName ?? user.name ?? "Assistente";
  const effectiveInitials = targetAssistantName
    ? targetAssistantName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : user.initials || "AO";
  const assistantId = effectiveAssistantId;

  // Intervalo em cache: 1 semana para trás e 3 semanas para a frente (como no Admin)
  const [loadedRange, setLoadedRange] = useState(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 7);
    const end = new Date(today);
    end.setDate(today.getDate() + 21);
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  });

  // Expandir intervalo caso o utilizador navegue para lá do buffer carregado
  useEffect(() => {
    setLoadedRange((prev) => {
      let newStart = prev.start;
      let newEnd = prev.end;
      if (info.isoDate < prev.start) {
        const d = new Date(info.isoDate);
        d.setDate(d.getDate() - 7);
        newStart = d.toISOString().split("T")[0];
      }
      if (info.isoDate > prev.end) {
        const d = new Date(info.isoDate);
        d.setDate(d.getDate() + 14);
        newEnd = d.toISOString().split("T")[0];
      }
      if (newStart === prev.start && newEnd === prev.end) return prev;
      return { start: newStart, end: newEnd };
    });
  }, [info.isoDate]);

  const { data: schedules = [], isLoading: isLoadingSchedules } =
    useSchedulesList({
      start_date: loadedRange.start,
      end_date: loadedRange.end,
      assistant_id: effectiveAssistantId !== "staff" ? effectiveAssistantId : undefined,
      per_page: 250,
    });

  const { data: absencesRes } = useAbsencesList({
    start_date: loadedRange.start,
    end_date: loadedRange.end,
    assistant_id: effectiveAssistantId !== "staff" ? effectiveAssistantId : undefined,
    per_page: 100,
  });

  const { data: calendarDays } = useOperatingCalendar(
    loadedRange.start,
    loadedRange.end
  );
  const { data: holidays } = useHolidaysList();
  const { data: operatingExceptions } = useOperatingExceptions("all");
  const { data: operatingRules } = useOperatingRules("all");

  const { data: allAssistantSchedules = [] } = useAllAssistantSchedules();
  const { data: allAssistantExceptions = [] } = useAllAssistantExceptions();

  const profilesByAssistant = useMemo(() => {
    const map: Record<string, AssistantScheduleProfileApi[]> = {};
    allAssistantSchedules.forEach((p) => {
      const aid = String(p.assistant_id);
      if (!map[aid]) map[aid] = [];
      map[aid].push(p);
    });
    return map;
  }, [allAssistantSchedules]);

  const exceptionsByAssistant = useMemo(() => {
    const map: Record<string, AssistantExceptionApi[]> = {};
    allAssistantExceptions.forEach((e) => {
      const aid = String(e.assistant_id);
      if (!map[aid]) map[aid] = [];
      map[aid].push(e);
    });
    return map;
  }, [allAssistantExceptions]);

  const dayData = useMemo(() => {
    const dummyAssistant = {
      id: assistantId,
      name: effectiveName,
      initials: effectiveInitials,
    };

    const targetId = assistantId;

    const dayStatus = resolveSchoolDayStatusByIsoDate(info.isoDate, {
      calendarDays,
      holidays,
      operatingExceptions,
      operatingRules,
    });

    const isSchoolOpen = dayStatus.isOpen;

    // Obter limites de turno e exceções específicas deste assistente para o dia
    const shiftBounds = resolveAssistantShiftBounds({
      assistantId: targetId,
      isoDate: info.isoDate,
      dow: info.dow,
      viewStartSlot: dayStatus.viewStartSlot ?? VIEW_START,
      viewEndSlot: dayStatus.viewEndSlot ?? VIEW_END,
      profiles: profilesByAssistant[String(targetId)],
      exceptions: exceptionsByAssistant[String(targetId)],
      schedulesList: schedules,
      absences: absencesRes?.data || [],
    });

    const { matrix, slotMetaByAssistant } = buildDayMatrixFromApi({
      isoDate: info.isoDate,
      isOpen: isSchoolOpen,
      assistants: [{ ...dummyAssistant, id: targetId }],
      schedules,
      absences: absencesRes?.data || [],
      profilesByAssistant,
      exceptionsByAssistant,
    });

    const slots = matrix[targetId] || Array(96).fill("off");
    const meta = slotMetaByAssistant?.[targetId] || {};
    const blocks = slotsToBlocks(slots, meta);

    return {
      slots,
      blocks,
      shiftBounds,
      dayStatus,
      targetId,
    };
  }, [
    info.isoDate,
    info.dow,
    assistantId,
    user,
    schedules,
    absencesRes,
    calendarDays,
    holidays,
    operatingExceptions,
    operatingRules,
    profilesByAssistant,
    exceptionsByAssistant,
  ]);

  return {
    ...dayData,
    schedules,
    absencesRes,
    profilesByAssistant,
    exceptionsByAssistant,
    isLoading: isLoadingSchedules && schedules.length === 0,
  };
}

/**
 * Vista Diária do Horário do Assistente
 */
export function StaffDayView({
  dayOffset,
  targetAssistantId,
  targetAssistantName,
  targetSchoolId,
}: {
  dayOffset: number;
  targetAssistantId?: EntityId;
  targetAssistantName?: string;
  targetSchoolId?: EntityId;
}) {
  const info = getDateInfo(dayOffset);
  const { slots, blocks, shiftBounds, dayStatus, schedules, isLoading } =
    useStaffScheduleData(dayOffset, targetAssistantId, targetAssistantName, targetSchoolId);

  const activeBlocks = blocks.filter((b) => b.state !== "off");

  // 1. Verificar se a escola está encerrada (Fim de semana, feriado, férias, tolerância)
  const isSchoolClosed = !dayStatus.isOpen;

  // 2. Verificar se o horário já foi gerado e publicado para esta data
  const publishInfo = getSchedulePublishStatusForDate(info.isoDate, schedules);
  const isPublished = publishInfo.isPublished;
  const hasWork = activeBlocks.length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 size={24} className="animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-foreground">
          A carregar o seu horário...
        </p>
      </div>
    );
  }

  // CASO A: A escola encontra-se encerrada (Feriado, Fim de semana, Férias ou encerramento oficial por Exceção)
  if (isSchoolClosed) {
    const isException = dayStatus.reasonType === "exception";
    const isHoliday = dayStatus.reasonType === "holiday";
    const title =
      dayStatus.title ||
      (isException
        ? "Encerramento Excecional"
        : isHoliday
        ? "Feriado"
        : "Dia de Descanso");
    const detail =
      dayStatus.detail ||
      (isException
        ? `A escola encontra-se encerrada por exceção de funcionamento (${dayStatus.closedLabel || "Exceção"}).`
        : isHoliday
        ? `Feriado (${dayStatus.closedLabel || "Feriado"}).`
        : "Hoje não tem serviço agendado. Desfrute do seu dia de descanso e aproveite o tempo com o que e quem mais gosta.");

    return (
      <div className="pt-2 pb-12">
        <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto shadow-xs my-6 flex flex-col items-center">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3 ${
              isException
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : isHoliday
                ? "bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20"
                : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {isException ? (
              <Building2 size={22} className="text-destructive" />
            ) : isHoliday ? (
              <Sparkles size={22} className="text-[#D97706]" />
            ) : (
              <CalendarOff size={22} className="text-muted-foreground" />
            )}
          </div>
          {isException && (
            <Badge
              variant="outline"
              className="mb-2 text-destructive border-destructive/30 bg-destructive/5 text-xs font-semibold"
            >
              Encerramento Excecional
            </Badge>
          )}
          {isHoliday && (
            <Badge
              variant="outline"
              className="mb-2 text-[#D97706] border-[#D97706]/30 bg-[#D97706]/5 text-xs font-semibold"
            >
              Feriado
            </Badge>
          )}
          <h3 className="text-lg font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {info.dayName}, {info.dateStr}
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            {detail}
          </p>
        </div>
      </div>
    );
  }

  // CASO B: A escola está aberta, MAS o horário ainda não foi gerado ou publicado pela direção
  if (!isSchoolClosed && !isPublished) {
    return (
      <div className="pt-2 pb-12">
        <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto shadow-xs my-6 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2.5">
            <Clock size={22} className="text-amber-600" />
          </div>
          <Badge
            variant="outline"
            className="text-[11px] py-0.5 px-2.5 border-amber-500/30 text-amber-600 bg-amber-500/10 font-medium mb-3"
          >
            {publishInfo.status === "draft"
              ? "Escala em Preparação"
              : "Horário Não Publicado"}
          </Badge>
          <h3 className="text-lg font-semibold text-foreground">
            Escala Não Disponível
          </h3>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {info.dayName}, {info.dateStr}
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-md">
            A escala de serviço para este dia ainda não foi gerada ou publicada pela direção escolar. Logo que esteja finalizada e publicada, poderá consultar aqui os seus horários e tarefas atribuídas.
          </p>
        </div>
      </div>
    );
  }

  const hasDefinedShift =
    shiftBounds.startSlot !== null &&
    shiftBounds.endSlot !== null &&
    shiftBounds.endSlot > shiftBounds.startSlot;

  // CASO C: A escola está aberta, a escala foi publicada, e este assistente tem folga / dia de descanso atribuído (sem turno nem serviço)
  if (!isSchoolClosed && isPublished && !hasWork && !hasDefinedShift) {
    return (
      <div className="pt-2 pb-12">
        <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto shadow-xs my-6 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
            <Sparkles size={22} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Dia de Descanso
          </h3>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {info.dayName}, {info.dateStr}
          </p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Hoje não tem serviço agendado. Desfrute do seu dia de descanso e
            aproveite o tempo com o que e quem mais gosta.
          </p>
        </div>
      </div>
    );
  }

  // CASO D: Escola aberta, horário publicado e assistente tem tarefas atribuídas
  const entryBlock = activeBlocks.find((b) => b.state !== "absent");
  const lastBlock = [...activeBlocks]
    .reverse()
    .find((b) => b.state !== "absent");

  const assistantShiftStart =
    shiftBounds.startSlot ?? (entryBlock ? entryBlock.start : 32);
  const assistantShiftEnd =
    shiftBounds.endSlot ??
    (lastBlock ? lastBlock.start + lastBlock.count : 68);

  const barStart = assistantShiftStart;
  const barEnd = Math.max(assistantShiftStart + 4, assistantShiftEnd);
  const barSlots = Math.max(1, barEnd - barStart);

  const activeWorkSlots = slots.filter(
    (s) => s !== "off" && s !== "lunch" && s !== "absent"
  ).length;
  const workloadLabel =
    activeWorkSlots > 0 ? formatDurationSlots(activeWorkSlots) : "—";

  const { user } = useAuth();
  const effectiveSchoolId = targetSchoolId ?? user?.school_id;
  const daySchedule = schedules.find((sc) => {
    if (sc.entries && sc.entries.length > 0) {
      return sc.entries.some((entry) => entry.date?.slice(0, 10) === info.isoDate);
    }
    const ws = (sc.week_start || "").slice(0, 10);
    const we = (sc.week_end || "").slice(0, 10);
    return Boolean(ws && we && ws <= info.isoDate && info.isoDate <= we);
  });

  const isTemporaryTransfer = Boolean(
    daySchedule?.is_temporary_transfer ||
    (daySchedule?.school_id && effectiveSchoolId && String(daySchedule.school_id) !== String(effectiveSchoolId))
  );

  return (
    <div className="pt-2 pb-8 space-y-4">
      {isTemporaryTransfer && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium">
          <ArrowRightLeft size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            Colocação em <strong>{daySchedule?.school_name || "outra escola"}</strong> (Transferência Temporária)
            {daySchedule?.origin_school_name && (
              <span className="text-muted-foreground ml-1.5 font-normal">
                · Escola de origem: {daySchedule.origin_school_name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3 Cartões de Resumo do Dia */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {[
          {
            label: "Entrada",
            value: TIME_SLOTS[assistantShiftStart] || "—",
          },
          {
            label: "Saída",
            value: TIME_SLOTS[assistantShiftEnd] || "—",
          },
          { label: "Carga Diária", value: workloadLabel },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl p-3 sm:p-3.5 text-center shadow-xs"
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-base sm:text-lg font-mono font-semibold text-foreground mt-0.5">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Linha Temporal Contínua com a mesma estética do Admin (cantos contínuos entre blocos) */}
      <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Horário do Turno
          </span>
          <span className="text-xs font-mono font-medium text-foreground">
            {TIME_SLOTS[barStart]} — {TIME_SLOTS[barEnd] || "24:00"}
          </span>
        </div>

        <div className="relative h-11 w-full bg-muted/40 rounded-lg p-1 border border-border/50 overflow-hidden">
          {activeBlocks.map((b, i) => {
            const cs = Math.max(b.start, barStart);
            const ce = Math.min(b.start + b.count, barEnd);
            if (ce <= cs) return null;

            const leftPct = ((cs - barStart) / barSlots) * 100;
            const widthPct = ((ce - cs) / barSlots) * 100;
            const color = getBlockDisplayColor(b);
            const name =
              b.activityName || BLOCK_STYLES[b.state]?.label || "Atividade";
            const timeStr = `${TIME_SLOTS[b.start]} – ${
              TIME_SLOTS[b.start + b.count] || "24:00"
            }`;
            const dMin = b.count * 15;
            const dStr =
              dMin >= 60
                ? `${Math.floor(dMin / 60)}h${
                    dMin % 60 > 0 ? ` ${dMin % 60}m` : ""
                  }`
                : `${dMin}m`;

            // Mesma regra de cantos do Admin: sem cantos arredondados quando encostado a outro bloco
            const radiusClass =
              b.hasPrevAdjacent && b.hasNextAdjacent
                ? "rounded-none"
                : b.hasPrevAdjacent
                ? "rounded-l-none rounded-r-md"
                : b.hasNextAdjacent
                ? "rounded-l-md rounded-r-none"
                : "rounded-md";

            const separatorClass = b.hasPrevAdjacent
              ? "border-l-[1.5px] border-card/90"
              : "";

            const showLabel = widthPct >= 10;
            const showDurationChip = widthPct >= 22;

            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className={`absolute inset-y-1 ${radiusClass} ${separatorClass} text-white shadow-2xs overflow-hidden transition-all flex items-center px-2 gap-1.5 text-left cursor-default hover:brightness-110 hover:z-10`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor: color,
                    }}
                  >
                    {showLabel && (
                      <span className="truncate text-xs font-medium tracking-tight">
                        {name}
                      </span>
                    )}
                    {showDurationChip && (
                      <span className="shrink-0 rounded bg-black/15 px-1 py-0.2 font-mono text-[9px] text-white/90">
                        {dStr}
                      </span>
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
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-semibold text-xs text-foreground">
                        {name}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-border/60 space-y-0.5">
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {timeStr}{" "}
                      <span className="text-foreground/80 font-semibold">
                        ({dStr})
                      </span>
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Marcadores de hora sob a barra (início e fim do turno do assistente) */}
        <div className="relative w-full h-4 mt-1.5 flex justify-between text-[10px] font-mono text-muted-foreground/70 px-0.5">
          <span>{TIME_SLOTS[barStart]}</span>
          {barSlots > 12 && (
            <span>{TIME_SLOTS[Math.round((barStart + barEnd) / 2)]}</span>
          )}
          <span>{TIME_SLOTS[barEnd] || "24:00"}</span>
        </div>
      </div>

      {/* Lista Limpa de Tarefas (Sem ícones desnecessários, cores oficiais e duração) */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1">
          Tarefas Agendadas
        </h3>

        {activeBlocks.length === 0 ? (
          <div className="text-center py-8 bg-card border border-border rounded-xl">
            <p className="text-sm text-muted-foreground">
              Sem tarefas específicas atribuídas para este turno.
            </p>
          </div>
        ) : (
          activeBlocks.map((block, i) => {
            const startTime = TIME_SLOTS[block.start];
            const endTime =
              TIME_SLOTS[block.start + block.count] || "24:00";
            const dMin = block.count * 15;
            const dStr =
              dMin >= 60
                ? `${Math.floor(dMin / 60)}h${
                    dMin % 60 > 0 ? ` ${dMin % 60}min` : ""
                  }`
                : `${dMin}min`;
            const color = getBlockDisplayColor(block);
            const name =
              block.activityName ||
              BLOCK_STYLES[block.state]?.label ||
              "Atividade";

            return (
              <div
                key={i}
                className="bg-card border border-border hover:border-accent/40 rounded-xl p-3.5 sm:p-4 transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-2.5 sm:w-3 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-base font-semibold text-foreground truncate">
                        {name}
                      </p>
                      {block.state === "lunch" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 border-orange-500/30 text-orange-600 bg-orange-500/10"
                        >
                          Pausa
                        </Badge>
                      )}
                      {block.state === "absent" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 border-destructive/30 text-destructive bg-destructive/10"
                        >
                          Ausência
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {startTime} – {endTime}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-muted text-xs font-mono font-medium text-muted-foreground border border-border/40">
                    {dStr}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Vista Semanal do Horário do Assistente
 */
export function StaffWeekView({
  weekStart,
  onSelectDay,
  targetAssistantId,
  targetAssistantName,
  targetSchoolId,
}: {
  weekStart: number;
  onSelectDay: (o: number) => void;
  targetAssistantId?: EntityId;
  targetAssistantName?: string;
  targetSchoolId?: EntityId;
}) {
  const { user } = useAuth();
  const effectiveAssistantId = targetAssistantId ?? user.assistant_id ?? undefined;
  const effectiveSchoolId = targetSchoolId ?? user.school_id;
  const effectiveName = targetAssistantName ?? user.name ?? "Assistente";
  const effectiveInitials = targetAssistantName
    ? targetAssistantName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : user.initials || "AO";
  const offsets = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart + i),
    [weekStart]
  );
  const startInfo = getDateInfo(offsets[0]);
  const endInfo = getDateInfo(offsets[6]);

  const { data: schedules = [], isLoading: isLoadingSchedules } = useSchedulesList({
    start_date: startInfo.isoDate,
    end_date: endInfo.isoDate,
    assistant_id: effectiveAssistantId,
    per_page: 200,
  });
  const { data: absencesRes } = useAbsencesList({
    start_date: startInfo.isoDate,
    end_date: endInfo.isoDate,
    assistant_id: effectiveAssistantId,
    per_page: 50,
  });
  const { data: calendarDays } = useOperatingCalendar(
    startInfo.isoDate,
    endInfo.isoDate
  );
  const { data: holidays } = useHolidaysList();
  const { data: operatingExceptions } = useOperatingExceptions("all");
  const { data: operatingRules } = useOperatingRules("all");
  const { data: allAssistantSchedules = [] } = useAllAssistantSchedules();
  const { data: allAssistantExceptions = [] } = useAllAssistantExceptions();

  const targetId = (effectiveAssistantId as string) ?? "staff";

  const profilesByAssistant = useMemo(() => {
    const map: Record<string, AssistantScheduleProfileApi[]> = {};
    allAssistantSchedules.forEach((p) => {
      const aid = String(p.assistant_id);
      if (!map[aid]) map[aid] = [];
      map[aid].push(p);
    });
    return map;
  }, [allAssistantSchedules]);

  const exceptionsByAssistant = useMemo(() => {
    const map: Record<string, AssistantExceptionApi[]> = {};
    allAssistantExceptions.forEach((e) => {
      const aid = String(e.assistant_id);
      if (!map[aid]) map[aid] = [];
      map[aid].push(e);
    });
    return map;
  }, [allAssistantExceptions]);

  return (
    <div className="pt-2 pb-6 space-y-2.5">
      {offsets.map((offset) => {
        const info = getDateInfo(offset);
        const isToday = offset === 0;
        const status = resolveSchoolDayStatusByIsoDate(info.isoDate, {
          calendarDays,
          holidays,
          operatingExceptions,
          operatingRules,
        });
        const isClosed = !status.isOpen;

        const { matrix, slotMetaByAssistant } = buildDayMatrixFromApi({
          isoDate: info.isoDate,
          isOpen: !isClosed,
          assistants: [
            {
              id: targetId,
              name: user.name || "Assistente",
              initials: user.initials || "AO",
            },
          ],
          schedules,
          absences: absencesRes?.data || [],
          profilesByAssistant,
          exceptionsByAssistant,
        });

        const slots = matrix[targetId] || Array(96).fill("off");
        const meta = slotMetaByAssistant?.[targetId] || {};
        const dayBlocks = slotsToBlocks(slots, meta);
        const activeBlocks = dayBlocks.filter((b) => b.state !== "off");

        const activeSlots = slots.filter(
          (s) => s !== "off" && s !== "lunch" && s !== "absent"
        ).length;
        const hasWork = activeSlots > 0;
        const hasAbsent = slots.some((s) => s === "absent");

        const entryBlock = activeBlocks.find((b) => b.state !== "absent");
        const lastBlock = [...activeBlocks]
          .reverse()
          .find((b) => b.state !== "absent");

        const weekShiftBounds = resolveAssistantShiftBounds({
          assistantId: targetId,
          isoDate: info.isoDate,
          dow: info.dow,
          viewStartSlot: status.viewStartSlot ?? VIEW_START,
          viewEndSlot: status.viewEndSlot ?? VIEW_END,
          profiles: profilesByAssistant[String(targetId)],
          exceptions: exceptionsByAssistant[String(targetId)],
          schedulesList: schedules,
          absences: absencesRes?.data || [],
        });
        const hasDefinedShift =
          weekShiftBounds.startSlot !== null &&
          weekShiftBounds.endSlot !== null &&
          weekShiftBounds.endSlot > weekShiftBounds.startSlot;

        // Limites de turno do assistente para o dia
        const shiftStart = weekShiftBounds.startSlot ?? (entryBlock ? entryBlock.start : 32);
        const shiftEnd = weekShiftBounds.endSlot ?? (lastBlock ? lastBlock.start + lastBlock.count : 68);
        const shiftSlots = Math.max(1, shiftEnd - shiftStart);

        const entryExitStr =
          entryBlock && lastBlock
            ? `${TIME_SLOTS[entryBlock.start]} – ${
                TIME_SLOTS[lastBlock.start + lastBlock.count] || "24:00"
              }`
            : null;

        // Estado de publicação para o dia
        const pubInfo = getSchedulePublishStatusForDate(info.isoDate, schedules);

        return (
          <button
            key={offset}
            type="button"
            onClick={() => onSelectDay(offset)}
            className={`w-full text-left rounded-xl border p-3.5 transition-all
              ${
                isToday
                  ? "border-accent bg-accent/5 shadow-xs"
                  : isClosed || (!hasWork && !hasAbsent)
                  ? "border-border/60 bg-card/60 opacity-80 hover:opacity-100 hover:border-accent/40"
                  : "border-border bg-card hover:border-accent/40 hover:bg-accent/3 shadow-xs"
              }
            `}
          >
            {/* Header do Dia */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold capitalize ${
                    isToday ? "text-accent" : "text-foreground"
                  }`}
                >
                  {info.dayShort}
                </span>
                <span
                  className={`text-xs font-mono ${
                    isToday ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  {info.dateStr}
                </span>
                {isToday && (
                  <Badge variant="default" className="text-[10px] py-0 px-1.5">
                    Hoje
                  </Badge>
                )}
                {hasAbsent && (
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 px-1.5 border-destructive/30 text-destructive bg-destructive/10"
                  >
                    Ausência
                  </Badge>
                )}
                {(() => {
                  const daySchedule = schedules.find((sc) => {
                    if (sc.entries && sc.entries.length > 0) {
                      return sc.entries.some((entry) => entry.date?.slice(0, 10) === info.isoDate);
                    }
                    const ws = (sc.week_start || "").slice(0, 10);
                    const we = (sc.week_end || "").slice(0, 10);
                    return Boolean(ws && we && ws <= info.isoDate && info.isoDate <= we);
                  });
                  const isDayTransfer = Boolean(
                    daySchedule?.is_temporary_transfer ||
                    (daySchedule?.school_id && effectiveSchoolId && String(daySchedule.school_id) !== String(effectiveSchoolId))
                  );
                  if (!isDayTransfer) return null;
                  return (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1.5 border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 flex items-center gap-1 font-medium"
                      title={`Colocação em ${daySchedule?.school_name || "outra escola"}`}
                    >
                      <ArrowRightLeft size={10} className="shrink-0" />
                      <span>{daySchedule?.school_name || "Transferência"}</span>
                    </Badge>
                  );
                })()}
              </div>

              <div>
                {isClosed ? (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      status.reasonType === "exception"
                        ? "border-destructive/30 text-destructive bg-destructive/10 font-medium"
                        : status.reasonType === "holiday"
                        ? "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium"
                        : "border-border text-muted-foreground bg-muted/40"
                    }`}
                  >
                    {status.closedLabel || (status.reasonType === "exception" ? "Exceção" : "Encerrada")}
                  </Badge>
                ) : isLoadingSchedules ? (
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin text-primary" />
                    <span>A verificar...</span>
                  </span>
                ) : !pubInfo.hasSchedule ? (
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border">
                    Não gerada
                  </span>
                ) : !pubInfo.isPublished ? (
                  <span className="text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    Em preparação
                  </span>
                ) : hasWork && entryExitStr ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-foreground">
                      {entryExitStr}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {formatDurationSlots(activeSlots)}
                    </span>
                  </div>
                ) : hasDefinedShift ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-foreground">
                      {TIME_SLOTS[shiftStart]} – {TIME_SLOTS[shiftEnd] || "24:00"}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Dia de descanso
                  </span>
                )}
              </div>
            </div>

            {/* Barra de Escalas com a mesma estética do Admin (cantos contínuos entre blocos) */}
            {!isClosed && pubInfo.isPublished && activeBlocks.length > 0 && (
              <div className="relative h-4 rounded-md overflow-hidden bg-muted/40 my-2">
                {activeBlocks.map((b, bi) => {
                  const cs = Math.max(b.start, shiftStart);
                  const ce = Math.min(b.start + b.count, shiftEnd);
                  if (ce <= cs) return null;
                  const color = getBlockDisplayColor(b);
                  const name =
                    b.activityName ||
                    BLOCK_STYLES[b.state]?.label ||
                    "Atividade";
                  const timeStr = `${TIME_SLOTS[b.start]} – ${
                    TIME_SLOTS[b.start + b.count] || "24:00"
                  }`;

                  const radiusClass =
                    b.hasPrevAdjacent && b.hasNextAdjacent
                      ? "rounded-none"
                      : b.hasPrevAdjacent
                      ? "rounded-l-none rounded-r-xs"
                      : b.hasNextAdjacent
                      ? "rounded-l-xs rounded-r-none"
                      : "rounded-xs";

                  const separatorClass = b.hasPrevAdjacent
                    ? "border-l border-card/80"
                    : "";

                  const dMin = b.count * 15;
                  const dStr =
                    dMin >= 60
                      ? `${Math.floor(dMin / 60)}h${
                          dMin % 60 > 0 ? ` ${dMin % 60}m` : ""
                        }`
                      : `${dMin}m`;

                  return (
                    <Tooltip key={bi}>
                      <TooltipTrigger asChild>
                        <div
                          className={`absolute inset-y-0.5 ${radiusClass} ${separatorClass} transition-transform hover:scale-105 hover:z-10 cursor-pointer`}
                          style={{
                            left: `${((cs - shiftStart) / shiftSlots) * 100}%`,
                            width: `${((ce - cs) / shiftSlots) * 100}%`,
                            backgroundColor: color,
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        sideOffset={6}
                        className="bg-popover text-popover-foreground border border-border shadow-xl px-3.5 py-2.5 rounded-xl text-left min-w-[190px]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-xs text-foreground">
                            {name}
                          </span>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-border/60 space-y-0.5">
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {timeStr}{" "}
                            <span className="text-foreground/80 font-semibold">
                              ({dStr})
                            </span>
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}

            {/* Chips de Atividades com respetivas cores e horários */}
            {!isClosed && pubInfo.isPublished && activeBlocks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activeBlocks.map((b, bi) => {
                  const color = getBlockDisplayColor(b);
                  const name =
                    b.activityName ||
                    BLOCK_STYLES[b.state]?.label ||
                    "Atividade";
                  const timeRange = `${TIME_SLOTS[b.start]} - ${
                    TIME_SLOTS[b.start + b.count] || "24:00"
                  }`;

                  return (
                    <div
                      key={bi}
                      title={timeRange}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 border border-border/40 text-[11px] text-foreground"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate max-w-[140px]">{name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {TIME_SLOTS[b.start]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Vista Mensal do Horário com Métricas, Calendário e Painel de Detalhes
 */
export function StaffMonthView({
  monthOffset,
  onSelectDay,
  onChangeMonth,
  targetAssistantId,
  targetAssistantName,
  targetSchoolId,
  monthStyle = "google",
}: {
  monthOffset: number;
  onSelectDay: (o: number) => void;
  onChangeMonth: (d: number) => void;
  targetAssistantId?: EntityId;
  targetAssistantName?: string;
  targetSchoolId?: EntityId;
  monthStyle?: "google" | "master-detail" | "agenda";
}) {
  const { user } = useAuth();
  const effectiveAssistantId = targetAssistantId ?? user.assistant_id ?? undefined;
  const effectiveSchoolId = targetSchoolId ?? user.school_id;
  const effectiveName = targetAssistantName ?? user.name ?? "Assistente";
  const effectiveInitials = targetAssistantName
    ? targetAssistantName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : user.initials || "AO";
  const monthsList = useMemo(() => getRealMonthsRange(3, 6), []);
  const clampedIdx = Math.max(0, Math.min(monthOffset, monthsList.length - 1));
  const month = monthsList[clampedIdx];

  const [selectedDayOffset, setSelectedDayOffset] = useState<number | null>(() => {
    // Inicializar com o dia de hoje se estiver no mês atual
    const today = new Date();
    const currentMonthIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    if (month.startIso.startsWith(currentMonthIso)) {
      return 0;
    }
    return month.firstOffset;
  });

  const { data: schedules = [] } = useSchedulesList({
    start_date: month.startIso,
    end_date: month.endIso,
    assistant_id: effectiveAssistantId,
    per_page: 250,
  });
  const { data: absencesRes } = useAbsencesList({
    start_date: month.startIso,
    end_date: month.endIso,
    assistant_id: effectiveAssistantId,
    per_page: 100,
  });

  const { data: allAssistantSchedules = [] } = useAllAssistantSchedules();
  const { data: allAssistantExceptions = [] } = useAllAssistantExceptions();
  const { data: calendarDays } = useOperatingCalendar(
    month.startIso,
    month.endIso
  );
  const { data: holidays } = useHolidaysList();
  const { data: operatingExceptions } = useOperatingExceptions("all");
  const { data: operatingRules } = useOperatingRules("all");

  const targetId = (effectiveAssistantId as string) ?? "staff";

  const profilesByAssistant = useMemo(() => {
    const map: Record<string, AssistantScheduleProfileApi[]> = {};
    allAssistantSchedules.forEach((p) => {
      const aid = String(p.assistant_id);
      if (!map[aid]) map[aid] = [];
      map[aid].push(p);
    });
    return map;
  }, [allAssistantSchedules]);

  const exceptionsByAssistant = useMemo(() => {
    const map: Record<string, AssistantExceptionApi[]> = {};
    allAssistantExceptions.forEach((e) => {
      const aid = String(e.assistant_id);
      if (!map[aid]) map[aid] = [];
      map[aid].push(e);
    });
    return map;
  }, [allAssistantExceptions]);

  // Pré-computar todos os dias do mês para renderização rápida e consistente
  const monthDaysData = useMemo(() => {
    return Array.from({ length: month.days }, (_, i) => {
      const dayNum = i + 1;
      const offset = month.firstOffset + i;
      const isToday = offset === 0;
      const isSelected = selectedDayOffset === offset;
      const info = getDateInfo(offset);

      const dayStatus = resolveSchoolDayStatusByIsoDate(info.isoDate, {
        calendarDays,
        holidays,
        operatingExceptions,
        operatingRules,
      });
      const isClosed = !dayStatus.isOpen;
      const pubInfo = getSchedulePublishStatusForDate(info.isoDate, schedules);

      const { matrix, slotMetaByAssistant } = buildDayMatrixFromApi({
        isoDate: info.isoDate,
        isOpen: !isClosed,
        assistants: [
          {
            id: targetId,
            name: user.name || "Assistente",
            initials: user.initials || "AO",
          },
        ],
        schedules,
        absences: absencesRes?.data || [],
        profilesByAssistant,
        exceptionsByAssistant,
      });

      const slots = matrix[targetId] || Array(96).fill("off");
      const meta = slotMetaByAssistant?.[targetId] || {};
      const blocks = slotsToBlocks(slots, meta);
      const activeBlocks = blocks.filter((b) => b.state !== "off");

      const entryBlock = activeBlocks.find((b) => b.state !== "absent");
      const lastBlock = [...activeBlocks]
        .reverse()
        .find((b) => b.state !== "absent");
      const activeSlots = slots.filter(
        (s) => s !== "off" && s !== "lunch" && s !== "absent"
      ).length;

      const hasWork = !isClosed && activeSlots > 0;
      const hasAbsent = !isClosed && slots.some((s) => s === "absent");

      // Transferência temporária
      const daySchedule = schedules.find((sc) => {
        if (sc.entries && sc.entries.length > 0) {
          return sc.entries.some((entry) => entry.date?.slice(0, 10) === info.isoDate);
        }
        const ws = (sc.week_start || "").slice(0, 10);
        const we = (sc.week_end || "").slice(0, 10);
        return Boolean(ws && we && ws <= info.isoDate && info.isoDate <= we);
      });
      const isTransfer = Boolean(
        daySchedule?.is_temporary_transfer ||
        (daySchedule?.school_id && effectiveSchoolId && String(daySchedule.school_id) !== String(effectiveSchoolId))
      );

      return {
        dayNum,
        offset,
        isToday,
        isSelected,
        info,
        isClosed,
        dayStatus,
        pubInfo,
        slots,
        blocks: activeBlocks,
        hasWork,
        hasAbsent,
        isTransfer,
        schoolName: daySchedule?.school_name,
        entryTime: entryBlock ? TIME_SLOTS[entryBlock.start] : null,
        exitTime: lastBlock
          ? TIME_SLOTS[lastBlock.start + lastBlock.count] || "24:00"
          : null,
        workload: activeSlots > 0 ? formatDurationSlots(activeSlots) : null,
        activeSlots,
      };
    });
  }, [
    month,
    selectedDayOffset,
    targetId,
    user,
    schedules,
    absencesRes,
    profilesByAssistant,
    exceptionsByAssistant,
    calendarDays,
    holidays,
    operatingExceptions,
    operatingRules,
    effectiveSchoolId,
  ]);

  // Calcular métricas mensais do assistente
  const monthMetrics = useMemo(() => {
    let totalWorkSlots = 0;
    let workDaysCount = 0;
    let absenceDaysCount = 0;
    let restDaysCount = 0;

    monthDaysData.forEach((d) => {
      if (d.hasAbsent) absenceDaysCount++;
      if (d.hasWork) {
        workDaysCount++;
        totalWorkSlots += d.activeSlots;
      } else if (!d.hasAbsent) {
        restDaysCount++;
      }
    });

    return {
      totalHours: formatDurationSlots(totalWorkSlots),
      workDays: workDaysCount,
      absenceDays: absenceDaysCount,
      restDays: restDaysCount,
    };
  }, [monthDaysData]);

  // Detalhes do dia selecionado para o preview abaixo do calendário
  const selectedDayData = useMemo(() => {
    if (selectedDayOffset === null) return null;
    return monthDaysData.find((d) => d.offset === selectedDayOffset) || null;
  }, [selectedDayOffset, monthDaysData]);

  // Renderizador do bloco de detalhes de um dia (reutilizado na Opção 1, 2 e 3)
  const renderDayDetailCard = (dayItem: NonNullable<typeof selectedDayData>) => (
    <Card className="p-4 border-border shadow-xs space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {dayItem.info.dayName}
          </p>
          <h4 className="text-base font-semibold text-foreground">
            {dayItem.info.dateStr}
          </h4>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelectDay(dayItem.info.offset)}
          className="text-xs gap-1.5"
        >
          <span>Ver Linha de 15 min</span>
          <ArrowRight size={13} />
        </Button>
      </div>

      {dayItem.isTransfer && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-medium">
          <ArrowRightLeft size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Colocação em <strong>{dayItem.schoolName}</strong> (Transferência Temporária)
          </span>
        </div>
      )}

      {dayItem.isClosed ? (
        <div className="py-2 flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              dayItem.dayStatus?.reasonType === "exception"
                ? "bg-destructive"
                : dayItem.dayStatus?.reasonType === "holiday"
                ? "bg-[#D97706]"
                : "bg-muted-foreground/60"
            }`}
          />
          <p className="text-xs font-medium text-foreground">
            {dayItem.dayStatus?.title || "Estabelecimento encerrado."}
          </p>
        </div>
      ) : !dayItem.pubInfo.isPublished ? (
        <div className="flex items-center gap-2 py-1">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-600 font-medium">
            A escala para este dia ainda não foi gerada ou publicada pela direção.
          </p>
        </div>
      ) : dayItem.blocks.length > 0 ? (
        <div>
          {dayItem.entryTime && (
            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-muted-foreground">
              <span>
                Horário: {dayItem.entryTime} – {dayItem.exitTime}
              </span>
              <span>·</span>
              <span>Carga: {dayItem.workload}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {dayItem.blocks.map((b, bi) => {
              const color = getBlockDisplayColor(b);
              const name =
                b.activityName ||
                BLOCK_STYLES[b.state]?.label ||
                "Atividade";
              const timeRange = `${TIME_SLOTS[b.start]} - ${
                TIME_SLOTS[b.start + b.count] || "24:00"
              }`;

              return (
                <div
                  key={bi}
                  title={timeRange}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/40 text-xs text-foreground"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium">{name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    ({TIME_SLOTS[b.start]} -{" "}
                    {TIME_SLOTS[b.start + b.count] || "24:00"})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-1">
          Dia de descanso - Sem tarefas agendadas para este dia.
        </p>
      )}
    </Card>
  );

  return (
    <div className="pt-2 pb-6 space-y-4">
      {/* 4 KPIs de Resumo do Mês */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: "Carga Mensal", value: monthMetrics.totalHours },
          { label: "Dias de Trabalho", value: `${monthMetrics.workDays} dias` },
          { label: "Dias de Descanso", value: `${monthMetrics.restDays} dias` },
          { label: "Ausências", value: `${monthMetrics.absenceDays} dias` },
        ].map((kpi) => (
          <Card
            key={kpi.label}
            className="p-3 text-center shadow-xs border-border bg-card"
          >
            <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            <p className="text-base sm:text-lg font-mono font-semibold text-foreground mt-0.5">
              {kpi.value}
            </p>
          </Card>
        ))}
      </div>

      {/* =========================================================================
          OPÇÃO 1: "Dashboard Operacional Moderno" (Grelha Estilo Google Calendar)
         ========================================================================= */}
      {monthStyle === "google" && (
        <Card className="overflow-hidden border-border bg-card shadow-xs">
          {/* Cabeçalho DOW */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d, i) => (
              <div
                key={i}
                className="text-center text-[11px] font-semibold text-muted-foreground py-2 border-r border-border/40 last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grelha de Células do Calendário */}
          <div className="grid grid-cols-7">
            {Array.from({ length: month.firstDow }, (_, i) => (
              <div
                key={`pre-${i}`}
                className="min-h-[82px] border-r border-b border-border/30 bg-muted/10"
              />
            ))}
            {monthDaysData.map((d) => (
              <button
                key={d.dayNum}
                type="button"
                onClick={() => setSelectedDayOffset(d.offset)}
                className={`min-h-[82px] p-1.5 text-left border-r border-b border-border/30 transition-colors flex flex-col justify-between cursor-pointer ${
                  d.isSelected
                    ? "bg-accent/10 ring-2 ring-accent inset-0 z-1"
                    : d.isToday
                    ? "bg-accent/5 font-semibold"
                    : "hover:bg-muted/40"
                } ${d.isClosed ? "bg-muted/15" : ""}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-mono rounded-full w-5 h-5 flex items-center justify-center ${
                      d.isToday
                        ? "bg-accent text-accent-foreground font-bold"
                        : "text-foreground"
                    }`}
                  >
                    {d.dayNum}
                  </span>
                  {d.isTransfer && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
                      Outra Escola
                    </span>
                  )}
                </div>

                {/* Conteúdo Informativo da Célula */}
                <div className="w-full mt-1 space-y-0.5">
                  {d.isClosed ? (
                    <span className="block text-[10px] text-muted-foreground/60 truncate font-sans">
                      {d.dayStatus.title || "Encerrado"}
                    </span>
                  ) : d.hasAbsent ? (
                    <span className="inline-flex items-center gap-1 w-full text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-medium truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                      Ausência
                    </span>
                  ) : d.hasWork ? (
                    <div className="w-full text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-foreground font-mono font-medium truncate flex items-center justify-between">
                      <span>{d.entryTime}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>{d.exitTime}</span>
                    </div>
                  ) : (
                    <span className="block text-[10px] text-muted-foreground/50 truncate font-sans">
                      Descanso
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-border/60 bg-muted/10">
            {[
              { color: "bg-accent", label: "Com Turno Marcado" },
              { color: "bg-destructive", label: "Ausência / Falta" },
              { color: "bg-amber-500", label: "Colocação Noutra Escola" },
              { color: "bg-muted-foreground/40", label: "Encerrado / Folga" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                <span className="text-[11px] text-muted-foreground">
                  {l.label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* =========================================================================
          OPÇÃO 2: "Layout Híbrido Master-Detail" (Calendário Compacto + Painel Lateral)
         ========================================================================= */}
      {monthStyle === "master-detail" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Lado Esquerdo: Calendário */}
          <Card className="lg:col-span-7 p-4 border-border bg-card shadow-xs">
            <div className="grid grid-cols-7 mb-2">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d, i) => (
                <div
                  key={i}
                  className="text-center text-[11px] font-semibold text-muted-foreground py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: month.firstDow }, (_, i) => (
                <div key={`pre-${i}`} />
              ))}
              {monthDaysData.map((d) => (
                <button
                  key={d.dayNum}
                  type="button"
                  onClick={() => setSelectedDayOffset(d.offset)}
                  className={`min-h-[50px] rounded-lg p-1.5 flex flex-col items-center justify-between text-xs font-mono transition-all border cursor-pointer ${
                    d.isSelected
                      ? "ring-2 ring-accent border-accent bg-accent/15 font-bold shadow-xs"
                      : d.isToday
                      ? "border-accent/60 bg-accent/5 font-bold"
                      : "border-border/40 hover:bg-muted/50"
                  } ${d.isClosed ? "opacity-60 bg-muted/20" : ""}`}
                >
                  <span>{d.dayNum}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {d.hasWork && <span className="w-2 h-2 rounded-full bg-accent" />}
                    {d.hasAbsent && <span className="w-2 h-2 rounded-full bg-destructive" />}
                    {d.isTransfer && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                  </div>
                </button>
              ))}
            </div>

            {/* Legenda compacta */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-border/60">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent" /> Turno
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-destructive" /> Falta
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Transferência
              </span>
            </div>
          </Card>

          {/* Lado Direito: Detalhe do Dia Selecionado */}
          <div className="lg:col-span-5">
            {selectedDayData ? (
              renderDayDetailCard(selectedDayData)
            ) : (
              <Card className="p-6 border-border bg-card text-center text-muted-foreground text-xs">
                Selecione um dia no calendário para ver o detalhe de tarefas.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          OPÇÃO 3: "Estilo Agenda / Timeline de Turnos" (Cards Diários Verticais)
         ========================================================================= */}
      {monthStyle === "agenda" && (
        <div className="space-y-2.5">
          {monthDaysData.map((d) => (
            <Card
              key={d.dayNum}
              className={`p-3 border-border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                d.isToday ? "border-accent/60 bg-accent/5 ring-1 ring-accent/30" : "bg-card hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-mono ${
                    d.isToday
                      ? "bg-accent text-accent-foreground font-bold"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <span className="text-[10px] uppercase font-semibold leading-none">
                    {d.info.dayName.slice(0, 3)}
                  </span>
                  <span className="text-sm font-bold leading-none mt-0.5">
                    {d.dayNum}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {d.info.dateStr}
                    </p>
                    {d.isTransfer && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                        {d.schoolName || "Outra Escola"}
                      </Badge>
                    )}
                  </div>

                  {d.isClosed ? (
                    <p className="text-xs text-muted-foreground">
                      {d.dayStatus.title || "Estabelecimento encerrado"}
                    </p>
                  ) : d.hasAbsent ? (
                    <p className="text-xs text-destructive font-medium">
                      Ausência registada
                    </p>
                  ) : d.hasWork ? (
                    <p className="text-xs text-muted-foreground font-mono">
                      Turno: <strong className="text-foreground">{d.entryTime} – {d.exitTime}</strong> ({d.workload})
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60">
                      Dia de descanso
                    </p>
                  )}
                </div>
              </div>

              {d.hasWork && (
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {d.blocks.slice(0, 3).map((b, bi) => (
                      <span
                        key={bi}
                        className="text-[10px] px-2 py-0.5 rounded bg-muted font-medium text-foreground"
                      >
                        {b.activityName || BLOCK_STYLES[b.state]?.label || "Tarefa"}
                      </span>
                    ))}
                    {d.blocks.length > 3 && (
                      <span className="text-[10px] px-1 text-muted-foreground">
                        +{d.blocks.length - 3}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectDay(d.offset)}
                    className="text-xs h-8"
                  >
                    Ver dia
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Painel de Preview do Dia Selecionado (apenas para o estilo "google" onde a grelha ocupa o ecrã todo) */}
      {monthStyle === "google" && selectedDayData && renderDayDetailCard(selectedDayData)}
    </div>
  );
}

/**
 * Componente Principal de Horários do Assistente
 */
export interface StaffScheduleSectionProps {
  targetAssistantId?: EntityId;
  targetAssistantName?: string;
  targetSchoolId?: EntityId;
}

export default function StaffScheduleSection({
  targetAssistantId,
  targetAssistantName,
  targetSchoolId,
}: StaffScheduleSectionProps = {}) {
  const monthsList = useMemo(() => getRealMonthsRange(3, 6), []);
  const [viewMode, setViewMode] = useState<StaffViewMode>("day");
  const [dayOffset, setDayOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(() => getMondayOffsetFromDayOffset(0));
  const [monthOffset, setMonthOffset] = useState(3);
  const [monthStyle, setMonthStyle] = useState<"google" | "master-detail" | "agenda">("google");
  const info = getDateInfo(dayOffset);

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

  function handleGoToToday() {
    setDayOffset(0);
    setWeekStart(getMondayOffsetFromDayOffset(0));
    setMonthOffset(3);
  }

  function navToDay(offset: number) {
    setDayOffset(offset);
    setWeekStart(getMondayOffsetFromDayOffset(offset));
    setViewMode("day");
  }

  function handleDatePickerChange(iso: string) {
    if (!iso) return;
    const offset = getOffsetFromIsoDate(iso);
    if (viewMode === "day") {
      setDayOffset(offset);
      setWeekStart(getMondayOffsetFromDayOffset(offset));
    } else if (viewMode === "week") {
      const monOffset = getMondayOffsetFromDayOffset(offset);
      setWeekStart(monOffset);
      setDayOffset(offset);
    } else if (viewMode === "month") {
      const idx = monthsList.findIndex((m) => iso.startsWith(m.startIso.slice(0, 7)));
      if (idx !== -1) {
        setMonthOffset(idx);
      }
      setDayOffset(offset);
      setWeekStart(getMondayOffsetFromDayOffset(offset));
    }
  }

  function handleScopeModeChange(mode: "day" | "week" | "month") {
    setViewMode(mode);
    if (mode === "week") {
      setWeekStart(getMondayOffsetFromDayOffset(dayOffset));
    } else if (mode === "month") {
      const currentIso = getIsoDateFromOffset(dayOffset);
      const idx = monthsList.findIndex((m) => currentIso.startsWith(m.startIso.slice(0, 7)));
      if (idx !== -1) {
        setMonthOffset(idx);
      }
    }
  }

  const currentIsoDate = useMemo(() => {
    if (viewMode === "week") return getIsoDateFromOffset(weekStart);
    if (viewMode === "month") return monthsList[monthOffset]?.startIso || getIsoDateFromOffset(0);
    return getIsoDateFromOffset(dayOffset);
  }, [viewMode, dayOffset, weekStart, monthOffset, monthsList]);

  const triggerLabel = useMemo(() => {
    if (viewMode === "day") {
      return `${info.dayName}, ${info.dateStr}`;
    }
    if (viewMode === "week") {
      const monInfo = getDateInfo(weekStart);
      const sunInfo = getDateInfo(weekStart + 6);
      return `Semana: ${monInfo.dateStr} – ${sunInfo.dateStr}`;
    }
    if (viewMode === "month") {
      return `Mês: ${monthsList[monthOffset]?.label || "Mês"}`;
    }
    return info.dateStr;
  }, [viewMode, info, weekStart, monthOffset, monthsList]);

  return (
    <div>
      {/* Top Bar Fixa com Navegação Unificada via DatePicker */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-1 pb-3 border-b border-border mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Título contextual da visão atual */}
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              {viewMode === "day" && "O Meu Horário — Vista Diária"}
              {viewMode === "week" && "O Meu Horário — Vista Semanal"}
              {viewMode === "month" && "O Meu Horário — Calendário Mensal"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {viewMode === "day" && `${info.dayName}, ${info.dateStr}`}
              {viewMode === "week" && `${getDateInfo(weekStart).dateStr} a ${getDateInfo(weekStart + 6).dateStr}`}
              {viewMode === "month" && (monthsList[monthOffset]?.label || "Mês")}
            </p>
          </div>

          {/* Controlos: Escolha de estilo (no Mês), DatePicker com escolha Dia/Semana/Mês e [ < ] [ Hoje ] [ > ] */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Opções de Apresentação Mensal (apenas no modo Mês para experimentar os 3 designs) */}
            {viewMode === "month" && (
              <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border/50">
                <button
                  type="button"
                  onClick={() => setMonthStyle("google")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    monthStyle === "google"
                      ? "bg-card shadow-xs text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Opção 1: Grelha Completa (Estilo Google Calendar)"
                >
                  <LayoutGrid size={13} />
                  <span className="hidden sm:inline">Grelha</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMonthStyle("master-detail")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    monthStyle === "master-detail"
                      ? "bg-card shadow-xs text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Opção 2: Dividido (Calendário + Painel de Detalhes do Dia)"
                >
                  <Columns2 size={13} />
                  <span className="hidden sm:inline">Dividido</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMonthStyle("agenda")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    monthStyle === "agenda"
                      ? "bg-card shadow-xs text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Opção 3: Agenda / Lista Vertical Dia-a-Dia"
                >
                  <List size={13} />
                  <span className="hidden sm:inline">Agenda</span>
                </button>
              </div>
            )}

            {/* DatePicker Unificado: escolhe a data e permite alternar entre Dia / Semana / Mês diretamente */}
            <DatePicker
              value={currentIsoDate}
              onChange={handleDatePickerChange}
              scopeMode={viewMode}
              onScopeModeChange={handleScopeModeChange}
              allowedScopeModes={["day", "week", "month"]}
              selectedWeekStart={getIsoDateFromOffset(weekStart)}
              selectedWeekEnd={getIsoDateFromOffset(weekStart + 6)}
              customTriggerLabel={triggerLabel}
              align="end"
              allowClear={false}
            />

            {/* Navegação Rápida [ < ] [ Hoje ] [ > ] */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden bg-card">
              <button
                type="button"
                onClick={prevNav}
                className="px-2.5 py-1.5 hover:bg-muted transition-colors border-r border-border text-muted-foreground hover:text-foreground cursor-pointer"
                title="Anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleGoToToday}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono cursor-pointer"
                title="Ir para Hoje"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={nextNav}
                className="px-2.5 py-1.5 hover:bg-muted transition-colors border-l border-border text-muted-foreground hover:text-foreground cursor-pointer"
                title="Seguinte"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "day" && <StaffDayView dayOffset={dayOffset} />}
      {viewMode === "week" && (
        <StaffWeekView weekStart={weekStart} onSelectDay={navToDay} />
      )}
      {viewMode === "month" && (
        <StaffMonthView
          monthOffset={monthOffset}
          onSelectDay={navToDay}
          monthStyle={monthStyle}
          onChangeMonth={(d) =>
            setMonthOffset((m) =>
              Math.max(0, Math.min(m + d, monthsList.length - 1))
            )
          }
        />
      )}
    </div>
  );
}
