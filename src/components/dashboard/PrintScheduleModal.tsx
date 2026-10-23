import React, { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  Check,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import type { Assistant } from "../../types";
import { TIME_SLOTS, MergedScheduleBlock } from "./blockStyles";
import type { AssistantResolvedShiftBounds } from "../../utils/scheduleMatrixUtils";

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

interface PrintScheduleModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "wall" | "individual";
  schoolName: string;
  agrupamentoName?: string;
  dateInfo: {
    dateStr: string;
    dayName: string;
    isoDate: string;
  };
  operatingWindowStr: string;
  workingAssistants: PrintableAssistantSchedule[];
  absentAssistants: PrintableAbsentAssistant[];
}

/**
 * Função utilitária para imprimir um documento HTML através de um iframe oculto.
 * Evita bloqueios de popup do browser e aplica CSS de impressão limpo.
 */
function printHtmlDocument(htmlBody: string, title: string, orientation: "portrait" | "landscape" = "portrait") {
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
        /* Fichas individuais */
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
 * Função utilitária para descarregar a escala diária em ficheiro CSV compatível com Excel.
 */
export function exportDailyScheduleToCsv(params: {
  schoolName: string;
  dateStr: string;
  isoDate: string;
  operatingWindowStr: string;
  workingAssistants: PrintableAssistantSchedule[];
  absentAssistants: PrintableAbsentAssistant[];
}) {
  const { schoolName, dateStr, isoDate, workingAssistants, absentAssistants } = params;

  const rows: string[][] = [
    ["Escola", "Data", "Assistente", "Cargo", "Turno Início", "Turno Fim", "Almoço Início", "Almoço Fim", "Atividades e Tarefas", "Estado"],
  ];

  workingAssistants.forEach(({ assistant, shiftBounds, blocks }) => {
    const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "--:--";
    const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "--:--";
    const lunchStart = shiftBounds.lunchStartSlot ? TIME_SLOTS[shiftBounds.lunchStartSlot] : "--:--";
    const lunchEnd = shiftBounds.lunchEndSlot ? TIME_SLOTS[shiftBounds.lunchEndSlot] : "--:--";

    const taskStrings = blocks
      .filter((b) => b.state !== "off" && b.state !== "lunch" && b.state !== "absent")
      .map((b) => {
        const s = TIME_SLOTS[b.start] || "";
        const e = TIME_SLOTS[Math.min(b.start + b.count, 95)] || "24:00";
        return `${s}-${e}: ${b.activityName || "Atividade"}`;
      })
      .join(" | ");

    rows.push([
      schoolName,
      dateStr,
      assistant.name,
      assistant.role || "Assistente Operacional",
      shiftStart,
      shiftEnd,
      lunchStart,
      lunchEnd,
      taskStrings || "Apoio Geral",
      "Em Serviço",
    ]);
  });

  absentAssistants.forEach(({ assistant, reason, isTransfer, transferDestName, shiftBounds }) => {
    const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "--:--";
    const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "--:--";
    rows.push([
      schoolName,
      dateStr,
      assistant.name,
      assistant.role || "Assistente Operacional",
      shiftStart,
      shiftEnd,
      "--:--",
      "--:--",
      isTransfer ? `Cedência temporária para ${transferDestName || "outra escola"}` : reason,
      isTransfer ? "Cedência Temporária" : "Ausente / Falta",
    ]);
  });

  // Codificar em CSV delimitado por ponto e vírgula com UTF-8 BOM
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
  a.href = url;
  a.download = `escala_${schoolSlug}_${isoDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PrintScheduleModal({
  open,
  onClose,
  initialTab = "wall",
  schoolName,
  agrupamentoName = "Agrupamento de Escolas",
  dateInfo,
  operatingWindowStr,
  workingAssistants,
  absentAssistants,
}: PrintScheduleModalProps) {
  const [activeTab, setActiveTab] = useState<"wall" | "individual">(initialTab);
  const [selectedAssistantFilter, setSelectedAssistantFilter] = useState<string>("all");

  const totalAssistants = workingAssistants.length;
  const totalAbsent = absentAssistants.length;

  const filteredWorkingAssistants = useMemo(() => {
    if (selectedAssistantFilter === "all") return workingAssistants;
    return workingAssistants.filter(
      (w) => String(w.assistant.id) === selectedAssistantFilter
    );
  }, [workingAssistants, selectedAssistantFilter]);

  // Gerar o HTML para a Escala de Afixação
  function generateWallPrintHtml() {
    const rowsHtml = workingAssistants
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
          .filter((b) => b.state !== "off" && b.state !== "lunch" && b.state !== "absent")
          .map((b) => {
            const s = TIME_SLOTS[b.start] || "";
            const e = TIME_SLOTS[Math.min(b.start + b.count, 95)] || "24:00";
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
      absentAssistants.length > 0
        ? `
        <div style="margin-top: 14px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px;">
          <strong style="color: #475569; font-size: 10px; text-transform: uppercase;">Assistentes Ausentes / Cedidos (${absentAssistants.length}):</strong>
          <ul style="margin: 4px 0 0 0; padding-left: 18px; font-size: 10px; color: #64748b;">
            ${absentAssistants
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
          <p>${dateInfo.dayName}, ${dateInfo.dateStr} &nbsp;·&nbsp; Horário da Escola: <strong>${operatingWindowStr}</strong></p>
        </div>
        <div class="meta">
          <p>Presentes em Serviço: <strong>${totalAssistants}</strong></p>
          ${totalAbsent > 0 ? `<p>Ausentes / Cedidos: <strong>${totalAbsent}</strong></p>` : ""}
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
          ${rowsHtml}
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
    `;
  }

  // Gerar o HTML para as Fichas Individuais
  function generateIndividualPrintHtml() {
    const slipsHtml = filteredWorkingAssistants
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
          .filter((b) => b.state !== "off" && b.state !== "lunch" && b.state !== "absent")
          .map((b) => {
            const s = TIME_SLOTS[b.start] || "";
            const e = TIME_SLOTS[Math.min(b.start + b.count, 95)] || "24:00";
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
                ${dateInfo.dayName}<br />${dateInfo.dateStr}
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
      <div class="header">
        <div>
          <h1>${schoolName}</h1>
          <p><strong>Fichas Individuais de Horário e Atividades</strong> — ${dateInfo.dayName}, ${dateInfo.dateStr}</p>
        </div>
        <div class="meta">
          <p>Total de Fichas: <strong>${filteredWorkingAssistants.length}</strong></p>
        </div>
      </div>

      <div class="slips-grid">
        ${slipsHtml}
      </div>
    `;
  }

  function handlePrintWall() {
    printHtmlDocument(
      generateWallPrintHtml(),
      `Escala_Afixacao_${schoolName}_${dateInfo.isoDate}`,
      "landscape"
    );
  }

  function handlePrintIndividual() {
    printHtmlDocument(
      generateIndividualPrintHtml(),
      `Fichas_Individuais_${schoolName}_${dateInfo.isoDate}`,
      "portrait"
    );
  }

  function handleExportCsv() {
    exportDailyScheduleToCsv({
      schoolName,
      dateStr: dateInfo.dateStr,
      isoDate: dateInfo.isoDate,
      operatingWindowStr,
      workingAssistants,
      absentAssistants,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-full max-w-4xl p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header do Modal */}
        <DialogHeader className="px-5 py-4 border-b border-border bg-muted/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Printer size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  Imprimir e Descarregar Horários
                  <Badge variant="outline" className="text-xs font-mono font-normal">
                    {dateInfo.dateStr}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {schoolName} · {workingAssistants.length} assistentes em serviço hoje
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <FileSpreadsheet size={13} />
              Descarregar CSV / Excel
            </Button>
          </div>
        </DialogHeader>

        {/* Corpo com Abas */}
        <div className="flex-1 overflow-y-auto p-5">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "wall" | "individual")}
            className="w-full"
          >
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger
                  value="wall"
                  className="flex items-center gap-1.5 text-xs py-1.5 px-3 data-[state=active]:bg-card"
                >
                  <FileText size={13} />
                  Escala Diária (Para Afixação)
                </TabsTrigger>
                <TabsTrigger
                  value="individual"
                  className="flex items-center gap-1.5 text-xs py-1.5 px-3 data-[state=active]:bg-card"
                >
                  <UserCheck size={13} />
                  Fichas Individuais (Para Entrega)
                </TabsTrigger>
              </TabsList>

              {activeTab === "individual" && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Assistente:</span>
                  <select
                    value={selectedAssistantFilter}
                    onChange={(e) => setSelectedAssistantFilter(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">Todos os Assistentes ({workingAssistants.length})</option>
                    {workingAssistants.map(({ assistant }) => (
                      <option key={assistant.id} value={String(assistant.id)}>
                        {assistant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* ABA 1: ESCALA DE AFIXAÇÃO */}
            <TabsContent value="wall" className="mt-0 space-y-4">
              <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/60">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                    Pré-visualização do Documento de Afixação (Formato Placard / A4)
                  </span>
                  <span>Paisagem (Landscape)</span>
                </div>

                {/* Folha de Pré-visualização Estilizada */}
                <div className="rounded-lg border border-border bg-card p-5 shadow-xs text-xs space-y-4">
                  <div className="border-b-2 border-primary/80 pb-3 flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground uppercase tracking-tight">
                        {agrupamentoName} — {schoolName}
                      </h4>
                      <p className="text-xs font-semibold text-primary mt-0.5">
                        Escala Diária de Serviço dos Assistentes Operacionais
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {dateInfo.dayName}, {dateInfo.dateStr} · Janela de Funcionamento:{" "}
                        <strong>{operatingWindowStr}</strong>
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <p>Presentes: <strong>{totalAssistants}</strong></p>
                      {totalAbsent > 0 && <p className="text-destructive">Ausentes/Cedidos: <strong>{totalAbsent}</strong></p>}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-[10px] uppercase font-semibold text-muted-foreground">
                          <th className="py-2 px-2.5">Assistente Operacional</th>
                          <th className="py-2 px-2.5">Horário Trabalho</th>
                          <th className="py-2 px-2.5">Pausa Almoço</th>
                          <th className="py-2 px-2.5">Distribuição de Tarefas / Postos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {workingAssistants.map(({ assistant, shiftBounds, blocks }) => {
                          const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "--:--";
                          const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "--:--";
                          const lunchStart = shiftBounds.lunchStartSlot
                            ? TIME_SLOTS[shiftBounds.lunchStartSlot]
                            : "--:--";
                          const lunchEnd = shiftBounds.lunchEndSlot
                            ? TIME_SLOTS[shiftBounds.lunchEndSlot]
                            : "--:--";

                          const taskBlocks = blocks.filter(
                            (b) => b.state !== "off" && b.state !== "lunch" && b.state !== "absent"
                          );

                          return (
                            <tr key={assistant.id} className="hover:bg-muted/20">
                              <td className="py-2 px-2.5 font-medium text-foreground">
                                {assistant.name}
                              </td>
                              <td className="py-2 px-2.5 font-mono text-[11px]">
                                {shiftStart} – {shiftEnd}
                              </td>
                              <td className="py-2 px-2.5 font-mono text-[11px] text-orange-600 dark:text-orange-400">
                                {lunchStart} – {lunchEnd}
                              </td>
                              <td className="py-2 px-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {taskBlocks.map((b, bi) => {
                                    const s = TIME_SLOTS[b.start] || "";
                                    const e = TIME_SLOTS[Math.min(b.start + b.count, 95)] || "24:00";
                                    return (
                                      <span
                                        key={bi}
                                        className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/60 text-foreground/90 font-medium whitespace-nowrap"
                                      >
                                        <span className="font-mono text-muted-foreground mr-1">
                                          {s}–{e}
                                        </span>
                                        {b.activityName || "Atividade"}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {absentAssistants.length > 0 && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-[11px] space-y-1">
                      <span className="font-semibold text-destructive uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <UserX size={11} />
                        Assistentes Ausentes / Cedidos ({absentAssistants.length}):
                      </span>
                      <div className="flex items-center gap-3 flex-wrap text-muted-foreground">
                        {absentAssistants.map((a) => (
                          <span key={a.assistant.id}>
                            <strong>{a.assistant.name}</strong> (
                            {a.isTransfer
                              ? `Cedência para ${a.transferDestName || "outra escola"}`
                              : a.reason}
                            )
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: FICHAS INDIVIDUAIS */}
            <TabsContent value="individual" className="mt-0 space-y-4">
              <div className="rounded-xl border border-border bg-muted/15 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/60">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                    Pré-visualização das Fichas de Horário Individual (Prontas para Entrega)
                  </span>
                  <span>2 por folha A4</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredWorkingAssistants.map(({ assistant, shiftBounds, blocks }) => {
                    const shiftStart = TIME_SLOTS[shiftBounds.startSlot] || "--:--";
                    const shiftEnd = TIME_SLOTS[shiftBounds.endSlot] || "--:--";
                    const lunchStart = shiftBounds.lunchStartSlot
                      ? TIME_SLOTS[shiftBounds.lunchStartSlot]
                      : "--:--";
                    const lunchEnd = shiftBounds.lunchEndSlot
                      ? TIME_SLOTS[shiftBounds.lunchEndSlot]
                      : "--:--";

                    const taskBlocks = blocks.filter(
                      (b) => b.state !== "off" && b.state !== "lunch" && b.state !== "absent"
                    );

                    return (
                      <div
                        key={assistant.id}
                        className="rounded-lg border-2 border-dashed border-border bg-card p-3.5 space-y-2.5 text-xs shadow-2xs"
                      >
                        <div className="flex items-start justify-between pb-2 border-b border-border">
                          <div>
                            <h5 className="font-bold text-sm text-foreground">
                              {assistant.name}
                            </h5>
                            <p className="text-[10px] text-muted-foreground">
                              {schoolName} · {assistant.role || "Assistente Operacional"}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {dateInfo.dateStr}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2 rounded-md font-mono text-[11px]">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-sans">
                              Turno de Trabalho
                            </span>
                            <span className="font-semibold text-foreground">
                              {shiftStart} – {shiftEnd}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-sans">
                              Pausa de Almoço
                            </span>
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              {lunchStart} – {lunchEnd}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-semibold mb-1">
                            Atividades Atribuídas:
                          </span>
                          <div className="space-y-1">
                            {taskBlocks.length > 0 ? (
                              taskBlocks.map((b, bi) => {
                                const s = TIME_SLOTS[b.start] || "";
                                const e = TIME_SLOTS[Math.min(b.start + b.count, 95)] || "24:00";
                                return (
                                  <div
                                    key={bi}
                                    className="flex items-center justify-between text-[11px] px-2 py-0.5 rounded bg-muted/40 border border-border/50"
                                  >
                                    <span className="font-medium text-foreground/90">
                                      {b.activityName || "Atividade"}
                                    </span>
                                    <span className="font-mono text-muted-foreground text-[10px]">
                                      {s} – {e}
                                    </span>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-[11px] text-muted-foreground italic">
                                Apoio Geral e Tarefas de Escola
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-dotted border-border flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Tomei conhecimento:</span>
                          <div className="w-36 border-b border-foreground/40 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Rodapé do Modal */}
        <DialogFooter className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="sm:hidden text-xs"
            >
              <Download size={13} className="mr-1.5" />
              CSV
            </Button>

            {activeTab === "wall" ? (
              <Button
                variant="default"
                size="sm"
                onClick={handlePrintWall}
                className="text-xs font-semibold bg-primary text-primary-foreground shadow-xs cursor-pointer"
              >
                <Printer size={13} className="mr-1.5" />
                Imprimir Escala de Afixação
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handlePrintIndividual}
                className="text-xs font-semibold bg-primary text-primary-foreground shadow-xs cursor-pointer"
              >
                <Printer size={13} className="mr-1.5" />
                Imprimir Fichas Individuais ({filteredWorkingAssistants.length})
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
