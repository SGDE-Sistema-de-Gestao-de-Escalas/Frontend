/**
 * Dados mock utilizados exclusivamente pelo módulo de Relatórios (ReportsPage).
 */

export const REPORTS_COVERAGE = [
  { day: "Seg", present: 10, min: 8 },
  { day: "Ter", present: 9, min: 8 },
  { day: "Qua", present: 11, min: 8 },
  { day: "Qui", present: 8, min: 8 },
  { day: "Sex", present: 7, min: 8 },
];

export const REPORTS_ALERTS = [
  { month: "Set", alerts: 2 },
  { month: "Out", alerts: 4 },
  { month: "Nov", alerts: 6 },
  { month: "Dez", alerts: 5 },
  { month: "Jan", alerts: 3 },
];

export const REPORTS_ALERTAS = REPORTS_ALERTS;

export const REPORTS_ABSENCE_TYPES = [
  { type: "Doença", count: 8, color: "#EF4444" },
  { type: "Licença Legal", count: 22, color: "#A85557" },
  { type: "Consulta Médica", count: 3, color: "#F59E0B" },
  { type: "Pessoal", count: 2, color: "#6366F1" },
];

export const REPORTS_ABSENCES = [
  {
    name: "Bruno Mendes",
    initials: "BM",
    days: 22,
    type: "Licença Parentalidade",
    status: "approved",
    coverage: "sem impacto",
    cobertura: "sem impacto",
  },
  {
    name: "João Alves",
    initials: "JA",
    days: 5,
    type: "Doença",
    status: "pending",
    coverage: "impacto alto",
    cobertura: "impacto alto",
  },
  {
    name: "Hugo Martins",
    initials: "HM",
    days: 4,
    type: "Doença",
    status: "approved",
    coverage: "impacto médio",
    cobertura: "impacto médio",
  },
  {
    name: "Fábio Lopes",
    initials: "FL",
    days: 3,
    type: "Doença",
    status: "approved",
    coverage: "impacto médio",
    cobertura: "impacto médio",
  },
  {
    name: "Elena Rodrigues",
    initials: "ER",
    days: 3,
    type: "Consulta Médica",
    status: "approved",
    coverage: "impacto baixo",
    cobertura: "impacto baixo",
  },
  {
    name: "Carla Sousa",
    initials: "CS",
    days: 2,
    type: "Pessoal",
    status: "approved",
    coverage: "impacto baixo",
    cobertura: "impacto baixo",
  },
  {
    name: "Inês Pinto",
    initials: "IP",
    days: 1,
    type: "Consulta Médica",
    status: "rejected",
    coverage: "sem impacto",
    cobertura: "sem impacto",
  },
  {
    name: "Ana Ferreira",
    initials: "AF",
    days: 0,
    type: "—",
    status: "none",
    coverage: "sem impacto",
    cobertura: "sem impacto",
  },
];

export const REPORTS_AUSENCIAS = REPORTS_ABSENCES;

export const assistants = [
  { id: 1, name: "Elena Rodrigues", exception: null },
  { id: 2, name: "Bruno Mendes", exception: "Licença Parentalidade" },
  { id: 5, name: "Ana Costa", exception: "Carga Horária 6h" },
];
