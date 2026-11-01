import { useMemo, useState, useEffect } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  Sparkles,
  UserCheck,
  Users,
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
import { Badge } from "../ui/badge";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import DatePicker from "../common/DatePicker";
import DateRangePicker from "../common/DateRangePicker";
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
import { useAuth } from "../../context/AuthContext";
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
  const { role } = useAuth();
  if (role !== 'admin') {
    return null;
  }

  const [startDate, setStartDate] = useState<string>(dateInfo.isoDate);
  const [endDate, setEndDate] = useState<string>(dateInfo.isoDate);
  const [docModel, setDocModel] = useState<"wall" | "individual" | "monthly">(
    initialDocModel
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  // Utilitário para calcular a segunda e domingo de uma semana a partir de uma data ISO YYYY-MM-DD
  function getWeekBoundsIso(iso: string): { first: string; last: string } {
    const d = iso ? new Date(iso + "T12:00:00") : new Date();
    const day = d.getDay(); // 0 = Sun
    const diffToMon = (day + 6) % 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      first: mon.toISOString().split("T")[0],
      last: sun.toISOString().split("T")[0],
    };
  }

  // Resetar datas para a data atual do dashboard ao abrir o modal
  useEffect(() => {
    if (open) {
      setStep(1);
      if (initialDocModel === "monthly") {
        const bounds = getMonthBoundsIso(dateInfo.isoDate);
        setStartDate(bounds.first);
        setEndDate(bounds.last);
      } else if (initialDocModel === "individual") {
        const bounds = getWeekBoundsIso(dateInfo.isoDate);
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
    if (docModel === "monthly" || docModel === "individual") {
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

      // Dividir os dias em blocos semanais (até 7 dias cada) para não transbordar a página A4
      const weekChunks: DailyExportDayData[][] = [];
      for (let i = 0; i < daysData.length; i += 7) {
        weekChunks.push(daysData.slice(i, i + 7));
      }

      const allPages: string[] = [];

      targetAssistants.forEach((assistant) => {
        const code = (assistant as any).internal_number || "AO";

        weekChunks.forEach((weekDays) => {
          const rowsCount = Math.max(1, weekDays.length);
          const rowHeightPt = Math.min(76, Math.max(54, Math.floor(420 / rowsCount)));
          const blockHeightPt = Number((rowHeightPt - 13.2).toFixed(1));
          const padTopNormal = Math.max(3, Math.floor((blockHeightPt - 18) / 2));
          const padTop15 = Math.max(2, Math.floor((blockHeightPt - 22) / 2));
          const padTopSpecial = Math.max(4, Math.floor((blockHeightPt - 12) / 2));

          const [firstOpen = "07:30", firstClose = "18:00"] = (
            weekDays[0]?.operatingWindowStr ||
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
            weekDays[0]?.isoDate === weekDays[weekDays.length - 1]?.isoDate
              ? weekDays[0]
                ? `${weekDays[0].dayName}, ${weekDays[0].dateStr}`
                : startDate
              : `${weekDays[0]?.dateStr || startDate} a ${
                  weekDays[weekDays.length - 1]?.dateStr || endDate
                }`;

          const legendMap = new Map<
            string,
            { name: string; color: string; bg: string; border: string }
          >();

          const dayRowsHtml = weekDays
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

          allPages.push(`
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
          `);
        });
      });

      const indivPagesHtml = allPages.join('<div class="page-break"></div>');

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
    if (docModel === "wall") {
      if (datesInRange.length > 7) {
        setDateError(
          "O intervalo selecionado para a escala diária não pode ultrapassar 7 dias (1 semana)."
        );
        return;
      }
    } else {
      if (datesInRange.length > 45) {
        setDateError(
          "O intervalo selecionado não pode ultrapassar 45 dias."
        );
        return;
      }
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
      if (err?.httpStatus === 403 || err?.response?.status === 403) {
        notify.error(
          "Apenas administradores têm permissão para imprimir e exportar escalas.",
          "Acesso Negado"
        );
        onClose();
        return;
      }

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
  const maxAllowedDays = docModel === "wall" ? 7 : 45;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-full max-w-2xl p-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col">
        {/* Header do Modal */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Printer size={18} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
                {step === 1 && "Modelo de Escala"}
                {step === 2 && "Período e Assistentes"}
                {step === 3 && "Formato e Emissão"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {step === 1 && "Escolha o tipo de mapa de trabalho pretendido para o estabelecimento."}
                {step === 2 && "Defina o intervalo de datas e a seleção de assistentes para a emissão."}
                {step === 3 && "Reveja os parâmetros e selecione o formato final de exportação."}
              </DialogDescription>
            </div>
          </div>

          {/* Stepper por baixo dos títulos - 3 colunas centradas com espaçamento simétrico */}
          <div className="!mt-4 pt-4 border-t border-border/60">
            <div className="max-w-md mx-auto grid grid-cols-3 relative">
              {/* Linha de ligação horizontal em fundo */}
              <div className="absolute top-2.5 left-[16.6%] right-[16.6%] h-px bg-border">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: step === 1 ? "0%" : step === 2 ? "50%" : "100%",
                  }}
                />
              </div>

              {/* Passo 1 */}
              <div
                className="flex flex-col items-center text-center cursor-pointer relative z-10"
                onClick={() => setStep(1)}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step === 1
                      ? "bg-primary text-primary-foreground shadow-xs ring-4 ring-card"
                      : step > 1
                      ? "bg-emerald-500 text-white ring-4 ring-card"
                      : "bg-muted text-muted-foreground border border-border ring-4 ring-card"
                  }`}
                >
                  {step > 1 ? <Check size={11} strokeWidth={3} /> : "1"}
                </div>
                <span
                  className={`text-xs mt-1.5 transition-colors ${
                    step === 1 ? "font-semibold text-foreground" : "text-muted-foreground font-medium"
                  }`}
                >
                  1. Modelo
                </span>
              </div>

              {/* Passo 2 */}
              <div
                className={`flex flex-col items-center text-center relative z-10 ${
                  step >= 2 ? "cursor-pointer" : "opacity-60"
                }`}
                onClick={() => step > 2 && setStep(2)}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step === 2
                      ? "bg-primary text-primary-foreground shadow-xs ring-4 ring-card"
                      : step > 2
                      ? "bg-emerald-500 text-white ring-4 ring-card"
                      : "bg-muted text-muted-foreground border border-border ring-4 ring-card"
                  }`}
                >
                  {step > 2 ? <Check size={11} strokeWidth={3} /> : "2"}
                </div>
                <span
                  className={`text-xs mt-1.5 transition-colors ${
                    step === 2 ? "font-semibold text-foreground" : "text-muted-foreground font-medium"
                  }`}
                >
                  2. Datas e Seleção
                </span>
              </div>

              {/* Passo 3 */}
              <div className={`flex flex-col items-center text-center relative z-10 ${step === 3 ? "" : "opacity-60"}`}>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step === 3
                      ? "bg-primary text-primary-foreground shadow-xs ring-4 ring-card"
                      : "bg-muted text-muted-foreground border border-border ring-4 ring-card"
                  }`}
                >
                  3
                </div>
                <span
                  className={`text-xs mt-1.5 transition-colors ${
                    step === 3 ? "font-semibold text-foreground" : "text-muted-foreground font-medium"
                  }`}
                >
                  3. Exportação
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo do Modal com Transição entre Passos */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* ========================================================= */}
          {/* PASSO 1: ESCOLHA DO MODELO DE ESCALA                      */}
          {/* ========================================================= */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Escolha o Modelo de Documento:
                </label>
                <p className="text-xs text-muted-foreground">
                  Selecione o formato de organização visual pretendido para a escala da escola.
                </p>
              </div>

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
                  } else if (nextModel === "individual") {
                    const bounds = getWeekBoundsIso(startDate || dateInfo.isoDate);
                    setStartDate(bounds.first);
                    setEndDate(bounds.last);
                  } else {
                    const singleDay = startDate || dateInfo.isoDate;
                    setStartDate(singleDay);
                    setEndDate(singleDay);
                  }
                }}
                className="grid grid-cols-1 gap-3"
              >
                {/* 1. Escala Diária (Mural / Afixação) */}
                <label
                  htmlFor="model-wall"
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    docModel === "wall"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                      : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                  }`}
                >
                  <RadioGroupItem value="wall" id="model-wall" className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Escala Diária de Serviço (Mural / Afixação)
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Grelha horizontal completa por escola. Mostra todos os assistentes em serviço, turnos, intervalos e tarefas diárias em página A4 para afixação.
                    </p>
                  </div>
                </label>

                {/* 2. Horário Semanal (Individual) */}
                <label
                  htmlFor="model-individual"
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    docModel === "individual"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                      : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                  }`}
                >
                  <RadioGroupItem value="individual" id="model-individual" className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Horário Semanal de Serviço (Individual)
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Horário individual estruturado por semana(s) de Segunda a Domingo. Ideal para entrega direta a cada assistente ou consulta do plano semanal de trabalho.
                    </p>
                  </div>
                </label>

                {/* 3. Horário Geral Mensal */}
                <label
                  htmlFor="model-monthly"
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    docModel === "monthly"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                      : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                  }`}
                >
                  <RadioGroupItem value="monthly" id="model-monthly" className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground block">
                      Horário Geral Mensal
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Visão mensal global dos turnos de todos os assistentes operacionais, incluindo intervalos de almoço e faltas, para arquivo e gestão administrativa.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 2: DEFINIÇÃO DE DATAS E ASSISTENTES                 */}
          {/* ========================================================= */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* Seleção do Intervalo de Datas */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    {docModel === "monthly" ? "Mês de Referência:" : "Intervalo de Datas:"}
                  </label>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {docModel === "monthly"
                      ? "Grelha mensal completa (Seg–Dom)"
                      : docModel === "individual"
                      ? "Semanas completas (Seg–Dom)"
                      : "Máximo: 7 dias"}
                  </span>
                </div>

                {docModel === "individual" ? (
                  <div>
                    <span className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Selecione uma ou várias semanas completas (Segunda a Domingo):
                    </span>
                    <DateRangePicker
                      value={{ startDate, endDate }}
                      selectWeekOnly={true}
                      allowClear={false}
                      onChange={(range) => {
                        if (!range.startDate || !range.endDate) return;
                        setStartDate(range.startDate);
                        setEndDate(range.endDate);
                        setDateError(null);
                      }}
                      className="w-full"
                    />
                  </div>
                ) : docModel === "wall" ? (
                  <div>
                    <span className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Intervalo de datas da escala diária (máximo 7 dias):
                    </span>
                    <DateRangePicker
                      value={{ startDate, endDate }}
                      maxDays={7}
                      allowClear={false}
                      onChange={(range) => {
                        if (!range.startDate || !range.endDate) return;
                        setStartDate(range.startDate);
                        setEndDate(range.endDate);
                        setDateError(null);
                      }}
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div>
                    <span className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Mês de referência (selecione o mês pretendido):
                    </span>
                    <DatePicker
                      value={startDate}
                      allowClear={false}
                      onChange={(v) => {
                        if (!v) return;
                        const bounds = getMonthBoundsIso(v);
                        setStartDate(bounds.first);
                        setEndDate(bounds.last);
                        setDateError(null);
                      }}
                      className="w-full"
                    />
                  </div>
                )}

                {dateError && (
                  <p className="text-[11px] text-destructive font-medium flex items-center gap-1 pt-1">
                    <AlertCircle size={12} />
                    {dateError}
                  </p>
                )}
              </div>

              <div className="h-px bg-border/60" />

              {/* Seleção de Assistentes */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  Assistentes a Incluir:
                </label>

                {docModel === "wall" ? (
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-xs text-muted-foreground leading-relaxed flex items-center gap-2.5">
                    <Check size={15} className="text-primary shrink-0" />
                    <span>
                      A <strong>Escala Diária de Mural</strong> inclui automaticamente todos os assistentes operacionais escalados no estabelecimento escolar.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-muted/20">
                    <span className="text-[11px] font-medium text-foreground block">
                      Filtrar assistente operacional:
                    </span>
                    <AssistantSelect
                      value={selectedAssistantFilter}
                      onChange={(val) => setSelectedAssistantFilter(val)}
                      assistants={allAssistantsList}
                      includeAllOption={true}
                      allOptionLabel="Todos os assistentes operacionais da escola"
                      placeholder="Pesquisar assistente por nome, nº ou email..."
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Pode emitir para todos os assistentes da escola ou apenas para um assistente específico.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 3: FORMATO DE SAÍDA E RESUMO                        */}
          {/* ========================================================= */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* Resumo da Configuração */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  Resumo da Emissão
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Modelo Selecionado:</span>
                    <span className="font-semibold text-foreground">
                      {docModel === "wall"
                        ? "Escala Diária (Mural / Afixação)"
                        : docModel === "individual"
                        ? "Horário Semanal (Individual)"
                        : "Horário Geral Mensal"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Estabelecimento:</span>
                    <span className="font-medium text-foreground truncate block">
                      {schoolName}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Período de Datas:</span>
                    <span className="font-mono font-medium text-foreground">
                      {startDate} → {endDate}
                    </span>
                    <span className="text-muted-foreground ml-1.5 text-[11px]">
                      ({selectedDaysCount} {selectedDaysCount === 1 ? "dia" : "dias"}
                      {docModel === "individual" && selectedDaysCount > 1
                        ? ` · ${Math.ceil(selectedDaysCount / 7)} sem.`
                        : ""})
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px]">Destinatário(s):</span>
                    <span className="font-medium text-foreground">
                      {docModel === "wall" || selectedAssistantFilter === "all"
                        ? `Todos os assistentes (${allAssistantsList.length})`
                        : allAssistantsList.find((a) => String(a.id) === selectedAssistantFilter)?.name ||
                          "Assistente selecionado"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Formato de Exportação */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Formato de Saída Pretendido:
                </label>

                <RadioGroup
                  value={outputFormat}
                  onValueChange={(val) => setOutputFormat(val as "pdf" | "csv")}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {/* PDF */}
                  <label
                    htmlFor="format-pdf"
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      outputFormat === "pdf"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                        : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                    }`}
                  >
                    <RadioGroupItem value="pdf" id="format-pdf" className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        Documento PDF A4 Horizontal
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Pronto a imprimir ou enviar, com cabeçalhos oficiais, cores por atividade e paginação automática.
                      </p>
                    </div>
                  </label>

                  {/* CSV */}
                  <label
                    htmlFor="format-csv"
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      outputFormat === "csv"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                        : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                    }`}
                  >
                    <RadioGroupItem value="csv" id="format-csv" className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        Ficheiro Excel / CSV (.csv)
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Exportação em folha de cálculo com codificação UTF-8 BOM diretamente compatível com o Microsoft Excel.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>

        {/* Footer do Modal com Navegação entre Passos */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              Passo {step} de 3
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {docModel === "wall"
                ? "Escala Diária"
                : docModel === "individual"
                ? "Horário Semanal"
                : "Horário Mensal"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <>
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
                  onClick={() => setStep(2)}
                  className="cursor-pointer font-medium gap-1.5"
                >
                  Continuar
                  <ChevronRight size={14} />
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="cursor-pointer gap-1"
                >
                  <ChevronLeft size={14} />
                  Voltar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    selectedDaysCount === 0 ||
                    selectedDaysCount > maxAllowedDays ||
                    !!dateError
                  }
                  onClick={() => setStep(3)}
                  className="cursor-pointer font-medium gap-1.5"
                >
                  Continuar
                  <ChevronRight size={14} />
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => setStep(2)}
                  className="cursor-pointer gap-1"
                >
                  <ChevronLeft size={14} />
                  Voltar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    selectedDaysCount === 0 ||
                    selectedDaysCount > maxAllowedDays ||
                    !!dateError ||
                    isExporting
                  }
                  onClick={handleExecute}
                  className="cursor-pointer font-medium gap-1.5"
                >
                  {isExporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : outputFormat === "pdf" ? (
                    <Printer size={14} />
                  ) : (
                    <Download size={14} />
                  )}
                  {isExporting
                    ? outputFormat === "pdf"
                      ? "A gerar PDF..."
                      : "A gerar CSV..."
                    : outputFormat === "pdf"
                    ? "Imprimir / Guardar PDF"
                    : "Descarregar CSV / Excel"}
                </Button>
              </>
            )}
          </div></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
