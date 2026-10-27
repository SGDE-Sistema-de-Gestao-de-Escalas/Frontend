import { useMemo, useState, useEffect } from "react";
import {
  Calendar,
  FileSpreadsheet,
  FileText,
  Printer,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import DatePicker from "../common/DatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { notify } from "../common/FeedbackNotification";
import { cn } from "../ui/utils";
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
import type { LunchBlockApi } from "../../api/services/schedules.service";

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
  initialDocModel?: "wall" | "individual";
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

/**
 * Função utilitária para imprimir documento HTML via iframe oculto limpo.
 */
function printHtmlDocument(
  htmlBody: string,
  title: string,
  orientation: "portrait" | "landscape" = "portrait"
) {
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
          size: A4 ${orientation};
          margin: 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 8px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .header h1 {
          font-size: 16px;
          margin: 0 0 4px 0;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
        }
        .header p {
          margin: 0;
          font-size: 11px;
          color: #475569;
        }
        .header .meta {
          text-align: right;
          font-size: 11px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          text-align: left;
          vertical-align: middle;
        }
        th {
          background-color: #f1f5f9;
          font-weight: 600;
          color: #1e293b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .tag {
          display: inline-block;
          font-size: 9px;
          font-weight: 600;
          padding: 2px 5px;
          border-radius: 3px;
          margin-right: 4px;
          margin-bottom: 2px;
          white-space: nowrap;
        }
        .task-tag {
          background-color: #e2e8f0;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        .lunch-tag {
          background-color: #ffedd5;
          color: #c2410c;
          border: 1px solid #fed7aa;
        }
        .footer-signatures {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
          padding-top: 16px;
        }
        .signature-box {
          width: 45%;
          border-top: 1px solid #94a3b8;
          text-align: center;
          font-size: 10px;
          color: #475569;
          padding-top: 4px;
        }
        .slips-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .slip-card {
          border: 1px dashed #64748b;
          border-radius: 6px;
          padding: 10px 12px;
          background: #ffffff;
          page-break-inside: avoid;
          margin-bottom: 8px;
        }
        .slip-header {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .slip-name {
          font-weight: 700;
          font-size: 12px;
          color: #0f172a;
        }
        .slip-role {
          font-size: 9px;
          color: #64748b;
        }
        .slip-shift {
          background-color: #f1f5f9;
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 10px;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
        }
        .slip-tasks {
          margin-top: 6px;
          font-size: 10px;
        }
        .slip-ack {
          margin-top: 12px;
          border-top: 1px dotted #cbd5e1;
          padding-top: 6px;
          font-size: 9px;
          color: #64748b;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .slip-sign-line {
          width: 55%;
          border-bottom: 1px solid #64748b;
          height: 12px;
        }
        .page-break {
          page-break-after: always;
          break-after: page;
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
      "Assistente",
      "Cargo",
      "Turno Início",
      "Turno Fim",
      "Almoço Início",
      "Almoço Fim",
      "Atividades e Tarefas",
      "Estado",
    ],
  ];

  daysData.forEach((day) => {
    if (!day.isOpen) {
      rows.push([
        schoolName,
        day.dateStr,
        day.dayName,
        "--",
        "--",
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
      const lunchStart = shiftBounds.lunchStartSlot
        ? TIME_SLOTS[shiftBounds.lunchStartSlot]
        : "--:--";
      const lunchEnd = shiftBounds.lunchEndSlot
        ? TIME_SLOTS[shiftBounds.lunchEndSlot]
        : "--:--";

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
        day.dateStr,
        day.dayName,
        assistant.name,
        assistant.role || "Assistente Operacional",
        shiftStart,
        shiftEnd,
        lunchStart,
        lunchEnd,
        taskStrings || "Apoio Geral à Escola",
        "Em Serviço",
      ]);
    });

    filteredAbsent.forEach(
      ({ assistant, reason, isTransfer, transferDestName, shiftBounds }) => {
        const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "--:--";
        const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "--:--";
        rows.push([
          schoolName,
          day.dateStr,
          day.dayName,
          assistant.name,
          assistant.role || "Assistente Operacional",
          shiftStart,
          shiftEnd,
          "--:--",
          "--:--",
          isTransfer
            ? `Cedência temporária para ${transferDestName || "outra escola"}`
            : reason,
          isTransfer ? "Cedência Temporária" : "Ausente / Falta",
        ]);
      }
    );
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
  const schoolSlug = schoolName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const dateSuffix =
    startDate === endDate ? startDate : `${startDate}_a_${endDate}`;
  a.href = url;
  a.download = `escala_${schoolSlug}_${dateSuffix}.csv`;
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
  operatingWindowStr = "08:00–18:00",
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
  const [docModel, setDocModel] = useState<"wall" | "individual">(initialDocModel);
  const [selectedAssistantFilter, setSelectedAssistantFilter] =
    useState<string>("all");
  const [outputFormat, setOutputFormat] = useState<"pdf" | "csv">("pdf");
  const [dateError, setDateError] = useState<string | null>(null);

  // Resetar datas para a data atual do dashboard ao abrir o modal
  useEffect(() => {
    if (open) {
      setStartDate(dateInfo.isoDate);
      setEndDate(dateInfo.isoDate);
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

  // Aplicar preenchimentos rápidos de data
  function applyDatePreset(
    preset: "today" | "this-week" | "next-week" | "this-month"
  ) {
    const now = new Date();
    if (preset === "today") {
      const todayIso = now.toISOString().split("T")[0];
      setStartDate(todayIso);
      setEndDate(todayIso);
    } else if (preset === "this-week") {
      const currentDow = now.getDay();
      const diffToMon = currentDow === 0 ? -6 : 1 - currentDow;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      setStartDate(mon.toISOString().split("T")[0]);
      setEndDate(fri.toISOString().split("T")[0]);
    } else if (preset === "next-week") {
      const currentDow = now.getDay();
      const diffToNextMon = currentDow === 0 ? 1 : 8 - currentDow;
      const nextMon = new Date(now);
      nextMon.setDate(now.getDate() + diffToNextMon);
      const nextFri = new Date(nextMon);
      nextFri.setDate(nextMon.getDate() + 4);
      setStartDate(nextMon.toISOString().split("T")[0]);
      setEndDate(nextFri.toISOString().split("T")[0]);
    } else if (preset === "this-month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
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
      // Se coincidir com o dia atual visualizado no Dashboard, usamos os dados em memória/rascunho
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

      // Caso contrário, calcula dinamicamente
      const dayStatus = operatingSources
        ? resolveSchoolDayStatusByIsoDate(isoDate, operatingSources)
        : {
            isOpen: true,
            schoolHours: undefined,
            viewStartSlot: 32,
            viewEndSlot: 76,
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
        month: "short",
        year: "numeric",
      });
      const dayWindowStr = `${
        TIME_SLOTS[dayStatus.viewStartSlot ?? 32] ?? "08:00"
      }–${TIME_SLOTS[dayStatus.viewEndSlot ?? 76] ?? "19:00"}`;

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
          const aStart = (ab.start_date || "").slice(0, 10);
          const aEnd = (ab.end_date || ab.start_date || "").slice(0, 10);
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
          viewStartSlot: dayStatus.viewStartSlot ?? 32,
          viewEndSlot: dayStatus.viewEndSlot ?? 76,
          profiles: profilesByAssistant[String(assistant.id)],
          exceptions: exceptionsByAssistant[String(assistant.id)],
          schedulesList,
          lunchBlocksForDate: lunchBlocksByDate[isoDate],
          absences,
        }) || {
          startSlot: 34,
          endSlot: 66,
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
            reason:
              absence.reason_label ||
              absence.reason ||
              "Ausência registada",
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

  // Gerar o HTML para a Escala de Afixação
  function generateWallPrintHtml() {
    const pagesHtml = daysData
      .map((day, idx) => {
        if (!day.isOpen) {
          return `
            <div class="header">
              <div>
                <h1>${agrupamentoName} — ${schoolName}</h1>
                <p><strong>Escala Diária de Serviço dos Assistentes Operacionais</strong></p>
                <p>${day.dayName}, ${day.dateStr}</p>
              </div>
            </div>
            <div style="padding: 24px; text-align: center; border: 1px dashed #cbd5e1; border-radius: 6px; background: #f8fafc; margin-top: 20px;">
              <strong style="color: #64748b; font-size: 13px;">${day.closedReason || "Estabelecimento Encerrado"}</strong>
            </div>
            ${idx < daysData.length - 1 ? '<div class="page-break"></div>' : ""}
          `;
        }

        const rowsHtml = day.workingAssistants
          .map(({ assistant, shiftBounds, blocks }) => {
            const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "--:--";
            const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "--:--";
            const lunchStart = shiftBounds.lunchStartSlot
              ? TIME_SLOTS[shiftBounds.lunchStartSlot]
              : "--:--";
            const lunchEnd = shiftBounds.lunchEndSlot
              ? TIME_SLOTS[shiftBounds.lunchEndSlot]
              : "--:--";

            const tasksHtml = blocks
              .filter(
                (b) =>
                  b.state !== "off" && b.state !== "lunch" && b.state !== "absent"
              )
              .map((b) => {
                const s = TIME_SLOTS[b.start] || "";
                const e =
                  TIME_SLOTS[Math.min(b.start + b.count, 95)] || "24:00";
                return `<span class="tag task-tag">${s}–${e}: ${b.activityName || "Atividade"}</span>`;
              })
              .join(" ");

            return `
              <tr>
                <td style="font-weight: 600;">${assistant.name}</td>
                <td style="white-space: nowrap; font-family: monospace;">${shiftStart} – ${shiftEnd}</td>
                <td style="white-space: nowrap; font-family: monospace;">${lunchStart} – ${lunchEnd}</td>
                <td>${tasksHtml || '<span style="color: #64748b; font-style: italic;">Apoio Geral à Escola</span>'}</td>
              </tr>
            `;
          })
          .join("");

        const absentSectionHtml =
          day.absentAssistants.length > 0
            ? `
            <div style="margin-top: 14px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px;">
              <strong style="color: #475569; font-size: 10px; text-transform: uppercase;">Assistentes Ausentes / Cedidos (${day.absentAssistants.length}):</strong>
              <ul style="margin: 4px 0 0 0; padding-left: 18px; font-size: 10px; color: #64748b;">
                ${day.absentAssistants
                  .map(
                    (a) =>
                      `<li><strong>${a.assistant.name}</strong> — ${
                        a.isTransfer
                          ? `Cedência temporária para ${a.transferDestName || "outra escola"}`
                          : a.reason || "Ausência registada"
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>
          `
            : "";

        return `
          <div class="header">
            <div>
              <h1>${agrupamentoName} — ${schoolName}</h1>
              <p><strong>Escala Diária de Serviço dos Assistentes Operacionais</strong></p>
              <p>${day.dayName}, ${day.dateStr} &nbsp;·&nbsp; Horário da Escola: <strong>${day.operatingWindowStr}</strong></p>
            </div>
            <div class="meta">
              <p>Presentes em Serviço: <strong>${day.workingAssistants.length}</strong></p>
              ${day.absentAssistants.length > 0 ? `<p>Ausentes / Cedidos: <strong>${day.absentAssistants.length}</strong></p>` : ""}
              <p style="color: #64748b; font-size: 9px; margin-top: 4px;">Emitido em: ${new Date().toLocaleDateString("pt-PT")} ${new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 26%;">Assistente Operacional</th>
                <th style="width: 15%;">Horário de Trabalho</th>
                <th style="width: 15%;">Pausa de Almoço</th>
                <th>Distribuição de Tarefas e Postos</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 12px;">Sem escalas geradas para este dia.</td></tr>'}
            </tbody>
          </table>

          ${absentSectionHtml}

          <div class="footer-signatures">
            <div class="signature-box">
              A Coordenação do Estabelecimento
            </div>
            <div class="signature-box">
              A Direção do Agrupamento
            </div>
          </div>

          ${idx < daysData.length - 1 ? '<div class="page-break"></div>' : ""}
        `;
      })
      .join("");

    return pagesHtml;
  }

  // Gerar o HTML para as Fichas Individuais
  function generateIndividualPrintHtml() {
    const daysSlipsHtml = daysData
      .map((day, dIdx) => {
        if (!day.isOpen) return "";

        const filteredWorking =
          selectedAssistantFilter === "all"
            ? day.workingAssistants
            : day.workingAssistants.filter(
                (w) => String(w.assistant.id) === selectedAssistantFilter
              );

        if (filteredWorking.length === 0) return "";

        const slipsHtml = filteredWorking
          .map(({ assistant, shiftBounds, blocks }) => {
            const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "--:--";
            const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "--:--";
            const lunchStart = shiftBounds.lunchStartSlot
              ? TIME_SLOTS[shiftBounds.lunchStartSlot]
              : "--:--";
            const lunchEnd = shiftBounds.lunchEndSlot
              ? TIME_SLOTS[shiftBounds.lunchEndSlot]
              : "--:--";

            const tasksList = blocks
              .filter(
                (b) =>
                  b.state !== "off" && b.state !== "lunch" && b.state !== "absent"
              )
              .map((b) => {
                const s = TIME_SLOTS[b.start] || "";
                const e =
                  TIME_SLOTS[Math.min(b.start + b.count, 95)] || "24:00";
                return `<li><strong>${s} – ${e}</strong>: ${b.activityName || "Atividade"}</li>`;
              })
              .join("");

            return `
              <div class="slip-card">
                <div class="slip-header">
                  <div>
                    <div class="slip-name">${assistant.name}</div>
                    <div class="slip-role">${schoolName} &nbsp;·&nbsp; ${assistant.role || "Assistente Operacional"}</div>
                  </div>
                  <div style="text-align: right; font-size: 10px; font-weight: 600; color: #475569;">
                    ${day.dayName}<br />${day.dateStr}
                  </div>
                </div>

                <div class="slip-shift">
                  <div>Turno: <strong>${shiftStart} – ${shiftEnd}</strong></div>
                  <div>Almoço: <strong>${lunchStart} – ${lunchEnd}</strong></div>
                </div>

                <div class="slip-tasks">
                  <strong style="font-size: 10px; text-transform: uppercase; color: #475569;">Atividades / Postos Atribuídos:</strong>
                  <ul style="margin: 4px 0 0 0; padding-left: 16px; font-size: 10px; color: #334155;">
                    ${tasksList || "<li>Apoio Geral e Tarefas de Escola</li>"}
                  </ul>
                </div>

                <div class="slip-ack">
                  <div>Tomei conhecimento:</div>
                  <div class="slip-sign-line"></div>
                </div>
              </div>
            `;
          })
          .join("");

        return `
          <div class="header" ${dIdx > 0 ? 'style="margin-top: 18px;"' : ""}>
            <div>
              <h1>${schoolName}</h1>
              <p><strong>Fichas Individuais de Horário e Atividades</strong> — ${day.dayName}, ${day.dateStr}</p>
            </div>
          </div>
          <div class="slips-grid">
            ${slipsHtml}
          </div>
          ${dIdx < daysData.length - 1 ? '<div class="page-break"></div>' : ""}
        `;
      })
      .filter(Boolean)
      .join("");

    return (
      daysSlipsHtml ||
      `<div style="text-align: center; padding: 30px; color: #64748b;">Sem fichas individuais para os parâmetros selecionados.</div>`
    );
  }

  function handleExecute() {
    if (startDate > endDate) {
      setDateError("A data final deve ser posterior ou igual à data inicial.");
      return;
    }
    setDateError(null);

    if (outputFormat === "csv") {
      exportSchedulesToCsv({
        schoolName,
        startDate,
        endDate,
        daysData,
        assistantFilterId:
          docModel === "individual" ? selectedAssistantFilter : undefined,
      });
      notify.success(
        "Ficheiro CSV gerado e descarregado com sucesso.",
        "Exportação Concluída"
      );
      onClose();
      return;
    }

    // Caso PDF / Impressão
    if (docModel === "wall") {
      const title = `Escala_Afixacao_${schoolName}_${startDate}`;
      printHtmlDocument(generateWallPrintHtml(), title, "landscape");
      notify.success(
        "Documento enviado para impressão / PDF.",
        "Impressão Iniciada"
      );
      onClose();
    } else {
      const title = `Fichas_Individuais_${schoolName}_${startDate}`;
      printHtmlDocument(generateIndividualPrintHtml(), title, "portrait");
      notify.success(
        "Fichas individuais enviadas para impressão / PDF.",
        "Impressão Iniciada"
      );
      onClose();
    }
  }

  const selectedDaysCount = datesInRange.length;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-full max-w-xl p-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header do Modal */}
        <DialogHeader className="px-6 py-5 border-b border-border bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Printer size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                Imprimir e Exportar Horários
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {schoolName} · {agrupamentoName}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* SECÇÃO 1: INTERVALO DE DATAS */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-primary" />
              <span>Intervalo de Datas</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Data Inicial:
                </span>
                <DatePicker
                  value={startDate}
                  onChange={(v) => {
                    setStartDate(v);
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
                  minDate={startDate || undefined}
                  onChange={(v) => {
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
                  Esta Semana
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset("next-week")}
                  className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card hover:bg-muted font-medium transition-colors text-foreground shadow-2xs cursor-pointer"
                >
                  Próxima Semana
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset("this-month")}
                  className="px-2.5 py-1 text-xs rounded-lg border border-border bg-card hover:bg-muted font-medium transition-colors text-foreground shadow-2xs cursor-pointer"
                >
                  Este Mês
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* SECÇÃO 2: MODELO DE DOCUMENTO */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={13} className="text-primary" />
              <span>Modelo de Documento</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card 1: Afixação */}
              <button
                type="button"
                onClick={() => setDocModel("wall")}
                className={cn(
                  "relative p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5",
                  docModel === "wall"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border bg-card hover:bg-muted/50 hover:border-border/80"
                )}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      docModel === "wall"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <FileText size={16} />
                  </div>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                      docModel === "wall"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {docModel === "wall" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Escala Diária (Para Afixação)
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Mapa geral completo com equipa e turnos para afixar no placard.
                  </div>
                </div>
              </button>

              {/* Card 2: Fichas Individuais */}
              <button
                type="button"
                onClick={() => setDocModel("individual")}
                className={cn(
                  "relative p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5",
                  docModel === "individual"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border bg-card hover:bg-muted/50 hover:border-border/80"
                )}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      docModel === "individual"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <UserCheck size={16} />
                  </div>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                      docModel === "individual"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {docModel === "individual" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Fichas Individuais (Para Entrega)
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Talões com horário, pausas e postos para assinatura e conhecimento.
                  </div>
                </div>
              </button>
            </div>

            {/* Seletor Customizado de Assistente quando Fichas Individuais */}
            {docModel === "individual" && (
              <div className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20 animate-in fade-in-50 duration-200">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Users size={13} className="text-primary" />
                  <span>Assistente a emitir:</span>
                </label>
                <Select
                  value={selectedAssistantFilter}
                  onValueChange={setSelectedAssistantFilter}
                >
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue placeholder="Selecione o assistente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="font-semibold text-foreground">
                        Todos os assistentes em serviço
                      </span>
                    </SelectItem>
                    {allAssistantsList.map((assistant) => (
                      <SelectItem
                        key={String(assistant.id)}
                        value={String(assistant.id)}
                      >
                        {assistant.name}
                        {assistant.role ? ` · ${assistant.role}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {selectedAssistantFilter === "all"
                    ? "Serão geradas fichas de entrega para todos os assistentes em serviço no período."
                    : "Será gerada apenas a ficha individual do assistente selecionado."}
                </p>
              </div>
            )}
          </div>

          <div className="h-px bg-border/60" />

          {/* SECÇÃO 3: FORMATO DE SAÍDA */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Printer size={13} className="text-primary" />
              <span>Formato de Saída</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Formato 1: PDF / Impressão */}
              <button
                type="button"
                onClick={() => setOutputFormat("pdf")}
                className={cn(
                  "relative p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5",
                  outputFormat === "pdf"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border bg-card hover:bg-muted/50 hover:border-border/80"
                )}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      outputFormat === "pdf"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Printer size={16} />
                  </div>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                      outputFormat === "pdf"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {outputFormat === "pdf" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    PDF / Impressão Direta
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Abre o diálogo de impressão ou guarda diretamente em PDF A4.
                  </div>
                </div>
              </button>

              {/* Formato 2: Excel / CSV */}
              <button
                type="button"
                onClick={() => setOutputFormat("csv")}
                className={cn(
                  "relative p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5",
                  outputFormat === "csv"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border bg-card hover:bg-muted/50 hover:border-border/80"
                )}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      outputFormat === "csv"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <FileSpreadsheet size={16} />
                  </div>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                      outputFormat === "csv"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    )}
                  >
                    {outputFormat === "csv" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Excel / CSV (.csv)
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Tabela estruturada com UTF-8 BOM compatível com Microsoft Excel.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer do Modal */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              {selectedDaysCount} {selectedDaysCount === 1 ? "dia" : "dias"}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {docModel === "wall" ? "Escala Diária" : "Fichas Individuais"} ·{" "}
              {outputFormat === "pdf" ? "PDF" : "CSV"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-medium cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleExecute}
              disabled={selectedDaysCount === 0 || !!dateError}
              className="text-xs font-semibold cursor-pointer gap-2"
            >
              {outputFormat === "pdf" ? (
                <>
                  <Printer size={14} />
                  <span>Imprimir / Gerar PDF</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet size={14} />
                  <span>Descarregar CSV / Excel</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
