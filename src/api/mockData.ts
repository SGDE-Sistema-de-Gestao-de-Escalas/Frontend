import type { Absence, AbsenceType, Assistant, School } from "../types";
import type {
  Absence,
  AbsenceType,
  ActivityType,
  Assistant,
  AuditLogEntry,
  BlockState,
  Holiday,
  Notification,
  ScheduleRule,
  School,
  SwapRequest,
} from "../types";

export const AGRUPAMENTO = {
  id: 1,
  name: "Agrupamento de Escolas de Lisboa Norte",
  code: "AELN",
};

export const schools: School[] = [
  { id: 1, name: "EB1 Quinta das Flores", address: "Rua das Flores, 12, Lisboa", phone: "213 000 001", active: true, assistants: 6 },
  { id: 2, name: "EB1 João de Deus", address: "Av. João de Deus, 45, Lisboa", phone: "213 000 002", active: true, assistants: 3 },
  { id: 3, name: "EB1 Marquesa de Alorna", address: "Rua Marquesa de Alorna, 3, Lisboa", phone: "213 000 003", active: true, assistants: 3 },
  { id: 4, name: "EB1 António Sérgio", address: "Rua António Sérgio, 8, Lisboa", phone: "213 000 004", active: false, assistants: 0 },
];

export const assistants: Assistant[] = [
  { id: 1, name: "Elena Rodrigues", initials: "ER", mecanografico: "ME-00127", exception: null, schoolId: 1, availableForTransfer: false },
  { id: 2, name: "Bruno Mendes", initials: "BM", mecanografico: "ME-00134", exception: "Licença Parentalidade", schoolId: 1, availableForTransfer: false },
  { id: 3, name: "Carla Sousa", initials: "CS", mecanografico: "ME-00141", exception: null, schoolId: 1, availableForTransfer: true },
  { id: 4, name: "Daniel Costa", initials: "DC", mecanografico: "ME-00158", exception: null, schoolId: 1, availableForTransfer: false },
  { id: 5, name: "Ana Costa", initials: "AC", mecanografico: "ME-00162", exception: "Carga Horária 6h", schoolId: 1, availableForTransfer: false },
  { id: 6, name: "Fábio Lopes", initials: "FL", mecanografico: "ME-00175", exception: null, schoolId: 1, availableForTransfer: true },
  { id: 7, name: "Graça Nunes", initials: "GN", mecanografico: "ME-00183", exception: null, schoolId: 2, availableForTransfer: true },
  { id: 8, name: "Hugo Martins", initials: "HM", mecanografico: "ME-00191", exception: null, schoolId: 2, availableForTransfer: false },
  { id: 9, name: "Inês Pinto", initials: "IP", mecanografico: "ME-00204", exception: null, schoolId: 2, availableForTransfer: true },
  { id: 10, name: "João Alves", initials: "JA", mecanografico: "ME-00217", exception: null, schoolId: 3, availableForTransfer: true },
  { id: 11, name: "Kátia Ramos", initials: "KR", mecanografico: "ME-00223", exception: null, schoolId: 3, availableForTransfer: false },
  { id: 12, name: "Luís Santos", initials: "LS", mecanografico: "ME-00239", exception: null, schoolId: 3, availableForTransfer: true },
];

export const absenceTypes: AbsenceType[] = [
  { id: 1, name: "Doença", requires_document: true },
  { id: 2, name: "Baixa Médica", requires_document: true },
  { id: 3, name: "Consulta Médica", requires_document: false },
  { id: 4, name: "Motivo Pessoal", requires_document: false },
  { id: 5, name: "Luto", requires_document: false },
  { id: 6, name: "Acidente de Trabalho", requires_document: true },
  { id: 7, name: "Tolerância de Ponto", requires_document: false },
];

export const absences: Absence[] = [
  { id: 1, assistant: "João Alves", initials: "JA", start: "27 Jan", end: "31 Jan", days: 5, reason: "Doença", status: "pending", submitted: "26 Jan 2026", note: "Urgente — febre alta", documentPath: null, conflict: true, conflictDetail: "Cobertura insuficiente em 27 Jan." },
  { id: 2, assistant: "Hugo Martins", initials: "HM", start: "03 Fev", end: "05 Fev", days: 3, reason: "Doença", status: "pending", submitted: "27 Jan 2026", note: "", documentPath: null, conflict: false, conflictDetail: "" },
  { id: 3, assistant: "Fábio Lopes", initials: "FL", start: "20 Jan", end: "22 Jan", days: 3, reason: "Baixa Médica", status: "justified", submitted: "19 Jan 2026", note: "Certificado médico anexado", documentPath: "atestado_fl_jan26.pdf", conflict: false, conflictDetail: "" },
  { id: 4, assistant: "Inês Pinto", initials: "IP", start: "15 Jan", end: "15 Jan", days: 1, reason: "Motivo Pessoal", status: "unjustified", submitted: "14 Jan 2026", note: "", documentPath: null, conflict: false, conflictDetail: "" },
];

export const TIME_SLOTS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, "0");
  const m = ((i % 4) * 15).toString().padStart(2, "0");
  return `${h}:${m}`;
});

export const VIEW_START = 24;  // slot 24 = 06:00
export const VIEW_END   = 84;  // slot 84 = 21:00 (exclusive)
export const VIEW_SLOTS = VIEW_END - VIEW_START; // 60 slots = 15 hours

export function buildAssistantRow(id: number): BlockState[] {
  const row: BlockState[] = Array(96).fill("off");
  const fill = (from: number, to: number, state: BlockState) => {
    for (let i = from; i < to; i++) row[i] = state;
  };
  switch (id) {
    case 1:
      fill(28, 32, "surveillance"); fill(32, 46, "work"); fill(46, 50, "lunch"); fill(50, 60, "work"); break;
    case 2:
      row.fill("absent"); break;
    case 3:
      fill(40, 48, "work"); fill(48, 52, "lunch"); fill(52, 64, "work"); fill(64, 68, "cleaning"); break;
    case 4:
      fill(28, 32, "collection"); fill(32, 48, "work"); fill(48, 52, "lunch"); fill(52, 60, "work"); break;
    case 5:
      fill(40, 50, "work"); fill(50, 54, "lunch"); fill(54, 64, "work"); break;
    case 6:
      fill(28, 36, "work"); fill(36, 40, "surveillance"); fill(40, 46, "work"); fill(46, 50, "lunch"); fill(50, 56, "work"); break;
    case 7:
      fill(40, 44, "surveillance"); fill(44, 52, "work"); fill(52, 54, "lunch"); fill(54, 68, "work"); break;
    case 8:
      fill(28, 46, "work"); fill(46, 50, "lunch"); fill(50, 56, "cleaning"); break;
    case 9:
      fill(40, 44, "delivery"); fill(44, 50, "work"); fill(50, 54, "lunch"); fill(54, 68, "work"); break;
    case 10:
      fill(28, 44, "work"); fill(44, 46, "surveillance"); fill(46, 50, "lunch"); fill(50, 60, "work"); break;
    case 11:
      fill(40, 42, "collection"); fill(42, 52, "work"); fill(52, 54, "lunch"); fill(54, 68, "work"); break;
    case 12:
      fill(28, 36, "work"); fill(36, 40, "cleaning"); fill(40, 48, "work"); fill(48, 52, "lunch"); fill(52, 56, "work"); break;
  }
  return row;
}

export function generateMatrix(): Record<number, BlockState[]> {
  const matrix: Record<number, BlockState[]> = {};
  assistants.forEach((a) => { matrix[a.id] = buildAssistantRow(a.id); });
  return matrix;
}

export const SCHEDULE_MATRIX = generateMatrix();

export function generateDayMatrix(dayOffset: number): Record<number, BlockState[]> {
  const dow = ((dayOffset % 7) + 7) % 7;
  const isWeekend = dow >= 5;
  const matrix: Record<number, BlockState[]> = {};
  const absentOn: Record<number, number[]> = { 8: [1], 10: [3, 4], 3: [2] };
  assistants.forEach((a) => {
    if (isWeekend) { matrix[a.id] = Array(96).fill("off") as BlockState[]; return; }
    if (a.exception === "Licença Parentalidade" || absentOn[a.id]?.includes(dow)) {
      matrix[a.id] = Array(96).fill("absent") as BlockState[]; return;
    }
    matrix[a.id] = buildAssistantRow(a.id);
  });
  return matrix;
}

export const DATE_INFO = (() => {
  const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const dayShorts = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const months = ["Jan", "Fev", "Mar", "Abr"];
  const daysPerMonth = [31, 28, 31, 30];
  const result: { dayName: string; dayShort: string; dateStr: string; day: number; monthLabel: string; dow: number }[] = [];
  let mIdx = 0; let day = 20; let dow = 0;
  for (let i = 0; i < 49; i++) {
    result.push({ dayName: dayNames[dow], dayShort: dayShorts[dow], dateStr: `${day.toString().padStart(2, "0")} ${months[mIdx]}`, day, monthLabel: `${months[mIdx]} 2026`, dow });
    day++; dow = (dow + 1) % 7;
    if (day > daysPerMonth[mIdx]) { day = 1; mIdx++; }
  }
  return result;
})();

export function getDateInfo(offset: number) {
  return DATE_INFO[Math.max(0, Math.min(offset + 7, DATE_INFO.length - 1))];
}

export const DASHBOARD_MONTHS = [
  { name: "Janeiro 2026", days: 31, firstDow: 2, firstOffset: -26 },
  { name: "Fevereiro 2026", days: 28, firstDow: 5, firstOffset: 5 },
  { name: "Março 2026", days: 31, firstDow: 5, firstOffset: 33 },
];

export function getDayCoverage(offset: number) {
  const matrix = generateDayMatrix(offset);
  const dow = ((offset % 7) + 7) % 7;
  if (dow >= 5) return { active: 0, isWeekend: true };
  let active = 0;
  assistants.forEach((a) => { if (matrix[a.id].some((s) => s !== "off")) active++; });
  return { active, isWeekend: false };
}

export const PROFILE_MONTHS = [
  { label: "Outubro 2025", days: 31, offset: 2, sickDay: null },
  { label: "Novembro 2025", days: 30, offset: 5, sickDay: null },
  { label: "Dezembro 2025", days: 31, offset: 0, sickDay: null },
  { label: "Janeiro 2026", days: 31, offset: 3, sickDay: 15, todayDay: 27 },
  { label: "Fevereiro 2026", days: 28, offset: 6, sickDay: null },
  { label: "Março 2026", days: 31, offset: 6, sickDay: null },
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, type: "alert", title: "Cobertura insuficiente", body: "Apenas 2 assistentes entre 08h–09h em 27 Jan. Mínimo exigido: 3.", time: "há 5 min", read: false },
  { id: 2, type: "alert", title: "Cobertura insuficiente", body: "Apenas 1 assistente entre 20h–21h em 27 Jan. Mínimo exigido: 2.", time: "há 5 min", read: false },
  { id: 3, type: "absence", title: "Novo pedido de falta", body: "João Alves solicitou ausência de 27–31 Jan (Doença, urgente).", time: "há 12 min", read: false },
  { id: 4, type: "absence", title: "Novo pedido de falta", body: "Hugo Martins solicitou ausência de 03–05 Fev (Doença).", time: "há 1 hora", read: false },
  { id: 5, type: "expiry", title: "Exceção prestes a expirar", body: "Licença Amamentação de Elena Rodrigues expira em 14 Set 2026 (231 dias).", time: "hoje", read: true },
  { id: 6, type: "info", title: "Horário recalculado", body: "Escala de 26 Jan recalculada com sucesso após aprovação da falta de Fábio Lopes.", time: "ontem", read: true },
  { id: 7, type: "info", title: "Lotação atualizada", body: "Regra de lotação alterada para 12 assistentes com vigência a partir de 01 Jan 2026.", time: "há 3 dias", read: true },
];

export const DEFAULT_ACTIVITY_TYPES: ActivityType[] = [
  { id: "work", label: "Trabalho", color: "#6366F1", builtIn: true },
  { id: "surveillance", label: "Vigilância", color: "#A855F7", builtIn: true },
  { id: "cleaning", label: "Limpeza", color: "#06B6D4", builtIn: true },
  { id: "collection", label: "Recolha", color: "#EC4899", builtIn: true },
  { id: "delivery", label: "Entrega", color: "#10B981", builtIn: true },
  { id: "lunch", label: "Pausa Almoço", color: "#F59E0B", builtIn: true },
  { id: "absent", label: "Ausente", color: "#EF4444", builtIn: true },
];

export const INITIAL_RULES: ScheduleRule[] = [
  { id: 1, activityTypeId: "work", periodStart: "07:30", periodEnd: "13:00", min: 3, type: "mandatory", start: "01 Jan 2026", end: null, assistantIds: assistants.map((a) => a.id) },
  { id: 2, activityTypeId: "work", periodStart: "13:00", periodEnd: "20:00", min: 4, type: "mandatory", start: "01 Jan 2026", end: null, assistantIds: assistants.map((a) => a.id) },
  { id: 3, activityTypeId: "surveillance", periodStart: "20:00", periodEnd: "22:00", min: 2, type: "optional", start: "01 Jan 2026", end: null, assistantIds: [1, 3, 6] },
  { id: 4, activityTypeId: "collection", periodStart: "07:30", periodEnd: "09:00", min: 1, type: "mandatory", start: "01 Jan 2026", end: null, assistantIds: [3, 6] },
  { id: 5, activityTypeId: "work", periodStart: "07:30", periodEnd: "13:00", min: 2, type: "mandatory", start: "01 Set 2025", end: "31 Dez 2025", assistantIds: assistants.map((a) => a.id) },
];

export const REPORTS_COVERAGE = [
  { day: "Seg", present: 10, min: 8 },
  { day: "Ter", present: 9, min: 8 },
  { day: "Qua", present: 11, min: 8 },
  { day: "Qui", present: 8, min: 8 },
  { day: "Sex", present: 7, min: 8 },
];

export const REPORTS_ALERTAS = [
  { month: "Set", alerts: 2 },
  { month: "Out", alerts: 4 },
  { month: "Nov", alerts: 6 },
  { month: "Dez", alerts: 5 },
  { month: "Jan", alerts: 3 },
];

export const REPORTS_ABSENCE_TYPES = [
  { type: "Doença", count: 8, color: "#EF4444" },
  { type: "Licença Legal", count: 22, color: "#A855F7" },
  { type: "Consulta Médica", count: 3, color: "#F59E0B" },
  { type: "Pessoal", count: 2, color: "#6366F1" },
];

export const REPORTS_AUSENCIAS = [
  { name: "Bruno Mendes", initials: "BM", days: 22, type: "Licença Parentalidade", status: "approved", cobertura: "sem impacto" },
  { name: "João Alves", initials: "JA", days: 5, type: "Doença", status: "pending", cobertura: "impacto alto" },
  { name: "Hugo Martins", initials: "HM", days: 4, type: "Doença", status: "approved", cobertura: "impacto médio" },
  { name: "Fábio Lopes", initials: "FL", days: 3, type: "Doença", status: "approved", cobertura: "impacto médio" },
  { name: "Elena Rodrigues", initials: "ER", days: 3, type: "Consulta Médica", status: "approved", cobertura: "impacto baixo" },
  { name: "Carla Sousa", initials: "CS", days: 2, type: "Pessoal", status: "approved", cobertura: "impacto baixo" },
  { name: "Inês Pinto", initials: "IP", days: 1, type: "Consulta Médica", status: "rejected", cobertura: "sem impacto" },
  { name: "Ana Ferreira", initials: "AF", days: 0, type: "—", status: "none", cobertura: "sem impacto" },
];

export const SWAP_REQUESTS: SwapRequest[] = [
  { id: 1, from: "Ana Ferreira", fromInit: "AF", to: "Fábio Lopes", toInit: "FL", date: "03 Fev 2026", fromBlock: "08:00–16:00", toBlock: "07:30–15:30", reason: "Compromisso pessoal", status: "pending", submitted: "27 Jan 2026" },
  { id: 2, from: "Inês Pinto", fromInit: "IP", to: "Kátia Ramos", toInit: "KR", date: "05 Fev 2026", fromBlock: "14:00–22:00", toBlock: "07:30–15:30", reason: "Consulta médica", status: "pending", submitted: "26 Jan 2026" },
  { id: 3, from: "Daniel Costa", fromInit: "DC", to: "Graça Nunes", toInit: "GN", date: "29 Jan 2026", fromBlock: "07:30–15:30", toBlock: "08:00–16:00", reason: "Assuntos pessoais", status: "approved", submitted: "24 Jan 2026" },
  { id: 4, from: "Luís Santos", fromInit: "LS", to: "Hugo Martins", toInit: "HM", date: "31 Jan 2026", fromBlock: "08:00–16:00", toBlock: "07:30–15:30", reason: "Transporte", status: "rejected", submitted: "22 Jan 2026" },
];

export const HOLIDAYS: Holiday[] = [
  { id: 1, name: "Carnaval", date: "03 Mar 2026", type: "nacional", impact: "baixo" },
  { id: 2, name: "Sexta-feira Santa", date: "03 Abr 2026", type: "nacional", impact: "alto" },
  { id: 3, name: "Páscoa", date: "05 Abr 2026", type: "nacional", impact: "alto" },
  { id: 4, name: "Dia do Trabalhador", date: "01 Mai 2026", type: "nacional", impact: "alto" },
  { id: 5, name: "Feriado Municipal Lisboa", date: "13 Jun 2026", type: "municipal", impact: "médio" },
  { id: 6, name: "Assunção de Nossa Sra.", date: "15 Ago 2026", type: "nacional", impact: "alto" },
];

export const AUDIT_LOG: AuditLogEntry[] = [
  { id: 1, ts: "27 Jan 2026 14:32", user: "Miguel Silva", action: "Aprovação de falta", entity: "Ausências", detail: "Aprovada falta de Fábio Lopes (20–22 Jan)", type: "approve" },
  { id: 2, ts: "27 Jan 2026 14:30", user: "Sistema", action: "Recálculo de escala", entity: "Dashboard", detail: "Escala de 20–26 Jan recalculada após aprovação", type: "system" },
  { id: 3, ts: "27 Jan 2026 11:15", user: "Miguel Silva", action: "Alteração de regra", entity: "Configurações", detail: "Mínimo tarde 13h–20h alterado de 3 para 4 assistentes", type: "edit" },
  { id: 4, ts: "26 Jan 2026 17:45", user: "Miguel Silva", action: "Criação de exceção", entity: "Perfil", detail: "Licença amamentação adicionada a Elena Rodrigues", type: "create" },
  { id: 5, ts: "26 Jan 2026 09:20", user: "Sistema", action: "Alerta de cobertura", entity: "Dashboard", detail: "Cobertura insuficiente detectada 08h–09h em 27 Jan", type: "alert" },
  { id: 6, ts: "25 Jan 2026 16:00", user: "Miguel Silva", action: "Rejeição de falta", entity: "Ausências", detail: "Rejeitada falta de Inês Pinto (15 Jan)", type: "reject" },
  { id: 7, ts: "24 Jan 2026 10:30", user: "Miguel Silva", action: "Regra de lotação editada", entity: "Configurações", detail: "Lotação alterada: 14 → 12 assistentes (vigência 01/01/26)", type: "edit" },
  { id: 8, ts: "23 Jan 2026 15:10", user: "Sistema", action: "Recálculo automático", entity: "Dashboard", detail: "Recálculo semanal de escala (sem 23–29 Jan)", type: "system" },
  { id: 9, ts: "22 Jan 2026 14:00", user: "Miguel Silva", action: "Aprovação de troca", entity: "Trocas", detail: "Troca aprovada: Daniel Costa ↔ Graça Nunes (29 Jan)", type: "approve" },
  { id: 10, ts: "20 Jan 2026 09:00", user: "Ana Ferreira", action: "Pedido de troca", entity: "Trocas", detail: "Troca solicitada para 03 Fev: AF ↔ FL", type: "create" },
];
