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
import type { MergedScheduleBlock } from "./blockStyles";
import type {
  AssistantResolvedShiftBounds,
  OperatingStatusSources,
} from "../../utils/scheduleMatrixUtils";
import type {
  AssistantScheduleProfileApi,
  AssistantExceptionApi,
} from "../../types/assistantSchedule.types";
import schedulesService, {
  type LunchBlockApi,
} from "../../api/services/schedules.service";

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

export default function PrintScheduleModal({
  open,
  onClose,
  initialDocModel = "wall",
  schoolName,
  agrupamentoName = "Agrupamento de Escolas",
  dateInfo,
  workingAssistants,
  absentAssistants,
  activeAssistants = [],
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
