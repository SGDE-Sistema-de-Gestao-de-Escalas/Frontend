import type {
  Assistant,
  BlockState,
  DateInfo,
  EntityId,
  ScheduleMatrix,
} from "../types";
import type {
  AssistantScheduleProfileApi,
  AssistantExceptionApi,
} from "../types/assistantSchedule.types";
import type {
  BackendScheduleEntryResource,
  BackendScheduleResource,
  LunchBlockApi,
} from "../api/services/schedules.service";
import type { BackendAbsenceResource } from "../api/services/absences.service";
import type { BackendHolidayResource } from "../api/services/holidays.service";
import type {
  OperatingCalendarDay,
  OperatingException,
  OperatingRule,
} from "../types/operatingHours.types";
import { TIME_SLOTS, VIEW_END, VIEW_START } from "../components/dashboard/blockStyles";

const DAY_NAMES_PT = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

const DAY_SHORTS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const MONTH_SHORTS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const MONTH_NAMES_PT = [
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

/**
 * Devolve a data civil local de hoje à meia-noite (12:00 para evitar desvios DST).
 */
export function getTodayBaseDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
}

/**
 * Converte um offset em dias (0 = hoje) para uma string YYYY-MM-DD real.
 */
export function getIsoDateFromOffset(dayOffset: number): string {
  const d = getTodayBaseDate();
  d.setDate(d.getDate() + dayOffset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Converte uma string YYYY-MM-DD para o offset em dias face a hoje.
 */
export function getOffsetFromIsoDate(isoDate: string): number {
  const base = getTodayBaseDate();
  const target = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}

/**
 * Obtém a informação formatada de uma data civil real com base no offset em dias (0 = hoje).
 * O campo `dow` segue a convenção Segunda = 0 ... Domingo = 6.
 */
export function getDateInfo(dayOffset: number): DateInfo & { isoDate: string } {
  const d = getTodayBaseDate();
  d.setDate(d.getDate() + dayOffset);
  const jsDay = d.getDay(); // 0 = Dom ... 6 = Sáb
  const dow = (jsDay + 6) % 7; // 0 = Seg ... 6 = Dom
  const dayNum = d.getDate();
  const monthIdx = d.getMonth();
  const year = d.getFullYear();
  const mm = String(monthIdx + 1).padStart(2, "0");
  const dd = String(dayNum).padStart(2, "0");

  return {
    dayName: DAY_NAMES_PT[dow],
    dayShort: DAY_SHORTS_PT[dow],
    dateStr: `${dd} ${MONTH_SHORTS_PT[monthIdx]}`,
    day: dayNum,
    monthLabel: `${MONTH_SHORTS_PT[monthIdx]} ${year}`,
    dow,
    isoDate: `${year}-${mm}-${dd}`,
  };
}

export interface DashboardMonthMeta {
  name: string;
  label: string;
  year: number;
  monthIndex: number;
  days: number;
  firstDow: number; // 0 = Seg ... 6 = Dom
  firstOffset: number;
  startIso: string;
  endIso: string;
}

/**
 * Gera a lista de meses reais centrada no mês atual (ex.: N meses anteriores até M meses seguintes).
 */
export function getRealMonthsRange(
  monthsBefore = 3,
  monthsAfter = 6
): DashboardMonthMeta[] {
  const today = getTodayBaseDate();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const list: DashboardMonthMeta[] = [];

  for (let delta = -monthsBefore; delta <= monthsAfter; delta++) {
    const firstOfMonth = new Date(currentYear, currentMonth + delta, 1, 12, 0, 0);
    const y = firstOfMonth.getFullYear();
    const m = firstOfMonth.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDow = (firstOfMonth.getDay() + 6) % 7; // 0 = Seg ... 6 = Dom
    const mm = String(m + 1).padStart(2, "0");
    const startIso = `${y}-${mm}-01`;
    const endIso = `${y}-${mm}-${String(daysInMonth).padStart(2, "0")}`;
    const firstOffset = getOffsetFromIsoDate(startIso);
    const name = `${MONTH_NAMES_PT[m]} ${y}`;

    list.push({
      name,
      label: name,
      year: y,
      monthIndex: m,
      days: daysInMonth,
      firstDow,
      firstOffset,
      startIso,
      endIso,
    });
  }

  return list;
}

/**
 * Converte uma hora "HH:MM" ou "HH:MM:SS" para o índice de slot de 15 minutos (0..96).
 */
export function timeToSlotIndex(time?: string | null): number {
  if (!time) return 0;
  const parts = time.trim().split(":");
  const h = parseInt(parts[0] || "0", 10) || 0;
  const m = parseInt(parts[1] || "0", 10) || 0;
  return Math.max(0, Math.min(96, Math.floor((h * 60 + m) / 15)));
}

export interface TimelineHourSegment {
  startSlot: number;
  endSlot: number;
  slotCount: number;
  widthPct: number;
  label: string;
  startTimeLabel: string;
  endTimeLabel: string;
}

/**
 * Constrói os segmentos horários dinâmicos para o cabeçalho e grelha do mapa de escalas
 * exatamente entre `viewStartSlot` (hora de abertura) e `viewEndSlot` (hora de fecho).
 */
export function buildTimelineHourSegments(
  viewStartSlot: number,
  viewEndSlot: number
): TimelineHourSegment[] {
  const safeStart = Math.max(0, Math.min(95, viewStartSlot));
  const safeEnd = Math.max(safeStart + 1, Math.min(96, viewEndSlot));
  const totalSlots = safeEnd - safeStart;
  const segments: TimelineHourSegment[] = [];

  let cursor = safeStart;
  while (cursor < safeEnd) {
    const nextHourSlot = Math.min(safeEnd, (Math.floor(cursor / 4) + 1) * 4);
    const slotCount = nextHourSlot - cursor;
    const startHour = Math.floor(cursor / 4)
      .toString()
      .padStart(2, "0");
    const startMin = ((cursor % 4) * 15).toString().padStart(2, "0");
    const endHour = Math.floor(nextHourSlot / 4)
      .toString()
      .padStart(2, "0");
    const endMin = ((nextHourSlot % 4) * 15).toString().padStart(2, "0");

    const startTimeLabel = `${startHour}:${startMin}`;
    const endTimeLabel = `${endHour}:${endMin}`;

    // Se começa à hora certa e tem 1h completa, mostra "08h"; se começa em meia-hora/quarto de hora, mostra "07:30"
    let label = `${startHour}h`;
    if (cursor % 4 !== 0) {
      label = startTimeLabel;
    } else if (slotCount < 4) {
      label = `${startHour}h (${endTimeLabel})`;
    }

    segments.push({
      startSlot: cursor,
      endSlot: nextHourSlot,
      slotCount,
      widthPct: (slotCount / totalSlots) * 100,
      label,
      startTimeLabel,
      endTimeLabel,
    });

    cursor = nextHourSlot;
  }

  return segments;
}

/**
 * Converte o nome/tipo de uma atividade do Backend num `BlockState` visual da grelha.
 * IMPORTANTE: Tarefas escolares como «Vigilância almoço» ou «Apoio ao almoço» são tarefas
 * de trabalho/vigilância dos alunos, e NUNCA devem ser confundidas com a «Pausa de Almoço»
 * do funcionário.
 */
export function mapActivityToBlockState(
  activityName?: string | null,
  isFallback?: boolean
): BlockState {
  if (isFallback) return "work";
  const norm = (activityName || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 1. TAREFAS DE VIGILÂNCIA (vigilância de recreio, portaria, refeitório/almoço de alunos)
  if (
    norm.includes("vigilancia") ||
    norm.includes("portaria") ||
    norm.includes("recreio") ||
    norm.includes("intervalo") ||
    norm.includes("fecho") ||
    norm.includes("refeitorio") ||
    norm.includes("cantina")
  ) {
    return "surveillance";
  }

  // 2. ACOLHIMENTO E RECEÇÃO
  if (
    norm.includes("acolhimento") ||
    norm.includes("recolha") ||
    norm.includes("rececao") ||
    norm.includes("entrada")
  ) {
    return "collection";
  }

  // 3. ENTREGA DE ALUNOS E SAÍDA
  if (norm.includes("entrega") || norm.includes("saida")) {
    return "delivery";
  }

  // 4. LIMPEZA E HIGIENIZAÇÃO
  if (
    norm.includes("limpeza") ||
    norm.includes("pavilhao") ||
    norm.includes("higien")
  ) {
    return "cleaning";
  }

  // 5. APOIO A TURMAS / ESCOLA
  if (
    norm.includes("apoio") ||
    norm.includes("turma") ||
    norm.includes("sala") ||
    norm.includes("aula")
  ) {
    return "work";
  }

  // 6. AUSÊNCIAS REGISTADAS
  if (norm.includes("ausencia") || norm.includes("falta")) {
    return "absent";
  }

  // 7. APENAS PAUSA PESSOAL DE REFEIÇÃO DO FUNCIONÁRIO (quando explicitamente indicado)
  if (
    norm.includes("pausa") ||
    norm.includes("refeicao") ||
    norm.includes("almoco")
  ) {
    return "lunch";
  }

  return "work";
}

export interface SchoolDayStatus {
  isOpen: boolean;
  reasonType?: "weekend" | "holiday" | "exception";
  title?: string;
  detail?: string;
  openingTime?: string | null;
  closingTime?: string | null;
  viewStartSlot: number;
  viewEndSlot: number;
  scheduleSourceLabel?: string | null;
}

export interface OperatingStatusSources {
  calendarDays?: OperatingCalendarDay[];
  operatingRules?: OperatingRule[];
  operatingExceptions?: OperatingException[];
  holidays?: BackendHolidayResource[];
}

function resolveBoundsFromTimes(
  openingTime?: string | null,
  closingTime?: string | null
): { viewStartSlot: number; viewEndSlot: number } {
  const start = openingTime ? timeToSlotIndex(openingTime) : VIEW_START;
  const end = closingTime ? timeToSlotIndex(closingTime) : VIEW_END;
  if (end <= start) {
    return { viewStartSlot: VIEW_START, viewEndSlot: VIEW_END };
  }
  return { viewStartSlot: start, viewEndSlot: end };
}

/**
 * Determina o estado de abertura e a janela horária dinâmica (`openingTime`, `closingTime`, `viewStartSlot`, `viewEndSlot`)
 * da escola para uma data ISO ("YYYY-MM-DD"), tendo em conta:
 * 1. Feriados (`/api/holidays`)
 * 2. Exceções de funcionamento com `valid_from` e `valid_until` (`/api/operating-exceptions`)
 * 3. Versões do Horário Fixo com `valid_from` e `valid_until` (`/api/operating-rules`, incluindo versões futuras que entram em vigor)
 * 4. Calendário operacional resolvido pelo Backend (`/api/operating-calendar`)
 */
export function resolveSchoolDayStatusByIsoDate(
  isoDate: string,
  sources?: OperatingStatusSources
): SchoolDayStatus {
  const cleanIso = isoDate.slice(0, 10);
  const d = new Date(`${cleanIso}T12:00:00`);
  const dow = (d.getDay() + 6) % 7; // 0 = Seg ... 6 = Dom
  const dayName = DAY_NAMES_PT[dow] || "Dia";

  // Helper para encontrar a exceção e a versão de regra fixa aplicáveis a `cleanIso`
  const matchingException = sources?.operatingExceptions?.find((ex) => {
    const from = (ex.valid_from || "").slice(0, 10);
    const until = (ex.valid_until || from).slice(0, 10);
    return from <= cleanIso && cleanIso <= until;
  });

  const rules = sources?.operatingRules || [];
  const matchingRules = rules
    .filter((r) => {
      const from = (r.valid_from || "").slice(0, 10);
      const until = r.valid_until ? r.valid_until.slice(0, 10) : null;
      return from <= cleanIso && (!until || cleanIso <= until);
    })
    .sort((a, b) =>
      (b.valid_from || "")
        .slice(0, 10)
        .localeCompare((a.valid_from || "").slice(0, 10))
    );

  const activeRuleForDate =
    matchingRules[0] ||
    rules.find((r) => r.status === "current") ||
    rules[0] ||
    null;

  const ruleDayEntry =
    activeRuleForDate && Array.isArray(activeRuleForDate.days)
      ? activeRuleForDate.days.find(
          (dayItem) => Number(dayItem.day_of_week) === dow
        )
      : undefined;

  // 1. Verificar se o calendário resolvido da API tem esta data
  const calDay = sources?.calendarDays?.find(
    (c) => c.date?.slice(0, 10) === cleanIso
  );
  if (calDay) {
    if (!calDay.is_open) {
      if (calDay.source === "holiday") {
        return {
          isOpen: false,
          reasonType: "holiday",
          title: `Estabelecimento Encerrado — ${calDay.reason || "Feriado"}`,
          detail:
            "Feriado registado no calendário global. Todas as atividades letivas e escalas estão suspensas neste dia.",
          viewStartSlot: VIEW_START,
          viewEndSlot: VIEW_END,
        };
      }
      if (calDay.source === "exception") {
        return {
          isOpen: false,
          reasonType: "exception",
          title: `Estabelecimento Encerrado — ${
            calDay.reason || matchingException?.name || "Exceção de Funcionamento"
          }`,
          detail:
            "Encerramento excecional definido nas regras de funcionamento da escola.",
          viewStartSlot: VIEW_START,
          viewEndSlot: VIEW_END,
        };
      }
      return {
        isOpen: false,
        reasonType: "weekend",
        title: `Estabelecimento Encerrado — ${dayName}`,
        detail:
          calDay.reason ||
          "O estabelecimento de ensino encontra-se encerrado neste dia segundo o horário fixo em vigor.",
        viewStartSlot: VIEW_START,
        viewEndSlot: VIEW_END,
      };
    }

    // Se o calendário diz que está aberto, obter opening_time / closing_time (com fallback para a exceção ou regra em vigor)
    const openTime =
      calDay.opening_time ||
      (!matchingException?.is_closed ? matchingException?.opening_time : null) ||
      ruleDayEntry?.opening_time ||
      null;
    const closeTime =
      calDay.closing_time ||
      (!matchingException?.is_closed ? matchingException?.closing_time : null) ||
      ruleDayEntry?.closing_time ||
      null;
    const bounds = resolveBoundsFromTimes(openTime, closeTime);

    let sourceLabel = "Horário Fixo";
    if (calDay.source === "exception" || (matchingException && !matchingException.is_closed)) {
      sourceLabel = `Exceção: ${matchingException?.name || calDay.reason || "Horário Especial"}`;
    } else if (activeRuleForDate?.status === "upcoming") {
      sourceLabel = `Horário Fixo (em vigor desde ${activeRuleForDate.valid_from.slice(0, 10)})`;
    }

    return {
      isOpen: true,
      openingTime: openTime,
      closingTime: closeTime,
      viewStartSlot: bounds.viewStartSlot,
      viewEndSlot: bounds.viewEndSlot,
      scheduleSourceLabel: sourceLabel,
    };
  }

  // 2. Verificar feriados
  const holiday = sources?.holidays?.find(
    (h) => h.date?.slice(0, 10) === cleanIso
  );
  if (holiday) {
    return {
      isOpen: false,
      reasonType: "holiday",
      title: `Estabelecimento Encerrado — ${holiday.name}`,
      detail:
        "Feriado registado no calendário global. Todas as atividades letivas e escalas estão suspensas neste dia.",
      viewStartSlot: VIEW_START,
      viewEndSlot: VIEW_END,
    };
  }

  // 3. Verificar exceções de funcionamento (`valid_from` .. `valid_until`)
  if (matchingException) {
    if (matchingException.is_closed) {
      return {
        isOpen: false,
        reasonType: "exception",
        title: `Estabelecimento Encerrado — ${matchingException.name}`,
        detail:
          "Encerramento excecional definido nas regras de funcionamento da escola.",
        viewStartSlot: VIEW_START,
        viewEndSlot: VIEW_END,
      };
    }
    const openTime =
      matchingException.opening_time || ruleDayEntry?.opening_time || null;
    const closeTime =
      matchingException.closing_time || ruleDayEntry?.closing_time || null;
    const bounds = resolveBoundsFromTimes(openTime, closeTime);
    return {
      isOpen: true,
      openingTime: openTime,
      closingTime: closeTime,
      viewStartSlot: bounds.viewStartSlot,
      viewEndSlot: bounds.viewEndSlot,
      scheduleSourceLabel: `Exceção: ${matchingException.name}`,
    };
  }

  // 4. Verificar versões do Horário Fixo (`valid_from` .. `valid_until`)
  if (activeRuleForDate && Array.isArray(activeRuleForDate.days)) {
    if (!ruleDayEntry || !ruleDayEntry.opening_time || !ruleDayEntry.closing_time) {
      return {
        isOpen: false,
        reasonType: "weekend",
        title: `Estabelecimento Encerrado — ${dayName}`,
        detail:
          "O estabelecimento de ensino não funciona neste dia da semana segundo a versão do horário fixo em vigor para esta data.",
        viewStartSlot: VIEW_START,
        viewEndSlot: VIEW_END,
      };
    }
    const bounds = resolveBoundsFromTimes(
      ruleDayEntry.opening_time,
      ruleDayEntry.closing_time
    );
    return {
      isOpen: true,
      openingTime: ruleDayEntry.opening_time,
      closingTime: ruleDayEntry.closing_time,
      viewStartSlot: bounds.viewStartSlot,
      viewEndSlot: bounds.viewEndSlot,
      scheduleSourceLabel:
        activeRuleForDate.status === "upcoming"
          ? `Horário Fixo (em vigor desde ${activeRuleForDate.valid_from.slice(0, 10)})`
          : "Horário Fixo",
    };
  }

  // 5. Fallback: Fim de semana encerrado
  if (dow >= 5) {
    return {
      isOpen: false,
      reasonType: "weekend",
      title: `Estabelecimento Encerrado — ${dayName}`,
      detail:
        "O estabelecimento de ensino encontra-se encerrado ao fim de semana. Não existem turnos nem atividades agendadas.",
      viewStartSlot: VIEW_START,
      viewEndSlot: VIEW_END,
    };
  }

  return {
    isOpen: true,
    viewStartSlot: VIEW_START,
    viewEndSlot: VIEW_END,
  };
}

/**
 * Determina o estado de abertura da escola numa data (usando o offset em dias face a hoje).
 */
export function resolveSchoolDayStatus(
  dayOffset: number,
  calendarDays?: OperatingCalendarDay[],
  extraSources?: Omit<OperatingStatusSources, "calendarDays">
): SchoolDayStatus {
  const info = getDateInfo(dayOffset);
  return resolveSchoolDayStatusByIsoDate(info.isoDate, {
    calendarDays,
    ...extraSources,
  });
}

/**
 * Verifica se existe escala gerada no Backend para uma determinada data civil (`YYYY-MM-DD`).
 */
export function hasGeneratedScheduleForDate(
  isoDate: string,
  schedules: BackendScheduleResource[] = []
): boolean {
  const cleanIso = isoDate.slice(0, 10);
  return schedules.some((sc) =>
    (sc.entries || []).some((entry) => entry.date?.slice(0, 10) === cleanIso)
  );
}

export type SchedulePublishStatus = "none" | "draft" | "published";

export interface SchedulePublishInfo {
  status: SchedulePublishStatus;
  label: string;
  isDraft: boolean;
  isPublished: boolean;
  hasSchedule: boolean;
  publishedAt?: string | null;
  generatedAt?: string | null;
  matchingSchedulesCount: number;
}

/**
 * Obtém o estado de publicação de uma escala para uma determinada data civil:
 * - 'none': nenhuma escala gerada para esta data
 * - 'draft': existe escala em modo rascunho
 * - 'published': todas as escalas desta data estão publicadas
 */
export function getSchedulePublishStatusForDate(
  isoDate: string,
  schedules: BackendScheduleResource[] = []
): SchedulePublishInfo {
  const cleanIso = isoDate.slice(0, 10);
  const matchingSchedules = schedules.filter((sc) =>
    (sc.entries || []).some((entry) => entry.date?.slice(0, 10) === cleanIso)
  );

  if (matchingSchedules.length === 0) {
    return {
      status: "none",
      label: "Não Gerada",
      isDraft: false,
      isPublished: false,
      hasSchedule: false,
      matchingSchedulesCount: 0,
    };
  }

  const isDraft = matchingSchedules.some((sc) => sc.status === "draft");
  const firstPublished = matchingSchedules.find(
    (sc) => sc.status === "published" && sc.published_at
  );
  const firstGenerated = matchingSchedules.find((sc) => sc.generated_at);

  return {
    status: isDraft ? "draft" : "published",
    label: isDraft ? "Rascunho" : "Publicada",
    isDraft,
    isPublished: !isDraft,
    hasSchedule: true,
    publishedAt: firstPublished?.published_at,
    generatedAt: firstGenerated?.generated_at,
    matchingSchedulesCount: matchingSchedules.length,
  };
}

export interface DraftDaySummary {
  isoDate: string;
  dateStr: string;
  dayName: string;
  dayShort: string;
  assistantsCount: number;
  entriesCount: number;
}

/**
 * Devolve a lista ordenada de todos os dias em rascunho (status === 'draft')
 * existentes na lista de escalas fornecida.
 */
export function getAllDraftDaysFromSchedules(
  schedules: BackendScheduleResource[] = []
): DraftDaySummary[] {
  const daysMap = new Map<
    string,
    { assistants: Set<string>; entriesCount: number }
  >();

  schedules.forEach((sc) => {
    if (sc.status !== "draft") return;
    (sc.entries || []).forEach((entry) => {
      if (!entry.date) return;
      const cleanIso = entry.date.slice(0, 10);
      if (!daysMap.has(cleanIso)) {
        daysMap.set(cleanIso, {
          assistants: new Set(),
          entriesCount: 0,
        });
      }
      const data = daysMap.get(cleanIso)!;
      data.assistants.add(sc.assistant_id);
      data.entriesCount += 1;
    });
  });

  const sortedDates = Array.from(daysMap.keys()).sort();

  return sortedDates.map((isoDate) => {
    const data = daysMap.get(isoDate)!;
    // Criar Date seguro em UTC
    const [y, m, d] = isoDate.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dow = (dateObj.getUTCDay() + 6) % 7;
    const dayName = DAY_NAMES_PT[dow] || "";
    const dayShort = DAY_SHORTS_PT[dow] || "";
    const dateStr = `${String(d).padStart(2, "0")} ${MONTH_SHORTS_PT[m - 1]}`;

    return {
      isoDate,
      dateStr,
      dayName,
      dayShort,
      assistantsCount: data.assistants.size,
      entriesCount: data.entriesCount,
    };
  });
}

/**
 * Verifica se um assistente tem ausência registada na API para uma determinada data civil.
 */
export function checkAssistantAbsenceOnDate(
  assistant: Pick<Assistant, "id">,
  isoDate: string,
  absences: BackendAbsenceResource[] = []
): {
  absent: boolean;
  reason?: string;
  isFullDay?: boolean;
  startSlot?: number;
  endSlot?: number;
} {
  const matching = absences.find((abs) => {
    if (String(abs.assistant_id) !== String(assistant.id)) return false;
    const from = (abs.valid_from || abs.start_date || "").slice(0, 10);
    const until = (abs.valid_until || abs.end_date || from).slice(0, 10);
    return from <= isoDate && isoDate <= until;
  });

  if (matching) {
    const startSlot = matching.start_time ? timeToSlotIndex(matching.start_time) : 0;
    const endSlot = matching.end_time ? timeToSlotIndex(matching.end_time) : 96;
    const spanSlots = endSlot - startSlot;
    return {
      absent: true,
      reason:
        matching.absence_type_name ||
        matching.justification ||
        "Ausência Registada",
      isFullDay: spanSlots >= 24 || (!matching.start_time && !matching.end_time),
      startSlot,
      endSlot,
    };
  }

  return { absent: false };
}

export interface AssistantResolvedShiftBounds {
  startSlot: number;
  endSlot: number;
  lunchStart?: number | null;
  lunchEnd?: number | null;
  lunchStartSlot: number | null;
  lunchEndSlot: number | null;
  absenceStartSlot: number | null;
  absenceEndSlot: number | null;
  absenceReason: string | null;
}

/**
 * Calcula os limites do turno (início, fim e almoço) de um assistente a partir dos blocos da matriz.
 */
export function getShiftBoundsFromRow(
  row: BlockState[],
  defaultStartSlot = 32,
  defaultEndSlot = 68
): AssistantResolvedShiftBounds {
  let startSlot = -1;
  let endSlot = -1;
  let lunchStart: number | null = null;
  let lunchEnd: number | null = null;

  for (let i = 0; i < row.length; i++) {
    if (row[i] !== "off") {
      if (startSlot === -1) startSlot = i;
      endSlot = i + 1;
    }
    if (row[i] === "lunch") {
      if (lunchStart === null) lunchStart = i;
      lunchEnd = i + 1;
    }
  }

  return {
    startSlot: startSlot === -1 ? defaultStartSlot : startSlot,
    endSlot: endSlot === -1 ? defaultEndSlot : endSlot,
    lunchStart,
    lunchEnd,
    lunchStartSlot: lunchStart,
    lunchEndSlot: lunchEnd,
    absenceStartSlot: null,
    absenceEndSlot: null,
    absenceReason: null,
  };
}

/**
 * Determina os limites de horário (turno fixo) de um assistente para uma data específica,
 * calculando também a sua pausa de almoço e eventuais faltas previstas registadas.
 * Prioriza:
 * 1. Regra de exceção ativa (AssistantExceptionApi)
 * 2. Perfil de horário contratual ativo (AssistantScheduleProfileApi - fixo ou rotativo)
 * 3. Horário planeado de dia de origem (se foi copiado)
 * 4. Matriz base comissionada do dia (se já existia escala com blocos atribuídos)
 * 5. Histórico de horários de trabalho do assistente para o mesmo dia da semana
 * 6. Horário padrão de funcionamento da escola (ex: 08:00–16:00)
 */
export interface ActiveRotatingShiftInfo {
  activeLabel: "A" | "B";
  rotationCycle: number;
  periodDays: number;
  periodLabel: string;
  cycleStartDate: string;
  cycleEndDate: string;
}

export function computeActiveRotatingShift(
  validFromStr: string,
  rotationPeriod: string = "biweekly",
  startsWith: string = "A",
  targetDateStr: string = new Date().toISOString().split("T")[0]
): ActiveRotatingShiftInfo {
  const normPeriod = String(rotationPeriod).toLowerCase();
  const periodDays =
    normPeriod.includes("sem") || normPeriod === "weekly"
      ? 7
      : normPeriod.includes("men") || normPeriod === "monthly"
      ? 28
      : 14;

  const validFrom = validFromStr ? validFromStr.slice(0, 10) : targetDateStr;
  const tTarget = new Date(targetDateStr + "T00:00:00").getTime();
  const tBase = new Date(validFrom + "T00:00:00").getTime();
  const daysDiff = Math.max(0, Math.floor((tTarget - tBase) / (1000 * 60 * 60 * 24)));

  const rotationCycle = Math.floor(daysDiff / periodDays);
  const isInitial = rotationCycle % 2 === 0;
  const startChar: "A" | "B" = startsWith === "B" ? "B" : "A";
  const activeLabel: "A" | "B" = isInitial
    ? startChar
    : startChar === "A"
    ? "B"
    : "A";

  const cycleStartMs = tBase + rotationCycle * periodDays * (1000 * 60 * 60 * 24);
  const cycleEndMs = cycleStartMs + (periodDays - 1) * (1000 * 60 * 60 * 24);

  const cycleStartDate = new Date(cycleStartMs).toISOString().split("T")[0];
  const cycleEndDate = new Date(cycleEndMs).toISOString().split("T")[0];

  const periodLabel =
    periodDays === 7 ? "Semanal" : periodDays === 28 ? "Mensal" : "Quinzenal";

  return {
    activeLabel,
    rotationCycle,
    periodDays,
    periodLabel,
    cycleStartDate,
    cycleEndDate,
  };
}

export function resolveAssistantShiftBounds(params: {
  assistantId: EntityId;
  isoDate: string;
  dow: number;
  viewStartSlot: number;
  viewEndSlot: number;
  profiles?: AssistantScheduleProfileApi[];
  exceptions?: AssistantExceptionApi[];
  copiedSourceRow?: BlockState[];
  baseDayRow?: BlockState[];
  schedulesList?: BackendScheduleResource[];
  lunchBlocksForDate?: Record<string, LunchBlockApi>;
  absences?: BackendAbsenceResource[];
}): AssistantResolvedShiftBounds {
  const {
    assistantId,
    isoDate,
    dow,
    viewStartSlot,
    viewEndSlot,
    profiles,
    exceptions,
    copiedSourceRow,
    baseDayRow,
    schedulesList,
    lunchBlocksForDate,
    absences,
  } = params;

  let startSlot: number | null = null;
  let endSlot: number | null = null;
  let lunchStartSlot: number | null = null;
  let lunchEndSlot: number | null = null;

  // 1. Exceções ativas para a data
  if (exceptions && exceptions.length > 0) {
    const activeEx = exceptions.find((ex) => {
      if (ex.valid_from && ex.valid_from.slice(0, 10) > isoDate) return false;
      if (ex.valid_until && ex.valid_until.slice(0, 10) < isoDate) return false;
      if (ex.days && ex.days.length > 0) {
        const matches = ex.days.includes(dow) || ex.days.includes(dow + 1);
        if (!matches) return false;
      }
      return Boolean(ex.start_time && ex.end_time);
    });

    if (activeEx && activeEx.start_time && activeEx.end_time) {
      const s = timeToSlotIndex(activeEx.start_time);
      const e = timeToSlotIndex(activeEx.end_time);
      if (e > s) {
        startSlot = s;
        endSlot = e;
      }
      if (
        activeEx.lunch_enabled !== false &&
        activeEx.lunch_start &&
        activeEx.lunch_end
      ) {
        const ls = timeToSlotIndex(activeEx.lunch_start);
        const le = timeToSlotIndex(activeEx.lunch_end);
        if (le > ls) {
          lunchStartSlot = ls;
          lunchEndSlot = le;
        }
      }
    }
  }

  // 2. Perfil de horário ativo (fixo ou rotativo)
  if (startSlot === null && profiles && profiles.length > 0) {
    const validProfiles = profiles
      .filter((p) => {
        if (p.valid_from && p.valid_from.slice(0, 10) > isoDate) return false;
        if (p.valid_until && p.valid_until.slice(0, 10) < isoDate) return false;
        return true;
      })
      .sort((a, b) => (b.valid_from || "").localeCompare(a.valid_from || ""));

    const currentProfile = validProfiles[0];
    if (currentProfile) {
      if (currentProfile.type === "fixo") {
        const shift =
          currentProfile.shifts?.find((s) => {
            if (!s.days || s.days.length === 0) return true;
            return s.days.includes(dow) || s.days.includes(dow + 1);
          }) || currentProfile.shifts?.[0];

        if (shift && shift.entry_time && shift.exit_time) {
          const s = timeToSlotIndex(shift.entry_time);
          const e = timeToSlotIndex(shift.exit_time);
          if (e > s) {
            startSlot = s;
            endSlot = e;
          }
          if (
            lunchStartSlot === null &&
            shift.lunch_enabled !== false &&
            shift.lunch_start &&
            shift.lunch_end
          ) {
            const ls = timeToSlotIndex(shift.lunch_start);
            const le = timeToSlotIndex(shift.lunch_end);
            if (le > ls) {
              lunchStartSlot = ls;
              lunchEndSlot = le;
            }
          }
        }
      } else if (currentProfile.type === "rotativo") {
        const validFrom = currentProfile.valid_from
          ? currentProfile.valid_from.slice(0, 10)
          : isoDate;
        const tTarget = new Date(isoDate + "T00:00:00").getTime();
        const tBase = new Date(validFrom + "T00:00:00").getTime();
        const daysDiff = Math.max(
          0,
          Math.floor((tTarget - tBase) / (1000 * 60 * 60 * 24))
        );
        const periodDays =
          currentProfile.rotation_period === "weekly"
            ? 7
            : currentProfile.rotation_period === "monthly"
            ? 28
            : 14;

        const rotationCycle = Math.floor(daysDiff / periodDays);
        const isInitial = rotationCycle % 2 === 0;
        const startsWith = currentProfile.starts_with || "A";
        const activeLabel: "A" | "B" = isInitial
          ? startsWith
          : startsWith === "A"
          ? "B"
          : "A";

        const shift =
          currentProfile.shifts?.find((s) => s.shift_label === activeLabel) ||
          currentProfile.shifts?.[0];

        if (shift && shift.entry_time && shift.exit_time) {
          const s = timeToSlotIndex(shift.entry_time);
          const e = timeToSlotIndex(shift.exit_time);
          if (e > s) {
            startSlot = s;
            endSlot = e;
          }
          if (
            lunchStartSlot === null &&
            shift.lunch_enabled !== false &&
            shift.lunch_start &&
            shift.lunch_end
          ) {
            const ls = timeToSlotIndex(shift.lunch_start);
            const le = timeToSlotIndex(shift.lunch_end);
            if (le > ls) {
              lunchStartSlot = ls;
              lunchEndSlot = le;
            }
          }
        }
      }
    }
  }

  // 3. Dia copiado de outra data
  if (startSlot === null && copiedSourceRow && copiedSourceRow.length > 0) {
    const hasBlocks = copiedSourceRow.some(
      (st) => st !== "off" && st !== "absent"
    );
    if (hasBlocks) {
      const b = getShiftBoundsFromRow(
        copiedSourceRow,
        viewStartSlot,
        viewEndSlot
      );
      if (b.endSlot > b.startSlot) {
        startSlot = b.startSlot;
        endSlot = b.endSlot;
        if (lunchStartSlot === null && b.lunchStart !== null && b.lunchEnd !== null) {
          lunchStartSlot = b.lunchStart;
          lunchEndSlot = b.lunchEnd;
        }
      }
    }
  }

  // 4. Matriz base do dia (já existente antes de entrar em modo de edição)
  if (startSlot === null && baseDayRow && baseDayRow.length > 0) {
    const hasBlocks = baseDayRow.some((st) => st !== "off" && st !== "absent");
    if (hasBlocks) {
      const b = getShiftBoundsFromRow(baseDayRow, viewStartSlot, viewEndSlot);
      if (b.endSlot > b.startSlot) {
        startSlot = b.startSlot;
        endSlot = b.endSlot;
        if (lunchStartSlot === null && b.lunchStart !== null && b.lunchEnd !== null) {
          lunchStartSlot = b.lunchStart;
          lunchEndSlot = b.lunchEnd;
        }
      }
    }
  }

  // 5. Histórico em schedulesList para o mesmo assistente
  if (startSlot === null && schedulesList && schedulesList.length > 0) {
    const aidStr = String(assistantId);
    const assistantSchedules = schedulesList.filter(
      (sc) => String(sc.assistant_id) === aidStr
    );
    const allEntries: BackendScheduleEntryResource[] = [];
    assistantSchedules.forEach((sc) => {
      (sc.entries || []).forEach((e) => {
        if (e.date && e.start_time && e.end_time) {
          allEntries.push(e);
        }
      });
    });

    if (allEntries.length > 0) {
      const entriesByDate: Record<string, BackendScheduleEntryResource[]> = {};
      allEntries.forEach((e) => {
        const d = e.date.slice(0, 10);
        if (!entriesByDate[d]) entriesByDate[d] = [];
        entriesByDate[d].push(e);
      });

      let bestDayEntries: BackendScheduleEntryResource[] | null = null;
      for (const [dateStr, entries] of Object.entries(entriesByDate)) {
        const d = new Date(dateStr + "T00:00:00");
        const entryDow = (d.getDay() + 6) % 7;
        if (entryDow === dow) {
          bestDayEntries = entries;
          break;
        }
      }
      if (!bestDayEntries) {
        const firstDate = Object.keys(entriesByDate)[0];
        if (firstDate) bestDayEntries = entriesByDate[firstDate];
      }

      if (bestDayEntries && bestDayEntries.length > 0) {
        const sortedStarts = bestDayEntries.map((e) => e.start_time).sort();
        const sortedEnds = bestDayEntries.map((e) => e.end_time).sort();
        const s = timeToSlotIndex(sortedStarts[0]);
        const e = timeToSlotIndex(sortedEnds[sortedEnds.length - 1]);
        if (e > s) {
          startSlot = s;
          endSlot = e;
        }
      }
    }
  }

  // 6. Fallback padrão: turno de 8 horas (32 slots) alinhado ao início de funcionamento da escola
  const finalStart = startSlot ?? viewStartSlot;
  const defaultEnd = Math.min(viewStartSlot + 32, viewEndSlot);
  const finalEnd = endSlot && endSlot > finalStart ? endSlot : (defaultEnd > finalStart ? defaultEnd : viewEndSlot);

  // 7. Se não encontrou almoço específico, verificar se há lunchBlocksForDate para este assistente
  if (lunchStartSlot === null && lunchBlocksForDate) {
    const lb = lunchBlocksForDate[String(assistantId)];
    if (lb && lb.start_time && lb.end_time) {
      const ls = timeToSlotIndex(lb.start_time);
      const le = timeToSlotIndex(lb.end_time);
      if (le > ls) {
        lunchStartSlot = ls;
        lunchEndSlot = le;
      }
    }
  }

  // 8. Se ainda não há almoço e a baseDayRow contém blocos "lunch"
  if (lunchStartSlot === null && baseDayRow && baseDayRow.length > 0) {
    const b = getShiftBoundsFromRow(baseDayRow, viewStartSlot, viewEndSlot);
    if (b.lunchStart !== null && b.lunchEnd !== null) {
      lunchStartSlot = b.lunchStart;
      lunchEndSlot = b.lunchEnd;
    }
  }

  // 9. Ausências previstas para esta data
  let absenceStartSlot: number | null = null;
  let absenceEndSlot: number | null = null;
  let absenceReason: string | null = null;

  if (absences && absences.length > 0) {
    const absInfo = checkAssistantAbsenceOnDate(
      { id: assistantId },
      isoDate,
      absences
    );
    if (absInfo.absent) {
      absenceStartSlot = absInfo.startSlot ?? null;
      absenceEndSlot = absInfo.endSlot ?? null;
      absenceReason = absInfo.reason ?? "Ausência Registada";
    }
  }

  return {
    startSlot: finalStart,
    endSlot: finalEnd,
    lunchStartSlot,
    lunchEndSlot,
    absenceStartSlot,
    absenceEndSlot,
    absenceReason,
  };
}

export interface SlotEntryMetadata {
  entryId?: string;
  activityTypeId?: string | null;
  activityName: string;
  activityColor?: string | null;
  isFallback?: boolean;
  isLocked?: boolean;
  ruleId?: string | null;
  replacedAssistantId?: string | null;
  replacementReason?: string | null;
}

/**
 * Constrói a matriz de 96 slots (15 min) para uma data civil específica (`isoDate`),
 * combinando as escalas reais da API (`GET /api/schedules`), blocos de almoço e ausências reais.
 */
export function buildDayMatrixFromApi(params: {
  isoDate: string;
  isOpen: boolean;
  assistants: Assistant[];
  schedules?: BackendScheduleResource[];
  absences?: BackendAbsenceResource[];
  lunchBlocksForDate?: Record<string, LunchBlockApi>;
  profilesByAssistant?: Record<string, AssistantScheduleProfileApi[]>;
  exceptionsByAssistant?: Record<string, AssistantExceptionApi[]>;
}): {
  matrix: ScheduleMatrix;
  slotMetaByAssistant: Record<EntityId, Record<number, SlotEntryMetadata>>;
} {
  const {
    isoDate,
    isOpen,
    assistants,
    schedules = [],
    absences = [],
    lunchBlocksForDate = {},
    profilesByAssistant,
    exceptionsByAssistant,
  } = params;

  const matrix: ScheduleMatrix = {};
  const slotMetaByAssistant: Record<EntityId, Record<number, SlotEntryMetadata>> = {};

  assistants.forEach((assistant) => {
    const row: BlockState[] = Array(96).fill("off");
    const metaRow: Record<number, SlotEntryMetadata> = {};

    if (!isOpen) {
      matrix[assistant.id] = row;
      slotMetaByAssistant[assistant.id] = metaRow;
      return;
    }

    // 1. Preencher com entradas reais das escalas do assistente para esta data
    const assistantSchedules = schedules.filter(
      (sc) => String(sc.assistant_id) === String(assistant.id)
    );

    const entriesForDay: BackendScheduleEntryResource[] = [];
    assistantSchedules.forEach((sc) => {
      (sc.entries || []).forEach((entry) => {
        if (entry.date?.slice(0, 10) === isoDate) {
          entriesForDay.push(entry);
        }
      });
    });

    entriesForDay.forEach((entry) => {
      const sSlot = timeToSlotIndex(entry.start_time);
      const eSlot = timeToSlotIndex(entry.end_time);
      const blockState = mapActivityToBlockState(
        entry.activity_name,
        entry.is_fallback
      );
      for (let i = sSlot; i < eSlot && i < 96; i++) {
        row[i] = blockState;
        metaRow[i] = {
          entryId: entry.id,
          activityTypeId: entry.activity_type_id,
          ruleId: entry.schedule_rule_id,
          activityName:
            entry.activity_name ||
            (entry.is_fallback ? "Apoio Escola" : "Atividade"),
          activityColor: entry.activity_color,
          isFallback: entry.is_fallback,
          isLocked: entry.is_locked,
          replacedAssistantId: entry.replaced_assistant_id,
          replacementReason: entry.replacement_reason,
        };
      }
    });

    // 2. Determinar intervalo de almoço do assistente
    let lunchS: number | null = null;
    let lunchE: number | null = null;

    // Fonte A: lunchBlocksForDate (devolvido diretamente pelo motor de geração)
    const lunch = lunchBlocksForDate[String(assistant.id)];
    if (lunch && lunch.start_time && lunch.end_time) {
      const ls = timeToSlotIndex(lunch.start_time);
      const le = timeToSlotIndex(lunch.end_time);
      if (le > ls) {
        lunchS = ls;
        lunchE = le;
      }
    }

    // Fonte B: Perfil de horário contratual / exceções do assistente
    if (lunchS === null && profilesByAssistant && profilesByAssistant[String(assistant.id)]) {
      const dow = (new Date(isoDate + "T12:00:00Z").getDay() + 6) % 7;
      const bounds = resolveAssistantShiftBounds({
        assistantId: assistant.id,
        isoDate,
        dow,
        viewStartSlot: 0,
        viewEndSlot: 96,
        profiles: profilesByAssistant[String(assistant.id)],
        exceptions: exceptionsByAssistant?.[String(assistant.id)],
        schedulesList: schedules,
        lunchBlocksForDate,
        absences,
      });
      if (bounds.lunchStartSlot !== null && bounds.lunchEndSlot !== null) {
        lunchS = bounds.lunchStartSlot;
        lunchE = bounds.lunchEndSlot;
      }
    }

    // Fonte C: Heurística entre tarefas/ausências
    // Se não há perfil ou lunchBlock, inferir a partir do intervalo livre entre entradas e ausências
    if (lunchS === null && entriesForDay.length >= 1) {
      const absInfo = checkAssistantAbsenceOnDate(assistant, isoDate, absences);
      const absStart = absInfo.absent && absInfo.startSlot !== undefined ? absInfo.startSlot : -1;
      const absEnd = absInfo.absent && absInfo.endSlot !== undefined ? absInfo.endSlot : -1;

      const busyIntervals: Array<{ start: number; end: number }> = entriesForDay.map((e) => ({
        start: timeToSlotIndex(e.start_time),
        end: timeToSlotIndex(e.end_time),
      }));
      if (absInfo.absent && absStart >= 0 && absEnd > absStart) {
        busyIntervals.push({ start: absStart, end: absEnd });
      }
      busyIntervals.sort((a, b) => a.start - b.start);

      for (let idx = 0; idx < busyIntervals.length - 1; idx++) {
        const gapStart = busyIntervals[idx].end;
        const gapEnd = busyIntervals[idx + 1].start;
        const gapSlots = gapEnd - gapStart;
        if (gapSlots >= 2 && gapSlots <= 6 && gapStart >= 44 && gapEnd <= 62) {
          lunchS = gapStart;
          lunchE = gapEnd;
          break;
        }
      }
    }

    // Marcar "lunch" nos slots livres correspondentes
    if (lunchS !== null && lunchE !== null) {
      for (let i = lunchS; i < lunchE && i < 96; i++) {
        if (row[i] === "off") {
          row[i] = "lunch";
          metaRow[i] = {
            activityName: "Pausa Almoço",
          };
        }
      }
    }

    // 3. Aplicar ausências registadas na API para este assistente nesta data
    const absInfo = checkAssistantAbsenceOnDate(assistant, isoDate, absences);
    if (absInfo.absent) {
      const aStart =
        absInfo.startSlot !== undefined && absInfo.startSlot > 0
          ? absInfo.startSlot
          : 32;
      const aEnd =
        absInfo.endSlot !== undefined && absInfo.endSlot < 96
          ? absInfo.endSlot
          : 68;
      for (let i = aStart; i < aEnd && i < 96; i++) {
        row[i] = "absent";
        metaRow[i] = {
          activityName: absInfo.reason || "Ausente",
        };
      }
    }

    matrix[assistant.id] = row;
    slotMetaByAssistant[assistant.id] = metaRow;
  });

  return { matrix, slotMetaByAssistant };
}

export { TIME_SLOTS };
