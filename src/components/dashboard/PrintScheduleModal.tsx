import { useMemo, useState, useEffect } from "react";
import { Loader2, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import DatePicker from "../common/DatePicker";
import AssistantSelect from "../common/AssistantSelect";
import { notify } from "../common/FeedbackNotification";
import type { Assistant } from "../../types";
import { TIME_SLOTS, MergedScheduleBlock, slotsToBlocks } from "./blockStyles";
import {
  resolveAssistantShiftBounds,
  buildDayMatrixFromApi,
  resolveSchoolDayStatusByIsoDate,
  type AssistantResolvedShiftBounds,
  type OperatingStatusSources,
} from "../../utils/scheduleMatrixUtils";
import type {
  AssistantScheduleProfileApi,
  AssistantExceptionApi,
} from "../../types/assistantSchedule.types";
import schedulesService, {
  type LunchBlockApi,
} from "../../api/services/schedules.service";
import logoHorizontalUrl from "../../assets/logo-horizontal.svg";

export interface PrintableAssistantSchedule {
  assistant: Assistant;
  shiftBounds: AssistantResolvedShiftBounds;
  blocks: MergedScheduleBlock[];
}

export interface PrintableAbsentAssistant {
  assistant: Assistant;
  reason: string;
  isTransfer?: boolean;
  transferDestName?: string;
  shiftBounds: AssistantResolvedShiftBounds;
}

export interface DailyExportDayData {
  isoDate: string;
  dateStr: string;
  dayName: string;
  isOpen: boolean;
  closedReason?: string;
  operatingWindowStr: string;
  workingAssistants: PrintableAssistantSchedule[];
  absentAssistants: PrintableAbsentAssistant[];
}

interface PrintScheduleModalProps {
  open: boolean;
  onClose: () => void;
  initialDocModel?: "wall" | "individual" | "monthly";
  schoolName: string;
  agrupamentoName?: string;
  dateInfo: {
    dateStr: string;
    dayName: string;
    isoDate: string;
  };
  operatingWindowStr?: string;
  workingAssistants: PrintableAssistantSchedule[];
  absentAssistants: PrintableAbsentAssistant[];
  activeAssistants?: Assistant[];
  schedulesList?: any[];
  absences?: any[];
  operatingSources?: OperatingStatusSources;
  profilesByAssistant?: Record<string, AssistantScheduleProfileApi[]>;
  exceptionsByAssistant?: Record<string, AssistantExceptionApi[]>;
  lunchBlocksByDate?: Record<string, Record<string, LunchBlockApi>>;
}

const DEFAULT_ACTIVITY_COLORS: Record<string, string> = {
  "apoio escola": "#6366F1",
  acolhimento: "#F59E0B",
  "apoio turmas/escola": "#3B82F6",
  "apoio turmas": "#3B82F6",
  intervalo: "#10B981",
  "vigilância almoço": "#A855F7",
  "vigilancia almoco": "#A855F7",
  limpeza: "#8B5CF6",
  "entrega de alunos": "#14B8A6",
  "apoio nee": "#06B6D4",
};

function resolveActivityHex(name?: string | null, explicitHex?: string | null): string {
  if (explicitHex && /^#[0-9A-Fa-f]{6}$/.test(explicitHex)) {
    return explicitHex;
  }
  const key = (name || "").trim().toLowerCase();
  return DEFAULT_ACTIVITY_COLORS[key] || "#6366F1";
}

function tintHex(hex: string, ratio = 0.85): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#f8fafc";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const nr = Math.round(r + (255 - r) * ratio);
  const ng = Math.round(g + (255 - g) * ratio);
  const nb = Math.round(b + (255 - b) * ratio);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb
    .toString(16)
    .padStart(2, "0")}`;
}

function darkenHex(hex: string, ratio = 0.45): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#1e293b";
  const r = Math.round(parseInt(clean.slice(0, 2), 16) * (1 - ratio));
  const g = Math.round(parseInt(clean.slice(2, 4), 16) * (1 - ratio));
  const b = Math.round(parseInt(clean.slice(4, 6), 16) * (1 - ratio));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
    .toString(16)
    .padStart(2, "0")}`;
}

function shortActivityLabel(name: string, durMin: number): string {
  if (durMin <= 15) {
    const map15: Record<string, string> = {
      Acolhimento: "Acol.",
      "Apoio Escola": "Apoio",
      "Apoio Turmas/escola": "Turmas",
      "Entrega de alunos": "Entr.",
      Intervalo: "Interv.",
      Limpeza: "Limp.",
      "Vigilância almoço": "Vigil.",
      "Apoio NEE": "NEE",
    };
    return map15[name] || `${name.slice(0, 5)}.`;
  }
  if (durMin <= 30) {
    const map30: Record<string, string> = {
      Acolhimento: "Acolhim.",
      "Apoio Escola": "Apoio",
      "Apoio Turmas/escola": "Turmas",
      "Entrega de alunos": "Entrega",
      Intervalo: "Intervalo",
      Limpeza: "Limpeza",
      "Vigilância almoço": "Vigilância",
      "Apoio NEE": "Apoio NEE",
    };
    return map30[name] || name.slice(0, 8);
  }
  return name;
}

function timeToMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

/**
 * Imprime o documento HTML com o layout V4 (A4 Horizontal com Timeline Fixa).
 */
function printV4HtmlDocument(htmlBody: string, title: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 9mm 10mm 10mm 10mm;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 7.5pt;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
        }
        .page-break {
          page-break-after: always;
          break-after: page;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          border-bottom: 1.2pt solid #0f172a;
          margin-bottom: 6pt;
        }
        .header-table td {
          vertical-align: bottom;
          padding: 0 0 5pt 0;
        }
        .school-title {
          font-size: 10pt;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 0.1pt;
          margin: 0;
        }
        .school-subtitle {
          font-size: 6.4pt;
          color: #64748b;
          margin: 1.5pt 0 0 0;
        }
        .date-title {
          font-size: 8.5pt;
          font-weight: 700;
          color: #0f172a;
          text-align: right;
          margin: 0;
          white-space: nowrap;
        }
        .hours-subtitle {
          font-size: 6.4pt;
          color: #64748b;
          text-align: right;
          margin: 1.5pt 0 0 0;
          white-space: nowrap;
        }
        .legend-bar {
          margin-bottom: 6pt;
          padding: 3.5pt 6pt;
          background-color: #f8fafc;
          border: 0.5pt solid #cbd5e1;
          border-radius: 2pt;
          font-size: 5.8pt;
          color: #334155;
        }
        .legend-label {
          font-weight: 700;
          text-transform: uppercase;
          color: #475569;
          margin-right: 6pt;
          letter-spacing: 0.3pt;
        }
        .legend-item {
          display: inline-block;
          margin-right: 9pt;
          color: #1e293b;
        }
        .legend-swatch {
          display: inline-block;
          width: 7pt;
          height: 5.5pt;
          border-radius: 1pt;
          margin-right: 3pt;
          vertical-align: middle;
        }
        .schedule-table {
          width: 100%;
          border-collapse: collapse;
        }
        .schedule-table thead th {
          border-top: 0.8pt solid #0f172a;
          border-bottom: 0.8pt solid #0f172a;
          background-color: #f8fafc;
          font-size: 5.8pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3pt;
          color: #334155;
          padding: 0;
          vertical-align: middle;
        }
        .schedule-table tbody td {
          border-bottom: 0.5pt solid #cbd5e1;
          padding: 0;
          vertical-align: middle;
        }
        .col-assistant {
          width: 11.5%;
          border-right: 0.5pt solid #cbd5e1;
          padding: 0 5pt !important;
          text-align: left;
        }
        .col-shift {
          width: 9.5%;
          border-right: 0.5pt solid #cbd5e1;
          padding: 0 5pt !important;
          text-align: left;
        }
        .col-timeline {
          width: 79%;
          padding: 0 !important;
        }
        .assistant-name {
          font-size: 6.6pt;
          font-weight: 700;
          color: #0f172a;
          display: block;
        }
        .assistant-code {
          font-size: 5.3pt;
          color: #64748b;
          margin-top: 1pt;
          display: block;
        }
        .shift-main {
          font-size: 6.2pt;
          font-weight: 700;
          color: #0f172a;
          display: block;
        }
        .shift-lunch {
          font-size: 5pt;
          color: #64748b;
          margin-top: 1.5pt;
          display: block;
        }
        .tl-header-wrap {
          position: relative;
          width: 100%;
          height: 17pt;
        }
        .tl-hour-header {
          position: absolute;
          top: 0;
          height: 17pt;
          border-left: 0.5pt solid #cbd5e1;
        }
        .tl-hour-text {
          padding-top: 4.5pt;
          padding-left: 2.5pt;
          font-size: 5.5pt;
          font-weight: 700;
          color: #334155;
          line-height: 8pt;
        }
        .tl-row-wrap {
          position: relative;
          width: 100%;
          height: 32pt;
          background-color: #ffffff;
        }
        .tl-tick-line {
          position: absolute;
          top: 0;
          height: 32pt;
          width: 0;
        }
        .tl-tick-hour {
          border-left: 0.5pt solid #e2e8f0;
        }
        .tl-tick-half {
          border-left: 0.5pt dashed #e2e8f0;
        }
        .tl-tick-quarter {
          border-left: 0.4pt dotted #f1f5f9;
        }
        .tl-block {
          position: absolute;
          top: 3pt;
          height: 26pt;
          box-sizing: border-box;
          padding: 0;
          margin: 0;
          border-radius: 1.5pt;
          border-top-width: 2.2pt;
          border-top-style: solid;
          border-bottom-width: 0.5pt;
          border-bottom-style: solid;
          border-left-width: 0.4pt;
          border-left-style: solid;
          border-right-width: 0.4pt;
          border-right-style: solid;
          overflow: hidden;
        }
        .tl-inner-normal {
          padding: 2.2pt 1.5pt 0 2pt;
        }
        .tl-inner-30 {
          padding: 2.2pt 1pt 0 1.2pt;
        }
        .tl-inner-15 {
          padding: 1.2pt 0.4pt 0 0.4pt;
          text-align: center;
        }
        .tl-inner-lunch {
          padding: 2.2pt 1.5pt 0 1.5pt;
          text-align: center;
        }
        .tl-inner-absent {
          padding-top: 7pt;
          text-align: center;
          font-size: 5.6pt;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.8pt;
          line-height: 8pt;
        }
        .tl-block-time {
          font-size: 4.3pt;
          color: #475569;
          display: block;
          line-height: 5.2pt;
          white-space: nowrap;
        }
        .tl-block-title {
          font-size: 5pt;
          font-weight: 700;
          display: block;
          line-height: 6.2pt;
          margin-top: 1.2pt;
          white-space: nowrap;
        }
        .tl-inner-30 .tl-block-time {
          font-size: 3.85pt;
          line-height: 4.8pt;
        }
        .tl-inner-30 .tl-block-title {
          font-size: 4.55pt;
          line-height: 5.8pt;
          margin-top: 1.2pt;
        }
        .tl-inner-15 .tl-block-time {
          font-size: 3.8pt;
          line-height: 4.3pt;
        }
        .tl-inner-15 .tl-block-title {
          font-size: 4pt;
          line-height: 4.6pt;
          margin-top: 0.6pt;
        }
        .tl-block-lunch {
          background-color: #f8fafc;
          border-top-color: #94a3b8;
          border-bottom-color: #cbd5e1;
          border-left-color: #cbd5e1;
          border-right-color: #cbd5e1;
          border-bottom-style: dashed;
          border-left-style: dashed;
          border-right-style: dashed;
        }
        .tl-block-lunch .tl-block-time {
          color: #64748b;
        }
        .tl-block-lunch .tl-block-title {
          color: #475569;
          font-weight: 400;
        }
        .tl-block-absent {
          background-color: #f8fafc;
          border-top-color: #94a3b8;
          border-bottom-color: #cbd5e1;
          border-left-color: #cbd5e1;
          border-right-color: #cbd5e1;
        }
        .tl-block-dayoff {
          background-color: #f8fafc;
          border-top-color: #cbd5e1;
          border-bottom-color: #e2e8f0;
          border-left-color: #e2e8f0;
          border-right-color: #e2e8f0;
          border-bottom-style: dashed;
          border-left-style: dashed;
          border-right-style: dashed;
        }
        .assistant-badge {
          display: inline-block;
          background-color: #f1f5f9;
          border: 0.5pt solid #cbd5e1;
          color: #0f172a;
          font-weight: 700;
          font-size: 6.5pt;
          padding: 1pt 4.5pt;
          border-radius: 2pt;
          margin-right: 4pt;
        }
        .row-day-off td {
          background-color: #f8fafc;
        }
        .col-day {
          width: 11.5%;
          border-right: 0.5pt solid #cbd5e1;
          padding: 0 5pt !important;
          text-align: left;
        }
        .day-name {
          font-size: 7pt;
          font-weight: 700;
          color: #0f172a;
          display: block;
        }
        .day-date {
          font-size: 5.6pt;
          color: #64748b;
          margin-top: 2pt;
          display: block;
        }
        .shift-off {
          font-size: 6.2pt;
          font-weight: 700;
          color: #64748b;
          display: block;
        }
        .shift-off-sub {
          font-size: 5.1pt;
          color: #94a3b8;
          margin-top: 2pt;
          display: block;
        }
        .closed-box {
          border: 0.5pt solid #cbd5e1;
          background-color: #f8fafc;
          border-radius: 3pt;
          padding: 18pt;
          text-align: center;
          color: #64748b;
          font-size: 8pt;
          font-weight: 700;
          margin-top: 12pt;
        }
        .footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          border-top: 0.4pt solid #cbd5e1;
          padding-top: 2.5pt;
          font-size: 5.5pt;
          color: #64748b;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      ${htmlBody}
    </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1500);
  }, 250);
}

/**
 * Função utilitária para descarregar a escala diária em ficheiro CSV (compatibilidade anterior).
 */
export function exportDailyScheduleToCsv(params: {
  schoolName: string;
  dateStr: string;
  isoDate: string;
  operatingWindowStr: string;
  workingAssistants: PrintableAssistantSchedule[];
  absentAssistants: PrintableAbsentAssistant[];
}) {
  exportSchedulesToCsv({
    schoolName: params.schoolName,
    startDate: params.isoDate,
    endDate: params.isoDate,
    daysData: [
      {
        isoDate: params.isoDate,
        dateStr: params.dateStr,
        dayName: "",
        isOpen: true,
        operatingWindowStr: params.operatingWindowStr,
        workingAssistants: params.workingAssistants,
        absentAssistants: params.absentAssistants,
      },
    ],
  });
}

/**
 * Função utilitária para exportar escalas de múltiplos dias em CSV com UTF-8 BOM para Excel.
 * Cumpre RGPD: nunca expõe o motivo de ausência.
 */
export function exportSchedulesToCsv(params: {
  schoolName: string;
  startDate: string;
  endDate: string;
  daysData: DailyExportDayData[];
  assistantFilterId?: string;
}) {
  const { schoolName, startDate, endDate, daysData, assistantFilterId } = params;

  const rows: string[][] = [
    [
      "Escola",
      "Data",
      "Dia da Semana",
      "Nº Mecanográfico",
      "Assistente",
      "Turno",
      "Almoço",
      "Atividades Atribuídas",
      "Estado",
    ],
  ];

  daysData.forEach((day) => {
    if (!day.isOpen) {
      rows.push([
        schoolName,
        day.isoDate,
        day.dayName,
        "--",
        "--",
        "--",
        "--",
        day.closedReason || "Estabelecimento Encerrado",
        "Encerrado",
      ]);
      return;
    }

    const filteredWorking =
      assistantFilterId && assistantFilterId !== "all"
        ? day.workingAssistants.filter(
            (w) => String(w.assistant.id) === assistantFilterId
          )
        : day.workingAssistants;

    const filteredAbsent =
      assistantFilterId && assistantFilterId !== "all"
        ? day.absentAssistants.filter(
            (a) => String(a.assistant.id) === assistantFilterId
          )
        : day.absentAssistants;

    filteredWorking.forEach(({ assistant, shiftBounds, blocks }) => {
      const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "--:--";
      const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "--:--";
      const lunchStr =
        shiftBounds.lunchStartSlot && shiftBounds.lunchEndSlot
          ? `${TIME_SLOTS[shiftBounds.lunchStartSlot]} – ${TIME_SLOTS[shiftBounds.lunchEndSlot]}`
          : "Sem pausa almoço";

      const taskStrings = blocks
        .filter(
          (b) => b.state !== "off" && b.state !== "lunch" && b.state !== "absent"
        )
        .map((b) => {
          const s = TIME_SLOTS[b.start] || "";
          const e = TIME_SLOTS[Math.min(b.start + b.count, 95)] || "24:00";
          return `${s}-${e}: ${b.activityName || "Atividade"}`;
        })
        .join(" | ");

      rows.push([
        schoolName,
        day.isoDate,
        day.dayName,
        (assistant as any).internal_number || "--",
        assistant.name,
        `${shiftStart} – ${shiftEnd}`,
        lunchStr,
        taskStrings || "Apoio Geral",
        "Em Serviço",
      ]);
    });

    filteredAbsent.forEach(({ assistant, shiftBounds }) => {
      const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "--:--";
      const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "--:--";
      rows.push([
        schoolName,
        day.isoDate,
        day.dayName,
        (assistant as any).internal_number || "--",
        assistant.name,
        `${shiftStart} – ${shiftEnd}`,
        "--",
        "--",
        "Ausente",
      ]);
    });
  });

  const csvContent =
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((field) => `"${String(field || "").replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateSuffix =
    startDate === endDate ? startDate : `${startDate}_a_${endDate}`;
  a.href = url;
  a.download = `escala_servico_${dateSuffix}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PrintScheduleModal({
  open,
  onClose,
  initialDocModel = "wall",
  schoolName,
  agrupamentoName = "Agrupamento de Escolas",
  dateInfo,
  operatingWindowStr = "07:30–18:00",
  workingAssistants,
  absentAssistants,
  activeAssistants = [],
  schedulesList = [],
  absences = [],
  operatingSources,
  profilesByAssistant = {},
  exceptionsByAssistant = {},
  lunchBlocksByDate = {},
}: PrintScheduleModalProps) {
  const [startDate, setStartDate] = useState<string>(dateInfo.isoDate);
  const [endDate, setEndDate] = useState<string>(dateInfo.isoDate);
  const [docModel, setDocModel] = useState<"wall" | "individual" | "monthly">(
    initialDocModel
  );
  const [selectedAssistantFilter, setSelectedAssistantFilter] =
    useState<string>("all");
  const [outputFormat, setOutputFormat] = useState<"pdf" | "csv">("pdf");
  const [dateError, setDateError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Utilitário para calcular o 1º e último dia do mês de uma data ISO YYYY-MM-DD
  function getMonthBoundsIso(iso: string): { first: string; last: string } {
    const d = iso ? new Date(iso + "T12:00:00") : new Date();
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1, 12, 0, 0);
    const lastDay = new Date(year, month + 1, 0, 12, 0, 0);
    return {
      first: firstDay.toISOString().split("T")[0],
      last: lastDay.toISOString().split("T")[0],
    };
  }

  // Resetar datas para a data atual do dashboard ao abrir o modal
  useEffect(() => {
    if (open) {
      if (initialDocModel === "monthly") {
        const bounds = getMonthBoundsIso(dateInfo.isoDate);
        setStartDate(bounds.first);
        setEndDate(bounds.last);
      } else {
        setStartDate(dateInfo.isoDate);
        setEndDate(dateInfo.isoDate);
      }
      setDocModel(initialDocModel);
      setSelectedAssistantFilter("all");
      setDateError(null);
    }
  }, [open, dateInfo.isoDate, initialDocModel]);

  // Lista de assistentes combinada para o seletor
  const allAssistantsList = useMemo(() => {
    if (activeAssistants.length > 0) return activeAssistants;
    const seen = new Set<string>();
    const list: Assistant[] = [];
    workingAssistants.forEach(({ assistant }) => {
      if (!seen.has(String(assistant.id))) {
        seen.add(String(assistant.id));
        list.push(assistant);
      }
    });
    absentAssistants.forEach(({ assistant }) => {
      if (!seen.has(String(assistant.id))) {
        seen.add(String(assistant.id));
        list.push(assistant);
      }
    });
    return list;
  }, [activeAssistants, workingAssistants, absentAssistants]);

  // Utilitário para somar dias a uma data ISO YYYY-MM-DD
  function addDaysIso(iso: string, daysToAdd: number): string {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().split("T")[0];
  }

  // Data máxima permitida (máximo de 7 dias para diária/semanal; mês completo para mensal)
  const maxEndDateIso = useMemo(() => {
    if (!startDate) return undefined;
    if (docModel === "monthly") {
      return addDaysIso(startDate, 44);
    }
    return addDaysIso(startDate, 6);
  }, [startDate, docModel]);

  // Aplicar preenchimentos rápidos de data
  function applyDatePreset(
    preset:
      | "today"
      | "this-week"
      | "next-week"
      | "full-week"
      | "this-month"
      | "next-month"
  ) {
    const baseDate = dateInfo.isoDate
      ? new Date(dateInfo.isoDate + "T12:00:00")
      : new Date();
    if (preset === "today") {
      const todayIso = new Date().toISOString().split("T")[0];
      setStartDate(todayIso);
      setEndDate(todayIso);
    } else if (preset === "this-week") {
      const currentDow = baseDate.getDay();
      const diffToMon = currentDow === 0 ? -6 : 1 - currentDow;
      const mon = new Date(baseDate);
      mon.setDate(baseDate.getDate() + diffToMon);
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      setStartDate(mon.toISOString().split("T")[0]);
      setEndDate(fri.toISOString().split("T")[0]);
    } else if (preset === "next-week") {
      const currentDow = baseDate.getDay();
      const diffToNextMon = currentDow === 0 ? 1 : 8 - currentDow;
      const nextMon = new Date(baseDate);
      nextMon.setDate(baseDate.getDate() + diffToNextMon);
      const nextFri = new Date(nextMon);
      nextFri.setDate(nextMon.getDate() + 4);
      setStartDate(nextMon.toISOString().split("T")[0]);
      setEndDate(nextFri.toISOString().split("T")[0]);
    } else if (preset === "full-week") {
      const currentDow = baseDate.getDay();
      const diffToMon = currentDow === 0 ? -6 : 1 - currentDow;
      const mon = new Date(baseDate);
      mon.setDate(baseDate.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      setStartDate(mon.toISOString().split("T")[0]);
      setEndDate(sun.toISOString().split("T")[0]);
    } else if (preset === "this-month") {
      const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 12, 0, 0);
      const last = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 12, 0, 0);
      setStartDate(first.toISOString().split("T")[0]);
      setEndDate(last.toISOString().split("T")[0]);
    } else if (preset === "next-month") {
      const first = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1, 12, 0, 0);
      const last = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0, 12, 0, 0);
      setStartDate(first.toISOString().split("T")[0]);
      setEndDate(last.toISOString().split("T")[0]);
    }
    setDateError(null);
  }

  // Lista de datas no intervalo
  const datesInRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    if (startDate > endDate) return [];
    const list: string[] = [];
    const curr = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    while (curr <= end) {
      list.push(curr.toISOString().split("T")[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  }, [startDate, endDate]);

  // Resolução dos dados de cada dia no intervalo
  const daysData: DailyExportDayData[] = useMemo(() => {
    return datesInRange.map((isoDate) => {
      if (
        isoDate === dateInfo.isoDate &&
        workingAssistants &&
        workingAssistants.length > 0
      ) {
        return {
          isoDate,
          dateStr: dateInfo.dateStr,
          dayName: dateInfo.dayName,
          isOpen: true,
          operatingWindowStr,
          workingAssistants,
          absentAssistants,
        };
      }

      const dayStatus = operatingSources
        ? resolveSchoolDayStatusByIsoDate(isoDate, operatingSources)
        : {
            isOpen: true,
            schoolHours: undefined,
            viewStartSlot: 30,
            viewEndSlot: 72,
            closedLabel: undefined,
            title: undefined,
          };

      const parsedDate = new Date(isoDate + "T12:00:00");
      const rawDayName = parsedDate.toLocaleDateString("pt-PT", {
        weekday: "long",
      });
      const dayName = rawDayName.charAt(0).toUpperCase() + rawDayName.slice(1);
      const dateStr = parsedDate.toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const dayWindowStr = `${
        TIME_SLOTS[dayStatus.viewStartSlot ?? 30] ?? "07:30"
      }–${TIME_SLOTS[dayStatus.viewEndSlot ?? 72] ?? "18:00"}`;

      if (!dayStatus.isOpen) {
        return {
          isoDate,
          dateStr,
          dayName,
          isOpen: false,
          closedReason:
            (dayStatus as any).closedLabel ||
            (dayStatus as any).title ||
            "Estabelecimento Encerrado",
          operatingWindowStr: dayWindowStr,
          workingAssistants: [],
          absentAssistants: [],
        };
      }

      const dayMatrixData = buildDayMatrixFromApi({
        isoDate,
        isOpen: dayStatus.isOpen,
        assistants: activeAssistants,
        schedules: schedulesList,
        absences,
        lunchBlocksForDate: lunchBlocksByDate[isoDate],
        profilesByAssistant,
        exceptionsByAssistant,
      });

      const dayWorking: PrintableAssistantSchedule[] = [];
      const dayAbsent: PrintableAbsentAssistant[] = [];

      activeAssistants.forEach((assistant) => {
        const absence = (absences || []).find((ab: any) => {
          const aStart = (ab.valid_from || ab.start_date || "").slice(0, 10);
          const aEnd = (ab.valid_until || ab.end_date || aStart || "").slice(0, 10);
          return (
            String(ab.assistant_id) === String(assistant.id) &&
            isoDate >= aStart &&
            isoDate <= aEnd
          );
        });

        const shiftBounds = resolveAssistantShiftBounds({
          assistantId: assistant.id,
          isoDate,
          dow: parsedDate.getDay() === 0 ? 7 : parsedDate.getDay(),
          viewStartSlot: dayStatus.viewStartSlot ?? 30,
          viewEndSlot: dayStatus.viewEndSlot ?? 72,
          profiles: profilesByAssistant[String(assistant.id)],
          exceptions: exceptionsByAssistant[String(assistant.id)],
          schedulesList,
          lunchBlocksForDate: lunchBlocksByDate[isoDate],
          absences,
        }) || {
          startSlot: 31,
          endSlot: 62,
        };

        const rowSlots = dayMatrixData.matrix[assistant.id] || [];
        const blocks = slotsToBlocks(
          rowSlots,
          dayMatrixData.slotMetaByAssistant[assistant.id]
        );
        const hasWork = blocks.some(
          (b) => b.state !== "off" && b.state !== "lunch" && b.state !== "absent"
        );

        if (absence) {
          dayAbsent.push({
            assistant,
            reason: "Ausente",
            shiftBounds,
          });
        } else if (hasWork) {
          dayWorking.push({
            assistant,
            shiftBounds,
            blocks,
          });
        }
      });

      return {
        isoDate,
        dateStr,
        dayName,
        isOpen: true,
        operatingWindowStr: dayWindowStr,
        workingAssistants: dayWorking,
        absentAssistants: dayAbsent,
      };
    });
  }, [
    datesInRange,
    dateInfo,
    operatingWindowStr,
    workingAssistants,
    absentAssistants,
    operatingSources,
    activeAssistants,
    schedulesList,
    absences,
    lunchBlocksByDate,
    profilesByAssistant,
    exceptionsByAssistant,
  ]);

  /**
   * Constrói o HTML V4 (A4 Horizontal com Timeline Fixa, Legenda Superior, Top Borders e Privacidade RGPD)
   * para impressão local caso necessário.
   */
  function generateV4TimelineHtml(assistantFilterId?: string) {
    const now = new Date();
    const printedAt = `${now.toLocaleDateString("pt-PT")} ${now.toLocaleTimeString(
      "pt-PT",
      { hour: "2-digit", minute: "2-digit" }
    )}`;
    const docTitle =
      docModel === "individual"
        ? "Horário Individual de Serviço"
        : "Escala Diária de Serviço";

    if (docModel === "individual") {
      const targetAssistants =
        assistantFilterId && assistantFilterId !== "all"
          ? allAssistantsList.filter((a) => String(a.id) === assistantFilterId)
          : allAssistantsList;

      const rowsCount = Math.max(1, daysData.length);
      const rowHeightPt = Math.min(76, Math.max(54, Math.floor(420 / rowsCount)));
      const blockHeightPt = Number((rowHeightPt - 13.2).toFixed(1));
      const padTopNormal = Math.max(3, Math.floor((blockHeightPt - 18) / 2));
      const padTop15 = Math.max(2, Math.floor((blockHeightPt - 22) / 2));
      const padTopSpecial = Math.max(4, Math.floor((blockHeightPt - 12) / 2));

      const [firstOpen = "07:30", firstClose = "18:00"] = (
        daysData[0]?.operatingWindowStr ||
        operatingWindowStr ||
        "07:30–18:00"
      )
        .split(/[–-]/)
        .map((s) => s.trim());

      const winStartMin = timeToMin(firstOpen);
      const winEndMin = timeToMin(firstClose);
      const winTotalMin = Math.max(60, winEndMin - winStartMin);

      const timeHeaders: { label: string; left: number; width: number }[] = [];
      for (let m = winStartMin; m < winEndMin; m += 30) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        timeHeaders.push({
          label: `${hh}:${mm}`,
          left: Number((((m - winStartMin) / winTotalMin) * 100).toFixed(3)),
          width: Number(((30 / winTotalMin) * 100).toFixed(3)),
        });
      }

      const quarterTicks: {
        left: number;
        isHour: boolean;
        isHalf: boolean;
      }[] = [];
      for (let m = winStartMin; m <= winEndMin; m += 15) {
        quarterTicks.push({
          left: Number((((m - winStartMin) / winTotalMin) * 100).toFixed(3)),
          isHour: m % 60 === 0,
          isHalf: m % 30 === 0,
        });
      }

      const timeHeadersHtml = timeHeaders
        .map(
          (th, thIdx) => `
            <div class="tl-hour-header" style="left: ${th.left}%; width: ${
            th.width
          }%; ${thIdx === 0 ? "border-left:none;" : ""}">
              <div class="tl-hour-text">${th.label}</div>
            </div>
          `
        )
        .join("");

      const ticksHtml = quarterTicks
        .map((qt, tIdx) => {
          if (tIdx === 0 || tIdx === quarterTicks.length - 1) return "";
          const cls = qt.isHour
            ? "tl-tick-hour"
            : qt.isHalf
            ? "tl-tick-half"
            : "tl-tick-quarter";
          return `<div class="tl-tick-line ${cls}" style="left: ${qt.left}%; height: ${rowHeightPt}pt;"></div>`;
        })
        .join("");

      const periodLabel =
        startDate === endDate
          ? daysData[0]
            ? `${daysData[0].dayName}, ${daysData[0].dateStr}`
            : startDate
          : `${daysData[0]?.dateStr || startDate} a ${
              daysData[daysData.length - 1]?.dateStr || endDate
            }`;

      const indivPagesHtml = targetAssistants
        .map((assistant, sIdx) => {
          const code = (assistant as any).internal_number || "AO";
          const legendMap = new Map<
            string,
            { name: string; color: string; bg: string; border: string }
          >();

          const dayRowsHtml = daysData
            .map((day) => {
              const dObj = new Date(day.isoDate + "T12:00:00");
              const dateDisplay = dObj.toLocaleDateString("pt-PT", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });

              const workingEntry = day.workingAssistants.find(
                (w) => String(w.assistant.id) === String(assistant.id)
              );
              const absentEntry = day.absentAssistants.find(
                (a) => String(a.assistant.id) === String(assistant.id)
              );

              if (!day.isOpen || (!workingEntry && !absentEntry)) {
                const subLabel = !day.isOpen
                  ? day.closedReason || "Estabelecimento encerrado"
                  : "Descanso semanal";
                const blockTitle = !day.isOpen
                  ? (day.closedReason || "FOLGA / DESCANSO SEMANAL").toUpperCase()
                  : "FOLGA / DESCANSO SEMANAL";
                return `
                  <tr class="row-day-off">
                    <td class="col-day">
                      <span class="day-name">${day.dayName}</span>
                      <span class="day-date">${dateDisplay}</span>
                    </td>
                    <td class="col-shift">
                      <span class="shift-off">Folga Semanal</span>
                      <span class="shift-off-sub">${subLabel}</span>
                    </td>
                    <td class="col-timeline">
                      <div class="tl-row-wrap" style="height: ${rowHeightPt}pt;">
                        ${ticksHtml}
                        <div class="tl-block tl-block-dayoff" style="left: 0.2%; width: 99.6%; top: 5pt; height: ${blockHeightPt}pt; border-top-width: 2.6pt; border-bottom-width: 0.6pt;">
                          <div style="padding-top: ${padTopSpecial}pt; text-align: center; font-size: 6pt; font-weight: 700; color: #64748b; letter-spacing: 0.8pt; line-height: 10pt;">${blockTitle}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
              }

              if (absentEntry) {
                const shiftStart =
                  TIME_SLOTS[absentEntry.shiftBounds.startSlot] || "08:30";
                const shiftEnd =
                  TIME_SLOTS[absentEntry.shiftBounds.endSlot] || "16:30";
                const sMin = Math.max(winStartMin, timeToMin(shiftStart));
                const eMin = Math.min(winEndMin, timeToMin(shiftEnd));
                const left = Number(
                  (((sMin - winStartMin) / winTotalMin) * 100).toFixed(3)
                );
                const width = Number(
                  ((Math.max(30, eMin - sMin) / winTotalMin) * 100).toFixed(3)
                );

                return `
                  <tr>
                    <td class="col-day">
                      <span class="day-name">${day.dayName}</span>
                      <span class="day-date">${dateDisplay}</span>
                    </td>
                    <td class="col-shift">
                      <span class="shift-main">${shiftStart} – ${shiftEnd}</span>
                      <span class="shift-lunch">Ausência registada</span>
                    </td>
                    <td class="col-timeline">
                      <div class="tl-row-wrap" style="height: ${rowHeightPt}pt;">
                        ${ticksHtml}
                        <div class="tl-block tl-block-absent" style="left: ${left}%; width: ${width}%; top: 5pt; height: ${blockHeightPt}pt; border-top-width: 2.6pt; border-bottom-width: 0.6pt;">
                          <div style="padding-top: ${padTopSpecial}pt; text-align: center; font-size: 6pt; font-weight: 700; color: #64748b; letter-spacing: 0.8pt; line-height: 10pt;">AUSENTE</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
              }

              const { shiftBounds, blocks } = workingEntry!;
              const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "--:--";
              const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "--:--";
              const lunchStr =
                shiftBounds.lunchStartSlot && shiftBounds.lunchEndSlot
                  ? `${TIME_SLOTS[shiftBounds.lunchStartSlot]} – ${
                      TIME_SLOTS[shiftBounds.lunchEndSlot]
                    }`
                  : null;

              const blocksHtml = blocks
                .filter((b) => b.state !== "off")
                .map((b) => {
                  const st = TIME_SLOTS[b.start] || "08:00";
                  const et =
                    TIME_SLOTS[Math.min(b.start + b.count, 95)] || "18:00";
                  const durMin = b.count * 15;
                  const left = Math.max(
                    0,
                    Number(
                      (
                        ((timeToMin(st) - winStartMin) / winTotalMin) *
                        100
                      ).toFixed(3)
                    )
                  );
                  const width = Number(
                    ((durMin / winTotalMin) * 100).toFixed(3)
                  );

                  if (b.state === "absent") {
                    return `
                      <div class="tl-block tl-block-absent" style="left: ${left}%; width: ${width}%; top: 5pt; height: ${blockHeightPt}pt; border-top-width: 2.6pt; border-bottom-width: 0.6pt;">
                        <div style="padding-top: ${padTopSpecial}pt; text-align: center; font-size: 6pt; font-weight: 700; color: #64748b; letter-spacing: 0.8pt; line-height: 10pt;">AUSENTE</div>
                      </div>
                    `;
                  }

                  if (b.state === "lunch") {
                    return `
                      <div class="tl-block tl-block-lunch" style="left: ${left}%; width: ${width}%; top: 5pt; height: ${blockHeightPt}pt; border-top-width: 2.6pt; border-bottom-width: 0.6pt;">
                        <div style="padding: ${padTopNormal}pt 1.5pt 0 1.5pt; text-align: center;">
                          <span class="tl-block-time" style="font-size: 4.8pt; line-height: 6pt;">${st}-${et}</span>
                          <span class="tl-block-title" style="font-size: 5.5pt; line-height: 7pt; margin-top: 2pt;">Almoço</span>
                        </div>
                      </div>
                    `;
                  }

                  const actName = b.activityName || "Apoio Escola";
                  const color = resolveActivityHex(actName, b.activityColor);
                  const bg = tintHex(color, 0.85);
                  const border = tintHex(color, 0.55);
                  const text = darkenHex(color, 0.45);
                  const label = shortActivityLabel(actName, durMin);

                  if (!legendMap.has(actName)) {
                    legendMap.set(actName, { name: actName, color, bg, border });
                  }

                  if (durMin <= 15) {
                    return `
                      <div class="tl-block" style="left: ${left}%; width: ${width}%; top: 5pt; height: ${blockHeightPt}pt; border-top-width: 2.6pt; border-bottom-width: 0.6pt; background-color: ${bg}; border-bottom-color: ${border}; border-left-color: ${border}; border-right-color: ${border}; border-top-color: ${color};">
                        <div style="padding: ${padTop15}pt 0.4pt 0 0.4pt; text-align: center;">
                          <span class="tl-block-time" style="font-size: 4.1pt; line-height: 4.8pt;">${st}<br/>${et}</span>
                          <span class="tl-block-title" style="color: ${text}; font-size: 4.4pt; line-height: 5.2pt; margin-top: 1pt;">${label}</span>
                        </div>
                      </div>
                    `;
                  }

                  return `
                    <div class="tl-block" style="left: ${left}%; width: ${width}%; top: 5pt; height: ${blockHeightPt}pt; border-top-width: 2.6pt; border-bottom-width: 0.6pt; background-color: ${bg}; border-bottom-color: ${border}; border-left-color: ${border}; border-right-color: ${border}; border-top-color: ${color};">
                      <div style="padding: ${padTopNormal}pt 1.5pt 0 2pt;">
                        <span class="tl-block-time" style="font-size: 4.8pt; line-height: 6pt;">${st}-${et}</span>
                        <span class="tl-block-title" style="color: ${text}; font-size: 5.5pt; line-height: 7pt; margin-top: 2pt;">${label}</span>
                      </div>
                    </div>
                  `;
                })
                .join("");

              return `
                <tr>
                  <td class="col-day">
                    <span class="day-name">${day.dayName}</span>
                    <span class="day-date">${dateDisplay}</span>
                  </td>
                  <td class="col-shift">
                    <span class="shift-main">${shiftStart} – ${shiftEnd}</span>
                    <span class="shift-lunch">${
                      lunchStr ? `Almoço: ${lunchStr}` : "Sem pausa almoço"
                    }</span>
                  </td>
                  <td class="col-timeline">
                    <div class="tl-row-wrap" style="height: ${rowHeightPt}pt;">
                      ${ticksHtml}
                      ${blocksHtml}
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("");

          const legendItemsHtml = Array.from(legendMap.values())
            .map(
              (act) => `
                <span class="legend-item">
                  <span class="legend-swatch" style="background-color: ${act.bg}; border: 0.4pt solid ${act.border}; border-top: 1.8pt solid ${act.color};"></span>${act.name}
                </span>
              `
            )
            .join("");

          return `
            <table class="header-table">
              <tr>
                <td style="width: 88pt;">
                  <img src="${logoHorizontalUrl}" style="height: 20pt; width: auto;" alt="SGDE" />
                </td>
                <td>
                  <div class="school-title">${schoolName} — Horário Individual de Serviço</div>
                  <div class="school-subtitle">
                    <span class="assistant-badge">${assistant.name} (${code})</span>
                    · Assistente Operacional · ${agrupamentoName}
                  </div>
                </td>
                <td style="width: 225pt;">
                  <div class="date-title">${periodLabel}</div>
                  <div class="hours-subtitle">Funcionamento: ${firstOpen} – ${firstClose}</div>
                </td>
              </tr>
            </table>

            <div class="legend-bar">
              <span class="legend-label">Legenda:</span>
              ${legendItemsHtml}
              <span class="legend-item">
                <span class="legend-swatch" style="background-color: #f8fafc; border: 0.4pt dashed #94a3b8; border-top: 1.8pt solid #94a3b8;"></span>Almoço
              </span>
              <span class="legend-item">
                <span class="legend-swatch" style="background-color: #f8fafc; border: 0.4pt dashed #cbd5e1; border-top: 1.8pt solid #cbd5e1;"></span>Folga / Encerrado
              </span>
              <span class="legend-item">
                <span class="legend-swatch" style="background-color: #f8fafc; border: 0.4pt solid #cbd5e1; border-top: 1.8pt solid #94a3b8;"></span>Ausente
              </span>
            </div>

            <table class="schedule-table">
              <thead>
                <tr>
                  <th class="col-day" style="padding: 4pt 5pt !important;">Dia / Data</th>
                  <th class="col-shift" style="padding: 4pt 5pt !important;">Turno / Almoço</th>
                  <th class="col-timeline">
                    <div class="tl-header-wrap">
                      ${timeHeadersHtml}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                ${dayRowsHtml}
              </tbody>
            </table>
            ${
              sIdx < targetAssistants.length - 1
                ? '<div class="page-break"></div>'
                : ""
            }
          `;
        })
        .join("");

      return `
        <div class="footer">
          <span>Impresso em ${printedAt}</span>
          <span>SGDE v1.0</span>
        </div>
        ${indivPagesHtml}
      `;
    }

    const pagesHtml = daysData
      .map((day, idx) => {
        const [rawOpen = "07:30", rawClose = "18:00"] = (
          day.operatingWindowStr || "07:30–18:00"
        )
          .split(/[–-]/)
          .map((s) => s.trim());

        const headerHtml = `
          <table class="header-table">
            <tr>
              <td style="width: 88pt;">
                <img src="${logoHorizontalUrl}" style="height: 20pt; width: auto;" alt="SGDE" />
              </td>
              <td>
                <div class="school-title">${schoolName} — ${docTitle}</div>
                <div class="school-subtitle">Assistentes Operacionais · ${agrupamentoName}</div>
              </td>
              <td style="width: 190pt;">
                <div class="date-title">${day.dayName}, ${day.dateStr}</div>
                <div class="hours-subtitle">${
                  day.isOpen
                    ? `Funcionamento: ${rawOpen} – ${rawClose}`
                    : "Estabelecimento Encerrado"
                }</div>
              </td>
            </tr>
          </table>
        `;

        if (!day.isOpen) {
          return `
            ${headerHtml}
            <div class="closed-box">
              ${day.closedReason || "Estabelecimento Encerrado"}
            </div>
            ${idx < daysData.length - 1 ? '<div class="page-break"></div>' : ""}
          `;
        }

        const winStartMin = timeToMin(rawOpen);
        const winEndMin = timeToMin(rawClose);
        const winTotalMin = Math.max(60, winEndMin - winStartMin);

        const timeHeaders: { label: string; left: number; width: number }[] = [];
        for (let m = winStartMin; m < winEndMin; m += 30) {
          const hh = String(Math.floor(m / 60)).padStart(2, "0");
          const mm = String(m % 60).padStart(2, "0");
          timeHeaders.push({
            label: `${hh}:${mm}`,
            left: Number((((m - winStartMin) / winTotalMin) * 100).toFixed(3)),
            width: Number(((30 / winTotalMin) * 100).toFixed(3)),
          });
        }

        const quarterTicks: {
          left: number;
          isHour: boolean;
          isHalf: boolean;
        }[] = [];
        for (let m = winStartMin; m <= winEndMin; m += 15) {
          quarterTicks.push({
            left: Number((((m - winStartMin) / winTotalMin) * 100).toFixed(3)),
            isHour: m % 60 === 0,
            isHalf: m % 30 === 0,
          });
        }

        const filteredWorking =
          assistantFilterId && assistantFilterId !== "all"
            ? day.workingAssistants.filter(
                (w) => String(w.assistant.id) === assistantFilterId
              )
            : day.workingAssistants;

        const filteredAbsent =
          assistantFilterId && assistantFilterId !== "all"
            ? day.absentAssistants.filter(
                (a) => String(a.assistant.id) === assistantFilterId
              )
            : day.absentAssistants;

        const legendMap = new Map<
          string,
          { name: string; color: string; bg: string; border: string }
        >();

        const workingRowsHtml = filteredWorking
          .map(({ assistant, shiftBounds, blocks }) => {
            const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "--:--";
            const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "--:--";
            const lunchStr =
              shiftBounds.lunchStartSlot && shiftBounds.lunchEndSlot
                ? `${TIME_SLOTS[shiftBounds.lunchStartSlot]} – ${TIME_SLOTS[shiftBounds.lunchEndSlot]}`
                : null;
            const code = (assistant as any).internal_number || "";

            const blocksHtml = blocks
              .filter((b) => b.state !== "off")
              .map((b) => {
                const st = TIME_SLOTS[b.start] || "08:00";
                const et =
                  TIME_SLOTS[Math.min(b.start + b.count, 95)] || "18:00";
                const durMin = b.count * 15;
                const left = Math.max(
                  0,
                  Number(
                    (((timeToMin(st) - winStartMin) / winTotalMin) * 100).toFixed(3)
                  )
                );
                const width = Number(((durMin / winTotalMin) * 100).toFixed(3));

                if (b.state === "absent") {
                  return `
                    <div class="tl-block tl-block-absent" style="left: ${left}%; width: ${width}%;">
                      <div class="tl-inner-absent">AUSENTE</div>
                    </div>
                  `;
                }

                if (b.state === "lunch") {
                  return `
                    <div class="tl-block tl-block-lunch" style="left: ${left}%; width: ${width}%;">
                      <div class="tl-inner-lunch">
                        <span class="tl-block-time">${st}-${et}</span>
                        <span class="tl-block-title">Almoço</span>
                      </div>
                    </div>
                  `;
                }

                const actName = b.activityName || "Apoio Escola";
                const color = resolveActivityHex(actName, b.activityColor);
                const bg = tintHex(color, 0.85);
                const border = tintHex(color, 0.55);
                const text = darkenHex(color, 0.45);
                const label = shortActivityLabel(actName, durMin);

                if (!legendMap.has(actName)) {
                  legendMap.set(actName, { name: actName, color, bg, border });
                }

                if (durMin <= 15) {
                  return `
                    <div class="tl-block" style="left: ${left}%; width: ${width}%; background-color: ${bg}; border-bottom-color: ${border}; border-left-color: ${border}; border-right-color: ${border}; border-top-color: ${color};">
                      <div class="tl-inner-15">
                        <span class="tl-block-time">${st}<br/>${et}</span>
                        <span class="tl-block-title" style="color: ${text};">${label}</span>
                      </div>
                    </div>
                  `;
                }

                const innerClass = durMin <= 30 ? "tl-inner-30" : "tl-inner-normal";
                return `
                  <div class="tl-block" style="left: ${left}%; width: ${width}%; background-color: ${bg}; border-bottom-color: ${border}; border-left-color: ${border}; border-right-color: ${border}; border-top-color: ${color};">
                    <div class="${innerClass}">
                      <span class="tl-block-time">${st}-${et}</span>
                      <span class="tl-block-title" style="color: ${text};">${label}</span>
                    </div>
                  </div>
                `;
              })
              .join("");

            const ticksHtml = quarterTicks
              .map((qt, tIdx) => {
                if (tIdx === 0 || tIdx === quarterTicks.length - 1) return "";
                const cls = qt.isHour
                  ? "tl-tick-hour"
                  : qt.isHalf
                  ? "tl-tick-half"
                  : "tl-tick-quarter";
                return `<div class="tl-tick-line ${cls}" style="left: ${qt.left}%;"></div>`;
              })
              .join("");

            return `
              <tr>
                <td class="col-assistant">
                  <span class="assistant-name">${assistant.name}</span>
                  <span class="assistant-code">${code}</span>
                </td>
                <td class="col-shift">
                  <span class="shift-main">${shiftStart} – ${shiftEnd}</span>
                  <span class="shift-lunch">${
                    lunchStr ? `Almoço: ${lunchStr}` : "Sem pausa almoço"
                  }</span>
                </td>
                <td class="col-timeline">
                  <div class="tl-row-wrap">
                    ${ticksHtml}
                    ${blocksHtml}
                  </div>
                </td>
              </tr>
            `;
          })
          .join("");

        const absentRowsHtml = filteredAbsent
          .map(({ assistant, shiftBounds }) => {
            const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "08:30";
            const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "16:30";
            const code = (assistant as any).internal_number || "";
            const sMin = Math.max(winStartMin, timeToMin(shiftStart));
            const eMin = Math.min(winEndMin, timeToMin(shiftEnd));
            const left = Number(
              (((sMin - winStartMin) / winTotalMin) * 100).toFixed(3)
            );
            const width = Number(
              ((Math.max(30, eMin - sMin) / winTotalMin) * 100).toFixed(3)
            );

            const ticksHtml = quarterTicks
              .map((qt, tIdx) => {
                if (tIdx === 0 || tIdx === quarterTicks.length - 1) return "";
                const cls = qt.isHour
                  ? "tl-tick-hour"
                  : qt.isHalf
                  ? "tl-tick-half"
                  : "tl-tick-quarter";
                return `<div class="tl-tick-line ${cls}" style="left: ${qt.left}%;"></div>`;
              })
              .join("");

            return `
              <tr>
                <td class="col-assistant">
                  <span class="assistant-name">${assistant.name}</span>
                  <span class="assistant-code">${code}</span>
                </td>
                <td class="col-shift">
                  <span class="shift-main">${shiftStart} – ${shiftEnd}</span>
                </td>
                <td class="col-timeline">
                  <div class="tl-row-wrap">
                    ${ticksHtml}
                    <div class="tl-block tl-block-absent" style="left: ${left}%; width: ${width}%;">
                      <div class="tl-inner-absent">AUSENTE</div>
                    </div>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("");

        const legendItemsHtml = Array.from(legendMap.values())
          .map(
            (act) => `
              <span class="legend-item">
                <span class="legend-swatch" style="background-color: ${act.bg}; border: 0.4pt solid ${act.border}; border-top: 1.8pt solid ${act.color};"></span>${act.name}
              </span>
            `
          )
          .join("");

        const timeHeadersHtml = timeHeaders
          .map(
            (th, thIdx) => `
              <div class="tl-hour-header" style="left: ${th.left}%; width: ${
              th.width
            }%; ${thIdx === 0 ? "border-left:none;" : ""}">
                <div class="tl-hour-text">${th.label}</div>
              </div>
            `
          )
          .join("");

        return `
          ${headerHtml}
          <div class="legend-bar">
            <span class="legend-label">Legenda:</span>
            ${legendItemsHtml}
            <span class="legend-item">
              <span class="legend-swatch" style="background-color: #f8fafc; border: 0.4pt dashed #94a3b8; border-top: 1.8pt solid #94a3b8;"></span>Almoço
            </span>
            <span class="legend-item">
              <span class="legend-swatch" style="background-color: #f8fafc; border: 0.4pt solid #cbd5e1; border-top: 1.8pt solid #94a3b8;"></span>Ausente
            </span>
          </div>

          <table class="schedule-table">
            <thead>
              <tr>
                <th class="col-assistant" style="padding: 4pt 5pt !important;">Assistente</th>
                <th class="col-shift" style="padding: 4pt 5pt !important;">Turno / Almoço</th>
                <th class="col-timeline">
                  <div class="tl-header-wrap">
                    ${timeHeadersHtml}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              ${workingRowsHtml}${absentRowsHtml}
            </tbody>
          </table>
          ${idx < daysData.length - 1 ? '<div class="page-break"></div>' : ""}
        `;
      })
      .join("");

    return `
      <div class="footer">
        <span>Impresso em ${printedAt}</span>
        <span>SGDE v1.0</span>
      </div>
      ${pagesHtml}
    `;
  }

  async function handleExecute() {
    if (startDate > endDate) {
      setDateError("A data final deve ser posterior ou igual à data inicial.");
      return;
    }
    if (docModel === "monthly") {
      if (datesInRange.length > 45) {
        setDateError(
          "O intervalo selecionado para o mapa mensal não pode ultrapassar 1 mês."
        );
        return;
      }
    } else if (datesInRange.length > 7) {
      setDateError(
        "O intervalo selecionado não pode ultrapassar 7 dias (1 semana)."
      );
      return;
    }
    setDateError(null);

    const assistantIdFilter =
      (docModel === "individual" || docModel === "monthly") &&
      selectedAssistantFilter !== "all"
        ? selectedAssistantFilter
        : undefined;

    try {
      setIsExporting(true);
      await schedulesService.downloadExport({
        start_date: startDate,
        end_date: endDate,
        format: outputFormat,
        model: docModel,
        assistant_id: assistantIdFilter,
      });

      notify.success(
        outputFormat === "csv"
          ? "Ficheiro CSV gerado e descarregado com sucesso."
          : "Documento PDF gerado e descarregado com sucesso.",
        "Exportação Concluída"
      );
      onClose();
    } catch (err: any) {
      const backendMsg =
        err?.backendMessage ||
        err?.response?.data?.message ||
        null;

      if (
        backendMsg ||
        (err?.httpStatus && err.httpStatus >= 400 && err.httpStatus < 500)
      ) {
        const message =
          backendMsg ||
          "Não existe nenhuma escala publicada para o período selecionado. Publique a escala antes de imprimir ou exportar.";
        setDateError(message);
        notify.warning(message, "Escala Não Publicada");
        return;
      }

      notify.error(
        "Não foi possível comunicar com o servidor para gerar o documento.",
        "Erro na Exportação"
      );
    } finally {
      setIsExporting(false);
    }
  }

  const selectedDaysCount = datesInRange.length;
  const maxAllowedDays = docModel === "monthly" ? 45 : 7;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-full max-w-xl p-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header do Modal */}
        <DialogHeader className="px-6 py-5 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Printer size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Imprimir e Exportar Horários
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {schoolName} · {agrupamentoName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* SECÇÃO 1: INTERVALO DE DATAS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                {docModel === "monthly" ? "Mês / Período de Referência" : "Intervalo de Datas"}
              </label>
              <span className="text-[11px] font-medium text-muted-foreground">
                {docModel === "monthly"
                  ? "Grelha mensal completa (Seg–Dom)"
                  : "Máximo: 7 dias (1 semana)"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Data Inicial:
                </span>
                <DatePicker
                  value={startDate}
                  allowClear={false}
                  onChange={(v) => {
                    if (!v) return;
                    if (docModel === "monthly") {
                      const bounds = getMonthBoundsIso(v);
                      setStartDate(bounds.first);
                      setEndDate(bounds.last);
                      setDateError(null);
                      return;
                    }
                    setStartDate(v);
                    const newMaxEnd = addDaysIso(v, 6);
                    if (endDate < v) {
                      setEndDate(v);
                    } else if (newMaxEnd && endDate > newMaxEnd) {
                      setEndDate(newMaxEnd);
                    }
                    setDateError(null);
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <span className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Data Final:
                </span>
                <DatePicker
                  value={endDate}
                  allowClear={false}
                  minDate={startDate || undefined}
                  maxDate={maxEndDateIso}
                  onChange={(v) => {
                    if (!v) return;
                    if (maxEndDateIso && v > maxEndDateIso) {
                      setEndDate(maxEndDateIso);
                      setDateError(
                        docModel === "monthly"
                          ? "O intervalo selecionado para o mapa mensal não pode ultrapassar 1 mês."
                          : "O intervalo selecionado não pode ultrapassar 7 dias (1 semana)."
                      );
                      return;
                    }
                    setEndDate(v);
                    setDateError(null);
                  }}
                  className="w-full"
                />
              </div>
            </div>

            {dateError && (
              <p className="text-[11px] text-destructive font-medium">
                {dateError}
              </p>
            )}

            {/* Atalhos de Preenchimento Rápido */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[11px] text-muted-foreground font-medium">
                Preenchimento rápido:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {docModel === "monthly" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("this-month")}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card hover:bg-muted font-medium transition-colors text-foreground shadow-2xs cursor-pointer"
                    >
                      Este Mês
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("next-month")}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card hover:bg-muted font-medium transition-colors text-foreground shadow-2xs cursor-pointer"
                    >
                      Próximo Mês
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("today")}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card hover:bg-muted font-medium transition-colors text-foreground shadow-2xs cursor-pointer"
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("this-week")}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card hover:bg-muted font-medium transition-colors text-foreground shadow-2xs cursor-pointer"
                    >
                      Esta Semana (Seg–Sex)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("full-week")}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card hover:bg-muted font-medium transition-colors text-foreground shadow-2xs cursor-pointer"
                    >
                      Semana Completa (7 dias)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("next-week")}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card hover:bg-muted font-medium transition-colors text-foreground shadow-2xs cursor-pointer"
                    >
                      Próxima Semana
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* SECÇÃO 2: MODELO DE DOCUMENTO */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Modelo de Documento:
            </label>

            <RadioGroup
              value={docModel}
              onValueChange={(val) => {
                const nextModel = val as "wall" | "individual" | "monthly";
                setDocModel(nextModel);
                setDateError(null);
                if (nextModel === "monthly") {
                  const bounds = getMonthBoundsIso(startDate || dateInfo.isoDate);
                  setStartDate(bounds.first);
                  setEndDate(bounds.last);
                } else {
                  const maxEnd = addDaysIso(startDate, 6);
                  if (maxEnd && endDate > maxEnd) {
                    setEndDate(startDate);
                  }
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
            >
              <label
                htmlFor="model-wall"
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  docModel === "wall"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                    : "border-border bg-card/60 hover:bg-muted/40 hover:border-border/80"
                }`}
              >
                <RadioGroupItem
                  value="wall"
                  id="model-wall"
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    Escala Diária
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Mapa diário (A4) com linha temporal e todos os assistentes.
                  </p>
                </div>
              </label>

              <label
                htmlFor="model-individual"
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  docModel === "individual"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                    : "border-border bg-card/60 hover:bg-muted/40 hover:border-border/80"
                }`}
              >
                <RadioGroupItem
                  value="individual"
                  id="model-individual"
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    Horário Semanal
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Linha temporal semanal por assistente (até 7 dias).
                  </p>
                </div>
              </label>

              <label
                htmlFor="model-monthly"
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  docModel === "monthly"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                    : "border-border bg-card/60 hover:bg-muted/40 hover:border-border/80"
                }`}
              >
                <RadioGroupItem
                  value="monthly"
                  id="model-monthly"
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    Horário Mensal
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Grelha de calendário mensal com turno, almoço e faltas.
                  </p>
                </div>
              </label>
            </RadioGroup>

            {/* Seletor Customizado de Assistente */}
            {(docModel === "individual" || docModel === "monthly") && (
              <div className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20 animate-in fade-in-50 duration-200">
                <label className="text-xs font-medium text-foreground block">
                  Assistente a emitir:
                </label>
                <AssistantSelect
                  value={selectedAssistantFilter}
                  onChange={(val) => setSelectedAssistantFilter(val)}
                  assistants={allAssistantsList}
                  includeAllOption={true}
                  allOptionLabel="Todos os assistentes"
                  placeholder="Pesquisar assistente por nome, nº ou email..."
                />
              </div>
            )}
          </div>

          <div className="h-px bg-border/60" />

          {/* SECÇÃO 3: FORMATO DE SAÍDA */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Formato de Saída:
            </label>

            <RadioGroup
              value={outputFormat}
              onValueChange={(val) => setOutputFormat(val as "pdf" | "csv")}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              <label
                htmlFor="format-pdf"
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  outputFormat === "pdf"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                    : "border-border bg-card/60 hover:bg-muted/40 hover:border-border/80"
                }`}
              >
                <RadioGroupItem
                  value="pdf"
                  id="format-pdf"
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    PDF A4 Horizontal
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Gera e descarrega diretamente o documento PDF A4 horizontal.
                  </p>
                </div>
              </label>

              <label
                htmlFor="format-csv"
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  outputFormat === "csv"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                    : "border-border bg-card/60 hover:bg-muted/40 hover:border-border/80"
                }`}
              >
                <RadioGroupItem
                  value="csv"
                  id="format-csv"
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    Excel / CSV (.csv)
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Tabela estruturada com UTF-8 BOM compatível com Microsoft Excel.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>

        {/* Footer do Modal */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              {selectedDaysCount} {selectedDaysCount === 1 ? "dia" : "dias"}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {docModel === "wall"
                ? "Escala Diária"
                : docModel === "monthly"
                ? "Horário Mensal"
                : "Horário Semanal"}{" "}
              · {outputFormat === "pdf" ? "PDF A4 Horizontal" : "CSV"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExecute}
              disabled={
                selectedDaysCount === 0 ||
                selectedDaysCount > maxAllowedDays ||
                !!dateError ||
                isExporting
              }
              className="cursor-pointer font-medium gap-1.5"
            >
              {isExporting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isExporting
                ? outputFormat === "pdf"
                  ? "A gerar PDF..."
                  : "A gerar CSV..."
                : outputFormat === "pdf"
                ? "Imprimir / Gerar PDF"
                : "Descarregar CSV / Excel"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
