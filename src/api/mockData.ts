import type { Absence, AbsenceType, Assistant, School } from "../types";

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
